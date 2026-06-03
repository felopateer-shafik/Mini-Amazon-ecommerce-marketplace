<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Vendor;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AnalyticsController extends Controller
{
    /**
     * Get dashboard analytics
     */
    public function index(Request $request): JsonResponse
    {
        $range = (string) $request->get('range', '30days');
        $now = now();
        $startDate = match ($range) {
            '7days' => $now->copy()->subDays(7)->startOfDay(),
            '30days' => $now->copy()->subDays(30)->startOfDay(),
            '90days' => $now->copy()->subDays(90)->startOfDay(),
            'year' => $now->copy()->startOfYear(),
            default => $now->copy()->subDays(30)->startOfDay(),
        };

        $totalUsers = User::count();
        $productsBaseQuery = Product::query()
            ->where(function ($query) {
                $query->whereNull('moderation_note')
                    ->orWhereNotIn('moderation_note', ['Removed by merchant', 'Removed by admin']);
            });

        $activeProducts = (clone $productsBaseQuery)->where('is_active', true)->count();
        $totalProducts = (clone $productsBaseQuery)->count();
        $totalOrders = Order::count();
        $activeMerchants = Vendor::where('is_active', true)->count();
        $totalRevenue = Order::whereHas('payment', function ($q) {
            $q->where('status', 'completed');
        })->sum('total');

        $rangeOrders = Order::where('created_at', '>=', $startDate)->count();
        $rangeRevenue = Order::where('created_at', '>=', $startDate)
            ->whereHas('payment', function ($q) {
                $q->where('status', 'completed');
            })
            ->sum('total');

        $totalWalletBalance = Wallet::sum('balance');
        $walletAccountsCount = Wallet::count();

        $conversionRate = $totalUsers > 0
            ? round(($totalOrders / $totalUsers) * 100, 1)
            : 0;

        $orderStatusBreakdown = Order::query()
            ->selectRaw('LOWER(status) as status, COUNT(*) as count')
            ->groupByRaw('LOWER(status)')
            ->pluck('count', 'status');
        
        $recentOrders = Order::with('user')
            ->latest()
            ->limit(10)
            ->get();

        $topProducts = Product::withCount(['orderItems' => function ($q) use ($startDate) {
                $q->where('created_at', '>=', $startDate);
            }])
            ->withSum(['orderItems as order_items_revenue' => function ($q) use ($startDate) {
                $q->where('created_at', '>=', $startDate);
            }], 'total_price')
            ->orderByDesc('order_items_count')
            ->limit(5)
            ->get();

        $revenueByMonth = Order::selectRaw('EXTRACT(MONTH FROM created_at) as month, SUM(total) as revenue')
            ->where('created_at', '>=', $startDate)
            ->whereHas('payment', function ($q) {
                $q->where('status', 'completed');
            })
            ->groupByRaw('EXTRACT(MONTH FROM created_at)')
            ->orderByRaw('EXTRACT(MONTH FROM created_at)')
            ->get();

        $userGrowthByMonth = User::selectRaw('EXTRACT(MONTH FROM created_at) as month, COUNT(*) as users')
            ->where('created_at', '>=', $startDate)
            ->groupByRaw('EXTRACT(MONTH FROM created_at)')
            ->orderByRaw('EXTRACT(MONTH FROM created_at)')
            ->get();

        $globalLowStockThreshold = max(0, (int) Cache::get('settings.low_stock_threshold', 0));

        $lowStockProducts = Product::query()
            ->where('track_inventory', true)
            ->when($globalLowStockThreshold > 0, function ($query) use ($globalLowStockThreshold) {
                $query->where('stock_quantity', '<=', $globalLowStockThreshold);
            }, function ($query) {
                $query->whereColumn('stock_quantity', '<=', 'min_stock_level');
            })
            ->orderBy('stock_quantity')
            ->limit(10)
            ->get(['id', 'name', 'sku', 'stock_quantity', 'min_stock_level']);

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => [
                    'total_users' => $totalUsers,
                    'active_products' => $activeProducts,
                    'total_products' => $totalProducts,
                    'total_orders' => $totalOrders,
                    'active_merchants' => $activeMerchants,
                    'total_revenue' => $totalRevenue,
                    'conversion_rate' => $conversionRate,
                    'total_wallet_balance' => (float) $totalWalletBalance,
                    'wallet_accounts_count' => $walletAccountsCount,
                    'range_orders' => $rangeOrders,
                    'range_revenue' => (float) $rangeRevenue,
                    'range' => $range,
                ],
                'recent_orders' => $recentOrders,
                'top_products' => $topProducts,
                'revenue_by_month' => $revenueByMonth,
                'order_status' => $orderStatusBreakdown,
                'user_growth_by_month' => $userGrowthByMonth,
                'low_stock_products' => $lowStockProducts,
            ],
        ]);
    }
}

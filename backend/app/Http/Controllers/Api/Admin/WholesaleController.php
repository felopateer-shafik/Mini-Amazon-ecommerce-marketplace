<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\WholesaleCustomer;
use App\Models\WholesaleProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class WholesaleController extends Controller
{
    public function customers(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->get('per_page', 10), 1), 100);
        $search = trim((string) $request->get('search', ''));

        $customersQuery = WholesaleCustomer::query()
            ->with('user:id,name,email');

        if ($search !== '') {
            $needle = '%' . mb_strtolower($search) . '%';
            $customersQuery->where(function ($q) use ($needle) {
                $q->whereRaw('LOWER(company) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(contact) LIKE ?', [$needle])
                    ->orWhereHas('user', function ($uq) use ($needle) {
                        $uq->whereRaw('LOWER(name) LIKE ?', [$needle])
                            ->orWhereRaw('LOWER(email) LIKE ?', [$needle]);
                    });
            });
        }

        $customers = $customersQuery
            ->latest()
            ->paginate($perPage);

        $mapped = collect($customers->items())->map(function (WholesaleCustomer $customer) {
            $user = $customer->user;

            $ordersCount = (int) ($customer->orders ?? 0);
            $totalSpent = (float) ($customer->total_spent ?? 0);

            if ($user) {
                $ordersCount = \App\Models\Order::where('user_id', $user->id)->count();
                $totalSpent = (float) \App\Models\Order::where('user_id', $user->id)
                    ->whereIn('status', ['delivered', 'shipped', 'confirmed', 'processing'])
                    ->sum('total');
            }

            return [
                'id' => $customer->id,
                'user_id' => $customer->user_id,
                'company' => $customer->company ?: ($user?->name ?? '—'),
                'email' => $customer->email ?: ($user?->email ?? null),
                'contact' => $customer->contact ?: ($user?->name ?? null),
                'orders' => $ordersCount,
                'total_spent' => $totalSpent,
                'status' => $customer->status ?? 'pending',
                'created_at' => optional($customer->created_at)->toISOString(),
                'updated_at' => optional($customer->updated_at)->toISOString(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $mapped,
            'meta' => [
                'total' => $customers->total(),
                'per_page' => $customers->perPage(),
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
            ],
        ]);
    }

    public function updateCustomerStatus(Request $request, WholesaleCustomer $customer): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:approved,pending,rejected,active',
        ]);

        $customer->update(['status' => $data['status']]);

        return response()->json([
            'success' => true,
            'data' => $customer->fresh(),
            'message' => __('messages.wholesale_customer_status_updated'),
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);

        $products = WholesaleProduct::query()
            ->with(['product:id,vendor_id,name,sku,price', 'product.vendor:id,store_name'])
            ->latest()
            ->paginate($perPage)
            ->through(function (WholesaleProduct $wholesaleProduct) {
                return [
                    'id' => $wholesaleProduct->id,
                    'product_id' => $wholesaleProduct->product_id,
                    'name' => $wholesaleProduct->product?->name,
                    'sku' => $wholesaleProduct->product?->sku,
                    'merchant' => $wholesaleProduct->product?->vendor?->store_name,
                    'retailPrice' => (float) ($wholesaleProduct->product?->price ?? 0),
                    'wholesalePrice' => (float) ($wholesaleProduct->wholesale_price ?? 0),
                    'minQty' => (int) ($wholesaleProduct->min_qty ?? 0),
                    'status' => $wholesaleProduct->status,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $products->items(),
            'meta' => [
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
            ],
        ]);
    }

    public function syncProducts(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => 'required|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.wholesalePrice' => 'required|numeric|min:0',
            'items.*.minQty' => 'required|integer|min:1',
            'items.*.status' => 'required|in:active,pending,inactive',
            'full_replace' => 'sometimes|boolean',
            'confirm' => 'sometimes|string|in:SYNC',
        ]);

        $fullReplace = (bool) ($data['full_replace'] ?? false);
        if ($fullReplace && (($data['confirm'] ?? null) !== 'SYNC')) {
            return response()->json([
                'success' => false,
                'message' => __('messages.wholesale_sync_confirmation_required'),
            ], 422);
        }

        if ($fullReplace) {
            $submittedProductIds = collect($data['items'])->pluck('product_id')->all();
            WholesaleProduct::whereNotIn('product_id', $submittedProductIds)->delete();
        }

        foreach ($data['items'] as $item) {
            WholesaleProduct::updateOrCreate(
                ['product_id' => $item['product_id']],
                [
                    'wholesale_price' => $item['wholesalePrice'],
                    'min_qty' => $item['minQty'],
                    'status' => $item['status'],
                ],
            );
        }

        return response()->json([
            'success' => true,
            'message' => __('messages.wholesale_products_synced'),
        ]);
    }

    public function bootstrapFromCatalog(): JsonResponse
    {
        $discountPercent = (float) Cache::get('settings.wholesale_default_discount', 20);
        $discountRatio = max(0, min(100, $discountPercent)) / 100;
        $priceMultiplier = max(0, 1 - $discountRatio);
        $defaultMinQty = max(1, (int) Cache::get('settings.wholesale_min_quantity', 10));

        $products = Product::query()
            ->where('is_active', true)
            ->limit(100)
            ->get(['id', 'price']);

        foreach ($products as $product) {
            WholesaleProduct::firstOrCreate(
                ['product_id' => $product->id],
                [
                    'wholesale_price' => round(((float) $product->price) * $priceMultiplier, 2),
                    'min_qty' => $defaultMinQty,
                    'status' => 'active',
                ],
            );
        }

        return response()->json([
            'success' => true,
            'message' => __('messages.wholesale_bootstrap_completed'),
        ]);
    }
}

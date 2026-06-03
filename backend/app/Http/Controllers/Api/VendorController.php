<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\VendorResource;
use App\Models\Brand;
use App\Models\Vendor;
use App\Models\UserNotification;
use App\Models\VendorPayoutRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class VendorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = $this->resolvePerPage($request, 12);

        $vendors = Vendor::where('is_active', true)
            ->with('user')
            ->withCount(['products' => function ($q) {
                $q->where('is_active', true);
            }])
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => VendorResource::collection($vendors->items()),
            'meta' => [
                'total' => $vendors->total(),
                'per_page' => $vendors->perPage(),
                'current_page' => $vendors->currentPage(),
                'last_page' => $vendors->lastPage(),
            ],
            'message' => __('vendors.retrieved'),
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(Vendor $vendor): JsonResponse
    {
        $vendor->loadCount(['products' => function ($q) {
            $q->where('is_active', true);
        }]);
        $vendor->load('user');
        
        return response()->json([
            'success' => true,
            'data' => new VendorResource($vendor),
            'message' => __('vendors.retrieved'),
        ]);
    }

    /**
     * Get vendor dashboard
     */
    public function dashboard(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;

        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => __('vendors.not_found_pending'),
            ], 404);
        }

        // Calculate real stats from orders
        $totalRevenue = $vendor->products()
            ->join('order_items', 'products.id', '=', 'order_items.product_id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->sum('order_items.total_price');

        $totalOrders = \App\Models\Order::whereHas('items.product', function ($q) use ($vendor) {
            $q->where('vendor_id', $vendor->id);
        })->count();

        $avgRating = (float) ($vendor->rating ?? 0);

        // Recent orders
        $recentOrders = \App\Models\Order::whereHas('items.product', function ($q) use ($vendor) {
            $q->where('vendor_id', $vendor->id);
        })
        ->with(['user:id,name,email'])
        ->withCount(['items as items_count' => function ($q) use ($vendor) {
            $q->whereHas('product', fn($p) => $p->where('vendor_id', $vendor->id));
        }])
        ->withSum(['items as vendor_items_total' => function ($q) use ($vendor) {
            $q->whereHas('product', fn($p) => $p->where('vendor_id', $vendor->id));
        }], 'total_price')
        ->latest()
        ->take(5)
        ->get()
        ->map(function ($order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'customer' => $order->user->name ?? 'Guest',
                'total' => (float) ($order->vendor_items_total ?? 0),
                'items_count' => (int) $order->items_count,
                'status' => $order->status,
                'created_at' => $order->created_at->toISOString(),
            ];
        });

        // Order status breakdown
        $orderStatuses = \App\Models\Order::whereHas('items.product', function ($q) use ($vendor) {
            $q->where('vendor_id', $vendor->id);
        })->selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status');

        // Sales chart — monthly revenue for the last 12 months
        $salesChart = \App\Models\OrderItem::whereHas('product', function ($q) use ($vendor) {
                $q->where('vendor_id', $vendor->id);
            })
            ->where('created_at', '>=', now()->subMonths(12)->startOfMonth())
            ->selectRaw("to_char(created_at, 'YYYY-MM') as month, COALESCE(SUM(total_price), 0) as sales")
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn($row) => [
                'month' => $row->month,
                'sales' => (float) $row->sales,
            ]);

        // Top products by total revenue (not just order item count)
        $topProducts = $vendor->products()
            ->withCount('orderItems')
            ->withSum('orderItems', 'quantity')
            ->withSum('orderItems', 'total_price')
            ->orderByDesc('order_items_sum_total_price')
            ->take(5)
            ->get()
            ->map(function ($p) {
                $images = is_string($p->images) ? json_decode($p->images, true) : ($p->images ?? []);
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'sold' => (int) ($p->order_items_sum_quantity ?? 0),
                    'stock' => (int) ($p->stock_quantity ?? 0),
                    'total_revenue' => (float) ($p->order_items_sum_total_price ?? 0),
                    'price' => (float) $p->price,
                    'image' => $images[0] ?? null,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'vendor' => new VendorResource($vendor),
                'total_products' => $vendor->products()->where('is_active', true)->count(),
                'active_products' => $vendor->products()->where('is_active', true)->count(),
                'total_orders' => $totalOrders,
                'total_sales' => (float) $totalRevenue,
                'average_rating' => round((float) $avgRating, 2),
                'review_count' => (int) ($vendor->review_count ?? 0),
                'recent_orders' => $recentOrders,
                'top_products' => $topProducts,
                'order_status' => $orderStatuses,
                'sales_chart' => $salesChart,
            ],
            'message' => __('vendors.dashboard_retrieved'),
        ]);
    }

    /**
     * Get vendor orders
     */
    public function orders(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;

        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        $perPage = $this->resolvePerPage($request);

        $ordersQuery = \App\Models\Order::whereHas('items.product', function ($q) use ($vendor) {
            $q->where('vendor_id', $vendor->id);
        })
        ->with(['user', 'payment', 'items' => function ($q) use ($vendor) {
            $q->whereHas('product', fn($p) => $p->where('vendor_id', $vendor->id))
              ->with('product');
        }]);

        $search = trim((string) $request->get('search', ''));
        if ($search !== '') {
            $needle = '%' . mb_strtolower($search) . '%';
            $ordersQuery->where(function ($q) use ($needle) {
                $q->whereRaw('LOWER(order_number) LIKE ?', [$needle])
                  ->orWhereHas('user', function ($uq) use ($needle) {
                      $uq->whereRaw('LOWER(name) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$needle]);
                  });
            });
        }

        $status = trim((string) $request->get('status', ''));
        if ($status !== '' && $status !== 'all') {
            $ordersQuery->where('status', $status);
        }

        $orders = $ordersQuery
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => OrderResource::collection($orders->items())->resolve($request),
            'meta' => [
                'total' => $orders->total(),
                'per_page' => $orders->perPage(),
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
            ],
            'message' => __('vendors.orders_retrieved'),
        ]);
    }

    /**
     * Get vendor earnings
     */
    public function earnings(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;

        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }
        
        $totalEarnings = $vendor->products()
            ->join('order_items', 'products.id', '=', 'order_items.product_id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.status', 'delivered')
            ->sum('order_items.total_price');

        $pendingEarnings = $vendor->products()
            ->join('order_items', 'products.id', '=', 'order_items.product_id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->whereIn('orders.status', ['pending', 'confirmed', 'processing'])
            ->sum('order_items.total_price');

        $commissionRate = (float) Cache::get('settings.commission_rate', $vendor->commission_rate ?? 10);
        $minWithdrawal = (float) Cache::get('settings.min_withdrawal', 100);
        $minPayout = (float) Cache::get('settings.min_payout', 100);
        $commissionRatio = max(0, min(100, $commissionRate)) / 100;
        $platformCommission = $totalEarnings * $commissionRatio;
        $vendorNet = $totalEarnings - $platformCommission;

        // ── Chart data based on period ──────────────────────────
        $period = $request->get('period', 'monthly');
        $chartData = $this->buildEarningsChart($vendor, $period, $commissionRatio);

        // ── Period-over-period change ──────────────────────────
        $changePercent = $this->calculateEarningsChange($vendor, $period);

        return response()->json([
            'success' => true,
            'data' => [
                'total_earnings' => (float) $totalEarnings,
                'pending_earnings' => (float) $pendingEarnings,
                'net_earnings' => (float) $vendorNet,
                'paid_earnings' => 0,
                'platform_commission' => (float) $platformCommission,
                'commission_rate' => $commissionRate,
                'min_withdrawal' => $minWithdrawal,
                'min_payout' => $minPayout,
                'chart_data' => $chartData,
                'payouts' => [],
                'change_percent' => $changePercent,
            ],
            'message' => __('vendors.earnings_retrieved'),
        ]);
    }

    /**
     * Update vendor order status
     */
    public function updateOrderStatus(Request $request, $orderId): JsonResponse
    {
        $request->validate([
            'status' => 'required|string|in:confirmed,processing,cancelled',
        ]);

        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }
        $order = \App\Models\Order::whereHas('items.product', function ($q) use ($vendor) {
            $q->where('vendor_id', $vendor->id);
        })->findOrFail($orderId);

        $allowedTransitions = [
            'pending' => ['confirmed', 'processing', 'cancelled'],
            'confirmed' => ['processing', 'cancelled'],
            'processing' => ['cancelled'],
            'shipped' => [],
            'delivered' => [],
            'cancelled' => [],
            'refunded' => [],
        ];

        $currentStatus = (string) $order->status;
        $targetStatus = (string) $request->status;
        if (!in_array($targetStatus, $allowedTransitions[$currentStatus] ?? [], true)) {
            return response()->json([
                'success' => false,
                'message' => __('orders.invalid_status'),
            ], 422);
        }

        $order->update(['status' => $request->status]);

        UserNotification::create([
            'user_id' => $order->user_id,
            'type' => 'order',
            'title' => __('messages.order_status_updated_title'),
            'message' => __('orders.status_updated_notification', [
                'order' => $order->order_number,
                'status' => $request->status,
            ]),
            'link' => '/orders/' . $order->id,
            'meta' => [
                'order_id' => $order->id,
                'status' => $request->status,
            ],
        ]);

        return response()->json([
            'success' => true,
            'data' => $order->fresh(),
            'message' => __('vendors.order_status_updated'),
        ]);
    }

    /**
     * Get vendor reviews
     */
    public function reviews(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        $baseQuery = \App\Models\Review::whereHas('product', function ($q) use ($vendor) {
            $q->where('vendor_id', $vendor->id);
        });

        $listQuery = (clone $baseQuery)
            ->with(['user', 'product'])
            ->latest();

        if ($request->filled('rating')) {
            $listQuery->where('rating', (int) $request->get('rating'));
        }

        $stats = (clone $baseQuery)
            ->selectRaw('COUNT(*) as total_reviews')
            ->selectRaw('COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as average_rating')
            ->selectRaw("SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5")
            ->selectRaw("SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4")
            ->selectRaw("SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3")
            ->selectRaw("SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2")
            ->selectRaw("SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1")
            ->first();

        $reviews = $listQuery->paginate($this->resolvePerPage($request));

        return response()->json([
            'success' => true,
            'data' => $reviews->items(),
            'meta' => [
                'total' => $reviews->total(),
                'per_page' => $reviews->perPage(),
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'stats' => [
                    'average_rating' => (float) ($stats->average_rating ?? 0),
                    'total_reviews' => (int) ($stats->total_reviews ?? 0),
                    'rating_distribution' => [
                        5 => (int) ($stats->rating_5 ?? 0),
                        4 => (int) ($stats->rating_4 ?? 0),
                        3 => (int) ($stats->rating_3 ?? 0),
                        2 => (int) ($stats->rating_2 ?? 0),
                        1 => (int) ($stats->rating_1 ?? 0),
                    ],
                ],
            ],
        ]);
    }

    /**
     * Reply to a review
     */
    public function replyToReview(Request $request, $reviewId): JsonResponse
    {
        $request->validate([
            'reply' => 'required|string|max:2000',
        ]);

        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        $review = \App\Models\Review::whereHas('product', function ($q) use ($vendor) {
            $q->where('vendor_id', $vendor->id);
        })->findOrFail($reviewId);

        $review->update(['vendor_reply' => $request->reply]);

        return response()->json([
            'success' => true,
            'data' => $review->fresh(),
            'message' => __('vendors.reply_posted'),
        ]);
    }

    public function markReviewHelpful(Request $request, $reviewId): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        $review = \App\Models\Review::whereHas('product', function ($q) use ($vendor) {
            $q->where('vendor_id', $vendor->id);
        })->findOrFail($reviewId);

        $review->increment('helpful_count');
        $review->refresh();

        return response()->json([
            'success' => true,
            'data' => $review,
            'message' => __('reviews.helpful_recorded'),
        ]);
    }

    /**
     * Get vendor settings
     */
    public function settings(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new VendorResource($vendor),
        ]);
    }

    /**
     * Update vendor settings
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        if ($request->has('country') && is_array($request->input('country'))) {
            $countryInput = $request->input('country');
            $request->merge([
                'country' => (string) ($countryInput['value'] ?? $countryInput['label'] ?? ''),
            ]);
        }

        $validated = $request->validate([
            'store_name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'email' => 'sometimes|nullable|email|max:255',
            'phone' => 'sometimes|string|max:20',
            'address' => 'sometimes|string|max:500',
            'city' => 'sometimes|string|max:100',
            'state' => 'sometimes|nullable|string|max:100',
            'country' => 'sometimes|string|max:100',
            'postal_code' => 'sometimes|nullable|string|max:20',
            'logo' => 'sometimes|nullable|string',
            'banner' => 'sometimes|nullable|string',
            'bank_name' => 'sometimes|nullable|string|max:255',
            'account_name' => 'sometimes|nullable|string|max:255',
            'account_number' => 'sometimes|nullable|string|max:255',
            'iban' => 'sometimes|nullable|string|max:255',
            'notification_preferences' => 'sometimes|nullable|array',
        ]);

        if (array_key_exists('logo', $validated)) {
            $validated['logo'] = $this->storeVendorImageDataUrl($validated['logo'], 'logo');
        }

        if (array_key_exists('banner', $validated)) {
            $validated['banner'] = $this->storeVendorImageDataUrl($validated['banner'], 'banner');
        }

        $vendor->update($validated);

        return response()->json([
            'success' => true,
            'data' => new VendorResource($vendor->fresh()),
            'message' => __('vendors.settings_updated'),
        ]);
    }

    private function storeVendorImageDataUrl(?string $value, string $type): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (!str_starts_with($value, 'data:image/')) {
            return $value;
        }

        if (!preg_match('/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/i', $value, $matches)) {
            return $value;
        }

        $extension = strtolower($matches[1]);
        if ($extension === 'jpeg') {
            $extension = 'jpg';
        }

        $decoded = base64_decode($matches[2], true);
        if ($decoded === false) {
            return $value;
        }

        $path = 'vendors/' . $type . '/' . Str::uuid() . '.' . $extension;
        Storage::disk('public')->put($path, $decoded);

        return Storage::url($path);
    }

    /**
     * Get vendor products (for merchant panel)
     */
    public function vendorProducts(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        $productsQuery = $vendor->products()
            ->with(['category', 'brand', 'variants', 'wholesaleProduct', 'latestReconsideration'])
            ->withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->where(function ($query) {
                $query->whereNull('moderation_note')
                    ->orWhereNotIn('moderation_note', ['Removed by merchant', 'Removed by admin']);
            });

        $search = trim((string) $request->get('search', ''));
        if ($search !== '') {
            $productsQuery->where(function ($query) use ($search) {
                $query->where('name', 'ILIKE', "%{$search}%")
                    ->orWhere('sku', 'ILIKE', "%{$search}%")
                    ->orWhere('description', 'ILIKE', "%{$search}%");
            });
        }

        $status = strtolower((string) $request->get('status', 'all'));
        if ($status === 'approved' || $status === 'active') {
            $productsQuery->where('moderation_status', 'approved')
                ->where(function ($query) {
                    $query->whereNull('pending_update_status')
                        ->orWhere('pending_update_status', '!=', 'pending');
                });
        } elseif ($status === 'pending' || $status === 'draft') {
            $productsQuery->where(function ($query) {
                $query->where('moderation_status', 'pending')
                    ->orWhere('pending_update_status', 'pending');
            });
        } elseif ($status === 'rejected' || $status === 'inactive') {
            $productsQuery->where(function ($query) {
                $query->where('moderation_status', 'rejected')
                    ->orWhere('pending_update_status', 'rejected');
            });
        }

        $products = $productsQuery
            ->latest()
            ->paginate($this->resolvePerPage($request));

        return response()->json([
            'success' => true,
            'data' => \App\Http\Resources\ProductResource::collection($products),
            'meta' => [
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
            ],
        ]);
    }

    /**
     * Get a single vendor product (for merchant edit form)
     */
    public function vendorProduct(Request $request, int $productId): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        $product = $vendor->products()
            ->with(['category', 'brand', 'variants', 'wholesaleProduct', 'latestReconsideration'])
            ->withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->findOrFail($productId);

        return response()->json([
            'success' => true,
            'data' => new \App\Http\Resources\ProductResource($product),
            'message' => __('products.retrieved'),
        ]);
    }

    /**
     * Get active brands (for merchant product forms)
     */
    public function brands(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => __('vendors.not_found'),
            ], 404);
        }

        $brands = Brand::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        return response()->json([
            'success' => true,
            'data' => $brands,
        ]);
    }

    /**
     * Show vendor by slug (public)
     */
    public function showBySlug($slug): JsonResponse
    {
        $vendor = Vendor::where('slug', $slug)
            ->where('is_active', true)
            ->withCount([
                'products' => function ($query) {
                    $query->where('is_active', true);
                },
            ])
            ->with('user')
            ->firstOrFail();

        // ── Compute review stats ────────────────────────────────
        $reviewStats = \App\Models\Review::whereHas('product', function ($q) use ($vendor) {
            $q->where('vendor_id', $vendor->id);
        })->where('is_approved', true)
          ->selectRaw('COUNT(*) as total')
          ->selectRaw('COALESCE(AVG(rating), 0) as avg_rating')
          ->selectRaw("SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive")
          ->first();

        $totalReviews = (int) ($reviewStats->total ?? 0);
        $avgRating = round((float) ($reviewStats->avg_rating ?? 0), 2);
        $positiveRating = $totalReviews > 0
            ? round(((int) ($reviewStats->positive ?? 0) / $totalReviews) * 100)
            : null;

        // ── Ship-on-time: orders with items from this vendor that were
        //    shipped within the vendor's processing_time (days) of creation ──
        $processingDays = max(1, (int) ($vendor->processing_time ?? 3));
        $totalVendorOrders = \App\Models\Order::whereHas('items.product', function ($q) use ($vendor) {
            $q->where('vendor_id', $vendor->id);
        })->whereIn('status', ['shipped', 'delivered'])->count();

        $shippedOnTime = $totalVendorOrders > 0
            ? \App\Models\Order::whereHas('items.product', function ($q) use ($vendor) {
                $q->where('vendor_id', $vendor->id);
            })->whereIn('status', ['shipped', 'delivered'])
              ->whereNotNull('shipped_at')
              ->whereRaw('shipped_at <= created_at + INTERVAL \'' . $processingDays . ' days\'')
              ->count()
            : 0;
        $shipOnTime = $totalVendorOrders > 0
            ? round(($shippedOnTime / $totalVendorOrders) * 100)
            : null;

        // ── Response rate: conversations where vendor has sent at least one reply ──
        $totalConversations = \App\Models\Conversation::where('vendor_id', $vendor->id)->count();
        $repliedConversations = $totalConversations > 0
            ? \App\Models\Conversation::where('vendor_id', $vendor->id)
                ->whereHas('messages', function ($q) use ($vendor) {
                    $q->where('sender_id', $vendor->user_id);
                })->count()
            : 0;
        $responseRate = $totalConversations > 0
            ? round(($repliedConversations / $totalConversations) * 100)
            : null;

        // Attach computed stats to vendor so VendorResource can expose them
        $vendor->setAttribute('review_count', $totalReviews);
        $vendor->setAttribute('computed_rating', $avgRating);
        $vendor->setAttribute('positive_rating', $positiveRating);
        $vendor->setAttribute('ship_on_time', $shipOnTime);
        $vendor->setAttribute('response_rate', $responseRate);

        return response()->json([
            'success' => true,
            'data' => new VendorResource($vendor),
        ]);
    }

    /**
     * Get vendor products by slug (public)
     */
    public function vendorProductsBySlug(Request $request, $slug): JsonResponse
    {
        $vendor = Vendor::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $products = $vendor->products()
            ->where('is_active', true)
            ->with('category', 'variants')
            ->withCount(['reviews' => function ($query) {
                $query->where('is_approved', true);
            }])
            ->withAvg(['reviews' => function ($query) {
                $query->where('is_approved', true);
            }], 'rating')
            ->paginate($this->resolvePerPage($request, 12));

        return response()->json([
            'success' => true,
            'data' => \App\Http\Resources\ProductResource::collection($products),
            'meta' => [
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
            ],
        ]);
    }

    private function buildEarningsChart(Vendor $vendor, string $period, float $commissionRatio): array
    {
        $chartData = [];
        $now = now();

        if ($period === 'weekly') {
            // Last 8 weeks
            for ($i = 7; $i >= 0; $i--) {
                $start = $now->copy()->subWeeks($i)->startOfWeek();
                $end = $start->copy()->endOfWeek();
                $revenue = $this->vendorRevenueBetween($vendor, $start, $end);
                $chartData[] = [
                    'month' => $start->format('M d'),
                    'revenue' => round($revenue, 2),
                    'net' => round($revenue * (1 - $commissionRatio), 2),
                ];
            }
        } elseif ($period === 'yearly') {
            // Last 5 years
            for ($i = 4; $i >= 0; $i--) {
                $start = $now->copy()->subYears($i)->startOfYear();
                $end = $start->copy()->endOfYear();
                $revenue = $this->vendorRevenueBetween($vendor, $start, $end);
                $chartData[] = [
                    'month' => $start->format('Y'),
                    'revenue' => round($revenue, 2),
                    'net' => round($revenue * (1 - $commissionRatio), 2),
                ];
            }
        } else {
            // Monthly - last 12 months
            for ($i = 11; $i >= 0; $i--) {
                $start = $now->copy()->subMonths($i)->startOfMonth();
                $end = $start->copy()->endOfMonth();
                $revenue = $this->vendorRevenueBetween($vendor, $start, $end);
                $chartData[] = [
                    'month' => $start->format('M Y'),
                    'revenue' => round($revenue, 2),
                    'net' => round($revenue * (1 - $commissionRatio), 2),
                ];
            }
        }

        return $chartData;
    }

    private function vendorRevenueBetween(Vendor $vendor, $start, $end): float
    {
        return (float) $vendor->products()
            ->join('order_items', 'products.id', '=', 'order_items.product_id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.status', 'delivered')
            ->whereBetween('orders.created_at', [$start, $end])
            ->sum('order_items.total_price');
    }

    private function calculateEarningsChange(Vendor $vendor, string $period): string
    {
        $now = now();

        if ($period === 'weekly') {
            $currentStart = $now->copy()->startOfWeek();
            $previousStart = $now->copy()->subWeek()->startOfWeek();
            $previousEnd = $now->copy()->subWeek()->endOfWeek();
        } elseif ($period === 'yearly') {
            $currentStart = $now->copy()->startOfYear();
            $previousStart = $now->copy()->subYear()->startOfYear();
            $previousEnd = $now->copy()->subYear()->endOfYear();
        } else {
            $currentStart = $now->copy()->startOfMonth();
            $previousStart = $now->copy()->subMonth()->startOfMonth();
            $previousEnd = $now->copy()->subMonth()->endOfMonth();
        }

        $current = $this->vendorRevenueBetween($vendor, $currentStart, $now);
        $previous = $this->vendorRevenueBetween($vendor, $previousStart, $previousEnd);

        if ($previous <= 0) {
            return $current > 0 ? '+100%' : '0%';
        }

        $change = (($current - $previous) / $previous) * 100;
        $sign = $change >= 0 ? '+' : '';

        return $sign . round($change, 1) . '%';
    }

    private function resolvePerPage(Request $request, int $default = 15): int
    {
        return min(max((int) $request->get('per_page', $default), 1), 100);
    }

    // ─── Payout Requests ────────────────────────────────────────────────────────

    public function requestPayout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'notes'  => 'nullable|string|max:1000',
        ]);

        $vendor = $request->user()->vendor;

        if (!$vendor) {
            return response()->json(['success' => false, 'message' => 'Vendor profile not found.'], 422);
        }

        // Prevent duplicate pending requests
        if ($vendor->payoutRequests()->where('status', VendorPayoutRequest::STATUS_PENDING)->exists()) {
            return response()->json([
                'success' => false,
                'message' => __('vendor.payout_already_pending'),
            ], 422);
        }

        $payoutRequest = $vendor->payoutRequests()->create([
            'amount' => $validated['amount'],
            'notes'  => $validated['notes'] ?? null,
            'status' => VendorPayoutRequest::STATUS_PENDING,
        ]);

        // Notify admins
        $adminIds = \App\Models\User::query()->role('admin')->pluck('id');
        foreach ($adminIds as $adminId) {
            UserNotification::create([
                'user_id' => (int) $adminId,
                'type'    => 'payout',
                'title'   => 'New Payout Request',
                'message' => "Vendor {$vendor->store_name} requested a payout of " . number_format((float) $validated['amount'], 2),
                'link'    => '/admin/payouts',
                'meta'    => ['payout_request_id' => $payoutRequest->id],
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => $payoutRequest,
            'message' => __('vendor.payout_request_submitted'),
        ]);
    }

    public function payoutRequests(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;

        if (!$vendor) {
            return response()->json(['success' => false, 'message' => 'Vendor profile not found.'], 422);
        }

        $requests = $vendor->payoutRequests()
            ->latest()
            ->paginate($this->resolvePerPage($request, 10));

        return response()->json([
            'success' => true,
            'data'    => $requests,
        ]);
    }
}

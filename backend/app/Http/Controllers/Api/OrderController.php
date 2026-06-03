<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\RefundResource;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\OrderService;
use App\Services\RefundService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Throwable;

class OrderController extends Controller
{
    public function __construct(
        private OrderService $orderService,
        private RefundService $refundService,
    ) {
    }

    /**
     * Display a listing of user's orders
     */
    public function index(Request $request): JsonResponse
    {
        $query = auth()->user()->orders()
            ->with(['items.product.vendor', 'payment', 'shipments']);

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Search by order number
        if ($request->filled('search')) {
            $query->where('order_number', 'ilike', '%' . $request->search . '%');
        }

        $orders = $query->latest()
            ->paginate(min(max((int) $request->get('per_page', 15), 1), 100));

        return response()->json([
            'success' => true,
            'data' => OrderResource::collection($orders),
            'meta' => [
                'total' => $orders->total(),
                'per_page' => $orders->perPage(),
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
            ],
        ]);
    }

    /**
     * Create a new order
     */
    public function store(StoreOrderRequest $request): JsonResponse
    {
        try {
            $actingUser = $request->user();
            $orderUser = $actingUser;
            $isPosOrder = strtoupper(trim((string) $request->input('shipping_method', ''))) === 'POS';
            $requestedCustomerId = $request->filled('customer_id')
                ? (int) $request->input('customer_id')
                : null;

            $canActForCustomer = $actingUser->isSystemAdminAccount()
                || $actingUser->hasAnyRole(['admin', 'staff'])
                || $actingUser->hasAnyPermission(['use-pos', 'update-orders']);

            if ($requestedCustomerId !== null && $canActForCustomer) {
                $orderUser = User::query()->findOrFail($requestedCustomerId);
            }

            // Resolve shipping address — always prefer structured data from address_id
            $shippingAddress = null;
            if ($request->address_id) {
                $address = $orderUser->addresses()->findOrFail($request->address_id);
                $shippingAddress = [
                    'name' => trim(($address->first_name ?? '') . ' ' . ($address->last_name ?? '')),
                    'phone' => $address->phone,
                    'address_line_1' => $address->address_line_1,
                    'address_line_2' => $address->address_line_2,
                    'city' => $address->city,
                    'state' => $address->state,
                    'postal_code' => $address->postal_code,
                    'country' => $address->country,
                ];
            }

            // POS/admin orders should use the selected customer's saved address when available.
            if (!$shippingAddress && $requestedCustomerId !== null && $canActForCustomer) {
                $customerAddress = $orderUser->addresses()
                    ->orderByDesc('is_default')
                    ->orderBy('id')
                    ->first();

                if ($customerAddress) {
                    $shippingAddress = [
                        'name' => trim(($customerAddress->first_name ?? '') . ' ' . ($customerAddress->last_name ?? '')),
                        'phone' => $customerAddress->phone,
                        'address_line_1' => $customerAddress->address_line_1,
                        'address_line_2' => $customerAddress->address_line_2,
                        'city' => $customerAddress->city,
                        'state' => $customerAddress->state,
                        'postal_code' => $customerAddress->postal_code,
                        'country' => $customerAddress->country,
                    ];
                } elseif ($isPosOrder) {
                    throw new \RuntimeException('Selected customer has no saved address.');
                }
            }

            if (!$shippingAddress && $request->shipping_address) {
                $raw = $request->shipping_address;
                $shippingAddress = is_array($raw) ? $raw : ['full_address' => $raw];
            }

            // Compute subtotal from database prices & validate stock
            $subtotal = 0;
            foreach ($request->items as $item) {
                $product = \App\Models\Product::findOrFail($item['product_id']);

                // Check stock availability
                $variant = !empty($item['variant_id'])
                    ? \App\Models\ProductVariant::where('product_id', $product->id)->find($item['variant_id'])
                    : null;

                $availableStock = $variant
                    ? (int) ($variant->stock_quantity ?? 0)
                    : (int) ($product->stock_quantity ?? 0);
                if ($availableStock < $item['quantity']) {
                    return response()->json([
                        'success' => false,
                        'message' => __('orders.insufficient_stock', ['product' => $product->name]),
                    ], 422);
                }

                $unitPrice = $variant ? $variant->price : $product->price;
                $subtotal += $item['quantity'] * $unitPrice;
            }

            $couponCode = trim((string) ($request->coupon_code ?? ''));

            $shippingMethod = trim((string) ($request->shipping_method ?? ''));
            $shippingZone = trim((string) ($request->shipping_zone ?? ''));
            $shippingMinDays = $request->shipping_min_days !== null ? (int) $request->shipping_min_days : null;
            $shippingMaxDays = $request->shipping_max_days !== null ? (int) $request->shipping_max_days : null;
            $customerNotes = trim((string) ($request->notes ?? ''));
            $shippingAmount = $this->resolveShippingAmount($subtotal, $shippingMethod, $request->items);
            $taxRate = max(0, (float) Cache::get('settings.tax_rate', 0));
            $taxAmount = round(($subtotal * $taxRate) / 100, 2);
            $currency = strtoupper((string) Cache::get('settings.currency', config('app.currency', 'EGP')));

            $requestedPaymentMethod = strtolower((string) ($request->payment_method ?? 'cod'));
            $gatewayEnabledByMethod = [
                'cod' => (bool) Cache::get('settings.cod_enabled', true),
                'paypal' => (bool) Cache::get('settings.paypal_enabled', false),
                'stripe' => (bool) Cache::get('settings.stripe_enabled', false),
                'credit_card' => (bool) Cache::get('settings.stripe_enabled', false),
                'wallet' => true,
                'wallet+cod' => (bool) Cache::get('settings.cod_enabled', true),
            ];
            if (array_key_exists($requestedPaymentMethod, $gatewayEnabledByMethod) && !$gatewayEnabledByMethod[$requestedPaymentMethod]) {
                return response()->json([
                    'success' => false,
                    'message' => __('messages.payment_method_disabled'),
                ], 422);
            }

            // Prepare order data
            $orderData = [
                'items' => $request->items,
                'user_id' => $orderUser->id,
                'customer_email' => $orderUser->email,
                'customer_phone' => $orderUser->phone,
                'shipping_address' => $shippingAddress ?: ['full_address' => 'N/A'],
                'billing_address' => $request->billing_address ?: ($shippingAddress ?: ['full_address' => 'N/A']),
                'payment_method' => $request->payment_method,
                'wallet_amount' => $request->wallet_amount ? (float) $request->wallet_amount : null,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'shipping_amount' => $shippingAmount,
                'shipping_method' => $shippingMethod !== '' ? $shippingMethod : null,
                'shipping_zone' => $shippingZone !== '' ? $shippingZone : null,
                'shipping_min_days' => $shippingMinDays,
                'shipping_max_days' => $shippingMaxDays,
                'discount_amount' => 0,
                'notes' => $customerNotes !== '' ? $customerNotes : null,
                'currency' => $currency,
            ];
            $orderData['total'] = $orderData['subtotal'] + $orderData['tax_amount'] + $orderData['shipping_amount'] - $orderData['discount_amount'];

            // Create order and apply coupon atomically with server-side locking/validation
            $order = DB::transaction(function () use ($orderData, $couponCode, $subtotal) {
                $coupon = null;
                $discountAmount = 0;

                if ($couponCode !== '') {
                    $coupon = Coupon::query()
                        ->whereRaw('UPPER(code) = ?', [strtoupper($couponCode)])
                        ->lockForUpdate()
                        ->first();

                    if (!$coupon || !$coupon->isValid()) {
                        throw new \RuntimeException(__('messages.coupon_invalid'));
                    }

                    if ($coupon->min_order_amount !== null && $subtotal < (float) $coupon->min_order_amount) {
                        throw new \RuntimeException(__('messages.coupon_min_order_not_met'));
                    }

                    $discountAmount = $coupon->calculateDiscount($subtotal);
                }

                $orderData['discount_amount'] = $discountAmount;
                $orderData['total'] = $orderData['subtotal'] + $orderData['tax_amount'] + $orderData['shipping_amount'] - $orderData['discount_amount'];

                $createdOrder = $this->orderService->createOrder($orderData);

                if ($coupon) {
                    $coupon->increment('usage_count');
                    $createdOrder->update(['coupon_id' => $coupon->id]);
                }

                return $createdOrder;
            });

            // Create notifications for customer and merchants participating in this order
            UserNotification::create([
                'user_id' => $order->user_id,
                'type' => 'order',
                'title' => __('messages.order_placed_title'),
                'message' => __('orders.placed_notification', ['order' => $order->order_number]),
                'link' => '/orders/' . $order->id,
                'meta' => ['order_id' => $order->id],
            ]);

            $vendorUserIds = $order->items()
                ->join('products', 'order_items.product_id', '=', 'products.id')
                ->join('vendors', 'products.vendor_id', '=', 'vendors.id')
                ->pluck('vendors.user_id')
                ->unique()
                ->filter();

            foreach ($vendorUserIds as $vendorUserId) {
                UserNotification::create([
                    'user_id' => $vendorUserId,
                    'type' => 'order',
                    'title' => __('messages.new_order_received_title'),
                    'message' => __('orders.new_order_vendor_notification', ['order' => $order->order_number]),
                    'link' => '/merchant/orders',
                    'meta' => ['order_id' => $order->id],
                ]);
            }

            $hasSystemAdminProducts = $order->items()
                ->join('products', 'order_items.product_id', '=', 'products.id')
                ->whereNull('products.vendor_id')
                ->exists();

            if ($hasSystemAdminProducts) {
                $systemAdminId = User::resolveSystemAdminId();
                if ($systemAdminId) {
                    UserNotification::create([
                        'user_id' => $systemAdminId,
                        'type' => 'order',
                        'title' => __('messages.new_order_received_title'),
                        'message' => __('orders.new_order_vendor_notification', ['order' => $order->order_number]),
                        'link' => '/admin/orders',
                        'meta' => [
                            'order_id' => $order->id,
                            'scope' => 'system_admin_product',
                        ],
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'data' => new OrderResource($order),
                'message' => __('orders.created'),
            ], 201);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => __('messages.not_found'),
            ], 404);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => __('messages.server_error'),
            ], 500);
        }
    }

    /**
     * Display the specified order
     */
    public function show(Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        $order->load(['items.product.vendor', 'payment', 'shipments', 'user', 'refunds']);

        return response()->json([
            'success' => true,
            'data' => new OrderResource($order),
        ]);
    }

    /**
     * Cancel an order
     */
    public function cancel(Order $order): JsonResponse
    {
        try {
            $this->authorize('view', $order);

            $this->orderService->cancelOrder($order);

            $order->load(['items.product.vendor', 'payment', 'shipments']);

            return response()->json([
                'success' => true,
                'data' => new OrderResource($order),
                'message' => __('orders.cancelled'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Request refund for an order item
     */
    public function requestRefund(Request $request, Order $order): JsonResponse
    {
        try {
            $this->authorize('view', $order);

            $validated = $request->validate([
                'order_item_id' => 'nullable|exists:order_items,id',
                'reason' => 'required|string|min:10',
                'reason_type' => 'nullable|string|in:other,damaged,wrong_item,not_as_described,late_delivery,order_cancelled',
            ]);

            $orderItemsQuery = $order->items();
            if (!empty($validated['order_item_id'])) {
                $orderItemsQuery->whereKey($validated['order_item_id']);
            }

            $orderItem = $orderItemsQuery
                ->orderBy('id')
                ->first();

            if (!$orderItem) {
                return response()->json([
                    'success' => false,
                    'message' => __('messages.invalid_input'),
                ], 422);
            }

            $refund = $this->refundService->requestRefund(
                $orderItem,
                $validated['reason'],
                (string) ($validated['reason_type'] ?? 'other')
            );

            $refund->load(['orderItem', 'order']);

            return response()->json([
                'success' => true,
                'data' => new RefundResource($refund),
                'message' => __('refunds.requested'),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    private function resolveShippingAmount(float $subtotal, ?string $selectedMethod, array $items = []): float
    {
        $shippingFee = (float) Cache::get('settings.shipping_fee', 50);
        $freeShippingEnabledRaw = Cache::get('settings.free_shipping_threshold_enabled', true);
        $freeShippingThreshold = (float) Cache::get('settings.free_shipping_threshold', 0);
        $shippingMethods = Cache::get('settings.shipping_methods', []);

        $freeShippingEnabled = filter_var($freeShippingEnabledRaw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($freeShippingEnabled === null) {
            $freeShippingEnabled = (bool) $freeShippingEnabledRaw;
        }

        $resolvedAmount = $shippingFee;
        $methodName = trim((string) ($selectedMethod ?? ''));

        if ($methodName !== '' && is_array($shippingMethods)) {
            foreach ($shippingMethods as $method) {
                if (!is_array($method)) {
                    continue;
                }

                if (trim((string) ($method['name'] ?? '')) === $methodName) {
                    $resolvedAmount = (float) ($method['cost'] ?? $shippingFee);
                    break;
                }
            }
        }

        if ($freeShippingEnabled && $freeShippingThreshold > 0 && $subtotal >= $freeShippingThreshold) {
            return 0.0;
        }

        if ($resolvedAmount <= 0 && !empty($items)) {
            $productIds = collect($items)
                ->pluck('product_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();

            if ($productIds->isNotEmpty()) {
                $products = \App\Models\Product::query()
                    ->with('vendor')
                    ->whereIn('id', $productIds)
                    ->get()
                    ->keyBy('id');
                $vendorsById = $products
                    ->pluck('vendor')
                    ->filter()
                    ->keyBy(fn ($vendor) => (int) $vendor->id);

                $vendorSubtotals = [];
                foreach ($items as $item) {
                    $productId = (int) ($item['product_id'] ?? 0);
                    $quantity = max(1, (int) ($item['quantity'] ?? 1));
                    $product = $products->get($productId);
                    if (!$product || !$product->vendor) {
                        continue;
                    }

                    $vendorId = (int) $product->vendor->id;
                    $lineTotal = (float) $product->price * $quantity;
                    $vendorSubtotals[$vendorId] = ($vendorSubtotals[$vendorId] ?? 0) + $lineTotal;
                }

                $vendorShipping = 0.0;
                foreach ($vendorSubtotals as $vendorId => $vendorSubtotal) {
                    $vendor = $vendorsById->get((int) $vendorId);
                    if (!$vendor) {
                        continue;
                    }

                    $isFreeEnabled = (bool) ($vendor->free_shipping_enabled ?? false);
                    $freeMinimum = (float) ($vendor->free_shipping_minimum ?? 0);
                    $standardRate = (float) ($vendor->standard_shipping_rate ?? 0);

                    if ($isFreeEnabled && $freeMinimum > 0 && $vendorSubtotal >= $freeMinimum) {
                        continue;
                    }

                    $vendorShipping += max(0, $standardRate);
                }

                $resolvedAmount = $vendorShipping;
            }
        }

        return max(0, $resolvedAmount);
    }
}

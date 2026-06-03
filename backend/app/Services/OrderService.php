<?php

namespace App\Services;

use App\Events\OrderCreated;
use App\Events\OrderShipped;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Wallet;
use App\Models\UserNotification;
use App\Services\LoyaltyPointService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class OrderService
{
    private function normalizeGatewayTransactionId(mixed $gatewayTransactionId): ?string
    {
        $normalized = trim((string) ($gatewayTransactionId ?? ''));

        return $normalized !== '' ? $normalized : null;
    }

    /**
     * Create an order from cart items
     */
    public function createOrder(array $orderData): Order
    {
        $actingUser = auth()->user();
        $orderUserId = (int) ($orderData['user_id'] ?? $actingUser?->id ?? 0);

        if ($orderUserId <= 0) {
            throw new \RuntimeException(__('messages.not_found'));
        }

        $orderUser = $actingUser && (int) $actingUser->id === $orderUserId
            ? $actingUser
            : User::query()->findOrFail($orderUserId);

        return DB::transaction(function () use ($orderData, $orderUser) {
            $shippingAmount = (float) ($orderData['shipping_amount'] ?? 0);
            $taxAmount = (float) ($orderData['tax_amount'] ?? 0);
            $discountAmount = (float) ($orderData['discount_amount'] ?? 0);

            $order = Order::create([
                'user_id' => $orderUser->id,
                'order_number' => $this->generateOrderNumber(),
                'status' => 'pending',
                'shipping_address' => $orderData['shipping_address'],
                'billing_address' => $orderData['billing_address'] ?? $orderData['shipping_address'],
                'customer_email' => $orderData['customer_email'] ?? $orderUser->email,
                'customer_phone' => $orderData['customer_phone'] ?? $orderUser->phone,
                'subtotal' => 0,
                'tax_amount' => $taxAmount,
                'shipping_amount' => $shippingAmount,
                'shipping_method' => $orderData['shipping_method'] ?? null,
                'shipping_zone' => $orderData['shipping_zone'] ?? null,
                'shipping_min_days' => $orderData['shipping_min_days'] ?? null,
                'shipping_max_days' => $orderData['shipping_max_days'] ?? null,
                'discount_amount' => $discountAmount,
                'total' => 0,
                'currency' => strtoupper((string) ($orderData['currency'] ?? config('app.currency', 'EGP'))),
                'notes' => $orderData['notes'] ?? null,
            ]);

            $calculatedSubtotal = 0;

            foreach ($orderData['items'] as $item) {
                $quantity = (int) ($item['quantity'] ?? 0);
                if ($quantity < 1) {
                    throw new \Exception(__('cart.invalid_quantity'));
                }

                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                $variantId = $item['product_variant_id'] ?? $item['variant_id'] ?? null;
                $variant = $variantId
                    ? ProductVariant::where('product_id', $product->id)->lockForUpdate()->find($variantId)
                    : null;

                $unitPrice = $variant ? $variant->price : $product->price;
                $lineTotal = $quantity * $unitPrice;

                if ($variant && $variant->track_inventory && $variant->stock_quantity < $quantity) {
                    throw new \Exception(__('cart.insufficient_stock'));
                }

                if (!$variant && $product->track_inventory && $product->stock_quantity < $quantity) {
                    throw new \Exception(__('cart.insufficient_stock'));
                }

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'product_variant_id' => $variant?->id,
                    'product_name' => $product->name,
                    'product_sku' => $variant ? $variant->sku : $product->sku,
                    'variant_name' => $variant?->name,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'total_price' => $lineTotal,
                    'product_attributes' => $variant?->attributes,
                ]);

                $calculatedSubtotal += $lineTotal;

                if ($variant && $variant->track_inventory) {
                    $variant->decrement('stock_quantity', $quantity);
                    $variant->refresh();
                    $this->notifyLowStockIfNeeded($product, (int) $variant->stock_quantity);
                } elseif ($product->track_inventory) {
                    $product->decrement('stock_quantity', $quantity);
                    $product->refresh();
                    $this->notifyLowStockIfNeeded($product, (int) $product->stock_quantity);
                }

                $product->increment('sold_count', $quantity);
            }

            $calculatedTotal = $calculatedSubtotal + $taxAmount + $shippingAmount - $discountAmount;
            $order->update([
                'subtotal' => $calculatedSubtotal,
                'total' => max(0, $calculatedTotal),
            ]);

            $paymentMethod = (string) ($orderData['payment_method'] ?? 'cod');
            $paymentStatus = 'pending';
            $walletAmountDeducted = 0;

            if ($paymentMethod === 'wallet' || $paymentMethod === 'wallet+cod') {
                $orderTotal = (float) $order->fresh()->total;
                $requestedWalletAmount = isset($orderData['wallet_amount'])
                    ? (float) $orderData['wallet_amount']
                    : $orderTotal;

                $wallet = Wallet::query()
                    ->where('user_id', $orderUser->id)
                    ->lockForUpdate()
                    ->first();

                if (!$wallet || !$wallet->is_active) {
                    throw new \RuntimeException('Wallet is not available.');
                }

                $walletAmountDeducted = min($requestedWalletAmount, (float) $wallet->balance, $orderTotal);

                if ($paymentMethod === 'wallet' && $walletAmountDeducted < $orderTotal) {
                    throw new \RuntimeException('Insufficient wallet balance.');
                }

                if ($walletAmountDeducted > 0) {
                    $wallet->decrement('balance', $walletAmountDeducted);
                    $wallet->increment('total_spent', $walletAmountDeducted);
                    $wallet->refresh();

                    $wallet->transactions()->create([
                        'type' => 'purchase',
                        'amount' => -$walletAmountDeducted,
                        'balance_after' => $wallet->balance,
                        'description' => 'Order payment ' . $order->order_number,
                        'reference' => 'order:' . $order->id,
                    ]);
                }

                if ($walletAmountDeducted >= $orderTotal) {
                    $paymentStatus = 'completed';
                }
                // For wallet+cod, remaining amount is paid via COD (status stays pending)
            }

            Payment::create([
                'order_id' => $order->id,
                'user_id' => $orderUser->id,
                'payment_method' => $paymentMethod,
                'gateway_transaction_id' => $this->normalizeGatewayTransactionId($orderData['gateway_transaction_id'] ?? null),
                'amount' => $order->fresh()->total,
                'currency' => strtoupper((string) ($orderData['currency'] ?? config('app.currency', 'EGP'))),
                'status' => $paymentStatus,
                'notes' => $walletAmountDeducted > 0 && $paymentMethod === 'wallet+cod'
                    ? 'Wallet: ' . number_format($walletAmountDeducted, 2) . ', COD: ' . number_format(max(0, (float) $order->fresh()->total - $walletAmountDeducted), 2)
                    : null,
            ]);

            OrderCreated::dispatch($order);

            return $order->load('items', 'payment');
        });
    }

    /**
     * Generate unique order number
     */
    private function generateOrderNumber(): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $candidate = 'ORD-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(6)), 0, 12));

            if (!Order::query()->where('order_number', $candidate)->exists()) {
                return $candidate;
            }
        }

        return 'ORD-' . date('YmdHis') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    }

    /**
     * Cancel an order
     */
    public function cancelOrder(Order $order): bool
    {
        if (!in_array($order->status, ['pending', 'confirmed', 'processing'])) {
            throw new \Exception(__('orders.cannot_cancel'));
        }

        DB::transaction(function () use ($order) {
            $order->loadMissing('items.product', 'items.variant', 'payment');

            foreach ($order->items as $item) {
                if ($item->variant && $item->variant->track_inventory) {
                    $item->variant->increment('stock_quantity', $item->quantity);
                } elseif ($item->product && $item->product->track_inventory) {
                    $item->product->increment('stock_quantity', $item->quantity);
                }

                if ($item->product) {
                    Product::query()
                        ->whereKey($item->product->id)
                        ->update([
                            'sold_count' => DB::raw('GREATEST(sold_count - ' . (int) $item->quantity . ', 0)'),
                        ]);
                }
            }

            $order->update(['status' => 'cancelled']);

            if ($order->payment && $order->payment->status === 'completed') {
                app(RefundService::class)->initiateRefund($order);
            }
        });

        return true;
    }

    /**
     * Update order status
     */
    public function updateOrderStatus(Order $order, string $status): void
    {
        $validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        
        if (!in_array($status, $validStatuses)) {
            throw new \Exception(__('orders.invalid_status'));
        }

        $order->update(['status' => $status]);

        if ($status === 'shipped') {
            OrderShipped::dispatch($order);
        }

        // Award loyalty points when order is delivered
        if ($status === 'delivered') {
            try {
                app(LoyaltyPointService::class)->awardPointsForOrder($order);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Failed to award loyalty points', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    private function notifyLowStockIfNeeded(Product $product, int $currentStock): void
    {
        if (!(bool) Cache::get('settings.notify_low_stock', true)) {
            return;
        }

        $globalThreshold = max(0, (int) Cache::get('settings.low_stock_threshold', 0));
        $productThreshold = max(0, (int) ($product->min_stock_level ?? 0));
        $effectiveThreshold = max($globalThreshold, $productThreshold);

        if ($effectiveThreshold <= 0 || $currentStock > $effectiveThreshold) {
            return;
        }

        $adminIds = User::query()->role('admin')->pluck('id');
        foreach ($adminIds as $adminId) {
            UserNotification::create([
                'user_id' => (int) $adminId,
                'type' => 'inventory',
                'title' => 'Low stock alert',
                'message' => sprintf('%s is low on stock (%d remaining).', (string) $product->name, $currentStock),
                'link' => '/admin/products',
                'meta' => [
                    'product_id' => $product->id,
                    'stock_quantity' => $currentStock,
                    'threshold' => $effectiveThreshold,
                ],
            ]);
        }
    }
}

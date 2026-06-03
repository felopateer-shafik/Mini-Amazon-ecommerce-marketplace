<?php

namespace App\Services;

use App\Events\RefundRequested;
use App\Models\Order;
use App\Models\Refund;
use App\Models\OrderItem;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RefundService
{
    /**
     * Request a refund for an order item
     */
    public function requestRefund(OrderItem $orderItem, string $reason, string $reasonType = 'other'): Refund
    {
        $order = $orderItem->order;

        if (!$order?->payment || (string) $order->payment->status !== 'completed') {
            throw new \Exception('Refund is only available after payment is completed.');
        }

        $allowedReasonTypes = ['other', 'damaged', 'wrong_item', 'not_as_described', 'late_delivery', 'order_cancelled'];
        $normalizedReasonType = in_array($reasonType, $allowedReasonTypes, true) ? $reasonType : 'other';

        // Check if already refunded
        $existing = Refund::where('order_id', $order->id)
            ->where('order_item_id', $orderItem->id)
            ->whereIn('status', ['pending', 'approved', 'processed'])
            ->first();

        if ($existing) {
            throw new \Exception(__('refunds.already_refunded'));
        }

        $refund = Refund::create([
            'order_id' => $order->id,
            'order_item_id' => $orderItem->id,
            'user_id' => $order->user_id,
            'reason' => $normalizedReasonType,
            'reason_description' => $reason,
            'refund_amount' => $orderItem->total_price,
            'currency' => $order->currency ?? (string) config('app.currency', 'EGP'),
            'status' => 'pending',
        ]);

        RefundRequested::dispatch($refund);

        return $refund;
    }

    /**
     * Approve a refund request
     */
    public function approveRefund(Refund $refund): void
    {
        $refund->update(['status' => 'approved']);
    }

    /**
     * Reject a refund request
     */
    public function rejectRefund(Refund $refund, string $notes): void
    {
        $refund->update([
            'status' => 'rejected',
            'admin_notes' => $notes,
        ]);
    }

    /**
     * Complete refund and update wallet
     */
    public function completeRefund(Refund $refund): void
    {
        DB::transaction(function () use ($refund): void {
            $lockedRefund = Refund::query()
                ->whereKey($refund->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedRefund->status === 'processed' && $lockedRefund->processed_at) {
                return;
            }

            $order = $lockedRefund->order;
            $orderItem = $lockedRefund->orderItem()->with(['product', 'variant'])->first();

            $lockedRefund->update([
                'status' => 'processed',
                'processed_at' => now(),
            ]);

            if ($orderItem) {
                if ($orderItem->variant && $orderItem->variant->track_inventory) {
                    $orderItem->variant()->lockForUpdate()->first()?->increment('stock_quantity', $orderItem->quantity);
                } elseif ($orderItem->product && $orderItem->product->track_inventory) {
                    $orderItem->product()->lockForUpdate()->first()?->increment('stock_quantity', $orderItem->quantity);
                }

                if ($orderItem->product) {
                    $orderItem->product()->update([
                        'sold_count' => DB::raw('GREATEST(sold_count - ' . (int) $orderItem->quantity . ', 0)'),
                    ]);
                }
            }

            $wallet = Wallet::query()
                ->where('user_id', $order->user_id)
                ->lockForUpdate()
                ->first();

            if ($wallet) {
                $wallet->increment('balance', $lockedRefund->refund_amount);
                $wallet->increment('total_earned', $lockedRefund->refund_amount);
            } else {
                $wallet = $order->user->wallet()->create([
                    'balance' => $lockedRefund->refund_amount,
                    'total_earned' => $lockedRefund->refund_amount,
                    'total_spent' => 0,
                    'currency' => $lockedRefund->currency ?? (string) config('app.currency', 'EGP'),
                    'is_active' => true,
                ]);

                $wallet = Wallet::query()
                    ->whereKey($wallet->id)
                    ->lockForUpdate()
                    ->firstOrFail();
            }

            $wallet->refresh();
            $wallet->transactions()->create([
                'type' => 'refund',
                'amount' => $lockedRefund->refund_amount,
                'balance_after' => $wallet->balance,
                'description' => 'Refund processed for order ' . ($order->order_number ?? $order->id),
                'reference' => 'refund:' . $lockedRefund->id,
            ]);

            // Deduct loyalty points that were earned for this order
            try {
                app(LoyaltyPointService::class)->deductPointsForRefund($order, (float) $lockedRefund->refund_amount);
            } catch (\Throwable $e) {
                Log::warning('Failed to deduct loyalty points for refund', [
                    'refund_id' => $lockedRefund->id,
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
            }
        });
    }

    /**
     * Initiate automatic refund for cancelled orders
     */
    public function initiateRefund(Order $order): void
    {
        if (!$order->payment || (string) $order->payment->status !== 'completed') {
            return;
        }

        foreach ($order->items as $item) {
            $refund = Refund::query()
                ->where('order_id', $order->id)
                ->where('order_item_id', $item->id)
                ->first();

            if (!$refund) {
                $refund = $this->requestRefund($item, 'Order cancelled', 'order_cancelled');
            }

            if ($refund->status === 'rejected') {
                continue;
            }

            if ($refund->status === 'pending') {
                $this->approveRefund($refund);
                $refund = $refund->fresh();
            }

            if ($refund->status !== 'processed') {
                $this->completeRefund($refund);
            }
        }
    }
}

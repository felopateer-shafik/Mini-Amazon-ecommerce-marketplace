<?php

namespace App\Services;

use App\Models\LoyaltyPoint;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LoyaltyPointService
{
    /**
     * Points earned per 1 EGP spent.
     * Default is 0.5 points per 1 EGP.
     */
    public function getPointsRate(): float
    {
        return (float) Cache::get('settings.points_per_currency', 0.5);
    }

    /**
     * Award loyalty points for a delivered order.
     * Points = order total (EGP) * points_per_currency.
     */
    public function awardPointsForOrder(Order $order): ?LoyaltyPoint
    {
        if (!$order->user_id) {
            return null;
        }

        // Only award once per order
        $alreadyAwarded = LoyaltyPoint::where('order_id', $order->id)
            ->where('type', 'earned')
            ->exists();

        if ($alreadyAwarded) {
            return null;
        }

        $rate = $this->getPointsRate();
        $orderTotal = (float) $order->total;
        $points = (int) floor($orderTotal * $rate);

        if ($points <= 0) {
            return null;
        }

        return LoyaltyPoint::create([
            'user_id' => $order->user_id,
            'order_id' => $order->id,
            'type' => 'earned',
            'points' => $points,
            'description' => "Earned {$points} points for order {$order->order_number}",
            'metadata' => [
                'order_total' => $orderTotal,
                'rate' => $rate,
                'currency' => $order->currency ?? 'EGP',
            ],
            'expires_at' => now()->addYear(),
        ]);
    }

    /**
     * Deduct loyalty points when a refund is processed.
     * Removes the points that were earned for that order.
     */
    public function deductPointsForRefund(Order $order, float $refundAmount): ?LoyaltyPoint
    {
        if (!$order->user_id) {
            return null;
        }

        // Already deducted?
        $alreadyDeducted = LoyaltyPoint::where('order_id', $order->id)
            ->where('type', 'deducted')
            ->exists();

        if ($alreadyDeducted) {
            return null;
        }

        $rate = $this->getPointsRate();
        $pointsToDeduct = (int) floor($refundAmount * $rate);

        if ($pointsToDeduct <= 0) {
            return null;
        }

        return LoyaltyPoint::create([
            'user_id' => $order->user_id,
            'order_id' => $order->id,
            'type' => 'deducted',
            'points' => -$pointsToDeduct,
            'description' => "Points deducted for refund on order {$order->order_number}",
            'metadata' => [
                'refund_amount' => $refundAmount,
                'rate' => $rate,
            ],
        ]);
    }
}

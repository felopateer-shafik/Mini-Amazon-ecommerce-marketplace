<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Order;

class PaymentService
{
    /**
     * Process payment
     */
    public function processPayment(Order $order, string $method): Payment
    {
        $payment = Payment::firstOrCreate(
            [
                'order_id' => $order->id,
            ],
            [
                'user_id' => $order->user_id,
                'payment_method' => $method,
                'amount' => $order->total,
                'currency' => config('app.currency', 'EGP'),
                'status' => 'pending',
            ]
        );

        if ($payment->wasRecentlyCreated === false) {
            $payment->update([
                'payment_method' => $method,
                'amount' => $order->total,
                'currency' => config('app.currency', 'EGP'),
            ]);
        }

        return $payment;
    }

    /**
     * Confirm payment
     */
    public function confirmPayment(Payment $payment, array $gatewayResponse): void
    {
        $payment->update([
            'status' => 'completed',
            'gateway_transaction_id' => $gatewayResponse['transaction_id'] ?? null,
            'gateway_response' => $gatewayResponse,
            'paid_at' => now(),
        ]);
    }

    /**
     * Fail payment
     */
    public function failPayment(Payment $payment, string $reason): void
    {
        $payment->update([
            'status' => 'failed',
            'gateway_response' => ['error' => $reason],
        ]);
    }

    /**
     * Refund payment
     */
    public function refundPayment(Payment $payment): void
    {
        $payment->update(['status' => 'refunded']);
    }
}

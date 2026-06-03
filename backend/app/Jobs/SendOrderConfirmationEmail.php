<?php

namespace App\Jobs;

use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendOrderConfirmationEmail implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(public Order $order)
    {
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $order = $this->order->loadMissing('user');
        $recipient = (string) ($order->user?->email ?? '');

        if ($recipient === '') {
            return;
        }

        $subject = 'Order Confirmation - ' . ($order->order_number ?? ('#' . $order->id));
        $body = implode("\n", [
            'Thank you for your order.',
            'Order Number: ' . ($order->order_number ?? $order->id),
            'Total: ' . number_format((float) ($order->total ?? 0), 2) . ' ' . (string) ($order->currency ?? config('app.currency', 'EGP')),
            'Status: ' . (string) ($order->status ?? 'pending'),
        ]);

        Mail::raw($body, function ($message) use ($recipient, $subject) {
            $message->to($recipient)->subject($subject);
        });
    }
}

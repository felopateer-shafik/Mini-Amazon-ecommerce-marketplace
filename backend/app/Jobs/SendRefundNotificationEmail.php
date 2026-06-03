<?php

namespace App\Jobs;

use App\Models\Refund;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class SendRefundNotificationEmail implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(public Refund $refund)
    {
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $refund = $this->refund->loadMissing('order', 'user');

        $adminRecipient = (string) (
            Cache::get('settings.site_email')
            ?? config('mail.from.address')
            ?? ''
        );

        if ($adminRecipient === '') {
            return;
        }

        $subject = 'Refund Notification - ' . ($refund->order?->order_number ?? ('Refund #' . $refund->id));
        $body = implode("\n", [
            'A refund request was processed.',
            'Refund ID: ' . $refund->id,
            'Order: ' . ($refund->order?->order_number ?? $refund->order_id),
            'Customer: ' . ($refund->user?->email ?? ('User #' . $refund->user_id)),
            'Amount: ' . number_format((float) ($refund->refund_amount ?? 0), 2) . ' ' . (string) ($refund->currency ?? config('app.currency', 'EGP')),
            'Status: ' . (string) ($refund->status ?? 'requested'),
        ]);

        Mail::raw($body, function ($message) use ($adminRecipient, $subject) {
            $message->to($adminRecipient)->subject($subject);
        });
    }
}

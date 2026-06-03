<?php

namespace App\Listeners;

use App\Events\RefundRequested;
use App\Jobs\SendRefundNotificationEmail;
use Illuminate\Support\Facades\Cache;

class NotifyAdminOfRefundRequest
{
    /**
     * Handle the event.
     */
    public function handle(RefundRequested $event): void
    {
        if (!(bool) Cache::get('settings.notify_refund_request', true)) {
            return;
        }

        // Dispatch job to notify admin
        SendRefundNotificationEmail::dispatch($event->refund)
            ->onQueue('emails');
    }
}

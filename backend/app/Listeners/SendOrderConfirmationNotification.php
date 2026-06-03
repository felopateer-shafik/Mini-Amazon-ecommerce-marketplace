<?php

namespace App\Listeners;

use App\Events\OrderCreated;
use App\Jobs\SendOrderConfirmationEmail;
use Illuminate\Support\Facades\Cache;

class SendOrderConfirmationNotification
{
    /**
     * Handle the event.
     */
    public function handle(OrderCreated $event): void
    {
        if (!(bool) Cache::get('settings.notify_new_order', true)) {
            return;
        }

        // Dispatch job to send email asynchronously
        SendOrderConfirmationEmail::dispatch($event->order)
            ->onQueue('emails')
            ->delay(now()->addSeconds(5));
    }
}

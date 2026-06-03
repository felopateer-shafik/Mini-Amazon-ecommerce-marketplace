<?php

namespace App\Providers;

use App\Events\OrderCreated;
use App\Events\OrderShipped;
use App\Events\RefundRequested;
use App\Listeners\NotifyAdminOfRefundRequest;
use App\Listeners\NotifyCustomerOrderShipped;
use App\Listeners\SendOrderConfirmationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        OrderCreated::class => [
            SendOrderConfirmationNotification::class,
        ],
        RefundRequested::class => [
            NotifyAdminOfRefundRequest::class,
        ],
        OrderShipped::class => [
            NotifyCustomerOrderShipped::class,
        ],
    ];
}

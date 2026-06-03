<?php

namespace App\Listeners;

use App\Events\OrderShipped;
use App\Models\UserNotification;

class NotifyCustomerOrderShipped
{
    public function handle(OrderShipped $event): void
    {
        $order = $event->order;

        UserNotification::create([
            'user_id' => $order->user_id,
            'type' => 'order',
            'title' => __('notifications.order_shipped_title'),
            'message' => __('notifications.order_shipped_body', ['order' => $order->order_number]),
            'link' => '/orders/' . $order->id,
            'meta' => [
                'order_id' => $order->id,
                'status' => 'shipped',
            ],
        ]);
    }
}

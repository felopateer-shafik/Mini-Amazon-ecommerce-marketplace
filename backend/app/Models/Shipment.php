<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Shipment extends Model
{
    protected $fillable = [
        'order_id',
        'order_item_id',
        'tracking_number',
        'carrier',
        'status',
        'shipping_address',
        'shipping_cost',
        'currency',
        'tracking_events',
        'shipped_at',
        'delivered_at',
        'notes',
    ];

    protected $casts = [
        'tracking_number' => EncryptedString::class,
        'carrier' => EncryptedString::class,
        'shipping_address' => EncryptedArray::class,
        'shipping_cost' => 'decimal:2',
        'tracking_events' => EncryptedArray::class,
        'notes' => EncryptedString::class,
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}

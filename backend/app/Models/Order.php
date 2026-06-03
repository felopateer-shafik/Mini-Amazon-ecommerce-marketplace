<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'coupon_id',
        'order_number',
        'status',
        'subtotal',
        'tax_amount',
        'shipping_amount',
        'shipping_method',
        'shipping_zone',
        'shipping_min_days',
        'shipping_max_days',
        'discount_amount',
        'total',
        'currency',
        'shipping_address',
        'billing_address',
        'customer_email',
        'customer_phone',
        'notes',
        'shipped_at',
        'delivered_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'shipping_amount' => 'decimal:2',
        'shipping_min_days' => 'integer',
        'shipping_max_days' => 'integer',
        'shipping_method' => EncryptedString::class,
        'shipping_zone' => EncryptedString::class,
        'discount_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'shipping_address' => EncryptedArray::class,
        'billing_address' => EncryptedArray::class,
        'customer_email' => EncryptedString::class,
        'customer_phone' => EncryptedString::class,
        'notes' => EncryptedString::class,
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that placed the order.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the order items.
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Get the payment for the order.
     */
    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    /**
     * Get the shipments for the order.
     */
    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }

    /**
     * Get the refunds for the order.
     */
    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function loyaltyPoints(): HasMany
    {
        return $this->hasMany(LoyaltyPoint::class);
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }
}

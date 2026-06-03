<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'user_id',
        'payment_method',
        'gateway_transaction_id',
        'status',
        'amount',
        'currency',
        'gateway_response',
        'notes',
        'paid_at',
    ];

    protected $casts = [
        'payment_method' => EncryptedString::class,
        'amount' => 'decimal:2',
        'gateway_response' => EncryptedArray::class,
        'notes' => EncryptedString::class,
        'paid_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function setGatewayTransactionIdAttribute(mixed $value): void
    {
        $normalized = trim((string) ($value ?? ''));

        $this->attributes['gateway_transaction_id'] = $normalized !== '' ? $normalized : null;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the order for the payment.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}

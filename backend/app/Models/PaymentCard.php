<?php

namespace App\Models;

use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentCard extends Model
{
    protected $fillable = [
        'user_id',
        'card_last_four',
        'card_brand',
        'card_holder_name',
        'expiry_month',
        'expiry_year',
        'billing_address',
        'is_default',
    ];

    protected $casts = [
        'card_last_four' => EncryptedString::class,
        'card_brand' => EncryptedString::class,
        'card_holder_name' => EncryptedString::class,
        'expiry_month' => EncryptedString::class,
        'expiry_year' => EncryptedString::class,
        'billing_address' => EncryptedString::class,
        'is_default' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Fields that should NEVER appear in serialized output.
     */
    protected $hidden = [];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

<?php

namespace App\Models;

use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    protected $fillable = [
        'user_id',
        'label',
        'first_name',
        'last_name',
        'phone',
        'address_line_1',
        'address_line_2',
        'city',
        'state',
        'postal_code',
        'country',
        'is_default',
    ];

    protected $casts = [
        'label' => EncryptedString::class,
        'first_name' => EncryptedString::class,
        'last_name' => EncryptedString::class,
        'phone' => EncryptedString::class,
        'address_line_1' => EncryptedString::class,
        'address_line_2' => EncryptedString::class,
        'city' => EncryptedString::class,
        'state' => EncryptedString::class,
        'postal_code' => EncryptedString::class,
        'country' => EncryptedString::class,
        'is_default' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

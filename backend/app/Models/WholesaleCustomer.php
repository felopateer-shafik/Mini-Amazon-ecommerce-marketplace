<?php

namespace App\Models;

use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;

class WholesaleCustomer extends Model
{
    protected $fillable = [
        'user_id',
        'company',
        'email',
        'contact',
        'orders',
        'total_spent',
        'status',
    ];

    protected $casts = [
        'company' => EncryptedString::class,
        'email' => EncryptedString::class,
        'contact' => EncryptedString::class,
        'orders' => 'integer',
        'total_spent' => 'decimal:2',
    ];

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

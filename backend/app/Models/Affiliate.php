<?php

namespace App\Models;

use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Affiliate extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'email',
        'code',
        'referrals',
        'earnings',
        'commission_rate',
        'status',
        'joined_at',
    ];

    protected $casts = [
        'name' => EncryptedString::class,
        'email' => EncryptedString::class,
        'referrals' => 'integer',
        'earnings' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'joined_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

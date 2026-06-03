<?php

namespace App\Models;

use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductReconsiderationRequest extends Model
{
    protected $fillable = [
        'product_id',
        'vendor_id',
        'message',
        'status',
        'admin_reply',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'message' => EncryptedString::class,
        'admin_reply' => EncryptedString::class,
        'reviewed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

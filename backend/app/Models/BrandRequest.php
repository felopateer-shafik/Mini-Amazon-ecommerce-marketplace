<?php

namespace App\Models;

use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandRequest extends Model
{
    protected $fillable = [
        'vendor_id',
        'brand_id',
        'name',
        'website',
        'description',
        'status',
        'admin_reply',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'name' => EncryptedString::class,
        'website' => EncryptedString::class,
        'description' => EncryptedString::class,
        'admin_reply' => EncryptedString::class,
        'reviewed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

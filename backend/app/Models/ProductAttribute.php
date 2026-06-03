<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductAttribute extends Model
{
    protected $fillable = [
        'product_id',
        'key',
        'value',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get value as array if it's JSON, otherwise as string
     */
    public function getDecodedValueAttribute()
    {
        $decoded = json_decode($this->value, true);
        return $decoded !== null ? $decoded : $this->value;
    }
}

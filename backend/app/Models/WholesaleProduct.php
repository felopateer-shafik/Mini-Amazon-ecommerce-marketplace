<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WholesaleProduct extends Model
{
    protected $fillable = [
        'product_id',
        'wholesale_price',
        'min_qty',
        'status',
    ];

    protected $casts = [
        'wholesale_price' => 'decimal:2',
        'min_qty' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

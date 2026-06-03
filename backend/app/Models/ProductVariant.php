<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'sku',
        'name',
        'price',
        'compare_price',
        'cost_price',
        'stock_quantity',
        'min_stock_level',
        'track_inventory',
        'is_active',
        'weight',
        'attributes',
        'images',
        'barcode',
        'position',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'weight' => 'decimal:2',
        'name' => EncryptedString::class,
        'barcode' => EncryptedString::class,
        'stock_quantity' => 'integer',
        'min_stock_level' => 'integer',
        'attributes' => EncryptedArray::class,
        'images' => EncryptedArray::class,
        'track_inventory' => 'boolean',
        'is_active' => 'boolean',
        'position' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the product that owns the variant.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

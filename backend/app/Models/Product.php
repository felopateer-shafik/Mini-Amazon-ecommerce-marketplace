<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Product extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'vendor_id',
        'product_type',
        'category_id',
        'brand_id',
        'name',
        'slug',
        'description',
        'short_description',
        'sku',
        'price',
        'compare_price',
        'cost_price',
        'stock_quantity',
        'min_stock_level',
        'sold_count',
        'track_inventory',
        'is_active',
        'is_featured',
        'free_shipping',
        'min_order_quantity',
        'max_order_quantity',
        'moderation_status',
        'moderation_note',
        'approved_at',
        'approved_by',
        'reviewed_at',
        'pending_update_payload',
        'pending_update_status',
        'pending_update_note',
        'pending_update_submitted_at',
        'pending_update_reviewed_at',
        'pending_update_reviewed_by',
        'weight',
        'dimensions',
        'images',
        'video_url',
        'tags',
        'meta_title',
        'meta_description',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'short_description' => EncryptedString::class,
        'meta_title' => EncryptedString::class,
        'meta_description' => EncryptedString::class,
        'pending_update_note' => EncryptedString::class,
        'weight' => 'decimal:2',
        'stock_quantity' => 'integer',
        'min_stock_level' => 'integer',
        'sold_count' => 'integer',
        'dimensions' => EncryptedArray::class,
        'images' => EncryptedArray::class,
        'tags' => EncryptedArray::class,
        'track_inventory' => 'boolean',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'free_shipping' => 'boolean',
        'min_order_quantity' => 'integer',
        'max_order_quantity' => 'integer',
        'approved_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'pending_update_payload' => EncryptedArray::class,
        'pending_update_submitted_at' => 'datetime',
        'pending_update_reviewed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($product) {
            if (empty($product->slug)) {
                $product->slug = Str::slug($product->name);
                $count = static::where('slug', 'LIKE', $product->slug . '%')->count();
                if ($count > 0) {
                    $product->slug .= '-' . ($count + 1);
                }
            }
        });
    }

    /**
     * Get the category for the product.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * Get the vendor that owns the product.
     */
    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    /**
     * Get the variants for the product.
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /**
     * Get the reviews for the product.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Get the order items for the product.
     */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function wishlists(): HasMany
    {
        return $this->hasMany(Wishlist::class);
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function wholesaleProduct(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(WholesaleProduct::class);
    }

    /**
     * Get the product attributes for filtering.
     */
    public function attributes(): HasMany
    {
        return $this->hasMany(ProductAttribute::class);
    }

    public function reconsiderationRequests(): HasMany
    {
        return $this->hasMany(ProductReconsiderationRequest::class);
    }

    public function latestReconsideration(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(ProductReconsiderationRequest::class)->latestOfMany();
    }

    /**
     * Get a specific attribute value.
     */
    public function getAttribute_value(string $key): mixed
    {
        $attr = $this->attributes()->where('key', $key)->first();
        if (!$attr) return null;
        $decoded = json_decode($attr->value, true);
        return $decoded !== null ? $decoded : $attr->value;
    }
}

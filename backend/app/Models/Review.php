<?php

namespace App\Models;

use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
        'order_item_id',
        'rating',
        'title',
        'comment',
        'is_verified',
        'is_approved',
        'is_featured',
        'vendor_reply',
    ];

    protected $casts = [
        'rating' => 'integer',
        'title' => EncryptedString::class,
        'comment' => EncryptedString::class,
        'vendor_reply' => EncryptedString::class,
        'is_verified' => 'boolean',
        'is_approved' => 'boolean',
        'is_featured' => 'boolean',
        'helpful_count' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::created(function (Review $review): void {
            self::refreshVendorMetricsForProduct($review->product_id);
        });

        static::updated(function (Review $review): void {
            $oldProductId = (int) ($review->getOriginal('product_id') ?? 0);
            $newProductId = (int) ($review->product_id ?? 0);

            if ($oldProductId !== $newProductId) {
                self::refreshVendorMetricsForProduct($oldProductId);
                self::refreshVendorMetricsForProduct($newProductId);
                return;
            }

            if (
                $review->wasChanged('rating')
                || $review->wasChanged('is_approved')
                || $review->wasChanged('product_id')
            ) {
                self::refreshVendorMetricsForProduct($newProductId);
            }
        });

        static::deleted(function (Review $review): void {
            self::refreshVendorMetricsForProduct((int) ($review->product_id ?? 0));
        });
    }

    private static function refreshVendorMetricsForProduct(?int $productId): void
    {
        if (!$productId) {
            return;
        }

        $vendorId = (int) (\App\Models\Product::query()
            ->withTrashed()
            ->whereKey($productId)
            ->value('vendor_id') ?? 0);

        \App\Models\Vendor::refreshRatingMetricsByVendorId($vendorId > 0 ? $vendorId : null);
    }

    /**
     * Get the user that wrote the review.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the product that was reviewed (includes soft-deleted products).
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    /**
     * Get the order item that was reviewed.
     */
    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}

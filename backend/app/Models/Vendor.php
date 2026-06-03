<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Vendor extends Model
{
    protected $fillable = [
        'user_id',
        'business_name',
        'store_name',
        'slug',
        'description',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'tax_id',
        'logo',
        'banner',
        'business_type',
        'bank_name',
        'bank_account',
        'account_name',
        'account_number',
        'iban',
        'free_shipping_enabled',
        'free_shipping_minimum',
        'standard_shipping_rate',
        'express_shipping_rate',
        'processing_time',
        'notification_preferences',
        'is_active',
        'is_verified',
        'status',
        'rejection_reason',
        'commission_rate',
        'rating',
        'review_count',
    ];

    protected $casts = [
        'business_name' => EncryptedString::class,
        'store_name' => EncryptedString::class,
        'description' => EncryptedString::class,
        'email' => EncryptedString::class,
        'phone' => EncryptedString::class,
        'address' => EncryptedString::class,
        'city' => EncryptedString::class,
        'state' => EncryptedString::class,
        'country' => EncryptedString::class,
        'postal_code' => EncryptedString::class,
        'tax_id' => EncryptedString::class,
        'bank_name' => EncryptedString::class,
        'account_name' => EncryptedString::class,
        'account_number' => EncryptedString::class,
        'iban' => EncryptedString::class,
        'logo' => EncryptedString::class,
        'banner' => EncryptedString::class,
        'notification_preferences' => EncryptedArray::class,
        'rejection_reason' => EncryptedString::class,
        'is_active' => 'boolean',
        'is_verified' => 'boolean',
        'free_shipping_enabled' => 'boolean',
        'free_shipping_minimum' => 'decimal:2',
        'standard_shipping_rate' => 'decimal:2',
        'express_shipping_rate' => 'decimal:2',
        'processing_time' => 'integer',
        'commission_rate' => 'decimal:2',
        'rating' => 'decimal:2',
        'review_count' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static function refreshRatingMetricsByVendorId(?int $vendorId): void
    {
        if (!$vendorId) {
            return;
        }

        $vendor = self::query()->find($vendorId);
        if (!$vendor) {
            return;
        }

        $stats = \App\Models\Review::query()
            ->where('is_approved', true)
            ->whereHas('product', function ($query) use ($vendorId) {
                $query->withTrashed()->where('vendor_id', $vendorId);
            })
            ->selectRaw('COUNT(*) as total_reviews')
            ->selectRaw('COALESCE(AVG(rating), 0) as average_rating')
            ->first();

        $vendor->update([
            'rating' => round((float) ($stats->average_rating ?? 0), 2),
            'review_count' => (int) ($stats->total_reviews ?? 0),
        ]);
    }

    /**
     * Get the user that owns the vendor.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the products for the vendor.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function orders(): Builder
    {
        return Order::query()->whereHas('items.product', function (Builder $query) {
            $query->where('vendor_id', $this->id);
        });
    }

    public function payoutRequests(): HasMany
    {
        return $this->hasMany(VendorPayoutRequest::class);
    }
}

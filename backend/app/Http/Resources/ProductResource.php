<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $authUser = $request->user();
        $resourceVendorUserId = 0;
        if ($this->relationLoaded('vendor') && $this->vendor) {
            $resourceVendorUserId = (int) $this->vendor->user_id;
        }

        $canViewCost = $authUser && (
            $authUser->hasRole('admin')
            || ($authUser->hasRole('merchant') && (int) $authUser->id === $resourceVendorUserId)
        );

        $attributes = $this->resource->getAttributes();
        $soldCount = array_key_exists('sold_count', $attributes)
            ? ((int) $attributes['sold_count'])
            : 0;

        $resolvedStatus = $this->moderation_status ?? ((bool) $this->is_active ? 'approved' : 'pending');
        if ($resolvedStatus === 'approved') {
            if (($this->pending_update_status ?? null) === 'pending') {
                $resolvedStatus = 'pending';
            } elseif (($this->pending_update_status ?? null) === 'rejected') {
                $resolvedStatus = 'rejected';
            }
        }

        return [
            'id' => $this->id,
            'vendor_id' => $this->vendor_id,
            'category_id' => $this->category_id,
            'brand_id' => $this->brand_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'short_description' => $this->short_description,
            'sku' => $this->sku,
            'price' => (float) $this->price,
            'compare_price' => $this->compare_price ? (float) $this->compare_price : null,
            'cost_price' => $this->when($canViewCost, $this->cost_price ? (float) $this->cost_price : null),
            'stock_quantity' => $this->stock_quantity,
            'stock' => $this->stock_quantity,
            'min_stock_level' => $this->min_stock_level,
            'track_inventory' => (bool) $this->track_inventory,
            'sold_count' => $soldCount,
            'sold' => $soldCount,
            'is_active' => (bool) $this->is_active,
            'is_featured' => (bool) $this->is_featured,
            'product_type' => $this->product_type ?? 'simple',
            'free_shipping' => (bool) $this->free_shipping,
            'min_order_quantity' => (int) ($this->min_order_quantity ?? 1),
            'max_order_quantity' => $this->max_order_quantity,
            'status' => $resolvedStatus,
            'moderation_status' => $this->moderation_status,
            'moderation_note' => $this->moderation_note,
            'approved_at' => $this->approved_at,
            'reviewed_at' => $this->reviewed_at,
            'has_pending_update' => ($this->pending_update_status ?? null) === 'pending',
            'pending_update_status' => $this->pending_update_status,
            'pending_update_note' => $this->pending_update_note,
            'pending_update_submitted_at' => $this->pending_update_submitted_at,
            'pending_update_reviewed_at' => $this->pending_update_reviewed_at,
            'pending_update_payload' => $this->when(
                $canViewCost && !empty($this->pending_update_payload),
                fn () => $this->pending_update_payload
            ),
            'weight' => $this->weight ? (float) $this->weight : null,
            'dimensions' => $this->dimensions,
            'images' => $this->normalizeImageUrls($this->images),
            'video_url' => $this->normalizeMediaUrl($this->video_url),
            'tags' => $this->tags,
            'wholesale_price' => $this->when(
                $this->relationLoaded('wholesaleProduct') && $this->wholesaleProduct,
                fn () => (float) $this->wholesaleProduct->wholesale_price
            ),
            'wholesale_min_qty' => $this->when(
                $this->relationLoaded('wholesaleProduct') && $this->wholesaleProduct,
                fn () => (int) $this->wholesaleProduct->min_qty
            ),
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'category' => $this->when(
                $this->relationLoaded('category') && $this->category,
                fn () => [
                    'id' => $this->category->id,
                    'name' => $this->category->name,
                    'name_ar' => $this->category->name_ar,
                    'slug' => $this->category->slug,
                ]
            ),
            'vendor' => $this->when(
                $this->relationLoaded('vendor') && $this->vendor,
                fn () => new VendorResource($this->vendor)
            ),
            'brand' => $this->when(
                $this->relationLoaded('brand') && $this->brand,
                fn () => [
                    'id' => $this->brand->id,
                    'name' => $this->brand->name,
                    'slug' => $this->brand->slug,
                ]
            ),
            'variants' => $this->when(
                $this->relationLoaded('variants'),
                fn () => ProductVariantResource::collection($this->variants)
            ),
            'latest_reconsideration' => $this->when(
                $this->relationLoaded('latestReconsideration') && $this->latestReconsideration,
                fn () => [
                    'id' => $this->latestReconsideration->id,
                    'message' => $this->latestReconsideration->message,
                    'status' => $this->latestReconsideration->status,
                    'admin_reply' => $this->latestReconsideration->admin_reply,
                    'created_at' => $this->latestReconsideration->created_at,
                    'reviewed_at' => $this->latestReconsideration->reviewed_at,
                ]
            ),
            'reviews_count' => $this->when(
                array_key_exists('reviews_count', $this->resource->getAttributes()),
                fn () => $this->reviews_count
            ),
            'review_count' => $this->when(
                array_key_exists('reviews_count', $this->resource->getAttributes()),
                fn () => $this->reviews_count
            ),
            'average_rating' => $this->when(
                array_key_exists('reviews_avg_rating', $this->resource->getAttributes()),
                fn () => round((float) $this->reviews_avg_rating, 1)
            ),
            'rating' => $this->when(
                array_key_exists('reviews_avg_rating', $this->resource->getAttributes()),
                fn () => round((float) $this->reviews_avg_rating, 1)
            ),
            'system_products_count' => $this->when(
                array_key_exists('system_products_count', $this->resource->getAttributes()),
                fn () => (int) $this->system_products_count
            ),
            'system_review_count' => $this->when(
                array_key_exists('system_review_count', $this->resource->getAttributes()),
                fn () => (int) $this->system_review_count
            ),
            'system_average_rating' => $this->when(
                array_key_exists('system_average_rating', $this->resource->getAttributes()),
                fn () => round((float) $this->system_average_rating, 2)
            ),
        ];
    }

    private function normalizeImageUrls($images): array
    {
        if (!is_array($images)) {
            return [];
        }

        return array_values(array_filter(array_map(function ($image) {
            if (!is_string($image) || trim($image) === '') {
                return null;
            }

            $value = trim($image);
            if (Str::startsWith($value, ['http://', 'https://', 'data:image/'])) {
                return $value;
            }

            if (Str::startsWith($value, '/')) {
                return url($value);
            }

            return url('/' . ltrim($value, '/'));
        }, $images)));
    }

    private function normalizeMediaUrl(?string $url): ?string
    {
        if (!$url || trim($url) === '') {
            return null;
        }

        $value = trim($url);
        if (Str::startsWith($value, ['http://', 'https://'])) {
            return $value;
        }

        if (Str::startsWith($value, '/')) {
            return url($value);
        }

        return url('/' . ltrim($value, '/'));
    }
}

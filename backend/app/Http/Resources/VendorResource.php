<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'business_name' => $this->business_name,
            'store_name' => $this->store_name,
            'slug' => $this->slug,
            'description' => $this->description,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'city' => $this->city,
            'state' => $this->state,
            'country' => $this->country,
            'postal_code' => $this->postal_code,
            'tax_id' => $this->tax_id,
            'logo' => $this->normalizeImageUrl($this->logo),
            'banner' => $this->normalizeImageUrl($this->banner),
            'bank_name' => $this->bank_name,
            'account_name' => $this->account_name,
            'account_number' => $this->account_number,
            'iban' => $this->iban,
            'free_shipping_enabled' => (bool) $this->free_shipping_enabled,
            'free_shipping_minimum' => (float) ($this->free_shipping_minimum ?? 0),
            'standard_shipping_rate' => (float) ($this->standard_shipping_rate ?? 0),
            'express_shipping_rate' => (float) ($this->express_shipping_rate ?? 0),
            'processing_time' => (int) ($this->processing_time ?? 1),
            'notification_preferences' => $this->notification_preferences,
            'is_active' => $this->is_active,
            'is_verified' => $this->is_verified,
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'commission_rate' => $this->commission_rate,
            'commission_earned' => (float) ($this->commission_earned ?? 0),
            'rating' => (float) ($this->rating ?? $this->computed_rating ?? 0),
            'review_count' => (int) ($this->review_count ?? 0),
            'orders_count' => (int) ($this->orders_count ?? 0),
            'total_revenue' => (float) ($this->total_revenue ?? 0),
            'positive_rating' => $this->positive_rating ?? null,
            'ship_on_time' => $this->ship_on_time ?? null,
            'response_rate' => $this->response_rate ?? null,
            'products_count' => $this->whenCounted('products'),
            'user' => $this->when(
                $this->relationLoaded('user') && $this->user,
                fn () => [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ]
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function normalizeImageUrl(?string $value): ?string
    {
        if (!$value) {
            return $value;
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://') || str_starts_with($value, 'data:image/')) {
            return $value;
        }

        return url(ltrim($value, '/'));
    }
}

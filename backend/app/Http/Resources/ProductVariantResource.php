<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $authUser = $request->user();
        $vendorUserId = null;
        if ($this->relationLoaded('product') && $this->product && $this->product->relationLoaded('vendor') && $this->product->vendor) {
            $vendorUserId = $this->product->vendor->user_id;
        }
        $canViewCost = $authUser && (
            $authUser->hasRole('admin')
            || ($authUser->hasRole('merchant') && $vendorUserId && (int) $authUser->id === (int) $vendorUserId)
        );

        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'sku' => $this->sku,
            'name' => $this->name,
            'values' => $this->resolveValuesText(),
            'price' => (float) $this->price,
            'compare_price' => $this->compare_price ? (float) $this->compare_price : null,
            'cost_price' => $this->when($canViewCost, $this->cost_price ? (float) $this->cost_price : null),
            'stock_quantity' => $this->stock_quantity,
            'min_stock_level' => $this->min_stock_level,
            'track_inventory' => (bool) $this->track_inventory,
            'is_active' => (bool) $this->is_active,
            'weight' => $this->weight ? (float) $this->weight : null,
            'attributes' => $this->attributes,
            'images' => $this->images,
            'barcode' => $this->barcode,
            'position' => (float) $this->position,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function resolveValuesText(): string
    {
        $attributes = $this->attributes;
        if (!is_array($attributes)) {
            return '';
        }

        $valuesText = $attributes['values_text'] ?? null;
        if (is_string($valuesText) && trim($valuesText) !== '') {
            return $valuesText;
        }

        $values = $attributes['values'] ?? null;
        if (is_array($values)) {
            return implode(', ', array_filter(array_map('strval', $values)));
        }

        return '';
    }
}

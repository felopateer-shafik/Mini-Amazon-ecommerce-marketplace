<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $attributes = $this->resource->getAttributes();
        $directProductsCount = array_key_exists('products_count', $attributes)
            ? (int) $attributes['products_count']
            : 0;
        $computedProductsCount = array_key_exists('computed_products_count', $attributes)
            ? (int) $attributes['computed_products_count']
            : null;

        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'name' => $this->name,
            'name_ar' => $this->name_ar,
            'slug' => $this->slug,
            'description' => $this->description,
            'description_ar' => $this->description_ar,
            'image' => $this->image,
            'icon' => $this->icon,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            'products_count' => (int) ($computedProductsCount ?? $directProductsCount),
            'children' => $this->when(
                $this->relationLoaded('children'),
                fn () => CategoryResource::collection($this->children)
            ),
            'parent' => $this->when(
                $this->relationLoaded('parent'),
                fn () => $this->parent ? new CategoryResource($this->parent) : null
            ),
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

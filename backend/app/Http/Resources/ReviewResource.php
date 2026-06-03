<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $attributes = $this->resource->getAttributes();

        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'user_id' => $this->user_id,
            'rating' => $this->rating,
            'title' => $this->title,
            'comment' => $this->comment,
            'is_verified' => (bool) $this->is_verified,
            'verified_purchase' => (bool) $this->is_verified,
            'is_approved' => (bool) $this->is_approved,
            'vendor_reply' => $this->vendor_reply,
            'reply' => $this->vendor_reply,
            'admin_reply' => array_key_exists('admin_reply', $attributes) ? $this->admin_reply : null,
            'status' => array_key_exists('status', $attributes) ? $this->status : null,
            'helpful_count' => $this->helpful_count,
            'user' => $this->when(
                $this->relationLoaded('user') && $this->user,
                fn () => new UserResource($this->user)
            ),
            'product' => new ProductResource($this->whenLoaded('product')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

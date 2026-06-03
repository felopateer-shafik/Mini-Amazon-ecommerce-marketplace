<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RefundResource extends JsonResource
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
            'order_id' => $this->order_id,
            'order_item_id' => $this->order_item_id,
            'user_id' => $this->user_id,
            'status' => $this->status,
            'reason' => $this->reason,
            'reason_description' => $this->reason_description,
            'refund_amount' => (float) $this->refund_amount,
            'currency' => $this->currency,
            'admin_notes' => $this->admin_notes,
            'processed_at' => $this->processed_at,
            'order_item' => new OrderItemResource($this->whenLoaded('orderItem')),
            'order' => new OrderResource($this->whenLoaded('order')),
            'user' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

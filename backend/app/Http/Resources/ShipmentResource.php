<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShipmentResource extends JsonResource
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
            'tracking_number' => $this->tracking_number,
            'carrier' => $this->carrier,
            'status' => $this->status,
            'shipping_address' => $this->shipping_address,
            'shipping_cost' => (float) $this->shipping_cost,
            'currency' => $this->currency,
            'tracking_events' => $this->tracking_events,
            'shipped_at' => $this->shipped_at,
            'delivered_at' => $this->delivered_at,
            'notes' => $this->notes,
            'order_item' => new OrderItemResource($this->whenLoaded('orderItem')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

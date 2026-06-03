<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $shippingEta = null;
        if ($this->shipping_min_days !== null || $this->shipping_max_days !== null) {
            $etaMin = $this->shipping_min_days ?? $this->shipping_max_days;
            $etaMax = $this->shipping_max_days ?? $this->shipping_min_days;
            if ($etaMin !== null && $etaMax !== null) {
                $shippingEta = min((int) $etaMin, (int) $etaMax) . '-' . max((int) $etaMin, (int) $etaMax) . ' days';
            }
        }

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'order_number' => $this->order_number,
            'status' => $this->status,
            'items_count' => array_key_exists('items_count', $this->resource->getAttributes())
                ? (int) $this->items_count
                : ($this->relationLoaded('items') ? $this->items->count() : null),
            'subtotal' => (float) $this->subtotal,
            'tax_amount' => (float) $this->tax_amount,
            'shipping_amount' => (float) $this->shipping_amount,
            'shipping_method' => $this->shipping_method,
            'shipping_zone' => $this->shipping_zone,
            'shipping_min_days' => $this->shipping_min_days,
            'shipping_max_days' => $this->shipping_max_days,
            'shipping_eta' => $shippingEta,
            'discount_amount' => (float) $this->discount_amount,
            'total' => (float) $this->total,
            'currency' => $this->currency,
            'shipping_address' => $this->shipping_address,
            'billing_address' => $this->billing_address,
            'customer_email' => $this->customer_email,
            'customer_phone' => $this->customer_phone,
            'notes' => $this->notes,
            'shipped_at' => $this->shipped_at,
            'delivered_at' => $this->delivered_at,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'payment' => new PaymentResource($this->whenLoaded('payment')),
            'shipments' => ShipmentResource::collection($this->whenLoaded('shipments')),
            'refunds' => RefundResource::collection($this->whenLoaded('refunds')),
            'user' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

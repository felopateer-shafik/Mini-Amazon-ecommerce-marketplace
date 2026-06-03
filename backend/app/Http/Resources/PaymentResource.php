<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $gatewayResponse = $this->gateway_response;
        if (is_string($gatewayResponse)) {
            $decoded = json_decode($gatewayResponse, true);
            $gatewayResponse = json_last_error() === JSON_ERROR_NONE ? $decoded : null;
        }

        $safeGatewayResponse = is_array($gatewayResponse)
            ? array_intersect_key($gatewayResponse, array_flip([
                'status',
                'code',
                'message',
                'transaction_id',
            ]))
            : null;

        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'user_id' => $this->user_id,
            'payment_method' => $this->payment_method,
            'gateway_transaction_id' => $this->gateway_transaction_id,
            'amount' => (float) $this->amount,
            'currency' => $this->currency,
            'status' => $this->status,
            'gateway_response' => $safeGatewayResponse,
            'notes' => $this->notes,
            'paid_at' => $this->paid_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

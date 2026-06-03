<?php

namespace App\Http\Requests;

use App\Models\ProductVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $shippingAddress = $this->input('shipping_address');
        if (is_string($shippingAddress) && trim($shippingAddress) !== '') {
            $this->merge([
                'shipping_address' => [
                    'full_address' => trim($shippingAddress),
                ],
            ]);
        }

        $billingAddress = $this->input('billing_address');
        if (is_string($billingAddress) && trim($billingAddress) !== '') {
            $this->merge([
                'billing_address' => [
                    'full_address' => trim($billingAddress),
                ],
            ]);
        }
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'customer_id' => 'nullable|integer|exists:users,id',
            'address_id' => [
                'nullable',
                'integer',
                'required_without:shipping_address',
                Rule::exists('addresses', 'id')->where(fn ($query) => $query->where('user_id', auth()->id())),
            ],
            'shipping_address' => 'nullable|array|required_without:address_id',
            'billing_address' => 'nullable|array',
            'payment_method' => 'required|in:credit_card,paypal,wallet,cod,stripe,wallet+cod',
            'wallet_amount' => 'nullable|numeric|min:0',
            'coupon_code' => 'nullable|string',
            'shipping_amount' => 'prohibited',
            'shipping_method' => 'nullable|string|max:100',
            'shipping_zone' => 'nullable|string|max:100',
            'shipping_min_days' => 'nullable|integer|min:1',
            'shipping_max_days' => 'nullable|integer|min:1',
            'notes' => 'nullable|string',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'items.required' => __('validation.required', ['attribute' => 'Order items']),
            'items.min' => __('validation.min.array', ['attribute' => 'Order items', 'min' => 1]),
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $actingUser = auth()->user();
            $customerId = $this->input('customer_id');

            $canOrderForCustomer = $actingUser
                && ($actingUser->isSystemAdminAccount()
                    || $actingUser->hasAnyRole(['admin', 'staff'])
                    || $actingUser->hasAnyPermission(['use-pos', 'update-orders']));

            if ($customerId && !$canOrderForCustomer) {
                $validator->errors()->add('customer_id', __('validation.invalid'));
            }

            foreach ((array) $this->input('items', []) as $index => $item) {
                $productId = $item['product_id'] ?? null;
                $variantId = $item['variant_id'] ?? null;

                if (!$variantId || !$productId) {
                    continue;
                }

                $belongsToProduct = ProductVariant::query()
                    ->whereKey($variantId)
                    ->where('product_id', $productId)
                    ->exists();

                if (!$belongsToProduct) {
                    $validator->errors()->add("items.$index.variant_id", __('validation.exists', ['attribute' => 'variant_id']));
                }
            }
        });
    }
}

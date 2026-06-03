<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StoreRefundRequest extends FormRequest
{
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
            'order_item_id' => [
                'required',
                Rule::exists('order_items', 'id')->where(function ($query) {
                    $query->whereIn('order_id', DB::table('orders')->select('id')->where('user_id', auth()->id()));
                }),
            ],
            'reason' => 'required|string|min:10|max:1000',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'reason.required' => __('validation.required', ['attribute' => 'Refund reason']),
            'reason.min' => __('validation.min.string', ['attribute' => 'Refund reason', 'min' => 10]),
        ];
    }
}

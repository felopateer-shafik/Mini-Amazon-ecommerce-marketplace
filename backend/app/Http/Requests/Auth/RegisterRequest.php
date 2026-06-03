<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'password' => ['required', 'string', 'min:8', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/', 'confirmed'],
            'password_confirmation' => 'required|string|min:8',
            'role' => 'sometimes|in:customer,merchant',
            'business_name' => 'required_if:role,merchant|string|max:255',
            'store_name' => 'required_if:role,merchant|string|max:255',
        ];
    }

    /**
     * Get custom error messages for validation rules.
     */
    public function messages(): array
    {
        return [
            'name.required' => __('validation.name_required'),
            'name.max' => __('validation.max_length', ['count' => 255]),
            'email.required' => __('validation.email_required'),
            'email.email' => __('validation.invalid_email'),
            'email.unique' => __('validation.email_unique'),
            'email.max' => __('validation.max_length', ['count' => 255]),
            'phone.unique' => 'this number is already used for another account',
            'password.required' => __('validation.password_required'),
            'password.min' => __('validation.password_min_length'),
            'password.regex' => __('validation.password_complexity'),
            'password.confirmed' => __('validation.password_mismatch'),
            'password_confirmation.required' => __('validation.password_confirmation_required'),
            'role.in' => __('validation.invalid_role'),
            'business_name.required_if' => __('validation.business_name_required'),
            'business_name.max' => __('validation.max_length', ['count' => 255]),
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $email = (string) $this->input('email', '');
                $phone = (string) $this->input('phone', '');

                if ($email !== '' && User::query()->where('email_hash', User::emailHashFor($email))->exists()) {
                    $validator->errors()->add('email', __('validation.unique', ['attribute' => 'email']));
                }

                if ($phone !== '' && User::query()->where('phone_hash', User::phoneHashFor($phone))->exists()) {
                    $validator->errors()->add('phone', 'this number is already used for another account');
                }
            },
        ];
    }
}

<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $categoryId = $this->route('category')?->id ?? $this->route('category') ?? null;

        return [
            'name' => 'sometimes|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'parent_id' => 'nullable|exists:categories,id|not_in:' . $categoryId,
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'image' => 'nullable|string',
            'icon' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
        ];
    }
}

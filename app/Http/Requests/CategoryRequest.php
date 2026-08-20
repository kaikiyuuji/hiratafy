<?php

namespace App\Http\Requests;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $category = $this->route('category');

        return [
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('categories')->where('user_id', $this->user()->id)
                    ->ignore($category instanceof Category ? $category->id : null),
            ],
            'is_active' => ['required', 'boolean'],
        ];
    }

    /** @return array{name: string, is_active: bool} */
    public function categoryData(): array
    {
        return [
            'name' => $this->string('name')->trim()->toString(),
            'is_active' => $this->boolean('is_active'),
        ];
    }
}

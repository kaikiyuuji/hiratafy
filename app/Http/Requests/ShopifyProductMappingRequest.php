<?php

namespace App\Http\Requests;

use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShopifyProductMappingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'external_key' => ['required', 'string', 'max:255'],
            'product_id' => [
                'required',
                'integer',
                Rule::exists('products', 'id')->where(
                    fn (Builder $query) => $query->where('user_id', $this->user()->id),
                ),
            ],
        ];
    }
}

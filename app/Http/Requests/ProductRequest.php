<?php

namespace App\Http\Requests;

use App\Models\Product;
use App\Support\Decimal;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $product = $this->route('product');
        $productId = $product instanceof Product ? $product->id : null;

        return [
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'id')->where(
                    fn (Builder $query) => $query->where('user_id', $this->user()->id),
                ),
            ],
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('products')->where('user_id', $this->user()->id)->ignore($productId),
            ],
            'sku' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('products')->where('user_id', $this->user()->id)->ignore($productId),
            ],
            'sale_price' => ['required', 'numeric', 'decimal:0,2', 'min:0'],
            'base_cost' => ['required', 'numeric', 'decimal:0,2', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'cost_tiers' => ['array', 'max:20'],
            'cost_tiers.*.min_quantity' => ['required', 'integer', 'min:2', 'max:100000', 'distinct'],
            'cost_tiers.*.unit_cost' => ['required', 'numeric', 'decimal:0,2', 'min:0'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'cost_tiers.*.min_quantity.distinct' => 'Cada faixa precisa ter uma quantidade mínima diferente.',
        ];
    }

    /**
     * @return array{
     *     category_id: int,
     *     name: string,
     *     sku: string|null,
     *     sale_price_cents: int,
     *     base_cost_cents: int,
     *     is_active: bool,
     *     cost_tiers: array<int, array{min_quantity: int, unit_cost_cents: int}>
     * }
     */
    public function productData(): array
    {
        $tiers = [];

        foreach ($this->array('cost_tiers') as $tier) {
            if (! is_array($tier)) {
                continue;
            }

            $tiers[] = [
                'min_quantity' => (int) ($tier['min_quantity'] ?? 0),
                'unit_cost_cents' => Decimal::moneyToCents((string) ($tier['unit_cost'] ?? 0)),
            ];
        }

        return [
            'category_id' => $this->integer('category_id'),
            'name' => $this->string('name')->trim()->toString(),
            'sku' => $this->filled('sku') ? $this->string('sku')->trim()->toString() : null,
            'sale_price_cents' => Decimal::moneyToCents($this->string('sale_price')->toString()),
            'base_cost_cents' => Decimal::moneyToCents($this->string('base_cost')->toString()),
            'is_active' => $this->boolean('is_active'),
            'cost_tiers' => $tiers,
        ];
    }
}

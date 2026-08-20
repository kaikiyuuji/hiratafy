<?php

namespace App\Http\Requests;

use App\Support\Decimal;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DiscountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'id')->where(
                    fn (Builder $query) => $query->where('user_id', $this->user()->id),
                ),
            ],
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['required', 'boolean'],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'tiers' => ['required', 'array', 'min:1', 'max:20'],
            'tiers.*.min_quantity' => ['required', 'integer', 'min:2', 'max:100000', 'distinct'],
            'tiers.*.percentage' => ['required', 'numeric', 'decimal:0,2', 'gt:0', 'max:100'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'tiers.*.min_quantity.distinct' => 'Cada faixa precisa ter uma quantidade mínima diferente.',
            'tiers.*.percentage.max' => 'O desconto não pode ultrapassar 100%.',
        ];
    }

    /**
     * @return array{
     *     category_id: int,
     *     name: string,
     *     is_active: bool,
     *     starts_on: string|null,
     *     ends_on: string|null,
     *     tiers: array<int, array{min_quantity: int, percentage_basis_points: int}>
     * }
     */
    public function discountData(): array
    {
        $tiers = [];

        foreach ($this->array('tiers') as $tier) {
            if (! is_array($tier)) {
                continue;
            }

            $tiers[] = [
                'min_quantity' => (int) ($tier['min_quantity'] ?? 0),
                'percentage_basis_points' => Decimal::percentageToBasisPoints(
                    (string) ($tier['percentage'] ?? 0),
                ),
            ];
        }

        return [
            'category_id' => $this->integer('category_id'),
            'name' => $this->string('name')->trim()->toString(),
            'is_active' => $this->boolean('is_active'),
            'starts_on' => $this->filled('starts_on') ? $this->string('starts_on')->toString() : null,
            'ends_on' => $this->filled('ends_on') ? $this->string('ends_on')->toString() : null,
            'tiers' => $tiers,
        ];
    }
}

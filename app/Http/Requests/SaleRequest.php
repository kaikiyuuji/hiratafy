<?php

namespace App\Http\Requests;

use App\Models\Sale;
use App\Support\Decimal;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $sale = $this->route('sale');
        $saleId = $sale instanceof Sale ? $sale->id : null;

        $rules = [
            'campaign_id' => [
                'nullable',
                'integer',
                Rule::exists('campaigns', 'id')->where(
                    fn (Builder $query) => $query->where('user_id', $this->user()->id),
                ),
            ],
            'order_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('sales')->where('user_id', $this->user()->id)->ignore($saleId),
            ],
            'customer_name' => ['nullable', 'string', 'max:150'],
            'sold_at' => ['required', 'date'],
            'shipping_mode' => ['nullable', Rule::in(['automatic', 'charged', 'free'])],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('products', 'id')->where(
                    fn (Builder $query) => $query->where('user_id', $this->user()->id),
                ),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100000'],
        ];

        if ($sale instanceof Sale) {
            $rules['supplier_cost_override_enabled'] = ['sometimes', 'boolean'];
            $rules['supplier_cost_override'] = [
                'nullable',
                Rule::requiredIf($this->boolean('supplier_cost_override_enabled')),
                'decimal:0,2',
                'min:0',
                'max:999999999.99',
            ];
        }

        return $rules;
    }

    /**
     * @return array{
     *     campaign_id: int|null,
     *     order_number: string|null,
     *     customer_name: string|null,
     *     sold_at: string,
     *     shipping_mode: 'automatic'|'charged'|'free',
     *     supplier_cost_override_cents: int|null,
     *     notes: string|null,
     *     items: array<int, array{product_id: int, quantity: int}>
     * }
     */
    public function saleData(): array
    {
        $items = [];

        foreach ($this->array('items') as $item) {
            if (! is_array($item)) {
                continue;
            }

            $items[] = [
                'product_id' => (int) ($item['product_id'] ?? 0),
                'quantity' => (int) ($item['quantity'] ?? 0),
            ];
        }

        $shippingMode = match ($this->string('shipping_mode')->toString()) {
            'charged' => 'charged',
            'free' => 'free',
            default => 'automatic',
        };
        $sale = $this->route('sale');
        $supplierCostOverrideCents = $sale instanceof Sale
            && $this->boolean('supplier_cost_override_enabled')
            && $this->filled('supplier_cost_override')
                ? Decimal::moneyToCents($this->string('supplier_cost_override')->toString())
                : null;

        return [
            'campaign_id' => $this->filled('campaign_id') ? $this->integer('campaign_id') : null,
            'order_number' => $this->filled('order_number')
                ? $this->string('order_number')->trim()->toString()
                : null,
            'customer_name' => $this->filled('customer_name')
                ? $this->string('customer_name')->trim()->toString()
                : null,
            'sold_at' => $this->string('sold_at')->toString(),
            'shipping_mode' => $shippingMode,
            'supplier_cost_override_cents' => $supplierCostOverrideCents,
            'notes' => $this->filled('notes') ? $this->string('notes')->trim()->toString() : null,
            'items' => $items,
        ];
    }
}

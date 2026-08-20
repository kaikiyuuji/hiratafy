<?php

namespace App\Http\Requests;

use App\Support\Decimal;
use Illuminate\Foundation\Http\FormRequest;

class FinancialSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'fixed_shipping' => ['required', 'numeric', 'decimal:0,2', 'min:0'],
            'free_shipping_threshold' => ['required', 'numeric', 'decimal:0,2', 'min:0'],
        ];
    }

    /** @return array{fixed_shipping_cents: int, free_shipping_threshold_cents: int} */
    public function settingsData(): array
    {
        return [
            'fixed_shipping_cents' => Decimal::moneyToCents($this->string('fixed_shipping')->toString()),
            'free_shipping_threshold_cents' => Decimal::moneyToCents(
                $this->string('free_shipping_threshold')->toString(),
            ),
        ];
    }
}

<?php

namespace App\Http\Requests;

use App\Support\Decimal;
use Illuminate\Foundation\Http\FormRequest;

class CampaignSpendRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'spend_date' => ['required', 'date'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.campaign_id' => ['required', 'integer', 'distinct'],
            'entries.*.budget' => ['required', 'numeric', 'decimal:0,2', 'min:0'],
            'entries.*.actual_spend' => ['nullable', 'numeric', 'decimal:0,2', 'min:0'],
        ];
    }

    /**
     * @return array{
     *     spend_date: string,
     *     entries: array<int, array{campaign_id: int, budget_cents: int, actual_spend_cents: int|null}>
     * }
     */
    public function spendData(): array
    {
        $entries = [];

        foreach ($this->array('entries') as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $actualSpend = $entry['actual_spend'] ?? null;
            $entries[] = [
                'campaign_id' => (int) ($entry['campaign_id'] ?? 0),
                'budget_cents' => Decimal::moneyToCents((string) ($entry['budget'] ?? 0)),
                'actual_spend_cents' => $actualSpend === null || $actualSpend === ''
                    ? null
                    : Decimal::moneyToCents((string) $actualSpend),
            ];
        }

        return [
            'spend_date' => $this->string('spend_date')->toString(),
            'entries' => $entries,
        ];
    }
}

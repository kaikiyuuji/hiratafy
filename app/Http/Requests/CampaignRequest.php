<?php

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $campaign = $this->route('campaign');

        return [
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('campaigns')->where('user_id', $this->user()->id)
                    ->ignore($campaign instanceof Campaign ? $campaign->id : null),
            ],
            'platform' => ['required', 'string', 'max:100'],
            'is_active' => ['required', 'boolean'],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array{
     *     name: string,
     *     platform: string,
     *     is_active: bool,
     *     starts_on: string|null,
     *     ends_on: string|null,
     *     notes: string|null
     * }
     */
    public function campaignData(): array
    {
        return [
            'name' => $this->string('name')->trim()->toString(),
            'platform' => $this->string('platform')->trim()->toString(),
            'is_active' => $this->boolean('is_active'),
            'starts_on' => $this->filled('starts_on') ? $this->string('starts_on')->toString() : null,
            'ends_on' => $this->filled('ends_on') ? $this->string('ends_on')->toString() : null,
            'notes' => $this->filled('notes') ? $this->string('notes')->trim()->toString() : null,
        ];
    }
}

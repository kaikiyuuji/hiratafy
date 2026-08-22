<?php

namespace App\Http\Requests;

use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShopifyIntegrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $shopDomain = strtolower(trim((string) $this->input('shop_domain')));
        $shopDomain = preg_replace('#^https?://#', '', $shopDomain) ?? $shopDomain;
        $shopDomain = explode('/', $shopDomain)[0];

        $this->merge(['shop_domain' => $shopDomain]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'shop_domain' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/',
                Rule::unique('shopify_integrations', 'shop_domain')
                    ->ignore($this->user()->shopifyIntegration?->id),
            ],
            'default_campaign_id' => [
                Rule::requiredIf($this->boolean('is_active')),
                'nullable',
                'integer',
                Rule::exists('campaigns', 'id')->where(
                    fn (Builder $query) => $query->where('user_id', $this->user()->id),
                ),
            ],
            'is_active' => ['required', 'boolean'],
        ];
    }

    /** @return array{shop_domain: string, default_campaign_id: int|null, is_active: bool} */
    public function integrationData(): array
    {
        return [
            'shop_domain' => $this->string('shop_domain')->toString(),
            'default_campaign_id' => $this->filled('default_campaign_id')
                ? $this->integer('default_campaign_id')
                : null,
            'is_active' => $this->boolean('is_active'),
        ];
    }
}

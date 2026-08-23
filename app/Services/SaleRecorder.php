<?php

namespace App\Services;

use App\Models\CampaignDailySpend;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaleRecorder
{
    public function __construct(private readonly SaleCalculator $calculator) {}

    /**
     * @param  array{
     *     campaign_id: int|null,
     *     source?: string,
     *     external_id?: string|null,
     *     order_number: string|null,
     *     customer_name: string|null,
     *     sold_at: string,
     *     shipping_mode?: 'automatic'|'charged'|'free',
     *     supplier_cost_override_cents?: int|null,
     *     notes: string|null,
     *     items: array<int, array{product_id: int, quantity: int}>
     * }  $data
     */
    public function save(
        User $user,
        array $data,
        ?Sale $sale = null,
        bool $requireCampaignSpend = true,
    ): Sale {
        $soldAt = Carbon::parse($data['sold_at']);

        if ($requireCampaignSpend && $data['campaign_id'] !== null) {
            $hasDailyInvestment = CampaignDailySpend::query()
                ->where('campaign_id', $data['campaign_id'])
                ->whereDate('spend_date', $soldAt->toDateString())
                ->exists();

            if (! $hasDailyInvestment) {
                throw ValidationException::withMessages([
                    'campaign_id' => 'Cadastre o investimento desta campanha na data da venda antes de continuar.',
                ]);
            }
        }

        $calculation = $this->calculator->calculate(
            $user,
            $soldAt,
            $data['items'],
            $data['shipping_mode'] ?? 'automatic',
        );
        $supplierCostOverrideCents = $sale === null
            ? null
            : ($data['supplier_cost_override_cents'] ?? null);
        $productCostCents = $supplierCostOverrideCents ?? $calculation['product_cost_cents'];

        return DB::transaction(function () use (
            $user,
            $data,
            $sale,
            $soldAt,
            $calculation,
            $supplierCostOverrideCents,
            $productCostCents,
        ): Sale {
            $sale ??= new Sale;
            $sale->fill([
                'user_id' => $user->id,
                'source' => $data['source'] ?? $sale->source ?? 'manual',
                'external_id' => $data['external_id'] ?? $sale->external_id,
                'campaign_id' => $data['campaign_id'],
                'order_number' => $data['order_number'],
                'customer_name' => $data['customer_name'],
                'sold_at' => $soldAt,
                'products_subtotal_cents' => $calculation['products_subtotal_cents'],
                'discount_cents' => $calculation['discount_cents'],
                'shipping_cents' => $calculation['shipping_cents'],
                'revenue_cents' => $calculation['revenue_cents'],
                'product_cost_cents' => $productCostCents,
                'supplier_cost_override_cents' => $supplierCostOverrideCents,
                'gross_profit_cents' => $calculation['revenue_cents'] - $productCostCents,
                'notes' => $data['notes'],
            ])->save();

            $sale->items()->delete();
            $sale->items()->createMany($calculation['items']);

            return $sale->load(['campaign', 'items']);
        });
    }
}

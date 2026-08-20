<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignDailySpend;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

class DashboardMetrics
{
    /** @return array<string, mixed> */
    public function build(User $user, CarbonInterface $start, CarbonInterface $end): array
    {
        $sales = Sale::query()
            ->where('user_id', $user->id)
            ->whereBetween('sold_at', [$start->copy()->startOfDay(), $end->copy()->endOfDay()])
            ->with('campaign:id,name')
            ->orderByDesc('sold_at')
            ->get();

        $spends = CampaignDailySpend::query()
            ->whereHas('campaign', fn ($query) => $query->where('user_id', $user->id))
            ->whereDate('spend_date', '>=', $start->toDateString())
            ->whereDate('spend_date', '<=', $end->toDateString())
            ->with('campaign:id,name')
            ->get();

        $adSpend = $spends->sum(fn (CampaignDailySpend $spend): int => $spend->effectiveSpendCents());
        $revenue = (int) $sales->sum('revenue_cents');
        $productCost = (int) $sales->sum('product_cost_cents');
        $profit = $revenue - $productCost - $adSpend;
        $units = $sales->isEmpty()
            ? 0
            : (int) SaleItem::query()->whereIn('sale_id', $sales->pluck('id'))->sum('quantity');
        $recentSales = [];

        foreach ($sales->take(8) as $sale) {
            $recentSales[] = [
                'id' => $sale->id,
                'order_number' => $sale->order_number,
                'customer_name' => $sale->customer_name,
                'sold_at' => $sale->sold_at->toIso8601String(),
                'campaign_name' => $sale->campaign?->name,
                'revenue_cents' => $sale->revenue_cents,
                'product_cost_cents' => $sale->product_cost_cents,
                'gross_profit_cents' => $sale->gross_profit_cents,
            ];
        }

        return [
            'summary' => [
                'orders' => $sales->count(),
                'units' => $units,
                'revenue_cents' => $revenue,
                'products_subtotal_cents' => (int) $sales->sum('products_subtotal_cents'),
                'discount_cents' => (int) $sales->sum('discount_cents'),
                'shipping_cents' => (int) $sales->sum('shipping_cents'),
                'product_cost_cents' => $productCost,
                'ad_spend_cents' => $adSpend,
                'profit_cents' => $profit,
                'roas' => $adSpend > 0 ? round($revenue / $adSpend, 2) : null,
                'margin_percentage' => $revenue > 0 ? round(($profit / $revenue) * 100, 2) : null,
                'average_order_cents' => $sales->isNotEmpty() ? (int) round($revenue / $sales->count()) : 0,
            ],
            'campaigns' => $this->campaignMetrics($user, $sales, $spends),
            'daily' => $this->dailyMetrics($start, $end, $sales, $spends),
            'recent_sales' => $recentSales,
        ];
    }

    /**
     * @param  iterable<int, Sale>  $sales
     * @param  iterable<int, CampaignDailySpend>  $spends
     * @return array<int, array<string, int|float|string|null>>
     */
    private function campaignMetrics(User $user, iterable $sales, iterable $spends): array
    {
        $metrics = [];

        foreach ($sales as $sale) {
            if ($sale->campaign_id === null) {
                continue;
            }

            $metrics[$sale->campaign_id] ??= [
                'orders' => 0,
                'revenue_cents' => 0,
                'product_cost_cents' => 0,
                'ad_spend_cents' => 0,
            ];
            $metrics[$sale->campaign_id]['orders']++;
            $metrics[$sale->campaign_id]['revenue_cents'] += $sale->revenue_cents;
            $metrics[$sale->campaign_id]['product_cost_cents'] += $sale->product_cost_cents;
        }

        foreach ($spends as $spend) {
            $metrics[$spend->campaign_id] ??= [
                'orders' => 0,
                'revenue_cents' => 0,
                'product_cost_cents' => 0,
                'ad_spend_cents' => 0,
            ];
            $metrics[$spend->campaign_id]['ad_spend_cents'] += $spend->effectiveSpendCents();
        }

        $campaigns = Campaign::query()
            ->where('user_id', $user->id)
            ->whereIn('id', array_keys($metrics))
            ->get();
        $rows = [];

        foreach ($campaigns as $campaign) {
            $campaignMetrics = $metrics[$campaign->id];
            $revenue = $campaignMetrics['revenue_cents'];
            $cost = $campaignMetrics['product_cost_cents'];
            $spend = $campaignMetrics['ad_spend_cents'];
            $orders = $campaignMetrics['orders'];

            $rows[] = [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'platform' => $campaign->platform,
                'orders' => $orders,
                'revenue_cents' => $revenue,
                'product_cost_cents' => $cost,
                'ad_spend_cents' => $spend,
                'profit_cents' => $revenue - $cost - $spend,
                'roas' => $spend > 0 ? round($revenue / $spend, 2) : null,
                'cpa_cents' => $orders > 0 ? (int) round($spend / $orders) : null,
            ];
        }

        usort($rows, fn (array $first, array $second): int => $second['revenue_cents'] <=> $first['revenue_cents']);

        return $rows;
    }

    /**
     * @param  iterable<int, Sale>  $sales
     * @param  iterable<int, CampaignDailySpend>  $spends
     * @return array<int, array<string, int|string>>
     */
    private function dailyMetrics(
        CarbonInterface $start,
        CarbonInterface $end,
        iterable $sales,
        iterable $spends,
    ): array {
        $metrics = [];

        foreach ($sales as $sale) {
            $date = $sale->sold_at->toDateString();
            $metrics[$date] ??= [
                'orders' => 0,
                'revenue_cents' => 0,
                'product_cost_cents' => 0,
                'ad_spend_cents' => 0,
            ];
            $metrics[$date]['orders']++;
            $metrics[$date]['revenue_cents'] += $sale->revenue_cents;
            $metrics[$date]['product_cost_cents'] += $sale->product_cost_cents;
        }

        foreach ($spends as $spend) {
            $date = $spend->spend_date->toDateString();
            $metrics[$date] ??= [
                'orders' => 0,
                'revenue_cents' => 0,
                'product_cost_cents' => 0,
                'ad_spend_cents' => 0,
            ];
            $metrics[$date]['ad_spend_cents'] += $spend->effectiveSpendCents();
        }

        $days = [];
        $cursor = Carbon::parse($start->toDateString());

        while ($cursor->lte($end)) {
            $date = $cursor->toDateString();
            $dayMetrics = $metrics[$date] ?? [
                'orders' => 0,
                'revenue_cents' => 0,
                'product_cost_cents' => 0,
                'ad_spend_cents' => 0,
            ];
            $revenue = $dayMetrics['revenue_cents'];
            $cost = $dayMetrics['product_cost_cents'];
            $adSpend = $dayMetrics['ad_spend_cents'];

            $days[] = [
                'date' => $date,
                'orders' => $dayMetrics['orders'],
                'revenue_cents' => $revenue,
                'product_cost_cents' => $cost,
                'ad_spend_cents' => $adSpend,
                'profit_cents' => $revenue - $cost - $adSpend,
            ];

            $cursor->addDay();
        }

        return $days;
    }
}

<?php

use App\Models\Campaign;
use App\Models\CampaignDailySpend;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests cannot visit the consolidated result', function () {
    $this->get(route('consolidated'))->assertRedirect(route('login'));
});

test('it consolidates every sale without using registered campaign spend', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $campaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'Facebook principal',
    ]);
    CampaignDailySpend::create([
        'campaign_id' => $campaign->id,
        'spend_date' => '2026-07-01',
        'budget_cents' => 50000,
        'actual_spend_cents' => 48000,
    ]);

    $firstSale = Sale::create([
        'user_id' => $user->id,
        'campaign_id' => $campaign->id,
        'order_number' => '1001',
        'sold_at' => '2026-06-15 12:00:00',
        'products_subtotal_cents' => 20000,
        'discount_cents' => 2000,
        'shipping_cents' => 1000,
        'revenue_cents' => 19000,
        'product_cost_cents' => 7000,
        'gross_profit_cents' => 12000,
    ]);
    $secondSale = Sale::create([
        'user_id' => $user->id,
        'campaign_id' => null,
        'order_number' => '1002',
        'sold_at' => '2026-08-20 15:00:00',
        'products_subtotal_cents' => 15000,
        'discount_cents' => 0,
        'shipping_cents' => 0,
        'revenue_cents' => 15000,
        'product_cost_cents' => 5000,
        'gross_profit_cents' => 10000,
    ]);

    foreach ([[$firstSale, 2], [$secondSale, 3]] as [$sale, $quantity]) {
        SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => null,
            'product_name' => 'Produto histórico',
            'category_name' => 'Categoria histórica',
            'quantity' => $quantity,
            'unit_price_cents' => 5000,
            'gross_amount_cents' => 5000 * $quantity,
            'discount_basis_points' => 0,
            'discount_amount_cents' => 0,
            'net_amount_cents' => 5000 * $quantity,
            'unit_cost_cents' => 1000,
            'cost_amount_cents' => 1000 * $quantity,
        ]);
    }

    Sale::create([
        'user_id' => $otherUser->id,
        'campaign_id' => null,
        'order_number' => 'OTHER-1',
        'sold_at' => '2026-08-20 16:00:00',
        'products_subtotal_cents' => 99900,
        'discount_cents' => 0,
        'shipping_cents' => 0,
        'revenue_cents' => 99900,
        'product_cost_cents' => 100,
        'gross_profit_cents' => 99800,
    ]);

    $this->actingAs($user)
        ->get(route('consolidated'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('consolidated')
            ->where('summary.orders', 2)
            ->where('summary.units', 5)
            ->where('summary.products_subtotal_cents', 35000)
            ->where('summary.discount_cents', 2000)
            ->where('summary.product_revenue_cents', 33000)
            ->where('summary.shipping_cents', 1000)
            ->where('summary.product_cost_cents', 12000)
            ->where('summary.product_profit_cents', 21000)
            ->missing('summary.ad_spend_cents')
            ->missing('campaigns'));
});

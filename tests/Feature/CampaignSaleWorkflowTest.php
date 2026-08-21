<?php

use App\Models\Campaign;
use App\Models\CampaignDailySpend;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('campaign sales require an investment entry for the same date', function () {
    $user = User::factory()->create();
    $category = Category::create([
        'user_id' => $user->id,
        'name' => 'DUMP',
    ]);
    $product = Product::create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'name' => 'Dump',
        'sale_price_cents' => 3000,
        'base_cost_cents' => 900,
    ]);
    $campaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'Dump | Purchase',
    ]);

    $response = $this->actingAs($user)->post(route('sales.store'), [
        'campaign_id' => $campaign->id,
        'order_number' => '1001',
        'customer_name' => 'Customer',
        'sold_at' => '2026-08-20T12:00',
        'notes' => null,
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1],
        ],
    ]);

    $response->assertSessionHasErrors('campaign_id');
    $this->assertDatabaseCount('sales', 0);
});

test('daily investments and sales feed overall and campaign profitability', function () {
    $user = User::factory()->create();
    $category = Category::create([
        'user_id' => $user->id,
        'name' => 'DUMP',
    ]);
    $product = Product::create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'name' => 'Dump',
        'sale_price_cents' => 5000,
        'base_cost_cents' => 1000,
    ]);
    $mainCampaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'Main',
    ]);
    $newCampaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'Test',
    ]);

    $investmentResponse = $this->actingAs($user)->post(route('campaign-spends.store'), [
        'spend_date' => '2026-08-20',
        'entries' => [
            ['campaign_id' => $mainCampaign->id, 'budget' => '300.00', 'actual_spend' => null],
            ['campaign_id' => $newCampaign->id, 'budget' => '40.00', 'actual_spend' => null],
        ],
    ]);
    $investmentResponse->assertRedirect(route('campaign-spends.index', ['date' => '2026-08-20']));

    $saleResponse = $this->actingAs($user)->post(route('sales.store'), [
        'campaign_id' => $mainCampaign->id,
        'order_number' => '1001',
        'customer_name' => null,
        'sold_at' => '2026-08-20T12:00',
        'notes' => null,
        'items' => [
            ['product_id' => $product->id, 'quantity' => 2],
        ],
    ]);
    $saleResponse->assertRedirect(route('sales.index'));

    expect(CampaignDailySpend::query()->sum('budget_cents'))->toBe(34000);
    $sale = Sale::query()->firstOrFail();
    expect($sale)
        ->revenue_cents->toBe(10000)
        ->product_cost_cents->toBe(2000)
        ->gross_profit_cents->toBe(8000);

    $dashboardResponse = $this->actingAs($user)->get(route('dashboard', [
        'start_date' => '2026-08-20',
        'end_date' => '2026-08-20',
    ]));

    $dashboardResponse->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('summary.orders', 1)
        ->where('summary.revenue_cents', 10000)
        ->where('summary.product_cost_cents', 2000)
        ->where('summary.ad_spend_cents', 34000)
        ->where('summary.profit_cents', -26000)
        ->has('campaigns', 2)
        ->where('campaigns.0.name', 'Main')
        ->where('campaigns.0.profit_cents', -22000)
        ->where('campaigns.1.name', 'Test')
        ->where('campaigns.1.revenue_cents', 0)
        ->where('campaigns.1.profit_cents', -4000));
});

test('adding a campaign to a filled day updates existing investments', function () {
    $user = User::factory()->create();
    $mainCampaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'Main',
    ]);
    $newCampaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'New',
    ]);
    $existingSpend = CampaignDailySpend::create([
        'campaign_id' => $mainCampaign->id,
        'spend_date' => '2026-08-18',
        'budget_cents' => 25000,
        'actual_spend_cents' => 24750,
    ]);

    $response = $this->actingAs($user)->post(route('campaign-spends.store'), [
        'spend_date' => '2026-08-18',
        'entries' => [
            ['campaign_id' => $mainCampaign->id, 'budget' => '300.00', 'actual_spend' => null],
            ['campaign_id' => $newCampaign->id, 'budget' => '40.00', 'actual_spend' => null],
        ],
    ]);

    $response->assertRedirect(route('campaign-spends.index', ['date' => '2026-08-18']));
    $this->assertDatabaseCount('campaign_daily_spends', 2);
    expect($existingSpend->refresh())
        ->budget_cents->toBe(30000)
        ->actual_spend_cents->toBeNull();
    $this->assertDatabaseHas('campaign_daily_spends', [
        'campaign_id' => $newCampaign->id,
        'budget_cents' => 4000,
        'actual_spend_cents' => null,
    ]);
});

test('actual spend replaces the planned budget in reports', function () {
    $user = User::factory()->create();
    $campaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'Main',
    ]);
    CampaignDailySpend::create([
        'campaign_id' => $campaign->id,
        'spend_date' => '2026-08-20',
        'budget_cents' => 30000,
        'actual_spend_cents' => 28745,
    ]);

    $response = $this->actingAs($user)->get(route('dashboard', [
        'start_date' => '2026-08-20',
        'end_date' => '2026-08-20',
    ]));

    $response->assertInertia(fn (Assert $page) => $page
        ->where('summary.ad_spend_cents', 28745)
        ->where('campaigns.0.ad_spend_cents', 28745));
});

test('investment calendar shows filled days and campaign budgets for the selected month', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $mainCampaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'Main',
    ]);
    $testCampaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'Test',
    ]);
    $otherCampaign = Campaign::create([
        'user_id' => $otherUser->id,
        'name' => 'Other',
    ]);

    CampaignDailySpend::insert([
        [
            'campaign_id' => $mainCampaign->id,
            'spend_date' => '2026-08-02',
            'budget_cents' => 30000,
            'actual_spend_cents' => 28745,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'campaign_id' => $testCampaign->id,
            'spend_date' => '2026-08-02',
            'budget_cents' => 4000,
            'actual_spend_cents' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'campaign_id' => $mainCampaign->id,
            'spend_date' => '2026-08-19',
            'budget_cents' => 45000,
            'actual_spend_cents' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'campaign_id' => $mainCampaign->id,
            'spend_date' => '2026-07-31',
            'budget_cents' => 25000,
            'actual_spend_cents' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'campaign_id' => $otherCampaign->id,
            'spend_date' => '2026-08-02',
            'budget_cents' => 99900,
            'actual_spend_cents' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $response = $this->actingAs($user)->get(route('campaign-spends.index', [
        'date' => '2026-08-20',
    ]));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('campaign-spends/index')
        ->where('calendar.month', '2026-08')
        ->where('calendar.previous_month_date', '2026-07-01')
        ->where('calendar.next_month_date', '2026-09-01')
        ->where('calendar.days_count', 2)
        ->where('calendar.budget_total_cents', 79000)
        ->has('calendar.days', 2)
        ->where('calendar.days.0.date', '2026-08-02')
        ->where('calendar.days.0.budget_total_cents', 34000)
        ->has('calendar.days.0.entries', 2)
        ->where('calendar.days.0.entries.0.campaign_name', 'Main')
        ->where('calendar.days.0.entries.0.budget_cents', 30000)
        ->where('calendar.days.0.entries.0.actual_spend_cents', 28745)
        ->where('calendar.days.0.entries.1.campaign_name', 'Test')
        ->where('calendar.days.0.entries.1.budget_cents', 4000)
        ->where('calendar.days.1.date', '2026-08-19')
        ->where('calendar.days.1.budget_total_cents', 45000));
});

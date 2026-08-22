<?php

use App\Models\Sale;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('dashboard includes every calendar day in the selected range', function () {
    $user = User::factory()->create();

    foreach ([
        ['order_number' => '1001', 'sold_at' => '2026-08-09 12:00:00', 'revenue' => 10000, 'cost' => 4000],
        ['order_number' => '1002', 'sold_at' => '2026-08-20 12:00:00', 'revenue' => 5000, 'cost' => 2000],
    ] as $sale) {
        Sale::create([
            'user_id' => $user->id,
            'campaign_id' => null,
            'order_number' => $sale['order_number'],
            'sold_at' => $sale['sold_at'],
            'products_subtotal_cents' => $sale['revenue'],
            'discount_cents' => 0,
            'shipping_cents' => 0,
            'revenue_cents' => $sale['revenue'],
            'product_cost_cents' => $sale['cost'],
            'gross_profit_cents' => $sale['revenue'] - $sale['cost'],
        ]);
    }

    $this->actingAs($user)
        ->get(route('dashboard', [
            'start_date' => '2026-08-09',
            'end_date' => '2026-08-20',
        ]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->has('daily', 12)
            ->where('daily.0.date', '2026-08-09')
            ->where('daily.0.orders', 1)
            ->where('daily.0.profit_cents', 6000)
            ->where('daily.1.date', '2026-08-10')
            ->where('daily.1.orders', 0)
            ->where('daily.11.date', '2026-08-20')
            ->where('daily.11.orders', 1)
            ->where('daily.11.profit_cents', 3000));
});

test('dashboard compares the selected range with the immediately previous period', function () {
    $user = User::factory()->create();

    foreach ([
        ['order_number' => 'PREVIOUS', 'sold_at' => '2026-08-08 12:00:00', 'revenue' => 5000, 'cost' => 2000],
        ['order_number' => 'CURRENT', 'sold_at' => '2026-08-10 12:00:00', 'revenue' => 10000, 'cost' => 4000],
    ] as $sale) {
        Sale::create([
            'user_id' => $user->id,
            'campaign_id' => null,
            'order_number' => $sale['order_number'],
            'sold_at' => $sale['sold_at'],
            'products_subtotal_cents' => $sale['revenue'],
            'discount_cents' => 0,
            'shipping_cents' => 0,
            'revenue_cents' => $sale['revenue'],
            'product_cost_cents' => $sale['cost'],
            'gross_profit_cents' => $sale['revenue'] - $sale['cost'],
        ]);
    }

    $this->actingAs($user)
        ->get(route('dashboard', [
            'start_date' => '2026-08-10',
            'end_date' => '2026-08-11',
        ]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('summary.revenue_cents', 10000)
            ->where('comparison.start_date', '2026-08-08')
            ->where('comparison.end_date', '2026-08-09')
            ->where('comparison.summary.revenue_cents', 5000)
            ->where('comparison.summary.product_cost_cents', 2000)
            ->where('comparison.summary.profit_cents', 3000));
});

<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('dashboard period is remembered when returning without query parameters', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('dashboard', [
        'start_date' => '2026-08-09',
        'end_date' => '2026-08-20',
    ]))->assertOk();

    $this->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.start_date', '2026-08-09')
            ->where('filters.end_date', '2026-08-20'));
});

test('product search is remembered after leaving its index', function () {
    $user = User::factory()->create();
    $category = Category::create([
        'user_id' => $user->id,
        'name' => 'Products',
    ]);

    foreach (['Halloween Dumpling', 'Bread Squishy'] as $name) {
        Product::create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'name' => $name,
            'sale_price_cents' => 2000,
            'base_cost_cents' => 900,
        ]);
    }

    $this->actingAs($user)
        ->get(route('products.index', ['search' => 'Halloween']))
        ->assertOk();

    $this->get(route('products.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.search', 'Halloween')
            ->has('products', 1)
            ->where('products.0.name', 'Halloween Dumpling'));
});

test('selected investment date is remembered', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('campaign-spends.index', ['date' => '2026-08-14']))
        ->assertOk();

    $this->get(route('campaign-spends.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('date', '2026-08-14')
            ->where('calendar.month', '2026-08'));
});

<?php

use App\Models\Category;
use App\Models\Discount;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\SaleCalculator;
use Illuminate\Support\Carbon;

test('it applies only the best eligible category discount across mixed products', function () {
    $user = User::factory()->create();
    $category = Category::create([
        'user_id' => $user->id,
        'name' => 'DUMP',
    ]);
    $firstProduct = Product::create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'name' => 'Dump A',
        'sale_price_cents' => 2000,
        'base_cost_cents' => 950,
    ]);
    $secondProduct = Product::create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'name' => 'Dump B',
        'sale_price_cents' => 1500,
        'base_cost_cents' => 700,
    ]);
    $discount = Discount::create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'name' => 'Leve mais',
    ]);
    $discount->tiers()->createMany([
        ['min_quantity' => 3, 'percentage_basis_points' => 1000],
        ['min_quantity' => 6, 'percentage_basis_points' => 2000],
    ]);

    $result = app(SaleCalculator::class)->calculate($user, Carbon::parse('2026-08-20'), [
        ['product_id' => $firstProduct->id, 'quantity' => 2],
        ['product_id' => $secondProduct->id, 'quantity' => 4],
    ]);

    expect($result)
        ->products_subtotal_cents->toBe(10000)
        ->discount_cents->toBe(2000)
        ->shipping_cents->toBe(0)
        ->revenue_cents->toBe(8000)
        ->product_cost_cents->toBe(4700)
        ->gross_profit_cents->toBe(3300)
        ->and($result['items'][0]['discount_basis_points'])->toBe(2000)
        ->and($result['items'][1]['discount_basis_points'])->toBe(2000);
});

test('it applies the supplier unit cost tier for the product quantity', function () {
    $user = User::factory()->create();
    $category = Category::create([
        'user_id' => $user->id,
        'name' => 'Bundles',
    ]);
    $product = Product::create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'name' => 'Bundle',
        'sale_price_cents' => 1500,
        'base_cost_cents' => 950,
    ]);
    $product->costTiers()->create([
        'min_quantity' => 3,
        'unit_cost_cents' => 900,
    ]);

    $result = app(SaleCalculator::class)->calculate($user, Carbon::parse('2026-08-20'), [
        ['product_id' => $product->id, 'quantity' => 3],
    ]);

    expect($result['product_cost_cents'])->toBe(2700)
        ->and($result['items'][0]['unit_cost_cents'])->toBe(900);
});

test('free shipping uses the subtotal before discounts', function () {
    $user = User::factory()->create();
    StoreSetting::create([
        'user_id' => $user->id,
        'currency' => 'USD',
        'fixed_shipping_cents' => 1200,
        'free_shipping_threshold_cents' => 9000,
    ]);
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
    $discount = Discount::create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'name' => 'Leve 3',
    ]);
    $discount->tiers()->create([
        'min_quantity' => 3,
        'percentage_basis_points' => 1000,
    ]);

    $result = app(SaleCalculator::class)->calculate($user, Carbon::parse('2026-08-20'), [
        ['product_id' => $product->id, 'quantity' => 3],
    ]);

    expect($result)
        ->products_subtotal_cents->toBe(9000)
        ->discount_cents->toBe(900)
        ->shipping_cents->toBe(0)
        ->revenue_cents->toBe(8100);
});

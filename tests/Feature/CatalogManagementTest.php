<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;

test('a user can create a product with supplier cost tiers', function () {
    $user = User::factory()->create();
    $category = Category::create([
        'user_id' => $user->id,
        'name' => 'DUMP',
    ]);

    $response = $this->actingAs($user)->post(route('products.store'), [
        'category_id' => $category->id,
        'name' => 'Dump Classic',
        'sku' => 'DUMP-001',
        'sale_price' => '19.90',
        'base_cost' => '9.50',
        'is_active' => true,
        'cost_tiers' => [
            ['min_quantity' => 3, 'unit_cost' => '9.00'],
            ['min_quantity' => 6, 'unit_cost' => '8.25'],
        ],
    ]);

    $response->assertRedirect(route('products.index'));
    $product = Product::query()->where('name', 'Dump Classic')->firstOrFail();

    expect($product)
        ->sale_price_cents->toBe(1990)
        ->base_cost_cents->toBe(950)
        ->and($product->costTiers()->pluck('unit_cost_cents')->all())->toBe([900, 825]);
});

test('a user cannot update another users product', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $category = Category::create([
        'user_id' => $owner->id,
        'name' => 'DUMP',
    ]);
    $otherCategory = Category::create([
        'user_id' => $otherUser->id,
        'name' => 'DUMP',
    ]);
    $product = Product::create([
        'user_id' => $owner->id,
        'category_id' => $category->id,
        'name' => 'Private product',
        'sale_price_cents' => 1000,
        'base_cost_cents' => 500,
    ]);

    $response = $this->actingAs($otherUser)->put(route('products.update', $product), [
        'category_id' => $otherCategory->id,
        'name' => 'Changed',
        'sku' => null,
        'sale_price' => '10.00',
        'base_cost' => '5.00',
        'is_active' => true,
        'cost_tiers' => [],
    ]);

    $response->assertNotFound();
    expect($product->fresh()->name)->toBe('Private product');
});

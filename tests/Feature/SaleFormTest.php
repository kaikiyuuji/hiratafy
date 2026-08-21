<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StoreSetting;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('new sales suggest the next numeric order number for the user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    createSaleForOrderNumber($user, '1008');
    createSaleForOrderNumber($user, '1010');
    createSaleForOrderNumber($user, 'WEB-9999');
    createSaleForOrderNumber($otherUser, '9000');

    $response = $this->actingAs($user)->get(route('sales.create'));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('sales/form')
        ->where('sale', null)
        ->where('nextOrderNumber', '1011'));
});

test('editing a sale keeps its order number without a new suggestion', function () {
    $user = User::factory()->create();
    $sale = createSaleForOrderNumber($user, '1005');
    createSaleForOrderNumber($user, '1024');

    $response = $this->actingAs($user)->get(route('sales.edit', $sale));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('sales/form')
        ->where('sale.order_number', '1005')
        ->where('sale.shipping_mode', 'free')
        ->missing('nextOrderNumber'));
});

test('shipping can be charged on create and removed on edit', function () {
    $user = User::factory()->create();
    StoreSetting::create([
        'user_id' => $user->id,
        'currency' => 'USD',
        'fixed_shipping_cents' => 490,
        'free_shipping_threshold_cents' => 10000,
    ]);
    $category = Category::create([
        'user_id' => $user->id,
        'name' => 'Products',
    ]);
    $product = Product::create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'name' => 'Product',
        'sale_price_cents' => 2000,
        'base_cost_cents' => 900,
    ]);
    $saleData = [
        'campaign_id' => null,
        'order_number' => '1001',
        'customer_name' => null,
        'sold_at' => '2026-08-20T12:00',
        'shipping_mode' => 'charged',
        'notes' => null,
        'items' => [
            ['product_id' => $product->id, 'quantity' => 6],
        ],
    ];

    $createResponse = $this->actingAs($user)->post(route('sales.store'), $saleData);
    $createResponse->assertRedirect(route('sales.index'));

    $sale = Sale::query()->where('user_id', $user->id)->firstOrFail();
    expect($sale)
        ->shipping_cents->toBe(490)
        ->revenue_cents->toBe(12490);

    $updateResponse = $this->actingAs($user)->put(route('sales.update', $sale), [
        ...$saleData,
        'shipping_mode' => 'free',
    ]);
    $updateResponse->assertRedirect(route('sales.index'));

    expect($sale->refresh())
        ->shipping_cents->toBe(0)
        ->revenue_cents->toBe(12000);
});

function createSaleForOrderNumber(User $user, string $orderNumber): Sale
{
    return Sale::create([
        'user_id' => $user->id,
        'campaign_id' => null,
        'order_number' => $orderNumber,
        'customer_name' => null,
        'sold_at' => '2026-08-20 12:00:00',
        'products_subtotal_cents' => 1000,
        'discount_cents' => 0,
        'shipping_cents' => 0,
        'revenue_cents' => 1000,
        'product_cost_cents' => 500,
        'gross_profit_cents' => 500,
        'notes' => null,
    ]);
}

<?php

use App\Models\Sale;
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
        ->missing('nextOrderNumber'));
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

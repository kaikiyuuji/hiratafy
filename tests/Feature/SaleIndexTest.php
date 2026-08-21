<?php

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('sales can be filtered by their total item quantity', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    $matchingSale = createIndexedSale($user, 'TOTAL-5');
    createIndexedSaleItem($matchingSale, 2, 'First product');
    createIndexedSaleItem($matchingSale, 3, 'Second product');

    $otherQuantitySale = createIndexedSale($user, 'TOTAL-3');
    createIndexedSaleItem($otherQuantitySale, 3, 'Third product');

    $otherUserSale = createIndexedSale($otherUser, 'OTHER-TOTAL-5');
    createIndexedSaleItem($otherUserSale, 5, 'Other user product');

    $this->actingAs($user)
        ->get(route('sales.index', [
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-31',
            'items_count' => 5,
        ]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('sales/index')
            ->where('filters.items_count', 5)
            ->has('sales.data', 1)
            ->where('sales.data.0.order_number', 'TOTAL-5')
            ->where('sales.data.0.items_count', 5));
});

function createIndexedSale(User $user, string $orderNumber): Sale
{
    return Sale::create([
        'user_id' => $user->id,
        'campaign_id' => null,
        'order_number' => $orderNumber,
        'sold_at' => '2026-08-20 12:00:00',
        'products_subtotal_cents' => 10000,
        'discount_cents' => 0,
        'shipping_cents' => 0,
        'revenue_cents' => 10000,
        'product_cost_cents' => 4000,
        'gross_profit_cents' => 6000,
    ]);
}

function createIndexedSaleItem(Sale $sale, int $quantity, string $productName): SaleItem
{
    return SaleItem::create([
        'sale_id' => $sale->id,
        'product_id' => null,
        'product_name' => $productName,
        'category_name' => 'Category',
        'quantity' => $quantity,
        'unit_price_cents' => 1000,
        'gross_amount_cents' => 1000 * $quantity,
        'discount_basis_points' => 0,
        'discount_amount_cents' => 0,
        'net_amount_cents' => 1000 * $quantity,
        'unit_cost_cents' => 400,
        'cost_amount_cents' => 400 * $quantity,
    ]);
}

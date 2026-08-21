<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;

class ConsolidatedMetrics
{
    /** @return array<string, int|string|null> */
    public function build(User $user): array
    {
        $sales = Sale::query()->where('user_id', $user->id);
        $orders = (clone $sales)->count();
        $productsSubtotal = (int) (clone $sales)->sum('products_subtotal_cents');
        $discount = (int) (clone $sales)->sum('discount_cents');
        $shipping = (int) (clone $sales)->sum('shipping_cents');
        $productCost = (int) (clone $sales)->sum('product_cost_cents');
        $productRevenue = $productsSubtotal - $discount;
        $firstSale = (clone $sales)->oldest('sold_at')->first(['sold_at']);
        $lastSale = (clone $sales)->latest('sold_at')->first(['sold_at']);

        $units = (int) SaleItem::query()
            ->whereHas('sale', fn ($query) => $query->where('user_id', $user->id))
            ->sum('quantity');

        return [
            'orders' => $orders,
            'units' => $units,
            'products_subtotal_cents' => $productsSubtotal,
            'discount_cents' => $discount,
            'product_revenue_cents' => $productRevenue,
            'shipping_cents' => $shipping,
            'product_cost_cents' => $productCost,
            'product_profit_cents' => $productRevenue - $productCost,
            'first_sale_at' => $firstSale?->sold_at->toIso8601String(),
            'last_sale_at' => $lastSale?->sold_at->toIso8601String(),
        ];
    }
}

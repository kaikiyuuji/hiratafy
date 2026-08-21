<?php

namespace App\Services;

use App\Models\Discount;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class SaleCalculator
{
    /**
     * @param  array<int, array{product_id: int, quantity: int}>  $rawItems
     * @param  'automatic'|'charged'|'free'  $shippingMode
     * @return array{
     *     products_subtotal_cents: int,
     *     discount_cents: int,
     *     shipping_cents: int,
     *     revenue_cents: int,
     *     product_cost_cents: int,
     *     gross_profit_cents: int,
     *     items: array<int, array<string, int|string>>
     * }
     */
    public function calculate(
        User $user,
        CarbonInterface $soldAt,
        array $rawItems,
        string $shippingMode = 'automatic',
    ): array {
        $quantities = collect($rawItems)
            ->groupBy('product_id')
            ->map(fn (Collection $items): int => $items->sum('quantity'));

        $products = Product::query()
            ->where('user_id', $user->id)
            ->whereIn('id', $quantities->keys())
            ->with(['category', 'costTiers'])
            ->get()
            ->keyBy('id');

        if ($products->count() !== $quantities->count()) {
            throw ValidationException::withMessages([
                'items' => 'Um ou mais produtos não existem ou não pertencem à sua conta.',
            ]);
        }

        $categoryQuantities = $products
            ->groupBy('category_id')
            ->map(fn (Collection $categoryProducts): int => $categoryProducts->sum(
                fn (Product $product): int => (int) $quantities->get($product->id),
            ));

        $discounts = Discount::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->whereIn('category_id', $categoryQuantities->keys())
            ->where(fn ($query) => $query
                ->whereNull('starts_on')
                ->orWhereDate('starts_on', '<=', $soldAt->toDateString()))
            ->where(fn ($query) => $query
                ->whereNull('ends_on')
                ->orWhereDate('ends_on', '>=', $soldAt->toDateString()))
            ->with('tiers')
            ->get()
            ->groupBy('category_id');

        $categoryDiscounts = $categoryQuantities->map(
            function (int $quantity, int $categoryId) use ($discounts): int {
                return $discounts->get($categoryId, collect())
                    ->flatMap->tiers
                    ->filter(fn ($tier): bool => $tier->min_quantity <= $quantity)
                    ->max('percentage_basis_points') ?? 0;
            },
        );

        $items = [];
        $subtotal = 0;
        $discountTotal = 0;
        $costTotal = 0;

        foreach ($products as $product) {
            $quantity = (int) $quantities->get($product->id);
            $gross = $product->sale_price_cents * $quantity;
            $discountBasisPoints = (int) $categoryDiscounts->get($product->category_id, 0);
            $discount = $this->percentageOf($gross, $discountBasisPoints);
            $eligibleCostTier = $product->costTiers
                ->where('min_quantity', '<=', $quantity)
                ->sortByDesc('min_quantity')
                ->first();
            $unitCost = $eligibleCostTier === null
                ? $product->base_cost_cents
                : $eligibleCostTier->unit_cost_cents;
            $cost = $unitCost * $quantity;

            $items[] = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'category_name' => $product->category->name,
                'quantity' => $quantity,
                'unit_price_cents' => $product->sale_price_cents,
                'gross_amount_cents' => $gross,
                'discount_basis_points' => $discountBasisPoints,
                'discount_amount_cents' => $discount,
                'net_amount_cents' => $gross - $discount,
                'unit_cost_cents' => $unitCost,
                'cost_amount_cents' => $cost,
            ];

            $subtotal += $gross;
            $discountTotal += $discount;
            $costTotal += $cost;
        }

        $settings = StoreSetting::forUser($user);
        $shipping = match ($shippingMode) {
            'charged' => $subtotal > 0 ? $settings->fixed_shipping_cents : 0,
            'free' => 0,
            default => $subtotal > 0 && $subtotal < $settings->free_shipping_threshold_cents
                ? $settings->fixed_shipping_cents
                : 0,
        };
        $revenue = $subtotal - $discountTotal + $shipping;

        return [
            'products_subtotal_cents' => $subtotal,
            'discount_cents' => $discountTotal,
            'shipping_cents' => $shipping,
            'revenue_cents' => $revenue,
            'product_cost_cents' => $costTotal,
            'gross_profit_cents' => $revenue - $costTotal,
            'items' => $items,
        ];
    }

    private function percentageOf(int $amountCents, int $basisPoints): int
    {
        return intdiv(($amountCents * $basisPoints) + 5000, 10000);
    }
}

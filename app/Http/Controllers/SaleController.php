<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesOwnership;
use App\Http\Requests\SaleRequest;
use App\Models\Campaign;
use App\Models\Discount;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\SaleRecorder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    use AuthorizesOwnership;

    public function index(Request $request): Response
    {
        $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'campaign_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $startDate = $request->filled('start_date')
            ? $request->string('start_date')->toString()
            : now()->startOfMonth()->toDateString();
        $endDate = $request->filled('end_date')
            ? $request->string('end_date')->toString()
            : now()->toDateString();
        $campaignId = $request->filled('campaign_id') ? $request->integer('campaign_id') : null;
        $search = $request->string('search')->trim()->toString();

        $sales = Sale::query()
            ->where('user_id', $user->id)
            ->whereBetween('sold_at', ["{$startDate} 00:00:00", "{$endDate} 23:59:59"])
            ->when($campaignId !== null, fn ($query) => $query->where('campaign_id', $campaignId))
            ->when($search !== '', fn ($query) => $query->where(
                fn ($nested) => $nested
                    ->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%"),
            ))
            ->with(['campaign:id,name', 'items:id,sale_id,quantity'])
            ->orderByDesc('sold_at')
            ->paginate(20)
            ->withQueryString();
        $saleRows = [];

        foreach ($sales->items() as $sale) {
            $saleRows[] = [
                'id' => $sale->id,
                'order_number' => $sale->order_number,
                'customer_name' => $sale->customer_name,
                'sold_at' => $sale->sold_at->toIso8601String(),
                'campaign_name' => $sale->campaign?->name,
                'items_count' => $sale->items->sum('quantity'),
                'products_subtotal_cents' => $sale->products_subtotal_cents,
                'discount_cents' => $sale->discount_cents,
                'shipping_cents' => $sale->shipping_cents,
                'revenue_cents' => $sale->revenue_cents,
                'product_cost_cents' => $sale->product_cost_cents,
                'gross_profit_cents' => $sale->gross_profit_cents,
            ];
        }

        return Inertia::render('sales/index', [
            'sales' => [
                'data' => $saleRows,
                'current_page' => $sales->currentPage(),
                'last_page' => $sales->lastPage(),
                'from' => $sales->firstItem(),
                'to' => $sales->lastItem(),
                'total' => $sales->total(),
                'prev_page_url' => $sales->previousPageUrl(),
                'next_page_url' => $sales->nextPageUrl(),
            ],
            'campaigns' => $this->campaignOptions($user),
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'campaign_id' => $campaignId,
                'search' => $search,
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return Inertia::render('sales/form', [
            ...$this->formProps($user),
            'sale' => null,
            'nextOrderNumber' => $this->nextOrderNumber($user),
        ]);
    }

    public function store(SaleRequest $request, SaleRecorder $recorder): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $recorder->save($user, $request->saleData());

        return to_route('sales.index')->with('toast', [
            'type' => 'success',
            'message' => 'Venda registrada e valores calculados.',
        ]);
    }

    public function edit(Request $request, Sale $sale): Response
    {
        $this->authorizeOwnership($request, $sale);
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $sale->load(['items', 'campaign:id,name']);

        return Inertia::render('sales/form', [
            ...$this->formProps($user, $sale),
            'sale' => [
                'id' => $sale->id,
                'campaign_id' => $sale->campaign_id,
                'order_number' => $sale->order_number,
                'customer_name' => $sale->customer_name,
                'sold_at' => $sale->sold_at->format('Y-m-d\TH:i'),
                'notes' => $sale->notes,
                'products_subtotal_cents' => $sale->products_subtotal_cents,
                'discount_cents' => $sale->discount_cents,
                'shipping_cents' => $sale->shipping_cents,
                'revenue_cents' => $sale->revenue_cents,
                'product_cost_cents' => $sale->product_cost_cents,
                'gross_profit_cents' => $sale->gross_profit_cents,
                'items' => $sale->items->map(fn ($item): array => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                ])->values(),
            ],
        ]);
    }

    public function update(SaleRequest $request, Sale $sale, SaleRecorder $recorder): RedirectResponse
    {
        $this->authorizeOwnership($request, $sale);
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $recorder->save($user, $request->saleData(), $sale);

        return to_route('sales.index')->with('toast', [
            'type' => 'success',
            'message' => 'Venda recalculada e atualizada.',
        ]);
    }

    public function destroy(Request $request, Sale $sale): RedirectResponse
    {
        $this->authorizeOwnership($request, $sale);
        $sale->delete();

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Venda excluída.',
        ]);
    }

    /** @return array<string, mixed> */
    private function formProps(User $user, ?Sale $sale = null): array
    {
        $existingProductIds = $sale?->items->pluck('product_id')->filter()->all() ?? [];
        $products = Product::query()
            ->where('user_id', $user->id)
            ->where(fn ($query) => $query
                ->where('is_active', true)
                ->when($existingProductIds !== [], fn ($nested) => $nested->orWhereIn('id', $existingProductIds)))
            ->with(['category:id,name', 'costTiers'])
            ->orderBy('name')
            ->get()
            ->map(function (Product $product): array {
                $costTiers = [];

                foreach ($product->costTiers as $tier) {
                    $costTiers[] = [
                        'min_quantity' => $tier->min_quantity,
                        'unit_cost_cents' => $tier->unit_cost_cents,
                    ];
                }

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'category_id' => $product->category_id,
                    'category_name' => $product->category->name,
                    'sale_price_cents' => $product->sale_price_cents,
                    'base_cost_cents' => $product->base_cost_cents,
                    'cost_tiers' => $costTiers,
                ];
            });

        $discounts = Discount::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->with('tiers')
            ->get()
            ->map(fn (Discount $discount): array => [
                'category_id' => $discount->category_id,
                'starts_on' => $discount->starts_on?->toDateString(),
                'ends_on' => $discount->ends_on?->toDateString(),
                'tiers' => $discount->tiers->map(fn ($tier): array => [
                    'min_quantity' => $tier->min_quantity,
                    'percentage_basis_points' => $tier->percentage_basis_points,
                ])->values()->all(),
            ]);
        $settings = StoreSetting::forUser($user);

        return [
            'products' => $products,
            'discounts' => $discounts,
            'campaigns' => $this->campaignOptions($user, true),
            'settings' => [
                'fixed_shipping_cents' => $settings->fixed_shipping_cents,
                'free_shipping_threshold_cents' => $settings->free_shipping_threshold_cents,
            ],
        ];
    }

    private function nextOrderNumber(User $user): string
    {
        $highestOrderNumber = 0;
        $orderNumbers = Sale::query()
            ->where('user_id', $user->id)
            ->whereNotNull('order_number')
            ->pluck('order_number');

        foreach ($orderNumbers as $orderNumber) {
            $numericOrderNumber = (string) $orderNumber;

            if (ctype_digit($numericOrderNumber)) {
                $highestOrderNumber = max($highestOrderNumber, (int) $numericOrderNumber);
            }
        }

        return (string) ($highestOrderNumber + 1);
    }

    /** @return array<int, array<string, mixed>> */
    private function campaignOptions(User $user, bool $withSpendDates = false): array
    {
        return Campaign::query()
            ->where('user_id', $user->id)
            ->when($withSpendDates, fn ($query) => $query->with('dailySpends:id,campaign_id,spend_date'))
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get()
            ->map(fn (Campaign $campaign): array => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'is_active' => $campaign->is_active,
                'spend_dates' => $withSpendDates
                    ? $campaign->dailySpends
                        ->map(fn ($spend): string => $spend->spend_date->toDateString())
                        ->values()
                        ->all()
                    : [],
            ])->all();
    }
}

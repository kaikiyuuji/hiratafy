<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesOwnership;
use App\Http\Controllers\Concerns\RemembersFilters;
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
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    use AuthorizesOwnership, RemembersFilters;

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $filters = $this->rememberedFilters(
            $request,
            'sales',
            [
                'start_date' => now()->startOfMonth()->toDateString(),
                'end_date' => now()->toDateString(),
                'campaign_id' => null,
                'items_count' => null,
                'search' => '',
                'sort' => 'latest',
            ],
            [
                'start_date' => ['required', 'date'],
                'end_date' => ['required', 'date', 'after_or_equal:start_date'],
                'campaign_id' => ['nullable', 'integer'],
                'items_count' => ['nullable', 'integer', 'min:1', 'max:5000000'],
                'search' => ['nullable', 'string', 'max:100'],
                'sort' => [
                    'required',
                    Rule::in([
                        'latest',
                        'oldest',
                        'customer_asc',
                        'customer_desc',
                        'revenue_desc',
                        'profit_desc',
                        'items_desc',
                    ]),
                ],
            ],
        );
        $startDate = (string) $filters['start_date'];
        $endDate = (string) $filters['end_date'];
        $campaignId = is_numeric($filters['campaign_id']) ? (int) $filters['campaign_id'] : null;
        $itemsCount = is_numeric($filters['items_count']) ? (int) $filters['items_count'] : null;
        $search = trim((string) ($filters['search'] ?? ''));
        $sort = (string) $filters['sort'];

        $salesQuery = Sale::query()
            ->where('user_id', $user->id)
            ->whereBetween('sold_at', ["{$startDate} 00:00:00", "{$endDate} 23:59:59"])
            ->when($campaignId !== null, fn ($query) => $query->where('campaign_id', $campaignId))
            ->when($itemsCount !== null, fn ($query) => $query->whereIn(
                'sales.id',
                fn ($itemsQuery) => $itemsQuery
                    ->select('sale_id')
                    ->from('sale_items')
                    ->groupBy('sale_id')
                    ->havingRaw('SUM(quantity) = ?', [$itemsCount]),
            ))
            ->when($search !== '', fn ($query) => $query->where(
                fn ($nested) => $nested
                    ->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%"),
            ))
            ->with('campaign:id,name')
            ->withSum('items as items_count', 'quantity');

        match ($sort) {
            'oldest' => $salesQuery->orderBy('sold_at')->orderBy('id'),
            'customer_asc' => $salesQuery
                ->orderByRaw("CASE WHEN customer_name IS NULL OR customer_name = '' THEN 1 ELSE 0 END")
                ->orderBy('customer_name')
                ->orderByDesc('sold_at'),
            'customer_desc' => $salesQuery
                ->orderByRaw("CASE WHEN customer_name IS NULL OR customer_name = '' THEN 1 ELSE 0 END")
                ->orderByDesc('customer_name')
                ->orderByDesc('sold_at'),
            'revenue_desc' => $salesQuery->orderByDesc('revenue_cents')->orderByDesc('sold_at'),
            'profit_desc' => $salesQuery->orderByDesc('gross_profit_cents')->orderByDesc('sold_at'),
            'items_desc' => $salesQuery->orderByDesc('items_count')->orderByDesc('sold_at'),
            default => $salesQuery->orderByDesc('sold_at')->orderByDesc('id'),
        };

        $sales = $salesQuery
            ->paginate(20)
            ->withQueryString();
        $saleRows = [];

        foreach ($sales->items() as $sale) {
            $saleRows[] = [
                'id' => $sale->id,
                'source' => $sale->source,
                'order_number' => $sale->order_number,
                'customer_name' => $sale->customer_name,
                'sold_at' => $sale->sold_at->toIso8601String(),
                'campaign_name' => $sale->campaign?->name,
                'items_count' => (int) $sale->getAttribute('items_count'),
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
                'items_count' => $itemsCount,
                'search' => $search,
                'sort' => $sort,
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
        $sale = $recorder->save($user, $request->saleData());
        $identifier = $sale->order_number
            ? "Pedido #{$sale->order_number}"
            : "Venda #{$sale->id}";

        return to_route('sales.index')->with('toast', [
            'type' => 'success',
            'message' => "{$identifier}: registro concluído e valores calculados.",
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
                'shipping_mode' => $sale->shipping_cents > 0 ? 'charged' : 'free',
                'notes' => $sale->notes,
                'products_subtotal_cents' => $sale->products_subtotal_cents,
                'discount_cents' => $sale->discount_cents,
                'shipping_cents' => $sale->shipping_cents,
                'revenue_cents' => $sale->revenue_cents,
                'product_cost_cents' => $sale->product_cost_cents,
                'supplier_cost_override_cents' => $sale->supplier_cost_override_cents,
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
        $sale = $recorder->save($user, $request->saleData(), $sale);
        $identifier = $sale->order_number
            ? "Pedido #{$sale->order_number}"
            : "Venda #{$sale->id}";

        return to_route('sales.index')->with('toast', [
            'type' => 'success',
            'message' => "{$identifier}: valores recalculados e atualizados.",
        ]);
    }

    public function destroy(Request $request, Sale $sale): RedirectResponse
    {
        $this->authorizeOwnership($request, $sale);
        $identifier = $sale->order_number
            ? "Pedido #{$sale->order_number}"
            : "Venda #{$sale->id}";
        $sale->delete();

        return back()->with('toast', [
            'type' => 'success',
            'message' => "{$identifier}: exclusão concluída.",
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

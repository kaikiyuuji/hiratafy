<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesOwnership;
use App\Http\Requests\DiscountRequest;
use App\Models\Category;
use App\Models\Discount;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DiscountController extends Controller
{
    use AuthorizesOwnership;

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $discounts = Discount::query()
            ->where('user_id', $user->id)
            ->with(['category:id,name', 'tiers'])
            ->orderByDesc('is_active')
            ->latest()
            ->get()
            ->map(fn (Discount $discount): array => $this->serializeDiscount($discount));

        return Inertia::render('discounts/index', ['discounts' => $discounts]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('discounts/form', [
            'discount' => null,
            'categories' => $this->categoryOptions($request),
        ]);
    }

    public function store(DiscountRequest $request): RedirectResponse
    {
        $data = $request->discountData();
        $tiers = $data['tiers'];
        unset($data['tiers']);
        $data['user_id'] = $request->user()->id;

        DB::transaction(function () use ($data, $tiers): void {
            $discount = Discount::create($data);
            $discount->tiers()->createMany($tiers);
        });

        return to_route('discounts.index')->with('toast', [
            'type' => 'success',
            'message' => 'Desconto criado com sucesso.',
        ]);
    }

    public function edit(Request $request, Discount $discount): Response
    {
        $this->authorizeOwnership($request, $discount);
        $discount->load(['category:id,name', 'tiers']);

        return Inertia::render('discounts/form', [
            'discount' => $this->serializeDiscount($discount),
            'categories' => $this->categoryOptions($request),
        ]);
    }

    public function update(DiscountRequest $request, Discount $discount): RedirectResponse
    {
        $this->authorizeOwnership($request, $discount);
        $data = $request->discountData();
        $tiers = $data['tiers'];
        unset($data['tiers']);

        DB::transaction(function () use ($discount, $data, $tiers): void {
            $discount->update($data);
            $discount->tiers()->delete();
            $discount->tiers()->createMany($tiers);
        });

        return to_route('discounts.index')->with('toast', [
            'type' => 'success',
            'message' => 'Desconto atualizado.',
        ]);
    }

    /** @return array<int, array{id: int, name: string}> */
    private function categoryOptions(Request $request): array
    {
        return Category::query()
            ->where('user_id', $request->user()?->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
            ])->all();
    }

    /** @return array<string, mixed> */
    private function serializeDiscount(Discount $discount): array
    {
        return [
            'id' => $discount->id,
            'category_id' => $discount->category_id,
            'category_name' => $discount->category->name,
            'name' => $discount->name,
            'is_active' => $discount->is_active,
            'starts_on' => $discount->starts_on?->toDateString(),
            'ends_on' => $discount->ends_on?->toDateString(),
            'tiers' => $discount->tiers->map(fn ($tier): array => [
                'id' => $tier->id,
                'min_quantity' => $tier->min_quantity,
                'percentage_basis_points' => $tier->percentage_basis_points,
            ])->values()->all(),
        ];
    }
}

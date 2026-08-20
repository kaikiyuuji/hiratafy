<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesOwnership;
use App\Http\Requests\ProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    use AuthorizesOwnership;

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $search = $request->string('search')->trim()->toString();

        $products = Product::query()
            ->where('user_id', $user->id)
            ->when($search !== '', fn ($query) => $query->where(
                fn ($nested) => $nested
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%"),
            ))
            ->with(['category:id,name', 'costTiers'])
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get()
            ->map(fn (Product $product): array => $this->serializeProduct($product));

        return Inertia::render('products/index', [
            'products' => $products,
            'filters' => ['search' => $search],
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('products/form', [
            'product' => null,
            'categories' => $this->categoryOptions($request),
        ]);
    }

    public function store(ProductRequest $request): RedirectResponse
    {
        $data = $request->productData();
        $tiers = $data['cost_tiers'];
        unset($data['cost_tiers']);
        $data['user_id'] = $request->user()->id;

        DB::transaction(function () use ($data, $tiers): void {
            $product = Product::create($data);
            $product->costTiers()->createMany($tiers);
        });

        return to_route('products.index')->with('toast', [
            'type' => 'success',
            'message' => 'Produto criado com sucesso.',
        ]);
    }

    public function edit(Request $request, Product $product): Response
    {
        $this->authorizeOwnership($request, $product);
        $product->load(['category:id,name', 'costTiers']);

        return Inertia::render('products/form', [
            'product' => $this->serializeProduct($product),
            'categories' => $this->categoryOptions($request),
        ]);
    }

    public function update(ProductRequest $request, Product $product): RedirectResponse
    {
        $this->authorizeOwnership($request, $product);
        $data = $request->productData();
        $tiers = $data['cost_tiers'];
        unset($data['cost_tiers']);

        DB::transaction(function () use ($product, $data, $tiers): void {
            $product->update($data);
            $product->costTiers()->delete();
            $product->costTiers()->createMany($tiers);
        });

        return to_route('products.index')->with('toast', [
            'type' => 'success',
            'message' => 'Produto atualizado.',
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
    private function serializeProduct(Product $product): array
    {
        return [
            'id' => $product->id,
            'category_id' => $product->category_id,
            'category_name' => $product->category->name,
            'name' => $product->name,
            'sku' => $product->sku,
            'sale_price_cents' => $product->sale_price_cents,
            'base_cost_cents' => $product->base_cost_cents,
            'is_active' => $product->is_active,
            'cost_tiers' => $product->costTiers->map(fn ($tier): array => [
                'id' => $tier->id,
                'min_quantity' => $tier->min_quantity,
                'unit_cost_cents' => $tier->unit_cost_cents,
            ])->values()->all(),
        ];
    }
}

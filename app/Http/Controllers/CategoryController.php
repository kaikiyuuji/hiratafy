<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesOwnership;
use App\Http\Requests\CategoryRequest;
use App\Models\Category;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    use AuthorizesOwnership;

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $categories = Category::query()
            ->where('user_id', $user->id)
            ->withCount(['products', 'discounts'])
            ->orderBy('name')
            ->get()
            ->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'is_active' => $category->is_active,
                'products_count' => $category->products_count,
                'discounts_count' => $category->discounts_count,
            ]);

        return Inertia::render('categories/index', ['categories' => $categories]);
    }

    public function store(CategoryRequest $request): RedirectResponse
    {
        $request->user()->categories()->create($request->categoryData());

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Categoria criada com sucesso.',
        ]);
    }

    public function update(CategoryRequest $request, Category $category): RedirectResponse
    {
        $this->authorizeOwnership($request, $category);
        $category->update($request->categoryData());

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Categoria atualizada.',
        ]);
    }
}

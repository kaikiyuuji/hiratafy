<?php

use App\Http\Controllers\CampaignController;
use App\Http\Controllers\CampaignSpendController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DiscountController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SaleController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('categorias', [CategoryController::class, 'index'])->name('categories.index');
    Route::post('categorias', [CategoryController::class, 'store'])->name('categories.store');
    Route::put('categorias/{category}', [CategoryController::class, 'update'])->name('categories.update');

    Route::get('produtos', [ProductController::class, 'index'])->name('products.index');
    Route::get('produtos/novo', [ProductController::class, 'create'])->name('products.create');
    Route::post('produtos', [ProductController::class, 'store'])->name('products.store');
    Route::get('produtos/{product}/editar', [ProductController::class, 'edit'])->name('products.edit');
    Route::put('produtos/{product}', [ProductController::class, 'update'])->name('products.update');

    Route::get('descontos', [DiscountController::class, 'index'])->name('discounts.index');
    Route::get('descontos/novo', [DiscountController::class, 'create'])->name('discounts.create');
    Route::post('descontos', [DiscountController::class, 'store'])->name('discounts.store');
    Route::get('descontos/{discount}/editar', [DiscountController::class, 'edit'])->name('discounts.edit');
    Route::put('descontos/{discount}', [DiscountController::class, 'update'])->name('discounts.update');

    Route::get('campanhas', [CampaignController::class, 'index'])->name('campaigns.index');
    Route::get('campanhas/nova', [CampaignController::class, 'create'])->name('campaigns.create');
    Route::post('campanhas', [CampaignController::class, 'store'])->name('campaigns.store');
    Route::get('campanhas/{campaign}/editar', [CampaignController::class, 'edit'])->name('campaigns.edit');
    Route::put('campanhas/{campaign}', [CampaignController::class, 'update'])->name('campaigns.update');

    Route::get('investimentos', [CampaignSpendController::class, 'index'])->name('campaign-spends.index');
    Route::post('investimentos', [CampaignSpendController::class, 'store'])->name('campaign-spends.store');

    Route::get('vendas', [SaleController::class, 'index'])->name('sales.index');
    Route::get('vendas/nova', [SaleController::class, 'create'])->name('sales.create');
    Route::post('vendas', [SaleController::class, 'store'])->name('sales.store');
    Route::get('vendas/{sale}/editar', [SaleController::class, 'edit'])->name('sales.edit');
    Route::put('vendas/{sale}', [SaleController::class, 'update'])->name('sales.update');
    Route::delete('vendas/{sale}', [SaleController::class, 'destroy'])->name('sales.destroy');
});

require __DIR__.'/settings.php';

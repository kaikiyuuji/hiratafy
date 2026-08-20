<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('sku')->nullable();
            $table->unsignedBigInteger('sale_price_cents');
            $table->unsignedBigInteger('base_cost_cents');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'name']);
            $table->unique(['user_id', 'sku']);
            $table->index(['user_id', 'is_active']);
        });

        Schema::create('product_cost_tiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('min_quantity');
            $table->unsignedBigInteger('unit_cost_cents');
            $table->timestamps();

            $table->unique(['product_id', 'min_quantity']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_cost_tiers');
        Schema::dropIfExists('products');
    }
};

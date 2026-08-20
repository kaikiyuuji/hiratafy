<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->string('order_number')->nullable();
            $table->string('customer_name')->nullable();
            $table->dateTime('sold_at');
            $table->unsignedBigInteger('products_subtotal_cents');
            $table->unsignedBigInteger('discount_cents')->default(0);
            $table->unsignedBigInteger('shipping_cents')->default(0);
            $table->unsignedBigInteger('revenue_cents');
            $table->unsignedBigInteger('product_cost_cents');
            $table->bigInteger('gross_profit_cents');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'order_number']);
            $table->index(['user_id', 'sold_at']);
            $table->index(['campaign_id', 'sold_at']);
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');
            $table->string('category_name');
            $table->unsignedInteger('quantity');
            $table->unsignedBigInteger('unit_price_cents');
            $table->unsignedBigInteger('gross_amount_cents');
            $table->unsignedInteger('discount_basis_points')->default(0);
            $table->unsignedBigInteger('discount_amount_cents')->default(0);
            $table->unsignedBigInteger('net_amount_cents');
            $table->unsignedBigInteger('unit_cost_cents');
            $table->unsignedBigInteger('cost_amount_cents');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
    }
};

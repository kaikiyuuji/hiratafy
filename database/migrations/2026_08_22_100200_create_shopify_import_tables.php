<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shopify_product_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shopify_integration_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('external_key');
            $table->string('shopify_product_id')->nullable();
            $table->string('shopify_variant_id')->nullable();
            $table->string('shopify_title');
            $table->timestamps();

            $table->unique(['shopify_integration_id', 'external_key'], 'shopify_mapping_external_unique');
            $table->index(['shopify_integration_id', 'product_id'], 'shopify_mapping_product_index');
        });

        Schema::create('shopify_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shopify_integration_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained()->nullOnDelete();
            $table->string('webhook_id')->nullable()->unique();
            $table->string('topic')->default('orders/paid');
            $table->string('external_order_id');
            $table->string('order_number')->nullable();
            $table->timestamp('occurred_at');
            $table->json('payload');
            $table->string('status')->default('pending');
            $table->text('error_message')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->unique(
                ['shopify_integration_id', 'external_order_id'],
                'shopify_event_order_unique',
            );
            $table->index(
                ['shopify_integration_id', 'status', 'created_at'],
                'shopify_event_status_index',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shopify_webhook_events');
        Schema::dropIfExists('shopify_product_mappings');
    }
};

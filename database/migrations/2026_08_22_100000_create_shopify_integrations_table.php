<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shopify_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('default_campaign_id')->nullable()->constrained('campaigns')->nullOnDelete();
            $table->string('shop_domain')->nullable()->unique();
            $table->string('shop_name')->nullable();
            $table->string('webhook_subscription_id')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamp('last_webhook_at')->nullable();
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shopify_integrations');
    }
};

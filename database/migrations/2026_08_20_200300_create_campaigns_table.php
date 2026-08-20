<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('platform')->default('Meta Ads');
            $table->boolean('is_active')->default(true);
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'name']);
            $table->index(['user_id', 'is_active']);
        });

        Schema::create('campaign_daily_spends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->date('spend_date');
            $table->unsignedBigInteger('budget_cents');
            $table->unsignedBigInteger('actual_spend_cents')->nullable();
            $table->timestamps();

            $table->unique(['campaign_id', 'spend_date']);
            $table->index('spend_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_daily_spends');
        Schema::dropIfExists('campaigns');
    }
};

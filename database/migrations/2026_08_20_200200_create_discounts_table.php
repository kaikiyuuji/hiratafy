<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
        });

        Schema::create('discount_tiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('discount_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('min_quantity');
            $table->unsignedInteger('percentage_basis_points');
            $table->timestamps();

            $table->unique(['discount_id', 'min_quantity']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discount_tiers');
        Schema::dropIfExists('discounts');
    }
};

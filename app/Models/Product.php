<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'user_id',
        'category_id',
        'name',
        'sku',
        'sale_price_cents',
        'base_cost_cents',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'sale_price_cents' => 'integer',
            'base_cost_cents' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return HasMany<ProductCostTier, $this> */
    public function costTiers(): HasMany
    {
        return $this->hasMany(ProductCostTier::class)->orderBy('min_quantity');
    }
}

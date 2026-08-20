<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    protected $fillable = [
        'user_id',
        'campaign_id',
        'order_number',
        'customer_name',
        'sold_at',
        'products_subtotal_cents',
        'discount_cents',
        'shipping_cents',
        'revenue_cents',
        'product_cost_cents',
        'gross_profit_cents',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'sold_at' => 'datetime',
            'products_subtotal_cents' => 'integer',
            'discount_cents' => 'integer',
            'shipping_cents' => 'integer',
            'revenue_cents' => 'integer',
            'product_cost_cents' => 'integer',
            'gross_profit_cents' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Campaign, $this> */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    /** @return HasMany<SaleItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }
}

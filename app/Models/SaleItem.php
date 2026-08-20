<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    protected $fillable = [
        'sale_id',
        'product_id',
        'product_name',
        'category_name',
        'quantity',
        'unit_price_cents',
        'gross_amount_cents',
        'discount_basis_points',
        'discount_amount_cents',
        'net_amount_cents',
        'unit_cost_cents',
        'cost_amount_cents',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price_cents' => 'integer',
            'gross_amount_cents' => 'integer',
            'discount_basis_points' => 'integer',
            'discount_amount_cents' => 'integer',
            'net_amount_cents' => 'integer',
            'unit_cost_cents' => 'integer',
            'cost_amount_cents' => 'integer',
        ];
    }

    /** @return BelongsTo<Sale, $this> */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

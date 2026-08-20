<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductCostTier extends Model
{
    protected $fillable = ['product_id', 'min_quantity', 'unit_cost_cents'];

    protected function casts(): array
    {
        return [
            'min_quantity' => 'integer',
            'unit_cost_cents' => 'integer',
        ];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

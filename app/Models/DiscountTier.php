<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $discount_id
 * @property int $min_quantity
 * @property int $percentage_basis_points
 */
class DiscountTier extends Model
{
    protected $fillable = [
        'discount_id',
        'min_quantity',
        'percentage_basis_points',
    ];

    protected function casts(): array
    {
        return [
            'min_quantity' => 'integer',
            'percentage_basis_points' => 'integer',
        ];
    }

    /** @return BelongsTo<Discount, $this> */
    public function discount(): BelongsTo
    {
        return $this->belongsTo(Discount::class);
    }
}

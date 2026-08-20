<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $category_id
 * @property string $name
 * @property bool $is_active
 * @property Carbon|null $starts_on
 * @property Carbon|null $ends_on
 */
class Discount extends Model
{
    protected $fillable = [
        'user_id',
        'category_id',
        'name',
        'is_active',
        'starts_on',
        'ends_on',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'starts_on' => 'date',
            'ends_on' => 'date',
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

    /** @return HasMany<DiscountTier, $this> */
    public function tiers(): HasMany
    {
        return $this->hasMany(DiscountTier::class)->orderBy('min_quantity');
    }
}

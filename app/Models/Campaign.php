<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string $platform
 * @property bool $is_active
 * @property Carbon|null $starts_on
 * @property Carbon|null $ends_on
 * @property string|null $notes
 */
class Campaign extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'platform',
        'is_active',
        'starts_on',
        'ends_on',
        'notes',
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

    /** @return HasMany<CampaignDailySpend, $this> */
    public function dailySpends(): HasMany
    {
        return $this->hasMany(CampaignDailySpend::class);
    }

    /** @return HasMany<Sale, $this> */
    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }
}

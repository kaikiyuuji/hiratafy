<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $campaign_id
 * @property Carbon $spend_date
 * @property int $budget_cents
 * @property int|null $actual_spend_cents
 */
class CampaignDailySpend extends Model
{
    protected $fillable = [
        'campaign_id',
        'spend_date',
        'budget_cents',
        'actual_spend_cents',
    ];

    protected function casts(): array
    {
        return [
            'spend_date' => 'date',
            'budget_cents' => 'integer',
            'actual_spend_cents' => 'integer',
        ];
    }

    /** @return BelongsTo<Campaign, $this> */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function effectiveSpendCents(): int
    {
        return $this->actual_spend_cents ?? $this->budget_cents;
    }
}

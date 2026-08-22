<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int|null $default_campaign_id
 * @property string $shop_domain
 * @property string|null $shop_name
 * @property string|null $webhook_subscription_id
 * @property bool $is_active
 * @property Carbon|null $last_webhook_at
 * @property Carbon|null $last_sync_at
 * @property User $user
 */
class ShopifyIntegration extends Model
{
    protected $fillable = [
        'user_id',
        'default_campaign_id',
        'shop_domain',
        'shop_name',
        'webhook_subscription_id',
        'is_active',
        'last_webhook_at',
        'last_sync_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_webhook_at' => 'datetime',
            'last_sync_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Campaign, $this> */
    public function defaultCampaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'default_campaign_id');
    }

    /** @return HasMany<ShopifyProductMapping, $this> */
    public function productMappings(): HasMany
    {
        return $this->hasMany(ShopifyProductMapping::class);
    }

    /** @return HasMany<ShopifyWebhookEvent, $this> */
    public function webhookEvents(): HasMany
    {
        return $this->hasMany(ShopifyWebhookEvent::class);
    }
}

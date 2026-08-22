<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @phpstan-import-type ShopifyOrder from \App\Services\Shopify\ShopifyOrderData
 *
 * @property int $id
 * @property int $shopify_integration_id
 * @property int|null $sale_id
 * @property string|null $webhook_id
 * @property string $topic
 * @property string $external_order_id
 * @property string|null $order_number
 * @property Carbon $occurred_at
 * @property ShopifyOrder $payload
 * @property string $status
 * @property string|null $error_message
 * @property Carbon|null $processed_at
 * @property ShopifyIntegration $integration
 * @property Sale|null $sale
 */
class ShopifyWebhookEvent extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSED = 'processed';

    public const STATUS_NEEDS_ATTENTION = 'needs_attention';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'shopify_integration_id',
        'sale_id',
        'webhook_id',
        'topic',
        'external_order_id',
        'order_number',
        'occurred_at',
        'payload',
        'status',
        'error_message',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'occurred_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<ShopifyIntegration, $this> */
    public function integration(): BelongsTo
    {
        return $this->belongsTo(ShopifyIntegration::class, 'shopify_integration_id');
    }

    /** @return BelongsTo<Sale, $this> */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}

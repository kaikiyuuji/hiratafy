<?php

namespace App\Services\Shopify;

use App\Models\ShopifyIntegration;
use App\Models\ShopifyWebhookEvent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** @phpstan-import-type ShopifyOrder from ShopifyOrderData */
class ShopifyEventRecorder
{
    /**
     * @param  ShopifyOrder  $order
     * @return array{event: ShopifyWebhookEvent, should_dispatch: bool}
     */
    public function record(
        ShopifyIntegration $integration,
        array $order,
        ?string $webhookId = null,
    ): array {
        return DB::transaction(function () use ($integration, $order, $webhookId): array {
            if ($webhookId !== null) {
                $duplicate = ShopifyWebhookEvent::query()
                    ->where('webhook_id', $webhookId)
                    ->first();

                if ($duplicate !== null) {
                    return ['event' => $duplicate, 'should_dispatch' => false];
                }
            }

            $event = ShopifyWebhookEvent::query()->firstOrCreate(
                [
                    'shopify_integration_id' => $integration->id,
                    'external_order_id' => $order['order_id'],
                ],
                [
                    'webhook_id' => $webhookId,
                    'topic' => 'orders/paid',
                    'order_number' => $order['order_number'],
                    'occurred_at' => Carbon::parse($order['processed_at']),
                    'payload' => $order,
                    'status' => ShopifyWebhookEvent::STATUS_PENDING,
                ],
            );

            if (! $event->wasRecentlyCreated && $webhookId !== null && $event->webhook_id === null) {
                $event->update(['webhook_id' => $webhookId]);
            }

            return [
                'event' => $event,
                'should_dispatch' => $event->wasRecentlyCreated
                    || $event->status !== ShopifyWebhookEvent::STATUS_PROCESSED,
            ];
        });
    }
}

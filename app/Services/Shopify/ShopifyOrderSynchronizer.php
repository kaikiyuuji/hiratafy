<?php

namespace App\Services\Shopify;

use App\Jobs\ProcessShopifyOrder;
use App\Models\ShopifyIntegration;

class ShopifyOrderSynchronizer
{
    public function __construct(
        private readonly ShopifyApi $api,
        private readonly ShopifyOrderData $orderData,
        private readonly ShopifyEventRecorder $eventRecorder,
    ) {}

    public function sync(ShopifyIntegration $integration): int
    {
        $initialDays = max(1, (int) config('services.shopify.initial_sync_days', 7));
        $since = $integration->last_sync_at?->copy()->subMinutes(10)
            ?? now()->subDays($initialDays);
        $orders = $this->api->paidOrdersSince($integration, $since);
        $queued = 0;

        foreach ($orders as $order) {
            $recorded = $this->eventRecorder->record(
                $integration,
                $this->orderData->fromGraphql($order),
            );

            if ($recorded['should_dispatch']) {
                ProcessShopifyOrder::dispatch($recorded['event']->id);
                $queued++;
            }
        }

        $integration->update(['last_sync_at' => now()]);

        return $queued;
    }
}

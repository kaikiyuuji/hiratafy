<?php

namespace App\Services\Shopify;

use App\Jobs\ProcessShopifyOrder;
use App\Models\ShopifyIntegration;
use Illuminate\Support\Facades\DB;

class ShopifyOrderSynchronizer
{
    public function __construct(
        private readonly ShopifyApi $api,
        private readonly ShopifyOrderData $orderData,
        private readonly ShopifyEventRecorder $eventRecorder,
    ) {}

    public function sync(ShopifyIntegration $integration): int
    {
        $initialDays = max(1, (int) config('services.shopify.initial_sync_days', 30));
        $since = $integration->last_sync_at?->copy()->subMinutes(10)
            ?? now()->subDays($initialDays);
        $orders = $this->api->paidOrdersSince($integration, $since);

        /** @var list<int> $eventIds */
        $eventIds = DB::transaction(function () use ($integration, $orders): array {
            $eventIds = [];

            foreach ($orders as $order) {
                $recorded = $this->eventRecorder->record(
                    $integration,
                    $this->orderData->fromGraphql($order),
                );

                if ($recorded['should_dispatch']) {
                    $eventIds[] = $recorded['event']->id;
                }
            }

            $integration->update(['last_sync_at' => now()]);

            return $eventIds;
        }, 5);

        foreach ($eventIds as $eventId) {
            ProcessShopifyOrder::dispatch($eventId);
        }

        return count($eventIds);
    }
}

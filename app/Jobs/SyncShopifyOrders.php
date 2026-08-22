<?php

namespace App\Jobs;

use App\Models\ShopifyIntegration;
use App\Services\Shopify\ShopifyOrderSynchronizer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SyncShopifyOrders implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(public readonly int $integrationId) {}

    public function handle(ShopifyOrderSynchronizer $synchronizer): void
    {
        $integration = ShopifyIntegration::query()->findOrFail($this->integrationId);
        $synchronizer->sync($integration);
    }
}

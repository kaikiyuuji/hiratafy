<?php

namespace App\Jobs;

use App\Models\ShopifyWebhookEvent;
use App\Services\Shopify\ShopifyOrderImporter;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class ProcessShopifyOrder implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 60;

    public function __construct(public readonly int $eventId) {}

    public function handle(ShopifyOrderImporter $importer): void
    {
        $event = ShopifyWebhookEvent::query()->findOrFail($this->eventId);
        $importer->import($event);
    }

    public function failed(?Throwable $exception): void
    {
        $event = ShopifyWebhookEvent::query()->find($this->eventId);

        if ($event === null || in_array($event->status, [
            ShopifyWebhookEvent::STATUS_PROCESSED,
            ShopifyWebhookEvent::STATUS_NEEDS_ATTENTION,
        ], true)) {
            return;
        }

        $event->update([
            'status' => ShopifyWebhookEvent::STATUS_FAILED,
            'error_message' => 'Não foi possível processar este pedido. Tente novamente.',
        ]);
    }
}

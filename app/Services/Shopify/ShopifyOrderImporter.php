<?php

namespace App\Services\Shopify;

use App\Models\Product;
use App\Models\Sale;
use App\Models\ShopifyProductMapping;
use App\Models\ShopifyWebhookEvent;
use App\Services\SaleRecorder;
use Illuminate\Support\Facades\DB;

class ShopifyOrderImporter
{
    public function __construct(
        private readonly SaleRecorder $saleRecorder,
        private readonly ShopifyOrderData $orderData,
    ) {}

    public function import(ShopifyWebhookEvent $event): ?Sale
    {
        return DB::transaction(function () use ($event): ?Sale {
            $event = ShopifyWebhookEvent::query()
                ->lockForUpdate()
                ->with(['integration.user'])
                ->findOrFail($event->id);

            if ($event->status === ShopifyWebhookEvent::STATUS_PROCESSED) {
                return $event->sale;
            }

            $integration = $event->integration;
            $user = $integration->user;

            if (! $integration->is_active || $integration->default_campaign_id === null) {
                $this->needsAttention(
                    $event,
                    'Ative a integração e selecione uma campanha padrão.',
                );

                return null;
            }

            $existingSale = Sale::query()
                ->where('user_id', $user->id)
                ->where('source', 'shopify')
                ->where('external_id', $event->external_order_id)
                ->first();

            if ($existingSale !== null) {
                $this->markProcessed($event, $existingSale);

                return $existingSale;
            }

            if ($event->order_number !== null) {
                $saleWithSameNumber = Sale::query()
                    ->where('user_id', $user->id)
                    ->where('order_number', $event->order_number)
                    ->first();

                if ($saleWithSameNumber !== null) {
                    $saleWithSameNumber->update([
                        'source' => 'shopify',
                        'external_id' => $event->external_order_id,
                    ]);
                    $this->markProcessed($event, $saleWithSameNumber);

                    return $saleWithSameNumber;
                }
            }

            $products = Product::query()
                ->where('user_id', $user->id)
                ->get();
            $productsByName = $products->groupBy(
                fn (Product $product): string => $this->orderData->normalizeName($product->name),
            );
            $mappings = ShopifyProductMapping::query()
                ->where('shopify_integration_id', $integration->id)
                ->with('product')
                ->get()
                ->keyBy('external_key');
            $quantities = [];
            $unmapped = [];

            foreach ($event->payload['items'] as $item) {
                $externalKey = $item['external_key'];
                $mapping = $mappings->get($externalKey);
                $product = $mapping?->product;

                if ($product === null) {
                    $matches = $productsByName->get(
                        $this->orderData->normalizeName($item['name']),
                        collect(),
                    );
                    $product = $matches->count() === 1 ? $matches->first() : null;

                    if ($product instanceof Product) {
                        ShopifyProductMapping::query()->updateOrCreate(
                            [
                                'shopify_integration_id' => $integration->id,
                                'external_key' => $externalKey,
                            ],
                            [
                                'product_id' => $product->id,
                                'shopify_product_id' => $item['shopify_product_id'],
                                'shopify_variant_id' => $item['shopify_variant_id'],
                                'shopify_title' => $item['name'],
                            ],
                        );
                    }
                }

                if (! $product instanceof Product) {
                    $unmapped[] = $item['name'];

                    continue;
                }

                $quantity = $item['quantity'];
                $quantities[$product->id] = ($quantities[$product->id] ?? 0) + $quantity;
            }

            if ($unmapped !== []) {
                $this->needsAttention(
                    $event,
                    'Vincule os produtos: '.implode(', ', array_unique($unmapped)).'.',
                );

                return null;
            }

            $items = collect($quantities)
                ->map(fn (int $quantity, int $productId): array => [
                    'product_id' => $productId,
                    'quantity' => $quantity,
                ])
                ->values()
                ->all();

            if ($items === []) {
                $this->needsAttention($event, 'O pedido não possui produtos importáveis.');

                return null;
            }

            $sale = $this->saleRecorder->save($user, [
                'campaign_id' => $integration->default_campaign_id,
                'source' => 'shopify',
                'external_id' => $event->external_order_id,
                'order_number' => $event->order_number,
                'customer_name' => null,
                'sold_at' => $event->payload['processed_at'],
                'shipping_mode' => 'automatic',
                'notes' => 'Importada automaticamente da Shopify.',
                'items' => $items,
            ], requireCampaignSpend: false);
            $this->markProcessed($event, $sale);

            return $sale;
        });
    }

    private function markProcessed(ShopifyWebhookEvent $event, Sale $sale): void
    {
        $event->update([
            'sale_id' => $sale->id,
            'status' => ShopifyWebhookEvent::STATUS_PROCESSED,
            'error_message' => null,
            'processed_at' => now(),
        ]);
    }

    private function needsAttention(ShopifyWebhookEvent $event, string $message): void
    {
        $event->update([
            'status' => ShopifyWebhookEvent::STATUS_NEEDS_ATTENTION,
            'error_message' => $message,
            'processed_at' => null,
        ]);
    }
}

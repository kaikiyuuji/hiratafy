<?php

namespace App\Console\Commands;

use App\Models\ShopifyIntegration;
use App\Services\Shopify\ShopifyApi;
use App\Services\Shopify\ShopifyOrderSynchronizer;
use Illuminate\Console\Command;
use Throwable;

class ConfigureShopify extends Command
{
    protected $signature = 'shopify:setup {url? : URL HTTPS pública do Hiratafy} {--skip-sync : Não buscar pedidos perdidos}';

    protected $description = 'Configura o webhook de pedidos pagos e sincroniza vendas da Shopify';

    public function handle(
        ShopifyApi $api,
        ShopifyOrderSynchronizer $synchronizer,
    ): int {
        $integrations = ShopifyIntegration::query()
            ->where('is_active', true)
            ->get();

        if ($integrations->isEmpty()) {
            $this->components->info('Shopify ainda não está ativada no Hiratafy.');

            return self::SUCCESS;
        }

        if (! $api->credentialsConfigured()) {
            $this->components->warn('Shopify ativa, mas faltam SHOPIFY_CLIENT_ID e SHOPIFY_CLIENT_SECRET no .env.');

            return self::SUCCESS;
        }

        $baseUrl = rtrim((string) ($this->argument('url') ?: config('app.url')), '/');
        $callbackUrl = "{$baseUrl}/webhooks/shopify/orders-paid";

        foreach ($integrations as $integration) {
            try {
                $shop = $api->shopInfo($integration);
                $subscriptionId = $api->ensureOrdersPaidWebhook($integration, $callbackUrl);
                $integration->update([
                    'shop_name' => $shop['name'],
                    'shop_domain' => strtolower($shop['myshopifyDomain']),
                    'webhook_subscription_id' => $subscriptionId,
                ]);

                $queued = $this->option('skip-sync')
                    ? 0
                    : $synchronizer->sync($integration->fresh());

                $this->components->info(
                    sprintf('%s conectada; %d pedido(s) enviado(s) para importação.', $shop['name'], $queued),
                );
            } catch (Throwable $exception) {
                report($exception);
                $this->components->error(
                    "Falha ao conectar {$integration->shop_domain}: {$exception->getMessage()}",
                );

                return self::FAILURE;
            }
        }

        return self::SUCCESS;
    }
}

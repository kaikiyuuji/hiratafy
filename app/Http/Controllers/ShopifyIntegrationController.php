<?php

namespace App\Http\Controllers;

use App\Http\Requests\ShopifyIntegrationRequest;
use App\Http\Requests\ShopifyProductMappingRequest;
use App\Jobs\ProcessShopifyOrder;
use App\Jobs\SyncShopifyOrders;
use App\Models\Campaign;
use App\Models\Product;
use App\Models\ShopifyIntegration;
use App\Models\ShopifyProductMapping;
use App\Models\ShopifyWebhookEvent;
use App\Models\User;
use App\Services\Shopify\ShopifyApi;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ShopifyIntegrationController extends Controller
{
    public function index(Request $request, ShopifyApi $api): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $integration = ShopifyIntegration::query()
            ->where('user_id', $user->id)
            ->first();
        $eventRows = [];

        if ($integration !== null) {
            $events = $integration->webhookEvents()
                ->with('sale:id')
                ->latest('occurred_at')
                ->limit(20)
                ->get();
            $mappings = $integration->productMappings()
                ->with('product:id,name')
                ->get()
                ->keyBy('external_key');

            foreach ($events as $event) {
                $items = [];

                foreach ($event->payload['items'] as $item) {
                    $mapping = $mappings->get($item['external_key']);

                    $items[] = [
                        'external_key' => $item['external_key'],
                        'name' => $item['name'],
                        'quantity' => $item['quantity'],
                        'mapped_product_id' => $mapping?->product_id,
                        'mapped_product_name' => $mapping?->product->name,
                    ];
                }

                $eventRows[] = [
                    'id' => $event->id,
                    'order_number' => $event->order_number,
                    'occurred_at' => $event->occurred_at->toIso8601String(),
                    'status' => $event->status,
                    'error_message' => $event->error_message,
                    'sale_id' => $event->sale_id,
                    'items' => $items,
                ];
            }
        }

        return Inertia::render('integrations/shopify', [
            'integration' => [
                'shop_domain' => $integration->shop_domain ?? '',
                'shop_name' => $integration?->shop_name,
                'default_campaign_id' => $integration?->default_campaign_id,
                'is_active' => $integration->is_active ?? false,
                'last_webhook_at' => $integration?->last_webhook_at?->toIso8601String(),
                'last_sync_at' => $integration?->last_sync_at?->toIso8601String(),
                'webhook_configured' => filled($integration?->webhook_subscription_id),
                'credentials_configured' => $api->credentialsConfigured(),
                'public_url' => str_starts_with((string) config('app.url'), 'https://')
                    ? config('app.url')
                    : null,
            ],
            'campaigns' => Campaign::query()
                ->where('user_id', $user->id)
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get(['id', 'name', 'is_active']),
            'products' => Product::query()
                ->where('user_id', $user->id)
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get(['id', 'name', 'is_active']),
            'events' => $eventRows,
            'stats' => [
                'processed' => $integration?->webhookEvents()
                    ->where('status', ShopifyWebhookEvent::STATUS_PROCESSED)
                    ->count() ?? 0,
                'needs_attention' => $integration?->webhookEvents()
                    ->whereIn('status', [
                        ShopifyWebhookEvent::STATUS_NEEDS_ATTENTION,
                        ShopifyWebhookEvent::STATUS_FAILED,
                    ])
                    ->count() ?? 0,
                'mappings' => $integration?->productMappings()->count() ?? 0,
            ],
        ]);
    }

    public function update(ShopifyIntegrationRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        ShopifyIntegration::query()->updateOrCreate(
            ['user_id' => $user->id],
            $request->integrationData(),
        );

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Configuração da Shopify salva.',
        ]);
    }

    public function connect(Request $request, ShopifyApi $api): RedirectResponse
    {
        $integration = $this->integrationFor($request);

        if (! $integration->is_active || $integration->default_campaign_id === null) {
            throw ValidationException::withMessages([
                'shopify' => 'Salve e ative a integração com uma campanha padrão antes de conectar.',
            ]);
        }

        $callbackUrl = route('shopify.webhooks.orders-paid');

        if (! str_starts_with($callbackUrl, 'https://')) {
            throw ValidationException::withMessages([
                'shopify' => 'Inicie o app com composer share para gerar a URL HTTPS antes de conectar.',
            ]);
        }

        try {
            $shop = $api->shopInfo($integration);

            if (strtolower($shop['myshopifyDomain']) !== strtolower((string) $integration->shop_domain)) {
                throw new \RuntimeException('As credenciais pertencem a outra loja.');
            }

            $subscriptionId = $api->ensureOrdersPaidWebhook($integration, $callbackUrl);
            $integration->update([
                'shop_name' => $shop['name'],
                'webhook_subscription_id' => $subscriptionId,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'shopify' => Str::limit($exception->getMessage(), 300),
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Loja conectada e webhook de pedidos pagos configurado.',
        ]);
    }

    public function sync(Request $request): RedirectResponse
    {
        $integration = $this->integrationFor($request);

        if (! $integration->is_active) {
            throw ValidationException::withMessages([
                'shopify' => 'Ative a integração antes de sincronizar.',
            ]);
        }

        SyncShopifyOrders::dispatch($integration->id);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Sincronização enviada para a fila.',
        ]);
    }

    public function retry(Request $request, ShopifyWebhookEvent $event): RedirectResponse
    {
        $this->authorizeEvent($request, $event);
        $event->update([
            'status' => ShopifyWebhookEvent::STATUS_PENDING,
            'error_message' => null,
        ]);
        ProcessShopifyOrder::dispatch($event->id);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Pedido enviado novamente para importação.',
        ]);
    }

    public function mapProduct(
        ShopifyProductMappingRequest $request,
        ShopifyWebhookEvent $event,
    ): RedirectResponse {
        $this->authorizeEvent($request, $event);
        $externalKey = $request->string('external_key')->toString();
        $item = null;

        foreach ($event->payload['items'] as $payloadItem) {
            if ($payloadItem['external_key'] === $externalKey) {
                $item = $payloadItem;

                break;
            }
        }

        if ($item === null) {
            throw ValidationException::withMessages([
                'external_key' => 'O produto não pertence a este pedido.',
            ]);
        }

        ShopifyProductMapping::query()->updateOrCreate(
            [
                'shopify_integration_id' => $event->shopify_integration_id,
                'external_key' => $item['external_key'],
            ],
            [
                'product_id' => $request->integer('product_id'),
                'shopify_product_id' => $item['shopify_product_id'],
                'shopify_variant_id' => $item['shopify_variant_id'],
                'shopify_title' => $item['name'],
            ],
        );
        $event->update([
            'status' => ShopifyWebhookEvent::STATUS_PENDING,
            'error_message' => null,
        ]);
        ProcessShopifyOrder::dispatch($event->id);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Produto vinculado e pedido reenviado.',
        ]);
    }

    private function integrationFor(Request $request): ShopifyIntegration
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return ShopifyIntegration::query()
            ->where('user_id', $user->id)
            ->firstOrFail();
    }

    private function authorizeEvent(Request $request, ShopifyWebhookEvent $event): void
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $event->loadMissing('integration:id,user_id');
        abort_unless($event->integration->user_id === $user->id, 404);
    }
}

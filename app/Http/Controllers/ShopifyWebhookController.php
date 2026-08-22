<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessShopifyOrder;
use App\Models\ShopifyIntegration;
use App\Services\Shopify\ShopifyEventRecorder;
use App\Services\Shopify\ShopifyOrderData;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use JsonException;

class ShopifyWebhookController extends Controller
{
    public function __invoke(
        Request $request,
        ShopifyOrderData $orderData,
        ShopifyEventRecorder $eventRecorder,
    ): Response {
        $secret = (string) config('services.shopify.client_secret');

        abort_if($secret === '', 503, 'Shopify não configurada.');

        $rawBody = $request->getContent();
        $providedHmac = (string) $request->header('X-Shopify-Hmac-Sha256');
        $calculatedHmac = base64_encode(hash_hmac('sha256', $rawBody, $secret, true));

        abort_unless(
            $providedHmac !== '' && hash_equals($calculatedHmac, $providedHmac),
            401,
            'Assinatura inválida.',
        );

        abort_unless(
            strtolower((string) $request->header('X-Shopify-Topic')) === 'orders/paid',
            400,
            'Tópico inválido.',
        );

        $shopDomain = strtolower((string) $request->header('X-Shopify-Shop-Domain'));
        $integration = ShopifyIntegration::query()
            ->where('shop_domain', $shopDomain)
            ->where('is_active', true)
            ->first();

        abort_if($integration === null, 404);

        try {
            $payload = json_decode($rawBody, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            abort(400, 'JSON inválido.');
        }

        abort_unless(is_array($payload), 400, 'Payload inválido.');

        $webhookIdHeader = $request->header('X-Shopify-Webhook-Id');
        $webhookId = is_string($webhookIdHeader) && $webhookIdHeader !== ''
            ? $webhookIdHeader
            : null;
        $recorded = $eventRecorder->record(
            $integration,
            $orderData->fromWebhook($payload),
            $webhookId,
        );
        $integration->update(['last_webhook_at' => now()]);

        if ($recorded['should_dispatch']) {
            ProcessShopifyOrder::dispatch($recorded['event']->id);
        }

        return response()->noContent();
    }
}

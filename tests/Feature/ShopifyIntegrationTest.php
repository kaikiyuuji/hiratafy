<?php

use App\Jobs\ProcessShopifyOrder;
use App\Models\Campaign;
use App\Models\Category;
use App\Models\Discount;
use App\Models\Product;
use App\Models\ProductCostTier;
use App\Models\ShopifyIntegration;
use App\Models\ShopifyProductMapping;
use App\Models\ShopifyWebhookEvent;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\Shopify\ShopifyApi;
use App\Services\Shopify\ShopifyOrderData;
use App\Services\Shopify\ShopifyOrderImporter;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;

test('a user can configure a shopify store and default campaign', function () {
    $user = User::factory()->create();
    $campaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'Meta | Principal',
    ]);

    $response = $this->actingAs($user)->put(route('shopify.update'), [
        'shop_domain' => 'HTTPS://LOJA-MRGK.MYSHOPIFY.COM/admin',
        'default_campaign_id' => $campaign->id,
        'is_active' => true,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('shopify_integrations', [
        'user_id' => $user->id,
        'shop_domain' => 'loja-mrgk.myshopify.com',
        'default_campaign_id' => $campaign->id,
        'is_active' => true,
    ]);

    $this->actingAs($user)->get(route('shopify.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('integrations/shopify')
            ->where('integration.shop_domain', 'loja-mrgk.myshopify.com')
            ->where('integration.default_campaign_id', $campaign->id)
            ->where('integration.is_active', true)
            ->has('campaigns', 1));
});

test('shopify configuration cannot use another users campaign', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $campaign = Campaign::create([
        'user_id' => $otherUser->id,
        'name' => 'Private campaign',
    ]);

    $this->actingAs($user)->put(route('shopify.update'), [
        'shop_domain' => 'loja-mrgk.myshopify.com',
        'default_campaign_id' => $campaign->id,
        'is_active' => true,
    ])->assertSessionHasErrors('default_campaign_id');

    $this->assertDatabaseCount('shopify_integrations', 0);
});

test('a signed paid order webhook stores only product identity and quantity', function () {
    Queue::fake();
    config()->set('services.shopify.client_secret', 'webhook-secret');
    $user = User::factory()->create();
    $campaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'Principal',
    ]);
    ShopifyIntegration::create([
        'user_id' => $user->id,
        'default_campaign_id' => $campaign->id,
        'shop_domain' => 'loja-mrgk.myshopify.com',
        'is_active' => true,
    ]);
    $payload = shopifyPaidOrderPayload();
    $rawPayload = json_encode($payload, JSON_THROW_ON_ERROR);

    $response = $this->call(
        'POST',
        route('shopify.webhooks.orders-paid'),
        server: shopifyWebhookHeaders($rawPayload, 'delivery-001'),
        content: $rawPayload,
    );

    $response->assertNoContent();
    $event = ShopifyWebhookEvent::query()->firstOrFail();
    expect(array_keys($event->payload))->toBe([
        'order_id',
        'order_number',
        'processed_at',
        'items',
    ])->and(array_keys($event->payload['items'][0]))->toBe([
        'external_key',
        'name',
        'quantity',
        'shopify_product_id',
        'shopify_variant_id',
    ])->and($event->payload['items'][0]['name'])
        ->toBe('Halloween Dumpling Squishy - Mystery Blind Box')
        ->and($event->payload['items'][0]['quantity'])->toBe(3);
    Queue::assertPushed(ProcessShopifyOrder::class, 1);

    $this->call(
        'POST',
        route('shopify.webhooks.orders-paid'),
        server: shopifyWebhookHeaders($rawPayload, 'delivery-001'),
        content: $rawPayload,
    )->assertNoContent();

    $this->assertDatabaseCount('shopify_webhook_events', 1);
    Queue::assertPushed(ProcessShopifyOrder::class, 1);
});

test('shopify webhook rejects an invalid signature', function () {
    Queue::fake();
    config()->set('services.shopify.client_secret', 'webhook-secret');
    $payload = json_encode(shopifyPaidOrderPayload(), JSON_THROW_ON_ERROR);
    $headers = shopifyWebhookHeaders($payload, 'delivery-invalid');
    $headers['HTTP_X_SHOPIFY_HMAC_SHA256'] = 'invalid';

    $this->call(
        'POST',
        route('shopify.webhooks.orders-paid'),
        server: $headers,
        content: $payload,
    )->assertUnauthorized();

    $this->assertDatabaseCount('shopify_webhook_events', 0);
    Queue::assertNothingPushed();
});

test('shopify orders use hiratafy prices discounts shipping costs and default campaign', function () {
    $user = User::factory()->create();
    $category = Category::create([
        'user_id' => $user->id,
        'name' => 'DUMPLING SQUISHY',
    ]);
    $product = Product::create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'name' => 'Halloween Dumpling Squishy - Mystery Blind Box',
        'sale_price_cents' => 1890,
        'base_cost_cents' => 800,
    ]);
    ProductCostTier::create([
        'product_id' => $product->id,
        'min_quantity' => 3,
        'unit_cost_cents' => 700,
    ]);
    $discount = Discount::create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'name' => 'Leve 3',
        'is_active' => true,
    ]);
    $discount->tiers()->create([
        'min_quantity' => 3,
        'percentage_basis_points' => 1000,
    ]);
    StoreSetting::create([
        'user_id' => $user->id,
        'currency' => 'USD',
        'fixed_shipping_cents' => 490,
        'free_shipping_threshold_cents' => 9000,
    ]);
    $campaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'Campanha padrão',
    ]);
    $integration = ShopifyIntegration::create([
        'user_id' => $user->id,
        'default_campaign_id' => $campaign->id,
        'shop_domain' => 'loja-mrgk.myshopify.com',
        'is_active' => true,
    ]);
    $order = app(ShopifyOrderData::class)->fromWebhook(shopifyPaidOrderPayload());
    $event = ShopifyWebhookEvent::create([
        'shopify_integration_id' => $integration->id,
        'topic' => 'orders/paid',
        'external_order_id' => $order['order_id'],
        'order_number' => $order['order_number'],
        'occurred_at' => $order['processed_at'],
        'payload' => $order,
        'status' => ShopifyWebhookEvent::STATUS_PENDING,
    ]);

    $sale = app(ShopifyOrderImporter::class)->import($event);

    expect($sale)->not->toBeNull()
        ->and($sale->source)->toBe('shopify')
        ->and($sale->external_id)->toBe('6249000001')
        ->and($sale->campaign_id)->toBe($campaign->id)
        ->and($sale->customer_name)->toBeNull()
        ->and($sale->products_subtotal_cents)->toBe(5670)
        ->and($sale->discount_cents)->toBe(567)
        ->and($sale->shipping_cents)->toBe(490)
        ->and($sale->revenue_cents)->toBe(5593)
        ->and($sale->product_cost_cents)->toBe(2100)
        ->and($sale->gross_profit_cents)->toBe(3493);
    expect($event->refresh()->status)->toBe(ShopifyWebhookEvent::STATUS_PROCESSED)
        ->and(ShopifyProductMapping::query()->firstOrFail()->product_id)->toBe($product->id);
    $this->assertDatabaseCount('campaign_daily_spends', 0);
});

test('an unknown shopify product waits for a manual mapping', function () {
    Queue::fake();
    $user = User::factory()->create();
    $category = Category::create([
        'user_id' => $user->id,
        'name' => 'UNIQUE',
    ]);
    $product = Product::create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'name' => 'Produto local',
        'sale_price_cents' => 1000,
        'base_cost_cents' => 500,
    ]);
    $campaign = Campaign::create([
        'user_id' => $user->id,
        'name' => 'Campanha padrão',
    ]);
    $integration = ShopifyIntegration::create([
        'user_id' => $user->id,
        'default_campaign_id' => $campaign->id,
        'shop_domain' => 'loja-mrgk.myshopify.com',
        'is_active' => true,
    ]);
    $order = app(ShopifyOrderData::class)->fromWebhook(shopifyPaidOrderPayload());
    $event = ShopifyWebhookEvent::create([
        'shopify_integration_id' => $integration->id,
        'topic' => 'orders/paid',
        'external_order_id' => $order['order_id'],
        'order_number' => $order['order_number'],
        'occurred_at' => $order['processed_at'],
        'payload' => $order,
        'status' => ShopifyWebhookEvent::STATUS_PENDING,
    ]);

    expect(app(ShopifyOrderImporter::class)->import($event))->toBeNull()
        ->and($event->refresh()->status)->toBe(ShopifyWebhookEvent::STATUS_NEEDS_ATTENTION);

    $this->actingAs($user)->post(route('shopify.events.map-product', $event), [
        'external_key' => $order['items'][0]['external_key'],
        'product_id' => $product->id,
    ])->assertRedirect();

    $this->assertDatabaseHas('shopify_product_mappings', [
        'shopify_integration_id' => $integration->id,
        'product_id' => $product->id,
        'external_key' => $order['items'][0]['external_key'],
    ]);
    expect($event->refresh()->status)->toBe(ShopifyWebhookEvent::STATUS_PENDING);
    Queue::assertPushed(ProcessShopifyOrder::class, 1);
});

test('shopify api creates the paid orders webhook at the current tunnel url', function () {
    config()->set('services.shopify.client_id', 'client-id');
    config()->set('services.shopify.client_secret', 'client-secret');
    config()->set('services.shopify.api_version', '2026-07');
    $user = User::factory()->create();
    $integration = ShopifyIntegration::create([
        'user_id' => $user->id,
        'shop_domain' => 'loja-mrgk.myshopify.com',
        'is_active' => true,
    ]);
    Http::fake([
        '*/admin/oauth/access_token' => Http::response([
            'access_token' => 'access-token',
            'expires_in' => 86399,
        ]),
        '*/admin/api/2026-07/graphql.json' => Http::sequence()
            ->push(['data' => ['shop' => [
                'name' => 'Loja MRGK',
                'myshopifyDomain' => 'loja-mrgk.myshopify.com',
            ]]])
            ->push(['data' => ['webhookSubscriptions' => ['nodes' => []]]])
            ->push(['data' => ['webhookSubscriptionCreate' => [
                'webhookSubscription' => [
                    'id' => 'gid://shopify/WebhookSubscription/1',
                    'uri' => 'https://example.trycloudflare.com/webhooks/shopify/orders-paid',
                ],
                'userErrors' => [],
            ]]]),
    ]);
    $api = app(ShopifyApi::class);

    expect($api->shopInfo($integration))->toBe([
        'name' => 'Loja MRGK',
        'myshopifyDomain' => 'loja-mrgk.myshopify.com',
    ])->and($api->ensureOrdersPaidWebhook(
        $integration,
        'https://example.trycloudflare.com/webhooks/shopify/orders-paid',
    ))->toBe('gid://shopify/WebhookSubscription/1');

    Http::assertSent(fn ($request): bool => $request->url()
        === 'https://loja-mrgk.myshopify.com/admin/oauth/access_token');
    Http::assertSent(fn ($request): bool => str_contains($request->body(), 'ORDERS_PAID'));
});

/** @return array<string, mixed> */
function shopifyPaidOrderPayload(): array
{
    return [
        'id' => 6249000001,
        'order_number' => 1042,
        'name' => '#1042',
        'processed_at' => '2026-08-22T14:30:00-03:00',
        'customer' => [
            'first_name' => 'Cliente',
            'email' => 'cliente@example.com',
        ],
        'current_total_price' => '999.99',
        'line_items' => [
            [
                'product_id' => 8123000001,
                'variant_id' => 45123000001,
                'title' => 'Halloween Dumpling Squishy - Mystery Blind Box',
                'name' => 'Halloween Dumpling Squishy - Mystery Blind Box',
                'quantity' => 3,
                'price' => '999.99',
            ],
        ],
    ];
}

/** @return array<string, string> */
function shopifyWebhookHeaders(string $payload, string $webhookId): array
{
    return [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_SHOPIFY_HMAC_SHA256' => base64_encode(
            hash_hmac('sha256', $payload, 'webhook-secret', true),
        ),
        'HTTP_X_SHOPIFY_TOPIC' => 'orders/paid',
        'HTTP_X_SHOPIFY_SHOP_DOMAIN' => 'loja-mrgk.myshopify.com',
        'HTTP_X_SHOPIFY_WEBHOOK_ID' => $webhookId,
        'HTTP_X_SHOPIFY_TRIGGERED_AT' => '2026-08-22T14:30:00-03:00',
    ];
}

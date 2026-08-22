<?php

namespace App\Services\Shopify;

use App\Models\ShopifyIntegration;
use Carbon\CarbonInterface;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ShopifyApi
{
    /** @var array<string, string> */
    private array $accessTokens = [];

    public function credentialsConfigured(): bool
    {
        return filled(config('services.shopify.client_id'))
            && filled(config('services.shopify.client_secret'));
    }

    /** @return array{name: string, myshopifyDomain: string} */
    public function shopInfo(ShopifyIntegration $integration): array
    {
        $data = $this->graphql($integration, <<<'GRAPHQL'
            query ShopInfo {
                shop {
                    name
                    myshopifyDomain
                }
            }
        GRAPHQL);
        $shop = data_get($data, 'shop');

        if (! is_array($shop) || ! is_string($shop['name'] ?? null) || ! is_string($shop['myshopifyDomain'] ?? null)) {
            throw new RuntimeException('A Shopify não retornou os dados esperados da loja.');
        }

        return [
            'name' => $shop['name'],
            'myshopifyDomain' => $shop['myshopifyDomain'],
        ];
    }

    public function ensureOrdersPaidWebhook(
        ShopifyIntegration $integration,
        string $callbackUrl,
    ): string {
        if (! str_starts_with($callbackUrl, 'https://')) {
            throw new RuntimeException('O webhook da Shopify exige um endereço HTTPS público.');
        }

        $data = $this->graphql($integration, <<<'GRAPHQL'
            query OrdersPaidWebhooks {
                webhookSubscriptions(first: 25, topics: [ORDERS_PAID]) {
                    nodes {
                        id
                        topic
                        uri
                    }
                }
            }
        GRAPHQL);
        $subscriptions = data_get($data, 'webhookSubscriptions.nodes', []);
        $subscription = collect(is_array($subscriptions) ? $subscriptions : [])
            ->first(fn (mixed $item): bool => is_array($item) && ($item['topic'] ?? null) === 'ORDERS_PAID');

        if (is_array($subscription) && is_string($subscription['id'] ?? null)) {
            if (($subscription['uri'] ?? null) !== $callbackUrl) {
                $this->mutation($integration, <<<'GRAPHQL'
                    mutation UpdateOrdersPaidWebhook($id: ID!, $subscription: WebhookSubscriptionInput!) {
                        webhookSubscriptionUpdate(id: $id, webhookSubscription: $subscription) {
                            webhookSubscription { id uri }
                            userErrors { field message }
                        }
                    }
                GRAPHQL, [
                    'id' => $subscription['id'],
                    'subscription' => ['uri' => $callbackUrl],
                ], 'webhookSubscriptionUpdate');
            }

            return $subscription['id'];
        }

        $result = $this->mutation($integration, <<<'GRAPHQL'
            mutation CreateOrdersPaidWebhook($topic: WebhookSubscriptionTopic!, $subscription: WebhookSubscriptionInput!) {
                webhookSubscriptionCreate(topic: $topic, webhookSubscription: $subscription) {
                    webhookSubscription { id uri }
                    userErrors { field message }
                }
            }
        GRAPHQL, [
            'topic' => 'ORDERS_PAID',
            'subscription' => ['uri' => $callbackUrl],
        ], 'webhookSubscriptionCreate');
        $id = data_get($result, 'webhookSubscription.id');

        if (! is_string($id)) {
            throw new RuntimeException('A Shopify não retornou o identificador do webhook.');
        }

        return $id;
    }

    /** @return array<int, array<string, mixed>> */
    public function paidOrdersSince(
        ShopifyIntegration $integration,
        CarbonInterface $since,
    ): array {
        $orders = [];
        $cursor = null;
        $search = sprintf(
            "financial_status:paid AND processed_at:>='%s'",
            $since->utc()->format('Y-m-d\TH:i:s\Z'),
        );

        for ($page = 0; $page < 20; $page++) {
            $data = $this->graphql($integration, <<<'GRAPHQL'
                query PaidOrders($cursor: String, $query: String!) {
                    orders(first: 50, after: $cursor, sortKey: PROCESSED_AT, query: $query) {
                        nodes {
                            id
                            legacyResourceId
                            name
                            createdAt
                            processedAt
                            lineItems(first: 250) {
                                nodes {
                                    name
                                    title
                                    quantity
                                    product { id title }
                                    variant { id title }
                                }
                            }
                        }
                        pageInfo { hasNextPage endCursor }
                    }
                }
            GRAPHQL, [
                'cursor' => $cursor,
                'query' => $search,
            ]);
            $nodes = data_get($data, 'orders.nodes', []);

            foreach (is_array($nodes) ? $nodes : [] as $node) {
                if (is_array($node)) {
                    $orders[] = $node;
                }
            }

            if (! data_get($data, 'orders.pageInfo.hasNextPage')) {
                break;
            }

            $cursor = data_get($data, 'orders.pageInfo.endCursor');

            if (! is_string($cursor) || $cursor === '') {
                break;
            }
        }

        return $orders;
    }

    /**
     * @param  array<string, mixed>  $variables
     * @return array<string, mixed>
     */
    private function mutation(
        ShopifyIntegration $integration,
        string $query,
        array $variables,
        string $resultKey,
    ): array {
        $data = $this->graphql($integration, $query, $variables);
        $result = data_get($data, $resultKey);

        if (! is_array($result)) {
            throw new RuntimeException('A Shopify retornou uma resposta de configuração inválida.');
        }

        $userErrors = $result['userErrors'] ?? [];
        $messages = [];

        foreach (is_array($userErrors) ? $userErrors : [] as $error) {
            if (is_array($error) && is_string($error['message'] ?? null)) {
                $messages[] = $error['message'];
            }
        }

        $errors = implode(' ', $messages);

        if ($errors !== '') {
            throw new RuntimeException($errors);
        }

        return $result;
    }

    /**
     * @param  array<string, mixed>  $variables
     * @return array<string, mixed>
     */
    private function graphql(
        ShopifyIntegration $integration,
        string $query,
        array $variables = [],
    ): array {
        $response = $this->client($integration)->post(
            sprintf(
                'https://%s/admin/api/%s/graphql.json',
                $this->shopDomain($integration),
                config('services.shopify.api_version'),
            ),
            ['query' => $query, 'variables' => $variables],
        );
        $response->throw();
        $errors = $response->json('errors');

        if (is_array($errors) && $errors !== []) {
            $message = collect($errors)
                ->filter(fn (mixed $error): bool => is_array($error))
                ->pluck('message')
                ->filter()
                ->implode(' ');

            throw new RuntimeException($message ?: 'A Shopify rejeitou a operação solicitada.');
        }

        $data = $response->json('data');

        if (! is_array($data)) {
            throw new RuntimeException('A Shopify retornou uma resposta vazia.');
        }

        return $data;
    }

    private function client(ShopifyIntegration $integration): PendingRequest
    {
        return Http::acceptJson()
            ->asJson()
            ->timeout(20)
            ->withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken($integration),
            ]);
    }

    private function accessToken(ShopifyIntegration $integration): string
    {
        $shopDomain = $this->shopDomain($integration);

        if (isset($this->accessTokens[$shopDomain])) {
            return $this->accessTokens[$shopDomain];
        }

        if (! $this->credentialsConfigured()) {
            throw new RuntimeException('Preencha SHOPIFY_CLIENT_ID e SHOPIFY_CLIENT_SECRET no arquivo .env.');
        }

        $response = Http::asForm()
            ->acceptJson()
            ->timeout(15)
            ->post("https://{$shopDomain}/admin/oauth/access_token", [
                'grant_type' => 'client_credentials',
                'client_id' => config('services.shopify.client_id'),
                'client_secret' => config('services.shopify.client_secret'),
            ]);
        $response->throw();
        $token = $response->json('access_token');

        if (! is_string($token) || $token === '') {
            throw new RuntimeException('Não foi possível gerar o token de acesso da Shopify.');
        }

        return $this->accessTokens[$shopDomain] = $token;
    }

    private function shopDomain(ShopifyIntegration $integration): string
    {
        $shopDomain = strtolower(trim((string) $integration->shop_domain));

        if (! preg_match('/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/', $shopDomain)) {
            throw new RuntimeException('O domínio myshopify.com configurado é inválido.');
        }

        return $shopDomain;
    }
}

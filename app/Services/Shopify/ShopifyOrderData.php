<?php

namespace App\Services\Shopify;

use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * @phpstan-type ShopifyOrderItem array{
 *     external_key: string,
 *     name: string,
 *     quantity: int<1, max>,
 *     shopify_product_id: string|null,
 *     shopify_variant_id: string|null
 * }
 * @phpstan-type ShopifyOrder array{
 *     order_id: string,
 *     order_number: string|null,
 *     processed_at: string,
 *     items: list<ShopifyOrderItem>
 * }
 */
class ShopifyOrderData
{
    /**
     * @param  array<array-key, mixed>  $payload
     * @return ShopifyOrder
     */
    public function fromWebhook(array $payload): array
    {
        $externalOrderId = $this->stringValue(
            $payload['id'] ?? $payload['admin_graphql_api_id'] ?? null,
        );

        if ($externalOrderId === null) {
            throw new InvalidArgumentException('O pedido da Shopify não possui identificador.');
        }

        /** @var list<ShopifyOrderItem> $items */
        $items = [];
        $lineItems = $payload['line_items'] ?? [];

        foreach (is_array($lineItems) ? $lineItems : [] as $lineItem) {
            if (! is_array($lineItem)) {
                continue;
            }

            $item = $this->normalizeItem(
                name: $lineItem['title'] ?? $lineItem['name'] ?? null,
                quantity: $lineItem['quantity'] ?? null,
                productId: $lineItem['product_id'] ?? null,
                variantId: $lineItem['variant_id'] ?? null,
            );

            if ($item !== null) {
                $items[] = $item;
            }
        }

        return [
            'order_id' => $externalOrderId,
            'order_number' => $this->orderNumber(
                $payload['order_number'] ?? $payload['name'] ?? null,
            ),
            'processed_at' => $this->stringValue(
                $payload['processed_at'] ?? $payload['created_at'] ?? null,
            ) ?? now()->toIso8601String(),
            'items' => $items,
        ];
    }

    /**
     * @param  array<array-key, mixed>  $order
     * @return ShopifyOrder
     */
    public function fromGraphql(array $order): array
    {
        $externalOrderId = $this->stringValue(
            $order['legacyResourceId'] ?? $order['id'] ?? null,
        );

        if ($externalOrderId === null) {
            throw new InvalidArgumentException('O pedido sincronizado não possui identificador.');
        }

        /** @var list<ShopifyOrderItem> $items */
        $items = [];
        $lineItems = data_get($order, 'lineItems.nodes', []);

        foreach (is_array($lineItems) ? $lineItems : [] as $lineItem) {
            if (! is_array($lineItem)) {
                continue;
            }

            $item = $this->normalizeItem(
                name: data_get($lineItem, 'product.title')
                    ?? $lineItem['title']
                    ?? $lineItem['name']
                    ?? null,
                quantity: $lineItem['quantity'] ?? null,
                productId: data_get($lineItem, 'product.id'),
                variantId: data_get($lineItem, 'variant.id'),
            );

            if ($item !== null) {
                $items[] = $item;
            }
        }

        return [
            'order_id' => $externalOrderId,
            'order_number' => $this->orderNumber($order['name'] ?? null),
            'processed_at' => $this->stringValue(
                $order['processedAt'] ?? $order['createdAt'] ?? null,
            ) ?? now()->toIso8601String(),
            'items' => $items,
        ];
    }

    public function normalizeName(string $name): string
    {
        return Str::lower(Str::squish($name));
    }

    /** @return ShopifyOrderItem|null */
    private function normalizeItem(
        mixed $name,
        mixed $quantity,
        mixed $productId,
        mixed $variantId,
    ): ?array {
        $title = $this->stringValue($name);
        $normalizedQuantity = filter_var($quantity, FILTER_VALIDATE_INT);

        if ($title === null || $normalizedQuantity === false || $normalizedQuantity < 1) {
            return null;
        }

        $shopifyProductId = $this->stringValue($productId);
        $shopifyVariantId = $this->stringValue($variantId);

        return [
            'external_key' => $this->externalKey($title, $shopifyProductId, $shopifyVariantId),
            'name' => $title,
            'quantity' => $normalizedQuantity,
            'shopify_product_id' => $shopifyProductId,
            'shopify_variant_id' => $shopifyVariantId,
        ];
    }

    private function externalKey(
        string $title,
        ?string $productId,
        ?string $variantId,
    ): string {
        if ($variantId !== null) {
            return "variant:{$variantId}";
        }

        if ($productId !== null) {
            return "product:{$productId}";
        }

        return 'title:'.sha1($this->normalizeName($title));
    }

    private function orderNumber(mixed $value): ?string
    {
        $orderNumber = $this->stringValue($value);

        return $orderNumber === null ? null : ltrim($orderNumber, '#');
    }

    private function stringValue(mixed $value): ?string
    {
        if (! is_string($value) && ! is_int($value)) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $shopify_integration_id
 * @property int $product_id
 * @property string $external_key
 * @property string|null $shopify_product_id
 * @property string|null $shopify_variant_id
 * @property string $shopify_title
 * @property ShopifyIntegration $integration
 * @property Product $product
 */
class ShopifyProductMapping extends Model
{
    protected $fillable = [
        'shopify_integration_id',
        'product_id',
        'external_key',
        'shopify_product_id',
        'shopify_variant_id',
        'shopify_title',
    ];

    /** @return BelongsTo<ShopifyIntegration, $this> */
    public function integration(): BelongsTo
    {
        return $this->belongsTo(ShopifyIntegration::class, 'shopify_integration_id');
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

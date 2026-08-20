export type CategoryRecord = {
    id: number;
    name: string;
    is_active: boolean;
    products_count: number;
    discounts_count: number;
};

export type ProductCostTier = {
    id?: number;
    min_quantity: number;
    unit_cost_cents: number;
};

export type ProductRecord = {
    id: number;
    category_id: number;
    category_name: string;
    name: string;
    sku: string | null;
    sale_price_cents: number;
    base_cost_cents: number;
    is_active: boolean;
    cost_tiers: ProductCostTier[];
};

export type DiscountTier = {
    id?: number;
    min_quantity: number;
    percentage_basis_points: number;
};

export type DiscountRecord = {
    id: number;
    category_id: number;
    category_name: string;
    name: string;
    is_active: boolean;
    starts_on: string | null;
    ends_on: string | null;
    tiers: DiscountTier[];
};

export type CampaignRecord = {
    id: number;
    name: string;
    platform: string;
    is_active: boolean;
    starts_on: string | null;
    ends_on: string | null;
    notes: string | null;
    sales_count: number;
    daily_spends_count: number;
};

export type CampaignOption = {
    id: number;
    name: string;
    is_active: boolean;
    spend_dates?: string[];
};

export type SaleRow = {
    id: number;
    order_number: string | null;
    customer_name: string | null;
    sold_at: string;
    campaign_name: string | null;
    items_count: number;
    products_subtotal_cents: number;
    discount_cents: number;
    shipping_cents: number;
    revenue_cents: number;
    product_cost_cents: number;
    gross_profit_cents: number;
};

export type SimplePagination<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

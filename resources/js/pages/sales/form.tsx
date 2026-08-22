import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    BadgePercent,
    Boxes,
    ChevronDown,
    CircleDollarSign,
    Package,
    Plus,
    ReceiptText,
    Trash2,
    Truck,
    WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { ProductCombobox } from '@/components/product-combobox';
import type { ProductComboboxOption } from '@/components/product-combobox';
import { QuantitySelector } from '@/components/quantity-selector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { formatBasisPoints, formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CampaignOption } from '@/types';

type CatalogCostTier = { min_quantity: number; unit_cost_cents: number };
type CatalogProduct = ProductComboboxOption & {
    id: number;
    name: string;
    category_id: number;
    category_name: string;
    sale_price_cents: number;
    base_cost_cents: number;
    cost_tiers: CatalogCostTier[];
};
type DiscountConfig = {
    category_id: number;
    starts_on: string | null;
    ends_on: string | null;
    tiers: { min_quantity: number; percentage_basis_points: number }[];
};
type StoreSettings = {
    fixed_shipping_cents: number;
    free_shipping_threshold_cents: number;
};
type ShippingMode = 'automatic' | 'charged' | 'free';
type SaleItemInput = { product_id: string; quantity: string };
type SaleFormData = {
    campaign_id: string;
    order_number: string;
    customer_name: string;
    sold_at: string;
    shipping_mode: ShippingMode;
    notes: string;
    items: SaleItemInput[];
};
type ExistingSale = {
    id: number;
    campaign_id: number | null;
    order_number: string | null;
    customer_name: string | null;
    sold_at: string;
    shipping_mode: Exclude<ShippingMode, 'automatic'>;
    notes: string | null;
    products_subtotal_cents: number;
    discount_cents: number;
    shipping_cents: number;
    revenue_cents: number;
    product_cost_cents: number;
    gross_profit_cents: number;
    items: { product_id: number | null; quantity: number }[];
};

type PreviewLine = {
    product: CatalogProduct;
    quantity: number;
    discount_basis_points: number;
    discount_cents: number;
    cost_tier_min_quantity: number | null;
    unit_cost_cents: number;
    gross_cents: number;
    cost_cents: number;
};

type Preview = {
    lines: (PreviewLine | null)[];
    subtotal_cents: number;
    discount_cents: number;
    shipping_cents: number;
    shipping_charged: boolean;
    revenue_cents: number;
    product_cost_cents: number;
    gross_profit_cents: number;
};

type Props = {
    sale: ExistingSale | null;
    nextOrderNumber?: string;
    products: CatalogProduct[];
    discounts: DiscountConfig[];
    campaigns: CampaignOption[];
    settings: StoreSettings;
};

export default function SaleForm({
    sale,
    nextOrderNumber,
    products,
    discounts,
    campaigns,
    settings,
}: Props) {
    const form = useForm<SaleFormData>({
        campaign_id: sale?.campaign_id ? String(sale.campaign_id) : '',
        order_number: sale?.order_number ?? nextOrderNumber ?? '',
        customer_name: sale?.customer_name ?? '',
        sold_at: sale?.sold_at ?? currentLocalDateTime(),
        shipping_mode: sale?.shipping_mode ?? 'automatic',
        notes: sale?.notes ?? '',
        items:
            sale?.items.map((item) => ({
                product_id:
                    item.product_id === null ? '' : String(item.product_id),
                quantity: String(item.quantity),
            })) ??
            (products.length > 0
                ? [{ product_id: String(products[0].id), quantity: '1' }]
                : []),
    });
    const [expandedItem, setExpandedItem] = useState<number | null>(0);
    const [recentProductIds, setRecentProductIds] = usePersistentState<
        string[]
    >('hiratafy.sales.recent-product-ids', []);
    const errors = form.errors as Record<string, string>;
    const preview = calculatePreview(form.data, products, discounts, settings);
    const saleDate = form.data.sold_at.slice(0, 10);
    const selectedCampaign = campaigns.find(
        (campaign) => campaign.id === Number(form.data.campaign_id),
    );
    const campaignInvestmentMissing =
        selectedCampaign !== undefined &&
        saleDate !== '' &&
        !(selectedCampaign.spend_dates ?? []).includes(saleDate);
    const submitDisabled =
        form.processing ||
        products.length === 0 ||
        form.data.items.length === 0 ||
        campaignInvestmentMissing;

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (sale) {
            form.put(`/vendas/${sale.id}`);
        } else {
            form.post('/vendas');
        }
    }

    function addItem() {
        const selectedIds = new Set(
            form.data.items.map((item) => item.product_id),
        );
        const nextProduct = products.find(
            (product) => !selectedIds.has(String(product.id)),
        );
        form.setData('items', [
            ...form.data.items,
            {
                product_id: nextProduct ? String(nextProduct.id) : '',
                quantity: '1',
            },
        ]);
        setExpandedItem(form.data.items.length);
    }

    function updateItem(
        index: number,
        field: keyof SaleItemInput,
        value: string,
    ) {
        form.setData(
            'items',
            form.data.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item,
            ),
        );
    }

    function removeItem(index: number) {
        form.setData(
            'items',
            form.data.items.filter((_, itemIndex) => itemIndex !== index),
        );
        setExpandedItem((currentIndex) => {
            if (currentIndex === null) {
                return null;
            }

            if (currentIndex === index) {
                return Math.max(0, index - 1);
            }

            return currentIndex > index ? currentIndex - 1 : currentIndex;
        });
    }

    function rememberProduct(productId: string) {
        setRecentProductIds((currentIds) =>
            [
                productId,
                ...currentIds.filter((currentId) => currentId !== productId),
            ].slice(0, 5),
        );
    }

    return (
        <>
            <Head title={sale ? 'Editar venda' : 'Nova venda'} />
            <form
                onSubmit={submit}
                className="flex flex-1 flex-col gap-4 p-3 pb-40 sm:gap-6 sm:p-4 sm:pb-40 md:p-6 md:pb-28 xl:pb-6"
            >
                <PageHeader
                    title={sale ? 'Editar venda' : 'Registrar venda'}
                    description="Os valores são calculados pelos produtos, descontos e regras de frete cadastrados."
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/vendas">
                                <ArrowLeft /> Voltar
                            </Link>
                        </Button>
                    }
                />

                {products.length === 0 && (
                    <Alert>
                        <Package />
                        <AlertTitle>Cadastre um produto antes</AlertTitle>
                        <AlertDescription>
                            Uma venda precisa de pelo menos um produto ativo.{' '}
                            <Link
                                href="/produtos/novo"
                                className="font-medium text-foreground underline"
                            >
                                Cadastrar produto
                            </Link>
                        </AlertDescription>
                    </Alert>
                )}

                {campaignInvestmentMissing && selectedCampaign && (
                    <Alert
                        variant="destructive"
                        className="border-destructive/40"
                    >
                        <AlertTriangle />
                        <AlertTitle>
                            Falta o investimento desta campanha
                        </AlertTitle>
                        <AlertDescription>
                            Cadastre o orçamento de “{selectedCampaign.name}” em{' '}
                            {saleDate.split('-').reverse().join('/')} antes de
                            salvar.{' '}
                            <Link
                                href={`/investimentos?date=${saleDate}`}
                                className="font-medium underline"
                            >
                                Informar investimento
                            </Link>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-6">
                        <Card className="shadow-xs">
                            <CardHeader>
                                <CardTitle>Dados do pedido</CardTitle>
                                <CardDescription>
                                    Use a data original para cadastrar vendas
                                    passadas.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="sold_at">Data e hora</Label>
                                    <Input
                                        id="sold_at"
                                        type="datetime-local"
                                        value={form.data.sold_at}
                                        onChange={(event) =>
                                            form.setData(
                                                'sold_at',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.sold_at} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Campanha</Label>
                                    <Select
                                        value={
                                            form.data.campaign_id || 'organic'
                                        }
                                        onValueChange={(value) =>
                                            form.setData(
                                                'campaign_id',
                                                value === 'organic'
                                                    ? ''
                                                    : value,
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="organic">
                                                Sem campanha / orgânica
                                            </SelectItem>
                                            {campaigns.map((campaign) => (
                                                <SelectItem
                                                    key={campaign.id}
                                                    value={String(campaign.id)}
                                                >
                                                    {campaign.name}
                                                    {!campaign.is_active
                                                        ? ' (pausada)'
                                                        : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={form.errors.campaign_id}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="order_number">
                                        Número do pedido
                                    </Label>
                                    <Input
                                        id="order_number"
                                        value={form.data.order_number}
                                        onChange={(event) =>
                                            form.setData(
                                                'order_number',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Ex.: 1042"
                                    />
                                    <InputError
                                        message={form.errors.order_number}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="customer_name">
                                        Cliente (opcional)
                                    </Label>
                                    <Input
                                        id="customer_name"
                                        value={form.data.customer_name}
                                        onChange={(event) =>
                                            form.setData(
                                                'customer_name',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Nome para referência"
                                    />
                                    <InputError
                                        message={form.errors.customer_name}
                                    />
                                </div>
                                <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between md:col-span-2 xl:col-span-4">
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id="shipping_charged"
                                            checked={preview.shipping_charged}
                                            onCheckedChange={(checked) =>
                                                form.setData(
                                                    'shipping_mode',
                                                    checked === true
                                                        ? 'charged'
                                                        : 'free',
                                                )
                                            }
                                        />
                                        <div className="grid gap-1">
                                            <Label htmlFor="shipping_charged">
                                                Frete cobrado do cliente
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                {preview.shipping_charged
                                                    ? `Soma ${formatCurrency(settings.fixed_shipping_cents)} ao faturamento deste pedido.`
                                                    : 'Nenhum frete será somado ao faturamento deste pedido.'}
                                            </p>
                                            <InputError
                                                message={
                                                    form.errors.shipping_mode
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                                        <span className="text-xs text-muted-foreground">
                                            {form.data.shipping_mode ===
                                            'automatic'
                                                ? 'Regra automática'
                                                : 'Ajuste manual'}
                                        </span>
                                        {form.data.shipping_mode !==
                                            'automatic' && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    form.setData(
                                                        'shipping_mode',
                                                        'automatic',
                                                    )
                                                }
                                            >
                                                Usar automático
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-xs">
                            <CardHeader className="items-stretch justify-between gap-4 sm:flex-row sm:items-start">
                                <div className="space-y-1.5">
                                    <CardTitle>Produtos</CardTitle>
                                    <CardDescription>
                                        O desconto soma a categoria; o custo do
                                        fornecedor usa cada produto
                                        separadamente.
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addItem}
                                    disabled={
                                        form.data.items.length >=
                                        products.length
                                    }
                                >
                                    <Plus /> Adicionar produto
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {form.data.items.map((item, index) => {
                                    const selectedElsewhere = new Set(
                                        form.data.items
                                            .filter(
                                                (_, itemIndex) =>
                                                    itemIndex !== index,
                                            )
                                            .map(
                                                (otherItem) =>
                                                    otherItem.product_id,
                                            ),
                                    );

                                    return (
                                        <SaleProductCard
                                            key={index}
                                            index={index}
                                            item={item}
                                            line={preview.lines[index]}
                                            products={products}
                                            disabledProductIds={
                                                selectedElsewhere
                                            }
                                            recentProductIds={recentProductIds}
                                            errors={errors}
                                            isOpen={expandedItem === index}
                                            canRemove={
                                                form.data.items.length > 1
                                            }
                                            onOpenChange={(open) =>
                                                setExpandedItem(
                                                    open ? index : null,
                                                )
                                            }
                                            onUpdate={(field, value) =>
                                                updateItem(index, field, value)
                                            }
                                            onRemove={() => removeItem(index)}
                                            onRecentProduct={rememberProduct}
                                        />
                                    );
                                })}
                                <InputError message={form.errors.items} />
                            </CardContent>
                        </Card>

                        <Card className="shadow-xs">
                            <CardHeader>
                                <CardTitle>Observações</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    value={form.data.notes}
                                    onChange={(event) =>
                                        form.setData(
                                            'notes',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Qualquer contexto útil sobre este pedido."
                                />
                                <InputError
                                    className="mt-2"
                                    message={form.errors.notes}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="hidden space-y-5 xl:sticky xl:top-6 xl:block">
                        <Card className="shadow-xs">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ReceiptText className="size-4" /> Resumo da
                                    venda
                                </CardTitle>
                                <CardDescription>
                                    Prévia calculada em tempo real.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SaleSummaryContent preview={preview} />
                            </CardContent>
                        </Card>

                        <Alert>
                            <Truck />
                            <AlertTitle>Regra do frete</AlertTitle>
                            <AlertDescription>
                                Frete grátis a partir de{' '}
                                {formatCurrency(
                                    settings.free_shipping_threshold_cents,
                                )}{' '}
                                no subtotal antes dos descontos. Abaixo disso, o
                                valor fixo é{' '}
                                {formatCurrency(settings.fixed_shipping_cents)}.
                                O controle nos dados do pedido permite ajustar
                                esta venda manualmente.
                            </AlertDescription>
                        </Alert>

                        {selectedCampaign && !campaignInvestmentMissing && (
                            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                                <WalletCards className="size-4" /> Investimento
                                encontrado para a campanha.
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={submitDisabled}
                        >
                            {form.processing && <Spinner />}
                            {sale ? 'Recalcular e salvar' : 'Registrar venda'}
                        </Button>
                    </div>
                </div>

                <MobileSaleSummary
                    preview={preview}
                    settings={settings}
                    processing={form.processing}
                    disabled={submitDisabled}
                    submitLabel={
                        sale ? 'Recalcular e salvar' : 'Registrar venda'
                    }
                />
            </form>
        </>
    );
}

function currentLocalDateTime(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

    return local.toISOString().slice(0, 16);
}

function calculatePreview(
    data: SaleFormData,
    products: CatalogProduct[],
    discounts: DiscountConfig[],
    settings: StoreSettings,
): Preview {
    const productMap = new Map(
        products.map((product) => [String(product.id), product]),
    );
    const categoryQuantities = new Map<number, number>();
    const soldOn = data.sold_at.slice(0, 10);

    data.items.forEach((item) => {
        const product = productMap.get(item.product_id);
        const quantity = Math.max(0, Number.parseInt(item.quantity, 10) || 0);

        if (product && quantity > 0) {
            categoryQuantities.set(
                product.category_id,
                (categoryQuantities.get(product.category_id) ?? 0) + quantity,
            );
        }
    });

    const categoryDiscounts = new Map<number, number>();
    categoryQuantities.forEach((quantity, categoryId) => {
        const bestRate = discounts
            .filter(
                (discount) =>
                    discount.category_id === categoryId &&
                    (discount.starts_on === null ||
                        discount.starts_on <= soldOn) &&
                    (discount.ends_on === null || discount.ends_on >= soldOn),
            )
            .flatMap((discount) => discount.tiers)
            .filter((tier) => tier.min_quantity <= quantity)
            .reduce(
                (highest, tier) =>
                    Math.max(highest, tier.percentage_basis_points),
                0,
            );
        categoryDiscounts.set(categoryId, bestRate);
    });

    const lines = data.items.map((item): PreviewLine | null => {
        const product = productMap.get(item.product_id);
        const quantity = Math.max(0, Number.parseInt(item.quantity, 10) || 0);

        if (!product || quantity === 0) {
            return null;
        }

        const discountBasisPoints =
            categoryDiscounts.get(product.category_id) ?? 0;
        const gross = product.sale_price_cents * quantity;
        const discount = Math.round((gross * discountBasisPoints) / 10_000);
        const eligibleTier = [...product.cost_tiers]
            .filter((tier) => tier.min_quantity <= quantity)
            .sort(
                (first, second) => second.min_quantity - first.min_quantity,
            )[0];
        const unitCost =
            eligibleTier?.unit_cost_cents ?? product.base_cost_cents;

        return {
            product,
            quantity,
            discount_basis_points: discountBasisPoints,
            discount_cents: discount,
            cost_tier_min_quantity: eligibleTier?.min_quantity ?? null,
            unit_cost_cents: unitCost,
            gross_cents: gross,
            cost_cents: unitCost * quantity,
        };
    });
    const validLines = lines.filter(
        (line): line is PreviewLine => line !== null,
    );
    const subtotal = validLines.reduce(
        (total, line) => total + line.gross_cents,
        0,
    );
    const discount = validLines.reduce(
        (total, line) => total + line.discount_cents,
        0,
    );
    const productCost = validLines.reduce(
        (total, line) => total + line.cost_cents,
        0,
    );
    const automaticShippingCharged =
        subtotal > 0 && subtotal < settings.free_shipping_threshold_cents;
    const shippingCharged =
        subtotal > 0 &&
        (data.shipping_mode === 'charged' ||
            (data.shipping_mode === 'automatic' && automaticShippingCharged));
    const shipping = shippingCharged ? settings.fixed_shipping_cents : 0;
    const revenue = subtotal - discount + shipping;

    return {
        lines,
        subtotal_cents: subtotal,
        discount_cents: discount,
        shipping_cents: shipping,
        shipping_charged: shippingCharged,
        revenue_cents: revenue,
        product_cost_cents: productCost,
        gross_profit_cents: revenue - productCost,
    };
}

function SaleProductCard({
    index,
    item,
    line,
    products,
    disabledProductIds,
    recentProductIds,
    errors,
    isOpen,
    canRemove,
    onOpenChange,
    onUpdate,
    onRemove,
    onRecentProduct,
}: {
    index: number;
    item: SaleItemInput;
    line: PreviewLine | null | undefined;
    products: CatalogProduct[];
    disabledProductIds: Set<string>;
    recentProductIds: string[];
    errors: Record<string, string>;
    isOpen: boolean;
    canRemove: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (field: keyof SaleItemInput, value: string) => void;
    onRemove: () => void;
    onRecentProduct: (productId: string) => void;
}) {
    const selectedProduct = products.find(
        (product) => String(product.id) === item.product_id,
    );
    const netAmount = line ? line.gross_cents - line.discount_cents : null;

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={onOpenChange}
            className="overflow-hidden rounded-lg border"
        >
            <div className="flex items-center gap-2 p-3 md:hidden">
                <CollapsibleTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        className="group h-auto min-w-0 flex-1 justify-start px-1 py-1 text-left whitespace-normal"
                    >
                        <span className="grid min-w-0 flex-1 gap-0.5">
                            <span className="truncate font-medium">
                                {selectedProduct?.name ??
                                    `Produto ${index + 1}`}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                                {item.quantity || '0'} un.
                                {netAmount !== null && (
                                    <> · {formatCurrency(netAmount)}</>
                                )}
                                {selectedProduct && (
                                    <> · {selectedProduct.category_name}</>
                                )}
                            </span>
                        </span>
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </Button>
                </CollapsibleTrigger>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={onRemove}
                    disabled={!canRemove}
                    aria-label={`Remover ${selectedProduct?.name ?? `produto ${index + 1}`}`}
                >
                    <Trash2 />
                </Button>
            </div>
            <CollapsibleContent
                forceMount
                className="border-t data-[state=closed]:hidden md:!block md:border-t-0"
            >
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-[minmax(220px,1fr)_160px_auto]">
                    <div className="col-span-2 grid min-w-0 gap-2 md:col-span-1">
                        <Label htmlFor={`product_${index}`}>Produto</Label>
                        <ProductCombobox
                            id={`product_${index}`}
                            products={products}
                            value={item.product_id}
                            disabledProductIds={disabledProductIds}
                            recentProductIds={recentProductIds}
                            onValueChange={(value) =>
                                onUpdate('product_id', value)
                            }
                            onRecentProduct={onRecentProduct}
                        />
                        <InputError
                            message={errors[`items.${index}.product_id`]}
                        />
                    </div>
                    <div className="grid min-w-0 gap-2">
                        <Label htmlFor={`quantity_${index}`}>Quantidade</Label>
                        <QuantitySelector
                            id={`quantity_${index}`}
                            value={item.quantity}
                            onValueChange={(value) =>
                                onUpdate('quantity', value)
                            }
                        />
                        <InputError
                            message={errors[`items.${index}.quantity`]}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6 hidden text-muted-foreground hover:text-destructive md:inline-flex"
                        onClick={onRemove}
                        disabled={!canRemove}
                        aria-label="Remover produto"
                    >
                        <Trash2 />
                    </Button>
                    <div className="col-span-2 grid grid-cols-2 gap-3 rounded-lg bg-muted/45 p-3 sm:grid-cols-3 md:col-span-3">
                        <LineMetric
                            label="Preço unit."
                            value={
                                line
                                    ? formatCurrency(
                                          line.product.sale_price_cents,
                                      )
                                    : '—'
                            }
                        />
                        <LineMetric
                            label="Desconto da categoria"
                            value={
                                line && line.discount_basis_points > 0
                                    ? formatBasisPoints(
                                          line.discount_basis_points,
                                      )
                                    : '—'
                            }
                            accent={
                                line !== null &&
                                line !== undefined &&
                                line.discount_basis_points > 0
                            }
                        />
                        <LineMetric
                            label="Custo do fornecedor"
                            value={
                                line
                                    ? formatCurrency(line.unit_cost_cents)
                                    : '—'
                            }
                        />
                    </div>
                    {line && (
                        <div className="col-span-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground md:col-span-3">
                            <span>Categoria: {line.product.category_name}</span>
                            <span>
                                Faixa do fornecedor:{' '}
                                {line.cost_tier_min_quantity === null
                                    ? 'custo-base'
                                    : `${line.cost_tier_min_quantity}+ unidades deste produto`}
                            </span>
                            <span className="hidden sm:inline">
                                Bruto: {formatCurrency(line.gross_cents)}
                            </span>
                            <span className="hidden sm:inline">
                                Desconto: −{' '}
                                {formatCurrency(line.discount_cents)}
                            </span>
                            <span className="hidden sm:inline">
                                Custo: {formatCurrency(line.cost_cents)}
                            </span>
                        </div>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function LineMetric({
    label,
    value,
    accent = false,
}: {
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <div className="grid gap-1 pt-0.5">
            <span className="text-xs font-medium text-muted-foreground">
                {label}
            </span>
            <span
                className={cn(
                    'text-sm font-medium',
                    accent && 'text-emerald-600 dark:text-emerald-400',
                )}
            >
                {value}
            </span>
        </div>
    );
}

function SaleSummaryContent({ preview }: { preview: Preview }) {
    return (
        <div className="space-y-4 text-sm">
            <SummaryRow
                icon={Boxes}
                label="Subtotal dos produtos"
                value={formatCurrency(preview.subtotal_cents)}
            />
            <SummaryRow
                icon={BadgePercent}
                label="Desconto automático"
                value={`− ${formatCurrency(preview.discount_cents)}`}
            />
            <SummaryRow
                icon={Truck}
                label={
                    preview.shipping_cents === 0 ? 'Frete grátis' : 'Frete fixo'
                }
                value={
                    preview.shipping_cents === 0
                        ? formatCurrency(0)
                        : `+ ${formatCurrency(preview.shipping_cents)}`
                }
            />
            <div className="border-t pt-4">
                <SummaryRow
                    icon={CircleDollarSign}
                    label="Faturamento"
                    value={formatCurrency(preview.revenue_cents)}
                    strong
                />
            </div>
            <SummaryRow
                icon={Package}
                label="Custo de produto"
                value={`− ${formatCurrency(preview.product_cost_cents)}`}
            />
            <div className="border-t pt-4">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <p className="font-medium">Margem bruta da venda</p>
                        <p className="text-xs text-muted-foreground">
                            Antes do custo diário de mídia
                        </p>
                    </div>
                    <p
                        className={cn(
                            'text-xl font-semibold break-words tabular-nums',
                            preview.gross_profit_cents >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-destructive',
                        )}
                    >
                        {formatCurrency(preview.gross_profit_cents)}
                    </p>
                </div>
            </div>
        </div>
    );
}

function MobileSaleSummary({
    preview,
    settings,
    processing,
    disabled,
    submitLabel,
}: {
    preview: Preview;
    settings: StoreSettings;
    processing: boolean;
    disabled: boolean;
    submitLabel: string;
}) {
    return (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t bg-background/95 px-3 py-2 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur md:bottom-0 md:px-6 xl:hidden">
            <div className="mx-auto grid max-w-3xl gap-2">
                <div className="grid grid-cols-3 gap-2">
                    <CompactMetric
                        label="Faturamento"
                        value={formatCurrency(preview.revenue_cents)}
                    />
                    <CompactMetric
                        label="Custo"
                        value={formatCurrency(preview.product_cost_cents)}
                    />
                    <CompactMetric
                        label="Margem"
                        value={formatCurrency(preview.gross_profit_cents)}
                        tone={
                            preview.gross_profit_cents >= 0
                                ? 'positive'
                                : 'negative'
                        }
                    />
                </div>
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button type="button" variant="outline">
                                <ReceiptText /> Detalhes
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="bottom"
                            className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
                        >
                            <SheetHeader className="border-b text-left">
                                <SheetTitle>Resumo da venda</SheetTitle>
                                <SheetDescription>
                                    Prévia calculada em tempo real.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="grid gap-4 px-4 pb-4">
                                <SaleSummaryContent preview={preview} />
                                <Alert>
                                    <Truck />
                                    <AlertTitle>Regra do frete</AlertTitle>
                                    <AlertDescription>
                                        Frete grátis a partir de{' '}
                                        {formatCurrency(
                                            settings.free_shipping_threshold_cents,
                                        )}
                                        . Abaixo disso, o valor fixo é{' '}
                                        {formatCurrency(
                                            settings.fixed_shipping_cents,
                                        )}
                                        .
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </SheetContent>
                    </Sheet>
                    <Button type="submit" disabled={disabled}>
                        {processing && <Spinner />}
                        {submitLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function CompactMetric({
    label,
    value,
    tone = 'default',
}: {
    label: string;
    value: string;
    tone?: 'default' | 'positive' | 'negative';
}) {
    return (
        <div className="min-w-0 rounded-md bg-muted/55 px-2 py-1.5">
            <p className="truncate text-[10px] text-muted-foreground">
                {label}
            </p>
            <p
                className={cn(
                    'truncate text-xs font-semibold tabular-nums sm:text-sm',
                    tone === 'positive' &&
                        'text-emerald-600 dark:text-emerald-400',
                    tone === 'negative' && 'text-destructive',
                )}
            >
                {value}
            </p>
        </div>
    );
}

function SummaryRow({
    icon: Icon,
    label,
    value,
    strong = false,
}: {
    icon: typeof Truck;
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4" /> {label}
            </span>
            <span
                className={cn(
                    'tabular-nums',
                    strong && 'font-semibold text-foreground',
                )}
            >
                {value}
            </span>
        </div>
    );
}

SaleForm.layout = {
    breadcrumbs: [
        { title: 'Vendas', href: '/vendas' },
        { title: 'Cadastro', href: '/vendas/nova' },
    ],
};

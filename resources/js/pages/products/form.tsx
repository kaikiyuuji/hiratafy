import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CircleDollarSign,
    Package,
    Plus,
    Trash2,
    Truck,
} from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
    centsToInput,
    formatCurrency,
    moneyInputToCents,
} from '@/lib/formatters';
import type { ProductRecord } from '@/types';

type CategoryOption = { id: number; name: string };
type CostTierInput = { min_quantity: string; unit_cost: string };
type ProductFormData = {
    category_id: string;
    name: string;
    sku: string;
    sale_price: string;
    base_cost: string;
    is_active: boolean;
    cost_tiers: CostTierInput[];
};

export default function ProductForm({
    product,
    categories,
}: {
    product: ProductRecord | null;
    categories: CategoryOption[];
}) {
    const form = useForm<ProductFormData>({
        category_id: product ? String(product.category_id) : '',
        name: product?.name ?? '',
        sku: product?.sku ?? '',
        sale_price: centsToInput(product?.sale_price_cents),
        base_cost: centsToInput(product?.base_cost_cents),
        is_active: product?.is_active ?? true,
        cost_tiers:
            product?.cost_tiers.map((tier) => ({
                min_quantity: String(tier.min_quantity),
                unit_cost: centsToInput(tier.unit_cost_cents),
            })) ?? [],
    });
    const errors = form.errors as Record<string, string>;
    const salePriceCents = moneyInputToCents(form.data.sale_price);
    const baseCostCents = moneyInputToCents(form.data.base_cost);
    const baseMargin = salePriceCents - baseCostCents;

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (product) {
            form.put(`/produtos/${product.id}`);
        } else {
            form.post('/produtos');
        }
    }

    function addTier() {
        form.setData('cost_tiers', [
            ...form.data.cost_tiers,
            { min_quantity: '', unit_cost: '' },
        ]);
    }

    function updateTier(
        index: number,
        field: keyof CostTierInput,
        value: string,
    ) {
        form.setData(
            'cost_tiers',
            form.data.cost_tiers.map((tier, tierIndex) =>
                tierIndex === index ? { ...tier, [field]: value } : tier,
            ),
        );
    }

    function removeTier(index: number) {
        form.setData(
            'cost_tiers',
            form.data.cost_tiers.filter((_, tierIndex) => tierIndex !== index),
        );
    }

    return (
        <>
            <Head title={product ? `Editar ${product.name}` : 'Novo produto'} />
            <form
                onSubmit={submit}
                className="flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4 md:p-6"
            >
                <PageHeader
                    title={product ? 'Editar produto' : 'Novo produto'}
                    description="Defina o preço cobrado e como o custo do fornecedor muda conforme a quantidade."
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/produtos">
                                <ArrowLeft /> Voltar
                            </Link>
                        </Button>
                    }
                />

                {categories.length === 0 && (
                    <Alert>
                        <Package />
                        <AlertTitle>Crie uma categoria primeiro</AlertTitle>
                        <AlertDescription>
                            O produto precisa de uma categoria para participar
                            dos descontos por quantidade.{' '}
                            <Link
                                href="/categorias"
                                className="font-medium text-foreground underline"
                            >
                                Ir para categorias
                            </Link>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-6">
                        <Card className="shadow-xs">
                            <CardHeader>
                                <CardTitle>Informações do produto</CardTitle>
                                <CardDescription>
                                    Dados usados no catálogo e nas vendas.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-5 md:grid-cols-2">
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="name">
                                        Nome do produto
                                    </Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(event) =>
                                            form.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Ex.: Dump Classic"
                                        autoFocus
                                    />
                                    <InputError message={form.errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Categoria</Label>
                                    <Select
                                        value={form.data.category_id}
                                        onValueChange={(value) =>
                                            form.setData('category_id', value)
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecione uma categoria" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((category) => (
                                                <SelectItem
                                                    key={category.id}
                                                    value={String(category.id)}
                                                >
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={form.errors.category_id}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="sku">SKU (opcional)</Label>
                                    <Input
                                        id="sku"
                                        value={form.data.sku}
                                        onChange={(event) =>
                                            form.setData(
                                                'sku',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="DUMP-001"
                                    />
                                    <InputError message={form.errors.sku} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="sale_price">
                                        Preço de venda (USD)
                                    </Label>
                                    <Input
                                        id="sale_price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.data.sale_price}
                                        onChange={(event) =>
                                            form.setData(
                                                'sale_price',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="19.90"
                                    />
                                    <InputError
                                        message={form.errors.sale_price}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="base_cost">
                                        Custo unitário-base (USD)
                                    </Label>
                                    <Input
                                        id="base_cost"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.data.base_cost}
                                        onChange={(event) =>
                                            form.setData(
                                                'base_cost',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="9.50"
                                    />
                                    <InputError
                                        message={form.errors.base_cost}
                                    />
                                </div>
                                <div className="flex items-start gap-3 rounded-lg border p-4 md:col-span-2">
                                    <Checkbox
                                        id="is_active"
                                        checked={form.data.is_active}
                                        onCheckedChange={(checked) =>
                                            form.setData(
                                                'is_active',
                                                checked === true,
                                            )
                                        }
                                    />
                                    <div className="grid gap-1">
                                        <Label htmlFor="is_active">
                                            Produto ativo
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Produtos inativos deixam de aparecer
                                            em novas vendas, mas o histórico é
                                            mantido.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-xs">
                            <CardHeader className="items-stretch justify-between gap-4 sm:flex-row sm:items-start">
                                <div className="space-y-1.5">
                                    <CardTitle>
                                        Faixas de custo do fornecedor
                                    </CardTitle>
                                    <CardDescription>
                                        O maior mínimo atingido define o custo
                                        unitário daquela linha da venda.
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addTier}
                                >
                                    <Plus /> Adicionar faixa
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {form.data.cost_tiers.length === 0 ? (
                                    <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                                        Sem faixas: o custo-base será usado em
                                        qualquer quantidade.
                                    </div>
                                ) : (
                                    form.data.cost_tiers.map((tier, index) => (
                                        <div
                                            key={index}
                                            className="grid items-start gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]"
                                        >
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor={`tier_quantity_${index}`}
                                                >
                                                    A partir de
                                                </Label>
                                                <Input
                                                    id={`tier_quantity_${index}`}
                                                    type="number"
                                                    min="2"
                                                    step="1"
                                                    value={tier.min_quantity}
                                                    onChange={(event) =>
                                                        updateTier(
                                                            index,
                                                            'min_quantity',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="3 unidades"
                                                />
                                                <InputError
                                                    message={
                                                        errors[
                                                            `cost_tiers.${index}.min_quantity`
                                                        ]
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor={`tier_cost_${index}`}
                                                >
                                                    Custo por unidade
                                                </Label>
                                                <Input
                                                    id={`tier_cost_${index}`}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={tier.unit_cost}
                                                    onChange={(event) =>
                                                        updateTier(
                                                            index,
                                                            'unit_cost',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="9.00"
                                                />
                                                <InputError
                                                    message={
                                                        errors[
                                                            `cost_tiers.${index}.unit_cost`
                                                        ]
                                                    }
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="justify-self-end text-muted-foreground hover:text-destructive sm:mt-6"
                                                onClick={() =>
                                                    removeTier(index)
                                                }
                                                aria-label="Remover faixa"
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6 xl:sticky xl:top-6">
                        <Card className="shadow-xs">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CircleDollarSign className="size-4" />{' '}
                                    Resumo unitário
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <SummaryRow
                                    label="Preço de venda"
                                    value={formatCurrency(salePriceCents)}
                                />
                                <SummaryRow
                                    label="Custo-base"
                                    value={formatCurrency(baseCostCents)}
                                />
                                <div className="border-t pt-4">
                                    <SummaryRow
                                        label="Margem bruta-base"
                                        value={formatCurrency(baseMargin)}
                                        strong
                                        negative={baseMargin < 0}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        <Alert>
                            <Truck />
                            <AlertTitle>Exemplo</AlertTitle>
                            <AlertDescription>
                                Se a faixa de 3 unidades custa US$ 9 cada, uma
                                venda de 3 registra US$ 27 de custo.
                            </AlertDescription>
                        </Alert>
                        <div className="flex gap-3">
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={
                                    form.processing || categories.length === 0
                                }
                            >
                                {form.processing && <Spinner />}
                                {product ? 'Salvar produto' : 'Criar produto'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
}

function SummaryRow({
    label,
    value,
    strong = false,
    negative = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
    negative?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span
                className={`${strong ? 'font-semibold' : ''} ${negative ? 'text-destructive' : ''}`}
            >
                {value}
            </span>
        </div>
    );
}

ProductForm.layout = {
    breadcrumbs: [
        { title: 'Produtos', href: '/produtos' },
        { title: 'Cadastro', href: '/produtos/novo' },
    ],
};

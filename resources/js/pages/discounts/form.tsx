import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, BadgePercent, Layers3, Plus, Trash2 } from 'lucide-react';
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
import type { DiscountRecord } from '@/types';

type CategoryOption = { id: number; name: string };
type TierInput = { min_quantity: string; percentage: string };
type DiscountFormData = {
    category_id: string;
    name: string;
    is_active: boolean;
    starts_on: string;
    ends_on: string;
    tiers: TierInput[];
};

export default function DiscountForm({
    discount,
    categories,
}: {
    discount: DiscountRecord | null;
    categories: CategoryOption[];
}) {
    const form = useForm<DiscountFormData>({
        category_id: discount ? String(discount.category_id) : '',
        name: discount?.name ?? '',
        is_active: discount?.is_active ?? true,
        starts_on: discount?.starts_on ?? '',
        ends_on: discount?.ends_on ?? '',
        tiers: discount?.tiers.map((tier) => ({
            min_quantity: String(tier.min_quantity),
            percentage: (tier.percentage_basis_points / 100).toFixed(2),
        })) ?? [{ min_quantity: '3', percentage: '10.00' }],
    });
    const errors = form.errors as Record<string, string>;

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (discount) {
            form.put(`/descontos/${discount.id}`);
        } else {
            form.post('/descontos');
        }
    }

    function addTier() {
        form.setData('tiers', [
            ...form.data.tiers,
            { min_quantity: '', percentage: '' },
        ]);
    }

    function updateTier(index: number, field: keyof TierInput, value: string) {
        form.setData(
            'tiers',
            form.data.tiers.map((tier, tierIndex) =>
                tierIndex === index ? { ...tier, [field]: value } : tier,
            ),
        );
    }

    function removeTier(index: number) {
        form.setData(
            'tiers',
            form.data.tiers.filter((_, tierIndex) => tierIndex !== index),
        );
    }

    return (
        <>
            <Head
                title={discount ? `Editar ${discount.name}` : 'Novo desconto'}
            />
            <form
                onSubmit={submit}
                className="flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4 md:p-6"
            >
                <PageHeader
                    title={discount ? 'Editar desconto' : 'Novo desconto'}
                    description="As quantidades de todos os produtos da categoria são somadas antes de escolher a faixa."
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/descontos">
                                <ArrowLeft /> Voltar
                            </Link>
                        </Button>
                    }
                />

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-6">
                        <Card className="shadow-xs">
                            <CardHeader>
                                <CardTitle>Regra</CardTitle>
                                <CardDescription>
                                    Identificação, categoria e vigência.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-5 md:grid-cols-2">
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="name">Nome da regra</Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(event) =>
                                            form.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Ex.: Leve mais DUMP"
                                        autoFocus
                                    />
                                    <InputError message={form.errors.name} />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
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
                                    <Label htmlFor="starts_on">
                                        Início (opcional)
                                    </Label>
                                    <Input
                                        id="starts_on"
                                        type="date"
                                        value={form.data.starts_on}
                                        onChange={(event) =>
                                            form.setData(
                                                'starts_on',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.starts_on}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="ends_on">
                                        Fim (opcional)
                                    </Label>
                                    <Input
                                        id="ends_on"
                                        type="date"
                                        value={form.data.ends_on}
                                        onChange={(event) =>
                                            form.setData(
                                                'ends_on',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.ends_on} />
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
                                            Aplicar automaticamente
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            A data da venda também precisa estar
                                            dentro da vigência.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-xs">
                            <CardHeader className="items-stretch justify-between gap-4 sm:flex-row sm:items-start">
                                <div className="space-y-1.5">
                                    <CardTitle>Faixas de desconto</CardTitle>
                                    <CardDescription>
                                        Informe quantidade mínima e percentual.
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
                                {form.data.tiers.map((tier, index) => (
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
                                                placeholder="3"
                                            />
                                            <InputError
                                                message={
                                                    errors[
                                                        `tiers.${index}.min_quantity`
                                                    ]
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor={`tier_percentage_${index}`}
                                            >
                                                Desconto (%)
                                            </Label>
                                            <Input
                                                id={`tier_percentage_${index}`}
                                                type="number"
                                                min="0.01"
                                                max="100"
                                                step="0.01"
                                                value={tier.percentage}
                                                onChange={(event) =>
                                                    updateTier(
                                                        index,
                                                        'percentage',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="10"
                                            />
                                            <InputError
                                                message={
                                                    errors[
                                                        `tiers.${index}.percentage`
                                                    ]
                                                }
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="justify-self-end text-muted-foreground hover:text-destructive sm:mt-6"
                                            onClick={() => removeTier(index)}
                                            disabled={
                                                form.data.tiers.length === 1
                                            }
                                            aria-label="Remover faixa"
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-5 xl:sticky xl:top-6">
                        <Alert>
                            <Layers3 />
                            <AlertTitle>As faixas não acumulam</AlertTitle>
                            <AlertDescription>
                                Se 3 itens dão 10% e 6 itens dão 20%, uma cesta
                                com 6 recebe somente 20%. Entre regras
                                simultâneas, prevalece o maior percentual
                                elegível.
                            </AlertDescription>
                        </Alert>
                        <Card className="shadow-xs">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BadgePercent className="size-4" /> Prévia
                                    da regra
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {[...form.data.tiers]
                                    .sort(
                                        (first, second) =>
                                            Number(first.min_quantity) -
                                            Number(second.min_quantity),
                                    )
                                    .map((tier, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm"
                                        >
                                            <span>
                                                {tier.min_quantity || '—'}+
                                                unidades
                                            </span>
                                            <span className="font-semibold">
                                                {tier.percentage || '—'}%
                                            </span>
                                        </div>
                                    ))}
                            </CardContent>
                        </Card>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={
                                form.processing || categories.length === 0
                            }
                        >
                            {form.processing && <Spinner />}
                            {discount ? 'Salvar desconto' : 'Criar desconto'}
                        </Button>
                    </div>
                </div>
            </form>
        </>
    );
}

DiscountForm.layout = {
    breadcrumbs: [
        { title: 'Descontos', href: '/descontos' },
        { title: 'Cadastro', href: '/descontos/novo' },
    ],
};

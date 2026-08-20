import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    CircleDollarSign,
    Info,
    Megaphone,
    Save,
    WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    centsToInput,
    formatCurrency,
    moneyInputToCents,
} from '@/lib/formatters';

type CampaignSpendRow = {
    id: number;
    name: string;
    platform: string;
    is_active: boolean;
    budget_cents: number | null;
    actual_spend_cents: number | null;
};

type SpendEntry = {
    campaign_id: number;
    budget: string;
    actual_spend: string;
};

type SpendFormData = {
    spend_date: string;
    entries: SpendEntry[];
};

export default function CampaignSpendsIndex({
    date,
    campaigns,
}: {
    date: string;
    campaigns: CampaignSpendRow[];
}) {
    const editableCampaigns = campaigns.filter(
        (campaign) => campaign.is_active || campaign.budget_cents !== null,
    );
    const [selectedDate, setSelectedDate] = useState(date);
    const form = useForm<SpendFormData>({
        spend_date: date,
        entries: editableCampaigns.map((campaign) => ({
            campaign_id: campaign.id,
            budget: centsToInput(campaign.budget_cents),
            actual_spend: centsToInput(campaign.actual_spend_cents),
        })),
    });
    const errors = form.errors as Record<string, string>;
    const plannedTotal = form.data.entries.reduce(
        (total, entry) => total + moneyInputToCents(entry.budget),
        0,
    );
    const effectiveTotal = form.data.entries.reduce(
        (total, entry) =>
            total +
            moneyInputToCents(
                entry.actual_spend === '' ? entry.budget : entry.actual_spend,
            ),
        0,
    );

    function loadDate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.get('/investimentos', { date: selectedDate });
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.post('/investimentos', { preserveScroll: true });
    }

    function updateEntry(
        index: number,
        field: 'budget' | 'actual_spend',
        value: string,
    ) {
        form.setData(
            'entries',
            form.data.entries.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, [field]: value } : entry,
            ),
        );
    }

    return (
        <>
            <Head title="Investimentos" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Investimentos do dia"
                    description="Defina o orçamento antes das vendas e complete o gasto real quando o Facebook fechar o dia."
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/campanhas">
                                <Megaphone /> Campanhas
                            </Link>
                        </Button>
                    }
                />

                <Card className="gap-4 py-4 shadow-xs">
                    <CardContent className="px-4">
                        <form
                            onSubmit={loadDate}
                            className="flex flex-col gap-3 sm:flex-row sm:items-end"
                        >
                            <div className="grid max-w-xs flex-1 gap-1.5">
                                <Label htmlFor="date">Dia de operação</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={selectedDate}
                                    onChange={(event) =>
                                        setSelectedDate(event.target.value)
                                    }
                                />
                            </div>
                            <Button type="submit" variant="outline">
                                <CalendarDays /> Carregar dia
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {editableCampaigns.length === 0 ? (
                    <Card className="shadow-xs">
                        <EmptyState
                            icon={WalletCards}
                            title="Nenhuma campanha ativa"
                            description="Crie ou reative uma campanha para informar o investimento deste dia."
                            action={
                                <Button asChild>
                                    <Link href="/campanhas/nova">
                                        Criar campanha
                                    </Link>
                                </Button>
                            }
                        />
                    </Card>
                ) : (
                    <form
                        onSubmit={submit}
                        className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
                    >
                        <Card className="shadow-xs">
                            <CardHeader>
                                <CardTitle>
                                    Campanhas em{' '}
                                    {date.split('-').reverse().join('/')}
                                </CardTitle>
                                <CardDescription>
                                    Use zero quando uma campanha ativa não tiver
                                    veiculado neste dia.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {editableCampaigns.map((campaign, index) => (
                                    <div
                                        key={campaign.id}
                                        className="grid items-start gap-4 rounded-lg border p-4 lg:grid-cols-[minmax(180px,1fr)_180px_180px]"
                                    >
                                        <div className="min-w-0 pt-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate font-medium">
                                                    {campaign.name}
                                                </p>
                                                {!campaign.is_active && (
                                                    <Badge variant="secondary">
                                                        Pausada
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {campaign.platform}
                                            </p>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor={`budget_${campaign.id}`}
                                            >
                                                Orçamento (USD)
                                            </Label>
                                            <Input
                                                id={`budget_${campaign.id}`}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={
                                                    form.data.entries[index]
                                                        ?.budget ?? ''
                                                }
                                                onChange={(event) =>
                                                    updateEntry(
                                                        index,
                                                        'budget',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="300.00"
                                            />
                                            <InputError
                                                message={
                                                    errors[
                                                        `entries.${index}.budget`
                                                    ]
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor={`actual_${campaign.id}`}
                                            >
                                                Gasto real (opcional)
                                            </Label>
                                            <Input
                                                id={`actual_${campaign.id}`}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={
                                                    form.data.entries[index]
                                                        ?.actual_spend ?? ''
                                                }
                                                onChange={(event) =>
                                                    updateEntry(
                                                        index,
                                                        'actual_spend',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Preencher depois"
                                            />
                                            <InputError
                                                message={
                                                    errors[
                                                        `entries.${index}.actual_spend`
                                                    ]
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}
                                <InputError message={form.errors.entries} />
                            </CardContent>
                        </Card>

                        <div className="space-y-5 xl:sticky xl:top-6">
                            <Card className="shadow-xs">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CircleDollarSign className="size-4" />{' '}
                                        Total do dia
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div className="flex justify-between gap-3">
                                        <span className="text-muted-foreground">
                                            Orçamento total
                                        </span>
                                        <span>
                                            {formatCurrency(plannedTotal)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-3 border-t pt-4 font-semibold">
                                        <span>Gasto usado no lucro</span>
                                        <span>
                                            {formatCurrency(effectiveTotal)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Alert>
                                <Info />
                                <AlertTitle>
                                    Qual valor entra no relatório?
                                </AlertTitle>
                                <AlertDescription>
                                    O gasto real substitui o orçamento. Enquanto
                                    estiver vazio, o orçamento é usado.
                                </AlertDescription>
                            </Alert>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={form.processing}
                            >
                                {form.processing ? <Spinner /> : <Save />}
                                Salvar investimentos
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </>
    );
}

CampaignSpendsIndex.layout = {
    breadcrumbs: [{ title: 'Investimentos', href: '/investimentos' }],
};

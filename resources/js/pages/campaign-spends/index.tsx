import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarCheck2,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
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
    formatDate,
    moneyInputToCents,
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

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

type CalendarEntry = {
    campaign_id: number;
    campaign_name: string;
    budget_cents: number;
    actual_spend_cents: number | null;
};

type CalendarDay = {
    date: string;
    budget_total_cents: number;
    entries: CalendarEntry[];
};

type BudgetCalendar = {
    month: string;
    previous_month_date: string;
    next_month_date: string;
    days_count: number;
    budget_total_cents: number;
    days: CalendarDay[];
};

export default function CampaignSpendsIndex({
    date,
    campaigns,
    calendar,
}: {
    date: string;
    campaigns: CampaignSpendRow[];
    calendar: BudgetCalendar;
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

                <InvestmentCalendar calendar={calendar} selectedDate={date} />

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

function InvestmentCalendar({
    calendar,
    selectedDate,
}: {
    calendar: BudgetCalendar;
    selectedDate: string;
}) {
    const cells = buildCalendarCells(calendar);

    return (
        <Card className="gap-0 overflow-hidden py-0 shadow-xs">
            <CardHeader className="gap-4 border-b py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                    <CardTitle className="flex items-center gap-2 capitalize">
                        <CalendarCheck2 className="size-4 text-primary" />
                        {formatMonth(calendar.month)}
                    </CardTitle>
                    <CardDescription>
                        {calendar.days_count === 0
                            ? 'Nenhum dia preenchido neste mês.'
                            : `${calendar.days_count} dia${calendar.days_count > 1 ? 's' : ''} preenchido${calendar.days_count > 1 ? 's' : ''} · ${formatCurrency(calendar.budget_total_cents)} em orçamento`}
                    </CardDescription>
                    {calendar.days_count > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-primary" />
                                Somente orçamento
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Gasto real informado
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="icon">
                        <Link
                            href={`/investimentos?date=${calendar.previous_month_date}`}
                            aria-label="Mês anterior"
                        >
                            <ChevronLeft />
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="icon">
                        <Link
                            href={`/investimentos?date=${calendar.next_month_date}`}
                            aria-label="Próximo mês"
                        >
                            <ChevronRight />
                        </Link>
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="py-4 xl:hidden">
                {calendar.days.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                        Salve o orçamento de um dia para ele aparecer aqui.
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {calendar.days.map((day) => (
                            <Link
                                key={day.date}
                                href={`/investimentos?date=${day.date}`}
                                className={cn(
                                    'group rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-muted/35',
                                    day.date === selectedDate &&
                                        'border-primary bg-primary/[0.045] ring-1 ring-primary/20',
                                )}
                            >
                                <div className="flex items-start justify-between gap-4 border-b pb-3">
                                    <div className="min-w-0">
                                        <p className="font-medium">
                                            {formatDate(day.date)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {day.entries.length}{' '}
                                            {day.entries.length === 1
                                                ? 'campanha'
                                                : 'campanhas'}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-[11px] text-muted-foreground">
                                            Orçamento total
                                        </p>
                                        <p className="font-semibold tabular-nums">
                                            {formatCurrency(
                                                day.budget_total_cents,
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2 py-3">
                                    {day.entries.map((entry) => (
                                        <div
                                            key={entry.campaign_id}
                                            className="flex items-center justify-between gap-3 text-sm"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span
                                                    className={cn(
                                                        'size-1.5 shrink-0 rounded-full',
                                                        entry.actual_spend_cents ===
                                                            null
                                                            ? 'bg-primary'
                                                            : 'bg-emerald-500',
                                                    )}
                                                />
                                                <span className="truncate">
                                                    {entry.campaign_name}
                                                </span>
                                            </span>
                                            <span className="shrink-0 font-medium tabular-nums">
                                                {formatCurrency(
                                                    entry.budget_cents,
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-end gap-1 border-t pt-3 text-xs font-medium text-primary">
                                    Abrir dia
                                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>

            <div className="hidden xl:block">
                <div className="grid grid-cols-7 border-b bg-muted/35 text-center text-xs font-medium text-muted-foreground">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(
                        (weekday) => (
                            <div key={weekday} className="px-2 py-2.5">
                                {weekday}
                            </div>
                        ),
                    )}
                </div>
                <div className="grid grid-cols-7 gap-px bg-border/70">
                    {cells.map((cell, index) =>
                        cell === null ? (
                            <div
                                key={`empty-${index}`}
                                className="min-h-32 bg-muted/15"
                                aria-hidden="true"
                            />
                        ) : (
                            <CalendarCell
                                key={cell.date}
                                date={cell.date}
                                dayNumber={cell.dayNumber}
                                details={cell.details}
                                selected={cell.date === selectedDate}
                            />
                        ),
                    )}
                </div>
            </div>
        </Card>
    );
}

function CalendarCell({
    date,
    dayNumber,
    details,
    selected,
}: {
    date: string;
    dayNumber: number;
    details: CalendarDay | undefined;
    selected: boolean;
}) {
    return (
        <Link
            href={`/investimentos?date=${date}`}
            className={cn(
                'min-h-32 bg-card p-2.5 transition-colors hover:z-10 hover:bg-muted/45 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                details && 'bg-primary/[0.025]',
                selected && 'z-10 bg-primary/[0.07] ring-2 ring-primary',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <span
                    className={cn(
                        'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                        selected && 'bg-primary text-primary-foreground',
                    )}
                >
                    {dayNumber}
                </span>
                {details && (
                    <span className="text-xs font-semibold tabular-nums">
                        {formatCurrency(details.budget_total_cents)}
                    </span>
                )}
            </div>

            {details ? (
                <div className="mt-2 space-y-1.5">
                    {details.entries.map((entry) => (
                        <div
                            key={entry.campaign_id}
                            className="rounded-md bg-muted/70 px-2 py-1.5"
                            title={`${entry.campaign_name}: ${formatCurrency(entry.budget_cents)}`}
                        >
                            <div className="flex items-center gap-1.5">
                                <span
                                    className={cn(
                                        'size-1.5 shrink-0 rounded-full',
                                        entry.actual_spend_cents === null
                                            ? 'bg-primary'
                                            : 'bg-emerald-500',
                                    )}
                                />
                                <p className="truncate text-[11px] text-muted-foreground">
                                    {entry.campaign_name}
                                </p>
                            </div>
                            <p className="mt-0.5 text-xs font-medium tabular-nums">
                                {formatCurrency(entry.budget_cents)}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="mt-3 text-[11px] text-muted-foreground/65">
                    Sem orçamento
                </p>
            )}
        </Link>
    );
}

function buildCalendarCells(calendar: BudgetCalendar) {
    const [year, month] = calendar.month.split('-').map(Number);
    const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const daysByDate = new Map(calendar.days.map((day) => [day.date, day]));

    return Array.from({ length: totalCells }, (_, index) => {
        const dayNumber = index - firstWeekday + 1;

        if (dayNumber < 1 || dayNumber > daysInMonth) {
            return null;
        }

        const date = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;

        return {
            date,
            dayNumber,
            details: daysByDate.get(date),
        };
    });
}

function formatMonth(month: string) {
    const [year, monthNumber] = month.split('-').map(Number);

    return new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(year, monthNumber - 1, 1, 12));
}

import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeDollarSign,
    BadgePercent,
    Boxes,
    CalendarDays,
    Megaphone,
    PackageCheck,
    ReceiptText,
    ShoppingBag,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { EmptyState } from '@/components/empty-state';
import { MetricCard } from '@/components/metric-card';
import { PageHeader } from '@/components/page-header';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatNumber,
    formatPercentage,
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

type Summary = {
    orders: number;
    units: number;
    revenue_cents: number;
    products_subtotal_cents: number;
    discount_cents: number;
    shipping_cents: number;
    product_cost_cents: number;
    ad_spend_cents: number;
    profit_cents: number;
    roas: number | null;
    margin_percentage: number | null;
    average_order_cents: number;
};

type CampaignMetric = {
    id: number;
    name: string;
    platform: string;
    orders: number;
    revenue_cents: number;
    product_cost_cents: number;
    ad_spend_cents: number;
    profit_cents: number;
    roas: number | null;
    cpa_cents: number | null;
};

type DailyMetric = {
    date: string;
    orders: number;
    revenue_cents: number;
    product_cost_cents: number;
    ad_spend_cents: number;
    profit_cents: number;
};

type RecentSale = {
    id: number;
    order_number: string | null;
    customer_name: string | null;
    sold_at: string;
    campaign_name: string | null;
    revenue_cents: number;
    product_cost_cents: number;
    gross_profit_cents: number;
};

type Props = {
    filters: { start_date: string; end_date: string };
    summary: Summary;
    campaigns: CampaignMetric[];
    daily: DailyMetric[];
    recent_sales: RecentSale[];
};

export default function Dashboard({
    filters,
    summary,
    campaigns,
    daily,
    recent_sales,
}: Props) {
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const chartMax = Math.max(
        1,
        ...daily.flatMap((day) => [
            day.revenue_cents,
            day.product_cost_cents,
            day.ad_spend_cents,
        ]),
    );
    const dailyRows = [...daily].reverse();
    const activeDays = daily.filter(
        (day) => day.orders > 0 || day.ad_spend_cents > 0,
    ).length;

    function filter(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.get(
            '/dashboard',
            { start_date: startDate, end_date: endDate },
            { preserveScroll: true, preserveState: true },
        );
    }

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Visão financeira"
                    description="Receita, produto e mídia reunidos para mostrar o lucro real da operação."
                    actions={
                        <Button asChild>
                            <Link href="/vendas/nova">
                                <ShoppingBag /> Nova venda
                            </Link>
                        </Button>
                    }
                />

                <Card className="gap-4 py-4 shadow-xs">
                    <CardContent className="px-4">
                        <form
                            onSubmit={filter}
                            className="flex flex-col gap-3 sm:flex-row sm:items-end"
                        >
                            <div className="grid flex-1 gap-1.5">
                                <label
                                    htmlFor="start_date"
                                    className="text-xs font-medium text-muted-foreground"
                                >
                                    Data inicial
                                </label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={startDate}
                                    onChange={(event) =>
                                        setStartDate(event.target.value)
                                    }
                                />
                            </div>
                            <div className="grid flex-1 gap-1.5">
                                <label
                                    htmlFor="end_date"
                                    className="text-xs font-medium text-muted-foreground"
                                >
                                    Data final
                                </label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={endDate}
                                    onChange={(event) =>
                                        setEndDate(event.target.value)
                                    }
                                />
                            </div>
                            <Button type="submit" variant="outline">
                                <CalendarDays /> Aplicar período
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Faturamento"
                        value={formatCurrency(summary.revenue_cents)}
                        hint={`${formatNumber(summary.orders)} vendas · ticket ${formatCurrency(summary.average_order_cents)}`}
                        icon={BadgeDollarSign}
                    />
                    <MetricCard
                        label="Investimento em campanhas"
                        value={formatCurrency(summary.ad_spend_cents)}
                        hint={`ROAS ${summary.roas === null ? '—' : `${summary.roas.toFixed(2)}x`}`}
                        icon={WalletCards}
                    />
                    <MetricCard
                        label="Custo de produtos"
                        value={formatCurrency(summary.product_cost_cents)}
                        hint={`${formatNumber(summary.units)} unidades vendidas`}
                        icon={Boxes}
                    />
                    <MetricCard
                        label="Lucro após mídia"
                        value={formatCurrency(summary.profit_cents)}
                        hint={`Margem ${formatPercentage(summary.margin_percentage)}`}
                        icon={
                            summary.profit_cents >= 0
                                ? TrendingUp
                                : TrendingDown
                        }
                        tone={
                            summary.profit_cents >= 0 ? 'positive' : 'negative'
                        }
                    />
                </div>

                {summary.orders === 0 && summary.ad_spend_cents === 0 ? (
                    <Card className="shadow-xs">
                        <EmptyState
                            icon={Sparkles}
                            title="Comece preparando a operação"
                            description="Cadastre o catálogo, crie uma campanha, informe o investimento do dia e então registre as vendas."
                            action={
                                <div className="flex flex-wrap justify-center gap-2">
                                    <Button asChild variant="outline">
                                        <Link href="/produtos/novo">
                                            Cadastrar produto
                                        </Link>
                                    </Button>
                                    <Button asChild>
                                        <Link href="/campanhas/nova">
                                            Criar campanha
                                        </Link>
                                    </Button>
                                </div>
                            }
                        />
                    </Card>
                ) : (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
                        <Card className="min-w-0 shadow-xs">
                            <CardHeader className="items-start justify-between gap-4 sm:flex-row">
                                <div className="space-y-1.5">
                                    <CardTitle>Ritmo diário</CardTitle>
                                    <CardDescription>
                                        Receita comparada ao custo de produto e
                                        à mídia.
                                    </CardDescription>
                                </div>
                                <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
                                    <Legend
                                        color="bg-emerald-500"
                                        label="Receita"
                                    />
                                    <Legend
                                        color="bg-amber-400"
                                        label="Produto"
                                    />
                                    <Legend
                                        color="bg-violet-500"
                                        label="Mídia"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto pb-2">
                                    <div
                                        className="flex h-56 min-w-full items-end gap-2 border-b px-1"
                                        style={{
                                            width: Math.max(
                                                560,
                                                daily.length * 38,
                                            ),
                                        }}
                                    >
                                        {daily.map((day) => (
                                            <div
                                                key={day.date}
                                                className="group flex h-full min-w-7 flex-1 flex-col justify-end gap-1"
                                                title={`${formatDate(day.date)} · Receita ${formatCurrency(day.revenue_cents)} · Produto ${formatCurrency(day.product_cost_cents)} · Mídia ${formatCurrency(day.ad_spend_cents)}`}
                                            >
                                                <div className="flex h-[184px] items-end justify-center gap-0.5">
                                                    <ChartBar
                                                        value={
                                                            day.revenue_cents
                                                        }
                                                        max={chartMax}
                                                        className="bg-emerald-500"
                                                    />
                                                    <ChartBar
                                                        value={
                                                            day.product_cost_cents
                                                        }
                                                        max={chartMax}
                                                        className="bg-amber-400"
                                                    />
                                                    <ChartBar
                                                        value={
                                                            day.ad_spend_cents
                                                        }
                                                        max={chartMax}
                                                        className="bg-violet-500"
                                                    />
                                                </div>
                                                <span className="pb-2 text-center text-[10px] text-muted-foreground">
                                                    {day.date.slice(8)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-xs">
                            <CardHeader>
                                <CardTitle>Composição do faturamento</CardTitle>
                                <CardDescription>
                                    O que aconteceu antes do lucro.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <BreakdownRow
                                    icon={PackageCheck}
                                    label="Subtotal dos produtos"
                                    value={formatCurrency(
                                        summary.products_subtotal_cents,
                                    )}
                                />
                                <BreakdownRow
                                    icon={BadgePercent}
                                    label="Descontos concedidos"
                                    value={`− ${formatCurrency(summary.discount_cents)}`}
                                />
                                <BreakdownRow
                                    icon={ReceiptText}
                                    label="Frete cobrado"
                                    value={`+ ${formatCurrency(summary.shipping_cents)}`}
                                />
                                <div className="border-t pt-4">
                                    <BreakdownRow
                                        icon={Target}
                                        label="Faturamento final"
                                        value={formatCurrency(
                                            summary.revenue_cents,
                                        )}
                                        strong
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <Card className="gap-0 overflow-hidden py-0 shadow-xs">
                    <CardHeader className="items-start justify-between border-b py-5 sm:flex-row sm:items-center">
                        <div className="space-y-1.5">
                            <CardTitle>Desempenho por campanha</CardTitle>
                            <CardDescription>
                                Receita e lucro atribuídos a cada campanha no
                                período.
                            </CardDescription>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/campanhas">
                                Gerenciar <ArrowRight />
                            </Link>
                        </Button>
                    </CardHeader>
                    {campaigns.length === 0 ? (
                        <EmptyState
                            icon={Megaphone}
                            title="Nenhuma campanha movimentada"
                            description="Campanhas aparecem aqui quando possuem investimento ou vendas no período."
                        />
                    ) : (
                        <Table className="responsive-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Campanha</TableHead>
                                    <TableHead className="text-right">
                                        Vendas
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Faturamento
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Mídia
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Produto
                                    </TableHead>
                                    <TableHead className="text-right">
                                        ROAS
                                    </TableHead>
                                    <TableHead className="text-right">
                                        CPA
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Lucro
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {campaigns.map((campaign) => (
                                    <TableRow key={campaign.id}>
                                        <TableCell data-primary>
                                            <div>
                                                <p className="font-medium">
                                                    {campaign.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {campaign.platform}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell
                                            data-label="Vendas"
                                            className="text-right"
                                        >
                                            {formatNumber(campaign.orders)}
                                        </TableCell>
                                        <TableCell
                                            data-label="Faturamento"
                                            className="text-right font-medium"
                                        >
                                            {formatCurrency(
                                                campaign.revenue_cents,
                                            )}
                                        </TableCell>
                                        <TableCell
                                            data-label="Mídia"
                                            className="text-right"
                                        >
                                            {formatCurrency(
                                                campaign.ad_spend_cents,
                                            )}
                                        </TableCell>
                                        <TableCell
                                            data-label="Produto"
                                            className="text-right"
                                        >
                                            {formatCurrency(
                                                campaign.product_cost_cents,
                                            )}
                                        </TableCell>
                                        <TableCell
                                            data-label="ROAS"
                                            className="text-right"
                                        >
                                            {campaign.roas === null
                                                ? '—'
                                                : `${campaign.roas.toFixed(2)}x`}
                                        </TableCell>
                                        <TableCell
                                            data-label="CPA"
                                            className="text-right"
                                        >
                                            {campaign.cpa_cents === null
                                                ? '—'
                                                : formatCurrency(
                                                      campaign.cpa_cents,
                                                  )}
                                        </TableCell>
                                        <TableCell
                                            data-label="Lucro"
                                            className="text-right"
                                        >
                                            <ProfitBadge
                                                value={campaign.profit_cents}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>

                <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="gap-0 overflow-hidden py-0 shadow-xs xl:col-span-2">
                        <CardHeader className="items-start justify-between gap-4 border-b py-5 sm:flex-row sm:items-center">
                            <div className="space-y-1.5">
                                <CardTitle>Fechamento por dia</CardTitle>
                                <CardDescription>
                                    Resultados completos de{' '}
                                    {formatDate(filters.start_date)} a{' '}
                                    {formatDate(filters.end_date)}, incluindo
                                    dias sem movimento.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">
                                    {formatNumber(daily.length)}{' '}
                                    {daily.length === 1 ? 'dia' : 'dias'} no
                                    período
                                </Badge>
                                <Badge variant="outline">
                                    {formatNumber(activeDays)} com movimento
                                </Badge>
                            </div>
                        </CardHeader>
                        <Table className="responsive-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Dia</TableHead>
                                    <TableHead className="text-right">
                                        Vendas
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Faturamento
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Produto
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Mídia
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Lucro
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Margem
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dailyRows.map((day) => {
                                    const hasMovement =
                                        day.orders > 0 ||
                                        day.ad_spend_cents > 0;
                                    const marginPercentage =
                                        day.revenue_cents > 0
                                            ? (day.profit_cents /
                                                  day.revenue_cents) *
                                              100
                                            : null;

                                    return (
                                        <TableRow
                                            key={day.date}
                                            className={cn(
                                                !hasMovement &&
                                                    'bg-muted/20 text-muted-foreground',
                                            )}
                                        >
                                            <TableCell data-primary>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            hasMovement &&
                                                                'font-medium',
                                                        )}
                                                    >
                                                        {formatDate(day.date)}
                                                    </span>
                                                    {!hasMovement && (
                                                        <Badge
                                                            variant="outline"
                                                            className="font-normal text-muted-foreground"
                                                        >
                                                            Sem movimento
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell
                                                data-label="Vendas"
                                                className="text-right tabular-nums"
                                            >
                                                {formatNumber(day.orders)}
                                            </TableCell>
                                            <TableCell
                                                data-label="Faturamento"
                                                className="text-right font-medium tabular-nums"
                                            >
                                                {formatCurrency(
                                                    day.revenue_cents,
                                                )}
                                            </TableCell>
                                            <TableCell
                                                data-label="Produto"
                                                className="text-right tabular-nums"
                                            >
                                                {formatCurrency(
                                                    day.product_cost_cents,
                                                )}
                                            </TableCell>
                                            <TableCell
                                                data-label="Mídia"
                                                className="text-right tabular-nums"
                                            >
                                                {formatCurrency(
                                                    day.ad_spend_cents,
                                                )}
                                            </TableCell>
                                            <TableCell
                                                data-label="Lucro"
                                                className="text-right"
                                            >
                                                {hasMovement ? (
                                                    <ProfitBadge
                                                        value={day.profit_cents}
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                data-label="Margem"
                                                className="text-right tabular-nums"
                                            >
                                                {formatPercentage(
                                                    marginPercentage,
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>

                    <Card className="gap-0 overflow-hidden py-0 shadow-xs xl:col-span-2">
                        <CardHeader className="items-start justify-between border-b py-5 sm:flex-row sm:items-center">
                            <div className="space-y-1.5">
                                <CardTitle>Vendas recentes</CardTitle>
                                <CardDescription>
                                    Últimos pedidos do período.
                                </CardDescription>
                            </div>
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/vendas">Ver todas</Link>
                            </Button>
                        </CardHeader>
                        {recent_sales.length === 0 ? (
                            <EmptyState
                                icon={ShoppingBag}
                                title="Sem vendas no período"
                                description="Ajuste as datas ou registre uma nova venda."
                            />
                        ) : (
                            <Table className="responsive-table">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Pedido</TableHead>
                                        <TableHead>Campanha</TableHead>
                                        <TableHead className="text-right">
                                            Faturamento
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recent_sales.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell data-primary>
                                                <Link
                                                    href={`/vendas/${sale.id}/editar`}
                                                    className="font-medium hover:underline"
                                                >
                                                    {sale.order_number ??
                                                        `Venda #${sale.id}`}
                                                </Link>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDateTime(
                                                        sale.sold_at,
                                                    )}
                                                </p>
                                            </TableCell>
                                            <TableCell data-label="Campanha">
                                                {sale.campaign_name ?? (
                                                    <span className="text-muted-foreground">
                                                        Orgânica
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                data-label="Faturamento"
                                                className="text-right font-medium"
                                            >
                                                {formatCurrency(
                                                    sale.revenue_cents,
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', color)} /> {label}
        </span>
    );
}

function ChartBar({
    value,
    max,
    className,
}: {
    value: number;
    max: number;
    className: string;
}) {
    return (
        <div
            className={cn(
                'w-1.5 min-w-1 rounded-t-sm opacity-85 transition-opacity group-hover:opacity-100',
                className,
            )}
            style={{
                height: value > 0 ? `${Math.max(2, (value / max) * 100)}%` : 0,
            }}
        />
    );
}

function BreakdownRow({
    icon: Icon,
    label,
    value,
    strong = false,
}: {
    icon: typeof ReceiptText;
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Icon className="size-4" />
                <span>{label}</span>
            </div>
            <span
                className={cn(
                    'text-sm tabular-nums',
                    strong && 'font-semibold text-foreground',
                )}
            >
                {value}
            </span>
        </div>
    );
}

function ProfitBadge({ value }: { value: number }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                'tabular-nums',
                value >= 0
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
            )}
        >
            {formatCurrency(value)}
        </Badge>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: '/dashboard' }],
};

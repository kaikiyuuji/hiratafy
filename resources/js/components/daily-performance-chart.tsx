import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export type DailyMetric = {
    date: string;
    orders: number;
    revenue_cents: number;
    product_cost_cents: number;
    ad_spend_cents: number;
    profit_cents: number;
};

type DailyChartMode = 'costs' | 'profit' | 'cumulative';

const dailyChartCopy: Record<
    DailyChartMode,
    { label: string; description: string }
> = {
    costs: {
        label: 'Custos',
        description:
            'Faturamento final comparado a produto e mídia na mesma barra de custos.',
    },
    profit: {
        label: 'Lucro',
        description:
            'Lucro ou prejuízo diário depois do custo de produto e da mídia.',
    },
    cumulative: {
        label: 'Acumulado',
        description:
            'Evolução do faturamento final e dos custos totais no período.',
    },
};

export function DailyPerformanceChart({ daily }: { daily: DailyMetric[] }) {
    const [dailyChartMode, setDailyChartMode] =
        usePersistentState<DailyChartMode>(
            'hiratafy.dashboard.daily-chart-mode',
            'costs',
        );
    const safeDailyChartMode = dailyChartCopy[dailyChartMode]
        ? dailyChartMode
        : 'costs';
    const chartCopy = dailyChartCopy[safeDailyChartMode];

    return (
        <Card className="min-w-0 shadow-xs">
            <CardHeader className="items-start justify-between gap-4 sm:flex-row">
                <div className="space-y-1.5">
                    <CardTitle>Ritmo diário</CardTitle>
                    <CardDescription>{chartCopy.description}</CardDescription>
                </div>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={safeDailyChartMode}
                    onValueChange={(value) => {
                        if (value) {
                            setDailyChartMode(value as DailyChartMode);
                        }
                    }}
                    aria-label="Opção do gráfico diário"
                    className="grid w-full grid-cols-3 sm:w-auto"
                >
                    {Object.entries(dailyChartCopy).map(([value, option]) => (
                        <ToggleGroupItem
                            key={value}
                            value={value}
                            aria-label={option.label}
                            className="px-2 text-xs sm:px-3"
                        >
                            {option.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </CardHeader>
            <CardContent className="space-y-4">
                <DailyChartLegend mode={safeDailyChartMode} />
                <DailyChart daily={daily} mode={safeDailyChartMode} />
                <div className="rounded-lg bg-muted/45 px-3 py-2 text-xs text-muted-foreground">
                    O faturamento final já considera os descontos aplicados e o
                    frete cobrado.
                    {safeDailyChartMode === 'costs' && (
                        <> A barra de custos empilha produto e mídia.</>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function DailyChartLegend({ mode }: { mode: DailyChartMode }) {
    if (mode === 'profit') {
        return (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <Legend color="bg-emerald-500" label="Lucro" />
                <Legend color="bg-rose-500" label="Prejuízo" />
            </div>
        );
    }

    if (mode === 'cumulative') {
        return (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <Legend color="bg-emerald-500" label="Faturamento acumulado" />
                <Legend
                    color="bg-violet-500"
                    label="Custos acumulados (produto + mídia)"
                />
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Legend color="bg-emerald-500" label="Faturamento final" />
            <Legend color="bg-amber-400" label="Produto" />
            <Legend color="bg-violet-500" label="Mídia" />
        </div>
    );
}

function DailyChart({
    daily,
    mode,
}: {
    daily: DailyMetric[];
    mode: DailyChartMode;
}) {
    if (mode === 'profit') {
        return <DailyProfitChart daily={daily} />;
    }

    if (mode === 'cumulative') {
        return <CumulativeChart daily={daily} />;
    }

    return <CostComparisonChart daily={daily} />;
}

function CostComparisonChart({ daily }: { daily: DailyMetric[] }) {
    const max = Math.max(
        1,
        ...daily.flatMap((day) => [
            day.revenue_cents,
            day.product_cost_cents + day.ad_spend_cents,
        ]),
    );

    return (
        <div className="overflow-x-auto pb-2">
            <div
                className="flex h-56 min-w-full items-end gap-2 border-b px-1"
                style={{ width: Math.max(560, daily.length * 44) }}
            >
                {daily.map((day) => {
                    const totalCosts =
                        day.product_cost_cents + day.ad_spend_cents;
                    const description = `${formatDate(day.date)} · Faturamento final ${formatCurrency(day.revenue_cents)} · Custos ${formatCurrency(totalCosts)} (Produto ${formatCurrency(day.product_cost_cents)} + Mídia ${formatCurrency(day.ad_spend_cents)})`;

                    return (
                        <Tooltip key={day.date}>
                            <TooltipTrigger asChild>
                                <div
                                    className="group flex h-full min-w-8 flex-1 flex-col justify-end gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label={description}
                                    tabIndex={0}
                                >
                                    <div className="flex h-[184px] items-end justify-center gap-1">
                                        <ChartBar
                                            value={day.revenue_cents}
                                            max={max}
                                            className="bg-emerald-500"
                                        />
                                        <StackedCostBar
                                            productCost={day.product_cost_cents}
                                            adSpend={day.ad_spend_cents}
                                            max={max}
                                        />
                                    </div>
                                    <span className="pb-2 text-center text-[10px] text-muted-foreground">
                                        {day.date.slice(8)}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="grid min-w-52 gap-1 py-2">
                                <p className="font-medium">
                                    {formatDate(day.date)}
                                </p>
                                <ChartTooltipRow
                                    label="Faturamento final"
                                    value={day.revenue_cents}
                                />
                                <ChartTooltipRow
                                    label="Produto"
                                    value={day.product_cost_cents}
                                />
                                <ChartTooltipRow
                                    label="Mídia"
                                    value={day.ad_spend_cents}
                                />
                                <ChartTooltipRow
                                    label="Custos totais"
                                    value={totalCosts}
                                    strong
                                />
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}

function DailyProfitChart({ daily }: { daily: DailyMetric[] }) {
    const max = Math.max(1, ...daily.map((day) => Math.abs(day.profit_cents)));

    return (
        <div className="overflow-x-auto pb-2">
            <div
                className="flex h-56 min-w-full items-end gap-2 border-b px-1"
                style={{ width: Math.max(560, daily.length * 44) }}
            >
                {daily.map((day) => {
                    const resultLabel =
                        day.profit_cents > 0
                            ? 'Lucro'
                            : day.profit_cents < 0
                              ? 'Prejuízo'
                              : 'Resultado';
                    const description = `${formatDate(day.date)} · ${resultLabel} ${formatCurrency(Math.abs(day.profit_cents))}`;

                    return (
                        <Tooltip key={day.date}>
                            <TooltipTrigger asChild>
                                <div
                                    className="group flex h-full min-w-8 flex-1 flex-col justify-end gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label={description}
                                    tabIndex={0}
                                >
                                    <ProfitBar
                                        value={day.profit_cents}
                                        max={max}
                                    />
                                    <span className="pb-2 text-center text-[10px] text-muted-foreground">
                                        {day.date.slice(8)}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="grid min-w-44 gap-1 py-2">
                                <p className="font-medium">
                                    {formatDate(day.date)}
                                </p>
                                <ChartTooltipRow
                                    label={resultLabel}
                                    value={day.profit_cents}
                                    strong
                                />
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}

function CumulativeChart({ daily }: { daily: DailyMetric[] }) {
    const width = Math.max(560, daily.length * 44);
    const height = 184;
    const verticalPadding = 10;
    const cumulative = daily.reduce<
        Array<
            DailyMetric & {
                cumulativeRevenue: number;
                cumulativeCosts: number;
            }
        >
    >((days, day) => {
        const previous = days.at(-1);

        return [
            ...days,
            {
                ...day,
                cumulativeRevenue:
                    (previous?.cumulativeRevenue ?? 0) + day.revenue_cents,
                cumulativeCosts:
                    (previous?.cumulativeCosts ?? 0) +
                    day.product_cost_cents +
                    day.ad_spend_cents,
            },
        ];
    }, []);
    const max = Math.max(
        1,
        ...cumulative.flatMap((day) => [
            day.cumulativeRevenue,
            day.cumulativeCosts,
        ]),
    );
    const points = cumulative.map((day, index) => {
        const x =
            cumulative.length === 1
                ? width / 2
                : (index / (cumulative.length - 1)) * width;
        const yFor = (value: number) =>
            height -
            verticalPadding -
            (value / max) * (height - verticalPadding * 2);

        return {
            ...day,
            x,
            revenueY: yFor(day.cumulativeRevenue),
            costsY: yFor(day.cumulativeCosts),
        };
    });

    return (
        <div className="overflow-x-auto pb-2">
            <div style={{ width }}>
                <div className="flex justify-end pb-1 text-[10px] text-muted-foreground">
                    Escala até {formatCurrency(max)}
                </div>
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="h-[184px] w-full border-b"
                    role="img"
                    aria-label="Faturamento final acumulado comparado aos custos acumulados de produto e mídia"
                >
                    {[0.25, 0.5, 0.75].map((position) => (
                        <line
                            key={position}
                            x1="0"
                            x2={width}
                            y1={height * position}
                            y2={height * position}
                            className="stroke-border"
                            strokeDasharray="4 6"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                    <polyline
                        points={points
                            .map((point) => `${point.x},${point.revenueY}`)
                            .join(' ')}
                        fill="none"
                        className="stroke-emerald-500"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                    <polyline
                        points={points
                            .map((point) => `${point.x},${point.costsY}`)
                            .join(' ')}
                        fill="none"
                        className="stroke-violet-500"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                    {points.map((point) => (
                        <g key={point.date}>
                            <circle
                                cx={point.x}
                                cy={point.revenueY}
                                r="3"
                                className="fill-emerald-500"
                            >
                                <title>{`${formatDate(point.date)} · Faturamento acumulado ${formatCurrency(point.cumulativeRevenue)}`}</title>
                            </circle>
                            <circle
                                cx={point.x}
                                cy={point.costsY}
                                r="3"
                                className="fill-violet-500"
                            >
                                <title>{`${formatDate(point.date)} · Custos acumulados ${formatCurrency(point.cumulativeCosts)}`}</title>
                            </circle>
                        </g>
                    ))}
                </svg>
                <div className="flex px-1">
                    {daily.map((day) => (
                        <span
                            key={day.date}
                            className="min-w-8 flex-1 py-2 text-center text-[10px] text-muted-foreground"
                        >
                            {day.date.slice(8)}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', color)} /> {label}
        </span>
    );
}

function ChartTooltipRow({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: number;
    strong?: boolean;
}) {
    return (
        <span
            className={cn(
                'flex items-center justify-between gap-4 tabular-nums',
                strong &&
                    'mt-1 border-t border-primary-foreground/20 pt-1 font-medium',
            )}
        >
            <span>{label}</span>
            <span>{formatCurrency(value)}</span>
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
                'w-2.5 min-w-2 rounded-t-sm opacity-85 transition-opacity group-hover:opacity-100',
                className,
            )}
            style={{
                height: value > 0 ? `${(value / max) * 100}%` : 0,
                minHeight: value > 0 ? 2 : 0,
            }}
        />
    );
}

function StackedCostBar({
    productCost,
    adSpend,
    max,
}: {
    productCost: number;
    adSpend: number;
    max: number;
}) {
    const total = productCost + adSpend;

    return (
        <div
            className="flex w-2.5 min-w-2 flex-col overflow-hidden rounded-t-sm opacity-85 transition-opacity group-hover:opacity-100"
            style={{
                height: total > 0 ? `${(total / max) * 100}%` : 0,
                minHeight: total > 0 ? 2 : 0,
            }}
            aria-hidden="true"
        >
            {adSpend > 0 && (
                <div
                    className="min-h-px bg-violet-500"
                    style={{ height: `${(adSpend / total) * 100}%` }}
                />
            )}
            {productCost > 0 && (
                <div
                    className="min-h-px bg-amber-400"
                    style={{ height: `${(productCost / total) * 100}%` }}
                />
            )}
        </div>
    );
}

function ProfitBar({ value, max }: { value: number; max: number }) {
    const height = `${(Math.abs(value) / max) * 50}%`;

    return (
        <div className="relative h-[184px] w-full">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed" />
            {value !== 0 && (
                <div
                    className={cn(
                        'absolute left-1/2 w-3 -translate-x-1/2 opacity-85 transition-opacity group-hover:opacity-100',
                        value > 0
                            ? 'rounded-t-sm bg-emerald-500'
                            : 'rounded-b-sm bg-rose-500',
                    )}
                    style={
                        value > 0
                            ? { height, bottom: '50%', minHeight: 2 }
                            : { height, top: '50%', minHeight: 2 }
                    }
                    aria-hidden="true"
                />
            )}
        </div>
    );
}

import { Head, Link } from '@inertiajs/react';
import {
    BadgeDollarSign,
    Boxes,
    Calculator,
    Info,
    PackageCheck,
    ReceiptText,
    ShoppingBag,
    Tags,
    TrendingDown,
    TrendingUp,
    Truck,
    WalletCards,
} from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePersistentState } from '@/hooks/use-persistent-state';
import {
    formatCurrency,
    formatDate,
    formatNumber,
    formatPercentage,
    moneyInputToCents,
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

type Summary = {
    orders: number;
    units: number;
    products_subtotal_cents: number;
    discount_cents: number;
    product_revenue_cents: number;
    shipping_cents: number;
    product_cost_cents: number;
    product_profit_cents: number;
    first_sale_at: string | null;
    last_sale_at: string | null;
};

export default function Consolidated({ summary }: { summary: Summary }) {
    const [campaignSpend, setCampaignSpend] = usePersistentState(
        'hiratafy.consolidated.campaign-spend',
        '',
    );
    const campaignSpendCents = Math.max(0, moneyInputToCents(campaignSpend));
    const finalProfitCents = summary.product_profit_cents - campaignSpendCents;
    const finalMargin =
        summary.product_revenue_cents > 0
            ? (finalProfitCents / summary.product_revenue_cents) * 100
            : null;
    const salesPeriod =
        summary.first_sale_at && summary.last_sale_at
            ? `${formatDate(summary.first_sale_at)} a ${formatDate(summary.last_sale_at)}`
            : 'Nenhuma venda cadastrada';

    return (
        <>
            <Head title="Consolidado" />

            <div className="flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4 md:p-6">
                <PageHeader
                    title="Consolidado de vendas"
                    description="Veja o resultado de toda a operação com um único valor total de mídia, sem considerar as campanhas cadastradas."
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/vendas">
                                <ShoppingBag /> Ver vendas
                            </Link>
                        </Button>
                    }
                />

                <Alert>
                    <Info />
                    <AlertTitle>Este cálculo é independente</AlertTitle>
                    <AlertDescription>
                        Nenhum orçamento ou gasto das campanhas existentes entra
                        nesta tela. O investimento informado abaixo serve apenas
                        para a simulação atual e não altera seus dados.
                    </AlertDescription>
                </Alert>

                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                    <MetricCard
                        label="Vendas consideradas"
                        value={formatNumber(summary.orders)}
                        hint={`${formatNumber(summary.units)} unidades · ${salesPeriod}`}
                        icon={ReceiptText}
                    />
                    <MetricCard
                        label="Receita dos produtos"
                        value={formatCurrency(summary.product_revenue_cents)}
                        hint={`${formatCurrency(summary.discount_cents)} em descontos`}
                        icon={BadgeDollarSign}
                    />
                    <MetricCard
                        label="Custo dos produtos"
                        value={formatCurrency(summary.product_cost_cents)}
                        hint="Custo registrado em cada venda"
                        icon={Boxes}
                    />
                    <MetricCard
                        label="Lucro antes da mídia"
                        value={formatCurrency(summary.product_profit_cents)}
                        hint="Receita dos produtos menos custos"
                        icon={PackageCheck}
                        tone={
                            summary.product_profit_cents >= 0
                                ? 'positive'
                                : 'negative'
                        }
                    />
                </div>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-6">
                    <Card className="overflow-hidden border-primary/20 shadow-xs">
                        <CardHeader className="border-b bg-primary/[0.035]">
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="size-4 text-primary" />
                                Simulação do resultado total
                            </CardTitle>
                            <CardDescription>
                                Digite o total investido em mídia desde o início
                                das vendas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] lg:items-end">
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-3">
                                    <Label htmlFor="campaign_spend">
                                        Investimento total em campanhas (USD)
                                    </Label>
                                    {campaignSpend !== '' && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto px-2 py-1 text-xs text-muted-foreground"
                                            onClick={() => setCampaignSpend('')}
                                        >
                                            Limpar
                                        </Button>
                                    )}
                                </div>
                                <div className="relative">
                                    <WalletCards className="absolute top-3 left-3 size-4 text-muted-foreground" />
                                    <Input
                                        id="campaign_spend"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        inputMode="decimal"
                                        value={campaignSpend}
                                        onChange={(event) =>
                                            setCampaignSpend(event.target.value)
                                        }
                                        placeholder="Ex.: 1250.00"
                                        className="h-11 pl-10 text-base"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Este valor fica salvo apenas neste navegador
                                    e continua sem alterar seus dados.
                                </p>
                            </div>

                            <div
                                className={cn(
                                    'rounded-xl border p-4 sm:p-5',
                                    finalProfitCents >= 0
                                        ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/40'
                                        : 'border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/40',
                                )}
                                aria-live="polite"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm text-muted-foreground">
                                            Lucro final estimado
                                        </p>
                                        <p
                                            className={cn(
                                                'text-3xl font-semibold tracking-tight break-words tabular-nums',
                                                finalProfitCents >= 0
                                                    ? 'text-emerald-700 dark:text-emerald-300'
                                                    : 'text-red-700 dark:text-red-300',
                                            )}
                                        >
                                            {formatCurrency(finalProfitCents)}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Margem final{' '}
                                            {formatPercentage(finalMargin)}
                                        </p>
                                    </div>
                                    {finalProfitCents >= 0 ? (
                                        <TrendingUp className="size-7 shrink-0 text-emerald-600" />
                                    ) : (
                                        <TrendingDown className="size-7 shrink-0 text-red-600" />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs xl:sticky xl:top-6">
                        <CardHeader>
                            <CardTitle>Composição do lucro</CardTitle>
                            <CardDescription>
                                Todas as vendas, sem separação por campanha.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <BreakdownRow
                                label="Subtotal dos produtos"
                                value={formatCurrency(
                                    summary.products_subtotal_cents,
                                )}
                            />
                            <BreakdownRow
                                label="Descontos aplicados"
                                value={`− ${formatCurrency(summary.discount_cents)}`}
                            />
                            <BreakdownRow
                                label="Receita dos produtos"
                                value={formatCurrency(
                                    summary.product_revenue_cents,
                                )}
                                strong
                                divided
                            />
                            <BreakdownRow
                                label="Custo dos produtos"
                                value={`− ${formatCurrency(summary.product_cost_cents)}`}
                            />
                            <BreakdownRow
                                label="Investimento informado"
                                value={`− ${formatCurrency(campaignSpendCents)}`}
                            />
                            <BreakdownRow
                                label="Lucro final"
                                value={formatCurrency(finalProfitCents)}
                                strong
                                divided
                                tone={
                                    finalProfitCents >= 0
                                        ? 'positive'
                                        : 'negative'
                                }
                            />
                        </CardContent>
                    </Card>
                </div>

                <Card className="shadow-xs">
                    <CardHeader>
                        <CardTitle>O que foi considerado</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
                        <RuleItem
                            icon={Tags}
                            title="Preços e descontos"
                            description="Usa os valores salvos no momento de cada venda."
                        />
                        <RuleItem
                            icon={Boxes}
                            title="Custos dos produtos"
                            description="Soma o custo histórico de todas as unidades vendidas."
                        />
                        <RuleItem
                            icon={Truck}
                            title="Frete separado"
                            description={`${formatCurrency(summary.shipping_cents)} recebidos em frete ficam fora do lucro dos produtos.`}
                        />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

function BreakdownRow({
    label,
    value,
    strong = false,
    divided = false,
    tone = 'default',
}: {
    label: string;
    value: string;
    strong?: boolean;
    divided?: boolean;
    tone?: 'default' | 'positive' | 'negative';
}) {
    return (
        <div
            className={cn(
                'flex items-start justify-between gap-4',
                divided && 'border-t pt-3',
                strong && 'font-semibold',
            )}
        >
            <span className="text-muted-foreground">{label}</span>
            <span
                className={cn('text-right tabular-nums', {
                    'text-emerald-600 dark:text-emerald-400':
                        tone === 'positive',
                    'text-red-600 dark:text-red-400': tone === 'negative',
                })}
            >
                {value}
            </span>
        </div>
    );
}

function RuleItem({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof Boxes;
    title: string;
    description: string;
}) {
    return (
        <div className="flex gap-3 rounded-lg bg-muted/55 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-xs">
                <Icon className="size-4" />
            </div>
            <div className="min-w-0 space-y-1">
                <p className="font-medium">{title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    );
}

Consolidated.layout = {
    breadcrumbs: [{ title: 'Consolidado', href: '/consolidado' }],
};

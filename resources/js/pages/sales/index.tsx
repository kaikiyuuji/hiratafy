import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { DateRangeShortcuts } from '@/components/date-range-shortcuts';
import { EmptyState } from '@/components/empty-state';
import { FilterPanel } from '@/components/filter-panel';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
} from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CampaignOption, SaleRow, SimplePagination } from '@/types';

type Props = {
    sales: SimplePagination<SaleRow>;
    campaigns: CampaignOption[];
    filters: {
        start_date: string;
        end_date: string;
        campaign_id: number | null;
        items_count: number | null;
        search: string;
        sort: string;
    };
};

export default function SalesIndex({ sales, campaigns, filters }: Props) {
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const [campaignId, setCampaignId] = useState(
        filters.campaign_id === null ? 'all' : String(filters.campaign_id),
    );
    const [itemsCount, setItemsCount] = useState(
        filters.items_count === null ? '' : String(filters.items_count),
    );
    const [search, setSearch] = useState(filters.search);
    const [sort, setSort] = useState(filters.sort);
    const [deleting, setDeleting] = useState<SaleRow | null>(null);

    function applyFilters(
        nextStartDate: string = startDate,
        nextEndDate: string = endDate,
    ) {
        router.get(
            '/vendas',
            {
                start_date: nextStartDate,
                end_date: nextEndDate,
                campaign_id: campaignId === 'all' ? '' : campaignId,
                items_count: itemsCount,
                search,
                sort,
            },
            { preserveState: true, replace: true },
        );
    }

    function filter(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        applyFilters();
    }

    function applyDateRange(nextStartDate: string, nextEndDate: string) {
        setStartDate(nextStartDate);
        setEndDate(nextEndDate);
        applyFilters(nextStartDate, nextEndDate);
    }

    function deleteSale() {
        if (!deleting) {
            return;
        }

        router.delete(`/vendas/${deleting.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    }

    return (
        <>
            <Head title="Vendas" />
            <div className="flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4 md:p-6">
                <PageHeader
                    title="Vendas"
                    description="Histórico manual de pedidos com receita, descontos e custo de produto já calculados."
                    actions={
                        <Button asChild>
                            <Link href="/vendas/nova">
                                <Plus /> Nova venda
                            </Link>
                        </Button>
                    }
                />

                <FilterPanel
                    summary={`${formatDate(filters.start_date)} – ${formatDate(filters.end_date)} · ${formatNumber(sales.total)} resultado${sales.total === 1 ? '' : 's'}`}
                    resetHref="/vendas?reset_filters=1"
                    quickActions={
                        <DateRangeShortcuts
                            startDate={startDate}
                            endDate={endDate}
                            todayLabel="Vendas de hoje"
                            showLastThirtyDays={false}
                            onSelect={(range) =>
                                applyDateRange(range.startDate, range.endDate)
                            }
                        />
                    }
                >
                    <form
                        onSubmit={filter}
                        className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[140px_140px_190px_130px_minmax(180px,1fr)_190px_auto] 2xl:items-end"
                    >
                        <div className="grid gap-1.5">
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
                        <div className="grid gap-1.5">
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
                        <div className="grid gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                                Campanha
                            </label>
                            <Select
                                value={campaignId}
                                onValueChange={setCampaignId}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todas as campanhas
                                    </SelectItem>
                                    {campaigns.map((campaign) => (
                                        <SelectItem
                                            key={campaign.id}
                                            value={String(campaign.id)}
                                        >
                                            {campaign.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <label
                                htmlFor="items_count"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Número de itens
                            </label>
                            <Input
                                id="items_count"
                                type="number"
                                min="1"
                                max="5000000"
                                step="1"
                                inputMode="numeric"
                                value={itemsCount}
                                onChange={(event) =>
                                    setItemsCount(event.target.value)
                                }
                                placeholder="Ex.: 6"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <label
                                htmlFor="search"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Pedido ou cliente
                            </label>
                            <div className="relative">
                                <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Buscar"
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <label
                                htmlFor="sort"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Ordenar por
                            </label>
                            <Select value={sort} onValueChange={setSort}>
                                <SelectTrigger id="sort" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="latest">
                                        Mais recentes
                                    </SelectItem>
                                    <SelectItem value="oldest">
                                        Mais antigas
                                    </SelectItem>
                                    <SelectItem value="customer_asc">
                                        Cliente (A–Z)
                                    </SelectItem>
                                    <SelectItem value="customer_desc">
                                        Cliente (Z–A)
                                    </SelectItem>
                                    <SelectItem value="items_desc">
                                        Maior quantidade
                                    </SelectItem>
                                    <SelectItem value="revenue_desc">
                                        Maior faturamento
                                    </SelectItem>
                                    <SelectItem value="profit_desc">
                                        Maior lucro
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            type="submit"
                            variant="outline"
                            className="self-end"
                        >
                            Filtrar
                        </Button>
                    </form>
                </FilterPanel>

                <Card className="gap-0 overflow-hidden py-0 shadow-xs">
                    {sales.data.length === 0 ? (
                        <EmptyState
                            icon={ShoppingBag}
                            title="Nenhuma venda encontrada"
                            description="Ajuste os filtros ou registre o primeiro pedido deste período."
                            action={
                                <Button asChild>
                                    <Link href="/vendas/nova">
                                        Registrar venda
                                    </Link>
                                </Button>
                            }
                        />
                    ) : (
                        <>
                            <Table className="responsive-table">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Pedido</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Campanha</TableHead>
                                        <TableHead className="text-right">
                                            Itens
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Desconto
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Faturamento
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Custo
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Margem bruta
                                        </TableHead>
                                        <TableHead className="w-24" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sales.data.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell data-primary>
                                                <p className="font-medium">
                                                    {sale.order_number ??
                                                        `Venda #${sale.id}`}
                                                </p>
                                                {sale.customer_name && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {sale.customer_name}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell data-label="Data">
                                                {formatDateTime(sale.sold_at)}
                                            </TableCell>
                                            <TableCell data-label="Campanha">
                                                {sale.campaign_name ? (
                                                    <Badge variant="outline">
                                                        {sale.campaign_name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        Orgânica
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                data-label="Itens"
                                                className="text-right"
                                            >
                                                {formatNumber(sale.items_count)}
                                            </TableCell>
                                            <TableCell
                                                data-label="Desconto"
                                                data-mobile-hidden
                                                className="text-right"
                                            >
                                                {sale.discount_cents > 0
                                                    ? `− ${formatCurrency(sale.discount_cents)}`
                                                    : '—'}
                                            </TableCell>
                                            <TableCell
                                                data-label="Faturamento"
                                                className="text-right font-medium"
                                            >
                                                {formatCurrency(
                                                    sale.revenue_cents,
                                                )}
                                            </TableCell>
                                            <TableCell
                                                data-label="Custo"
                                                data-mobile-hidden
                                                className="text-right"
                                            >
                                                {formatCurrency(
                                                    sale.product_cost_cents,
                                                )}
                                            </TableCell>
                                            <TableCell
                                                data-label="Margem bruta"
                                                className={cn(
                                                    'text-right font-medium',
                                                    sale.gross_profit_cents >= 0
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-destructive',
                                                )}
                                            >
                                                {formatCurrency(
                                                    sale.gross_profit_cents,
                                                )}
                                            </TableCell>
                                            <TableCell data-actions>
                                                <div className="flex justify-end">
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        size="icon"
                                                    >
                                                        <Link
                                                            href={`/vendas/${sale.id}/editar`}
                                                            aria-label="Editar venda"
                                                        >
                                                            <Pencil />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive"
                                                        onClick={() =>
                                                            setDeleting(sale)
                                                        }
                                                        aria-label="Excluir venda"
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                                <span>
                                    {sales.from}–{sales.to} de{' '}
                                    {formatNumber(sales.total)} vendas
                                </span>
                                <div className="flex w-full gap-2 sm:w-auto [&>*]:flex-1">
                                    <Button
                                        asChild={sales.prev_page_url !== null}
                                        variant="outline"
                                        size="sm"
                                        disabled={!sales.prev_page_url}
                                    >
                                        {sales.prev_page_url ? (
                                            <Link href={sales.prev_page_url}>
                                                Anterior
                                            </Link>
                                        ) : (
                                            <span>Anterior</span>
                                        )}
                                    </Button>
                                    <Button
                                        asChild={sales.next_page_url !== null}
                                        variant="outline"
                                        size="sm"
                                        disabled={!sales.next_page_url}
                                    >
                                        {sales.next_page_url ? (
                                            <Link href={sales.next_page_url}>
                                                Próxima
                                            </Link>
                                        ) : (
                                            <span>Próxima</span>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </Card>
            </div>

            <Dialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir venda?</DialogTitle>
                        <DialogDescription>
                            A venda{' '}
                            {deleting?.order_number ?? `#${deleting?.id}`} será
                            removida dos relatórios. Esta ação não pode ser
                            desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleting(null)}
                        >
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={deleteSale}>
                            Excluir venda
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

SalesIndex.layout = {
    breadcrumbs: [{ title: 'Vendas', href: '/vendas' }],
};

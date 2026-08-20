import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { EmptyState } from '@/components/empty-state';
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
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CampaignOption, SaleRow, SimplePagination } from '@/types';

type Props = {
    sales: SimplePagination<SaleRow>;
    campaigns: CampaignOption[];
    filters: {
        start_date: string;
        end_date: string;
        campaign_id: number | null;
        search: string;
    };
};

export default function SalesIndex({ sales, campaigns, filters }: Props) {
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const [campaignId, setCampaignId] = useState(
        filters.campaign_id === null ? 'all' : String(filters.campaign_id),
    );
    const [search, setSearch] = useState(filters.search);
    const [deleting, setDeleting] = useState<SaleRow | null>(null);

    function filter(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.get(
            '/vendas',
            {
                start_date: startDate,
                end_date: endDate,
                campaign_id: campaignId === 'all' ? '' : campaignId,
                search,
            },
            { preserveState: true, replace: true },
        );
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
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
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

                <Card className="py-4 shadow-xs">
                    <form
                        onSubmit={filter}
                        className="grid gap-3 px-4 sm:grid-cols-2 xl:grid-cols-[160px_160px_220px_minmax(220px,1fr)_auto] xl:items-end"
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
                        <Button type="submit" variant="outline">
                            Filtrar
                        </Button>
                    </form>
                </Card>

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
                            <Table>
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
                                            <TableCell>
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
                                            <TableCell>
                                                {formatDateTime(sale.sold_at)}
                                            </TableCell>
                                            <TableCell>
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
                                            <TableCell className="text-right">
                                                {formatNumber(sale.items_count)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {sale.discount_cents > 0
                                                    ? `− ${formatCurrency(sale.discount_cents)}`
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(
                                                    sale.revenue_cents,
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(
                                                    sale.product_cost_cents,
                                                )}
                                            </TableCell>
                                            <TableCell
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
                                            <TableCell>
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
                                <div className="flex gap-2">
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

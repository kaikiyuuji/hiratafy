import { Head, Link } from '@inertiajs/react';
import { BadgePercent, CalendarRange, Pencil, Plus } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatBasisPoints, formatDate } from '@/lib/formatters';
import type { DiscountRecord } from '@/types';

export default function DiscountsIndex({
    discounts,
}: {
    discounts: DiscountRecord[];
}) {
    return (
        <>
            <Head title="Descontos" />
            <div className="flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4 md:p-6">
                <PageHeader
                    title="Descontos por quantidade"
                    description="Regras por categoria aplicadas automaticamente ao registrar uma venda."
                    actions={
                        <Button asChild>
                            <Link href="/descontos/novo">
                                <Plus /> Novo desconto
                            </Link>
                        </Button>
                    }
                />

                <Card className="gap-0 overflow-hidden py-0 shadow-xs">
                    {discounts.length === 0 ? (
                        <EmptyState
                            icon={BadgePercent}
                            title="Nenhum desconto configurado"
                            description="Crie faixas como 3 unidades por 10% e 6 unidades por 20%."
                            action={
                                <Button asChild>
                                    <Link href="/descontos/novo">
                                        Criar desconto
                                    </Link>
                                </Button>
                            }
                        />
                    ) : (
                        <Table className="responsive-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Regra</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Faixas</TableHead>
                                    <TableHead>Vigência</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-16" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {discounts.map((discount) => (
                                    <TableRow key={discount.id}>
                                        <TableCell
                                            data-primary
                                            className="font-medium"
                                        >
                                            {discount.name}
                                        </TableCell>
                                        <TableCell data-label="Categoria">
                                            {discount.category_name}
                                        </TableCell>
                                        <TableCell data-label="Faixas">
                                            <div className="flex flex-wrap gap-1.5">
                                                {discount.tiers.map((tier) => (
                                                    <Badge
                                                        key={
                                                            tier.id ??
                                                            tier.min_quantity
                                                        }
                                                        variant="outline"
                                                    >
                                                        {tier.min_quantity}+ →{' '}
                                                        {formatBasisPoints(
                                                            tier.percentage_basis_points,
                                                        )}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell data-label="Vigência">
                                            <div className="flex items-center gap-2 text-sm">
                                                <CalendarRange className="size-4 text-muted-foreground" />
                                                {discount.starts_on ||
                                                discount.ends_on ? (
                                                    <span>
                                                        {discount.starts_on
                                                            ? formatDate(
                                                                  discount.starts_on,
                                                              )
                                                            : 'Sem início'}{' '}
                                                        –{' '}
                                                        {discount.ends_on
                                                            ? formatDate(
                                                                  discount.ends_on,
                                                              )
                                                            : 'sem fim'}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        Sempre
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell data-label="Status">
                                            <Badge
                                                variant={
                                                    discount.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {discount.is_active
                                                    ? 'Ativo'
                                                    : 'Inativo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell data-actions>
                                            <Button
                                                asChild
                                                variant="ghost"
                                                size="icon"
                                            >
                                                <Link
                                                    href={`/descontos/${discount.id}/editar`}
                                                    aria-label={`Editar ${discount.name}`}
                                                >
                                                    <Pencil />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            </div>
        </>
    );
}

DiscountsIndex.layout = {
    breadcrumbs: [{ title: 'Descontos', href: '/descontos' }],
};

import { Head, Link, router } from '@inertiajs/react';
import { Package, Pencil, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/formatters';
import type { ProductRecord } from '@/types';

export default function ProductsIndex({
    products,
    filters,
}: {
    products: ProductRecord[];
    filters: { search: string };
}) {
    const [search, setSearch] = useState(filters.search);

    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.get(
            '/produtos',
            { search },
            { preserveState: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Produtos" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Produtos"
                    description="Preços de venda, custos-base e faixas de custo negociadas com o fornecedor."
                    actions={
                        <Button asChild>
                            <Link href="/produtos/novo">
                                <Plus /> Novo produto
                            </Link>
                        </Button>
                    }
                />

                <form
                    onSubmit={submitSearch}
                    className="flex max-w-md flex-col gap-2 sm:flex-row"
                >
                    <div className="relative flex-1">
                        <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por nome ou SKU"
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" variant="outline">
                        Buscar
                    </Button>
                </form>

                <Card className="gap-0 overflow-hidden py-0 shadow-xs">
                    {products.length === 0 ? (
                        <EmptyState
                            icon={Package}
                            title={
                                filters.search
                                    ? 'Nenhum produto encontrado'
                                    : 'Seu catálogo está vazio'
                            }
                            description={
                                filters.search
                                    ? 'Tente outro nome ou limpe a busca.'
                                    : 'Cadastre preços e custos para começar a registrar vendas.'
                            }
                            action={
                                !filters.search && (
                                    <Button asChild>
                                        <Link href="/produtos/novo">
                                            Cadastrar produto
                                        </Link>
                                    </Button>
                                )
                            }
                        />
                    ) : (
                        <Table className="responsive-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead className="text-right">
                                        Preço
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Custo-base
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Margem bruta
                                    </TableHead>
                                    <TableHead>Faixas de custo</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-16" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => {
                                    const margin =
                                        product.sale_price_cents -
                                        product.base_cost_cents;

                                    return (
                                        <TableRow key={product.id}>
                                            <TableCell data-primary>
                                                <p className="font-medium">
                                                    {product.name}
                                                </p>
                                                {product.sku && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {product.sku}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell data-label="Categoria">
                                                {product.category_name}
                                            </TableCell>
                                            <TableCell
                                                data-label="Preço"
                                                className="text-right font-medium"
                                            >
                                                {formatCurrency(
                                                    product.sale_price_cents,
                                                )}
                                            </TableCell>
                                            <TableCell
                                                data-label="Custo-base"
                                                className="text-right"
                                            >
                                                {formatCurrency(
                                                    product.base_cost_cents,
                                                )}
                                            </TableCell>
                                            <TableCell
                                                data-label="Margem bruta"
                                                className="text-right text-emerald-600 dark:text-emerald-400"
                                            >
                                                {formatCurrency(margin)}
                                            </TableCell>
                                            <TableCell data-label="Faixas de custo">
                                                {product.cost_tiers.length === 0
                                                    ? '—'
                                                    : `${product.cost_tiers.length} faixa${product.cost_tiers.length > 1 ? 's' : ''}`}
                                            </TableCell>
                                            <TableCell data-label="Status">
                                                <Badge
                                                    variant={
                                                        product.is_active
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {product.is_active
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
                                                        href={`/produtos/${product.id}/editar`}
                                                        aria-label={`Editar ${product.name}`}
                                                    >
                                                        <Pencil />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            </div>
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [{ title: 'Produtos', href: '/produtos' }],
};

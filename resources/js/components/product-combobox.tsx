import { Check, ChevronsUpDown, PackageSearch, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export type ProductComboboxOption = {
    id: number;
    name: string;
    category_name: string;
    sale_price_cents: number;
};

type Props = {
    id?: string;
    products: ProductComboboxOption[];
    value: string;
    disabledProductIds?: Set<string>;
    recentProductIds?: string[];
    onValueChange: (value: string) => void;
    onRecentProduct: (value: string) => void;
};

export function ProductCombobox({
    id,
    products,
    value,
    disabledProductIds = new Set(),
    recentProductIds = [],
    onValueChange,
    onRecentProduct,
}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const selectedProduct = products.find(
        (product) => String(product.id) === value,
    );
    const visibleProducts = useMemo(() => {
        const normalizedQuery = normalize(query);
        const recentPositions = new Map(
            recentProductIds.map((productId, index) => [productId, index]),
        );

        return products
            .filter((product) => {
                if (normalizedQuery === '') {
                    return true;
                }

                return normalize(
                    `${product.name} ${product.category_name}`,
                ).includes(normalizedQuery);
            })
            .sort((first, second) => {
                const firstPosition =
                    recentPositions.get(String(first.id)) ?? Number.MAX_VALUE;
                const secondPosition =
                    recentPositions.get(String(second.id)) ?? Number.MAX_VALUE;

                if (firstPosition !== secondPosition) {
                    return firstPosition - secondPosition;
                }

                return first.name.localeCompare(second.name, 'pt-BR');
            });
    }, [products, query, recentProductIds]);

    function selectProduct(productId: string) {
        onValueChange(productId);
        onRecentProduct(productId);
        setOpen(false);
        setQuery('');
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (!nextOpen) {
                    setQuery('');
                }
            }}
        >
            <DialogTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Selecionar produto"
                    className="h-auto min-h-10 w-full min-w-0 justify-between px-3 py-2 font-normal sm:min-h-9"
                >
                    {selectedProduct ? (
                        <span className="grid min-w-0 text-left leading-tight">
                            <span className="truncate font-medium">
                                {selectedProduct.name}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                                {selectedProduct.category_name} ·{' '}
                                {formatCurrency(
                                    selectedProduct.sale_price_cents,
                                )}
                            </span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">
                            Selecione um produto
                        </span>
                    )}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
                </Button>
            </DialogTrigger>
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
                <DialogHeader className="border-b p-4 pr-12 sm:p-5 sm:pr-12">
                    <DialogTitle>Selecionar produto</DialogTitle>
                    <DialogDescription>
                        Pesquise pelo nome ou pela categoria.
                    </DialogDescription>
                </DialogHeader>
                <div className="border-b p-3 sm:p-4">
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar produto ou categoria"
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="max-h-[55dvh] overflow-y-auto p-2 sm:max-h-[420px]">
                    {visibleProducts.length === 0 ? (
                        <div className="grid place-items-center gap-2 px-4 py-12 text-center">
                            <div className="grid size-10 place-items-center rounded-full bg-muted">
                                <PackageSearch className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    Nenhum produto encontrado
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Tente outro nome ou categoria.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-1">
                            {visibleProducts.map((product) => {
                                const productId = String(product.id);
                                const isSelected = productId === value;
                                const isRecent =
                                    recentProductIds.includes(productId);

                                return (
                                    <Button
                                        key={product.id}
                                        type="button"
                                        variant="ghost"
                                        disabled={
                                            disabledProductIds.has(productId) &&
                                            !isSelected
                                        }
                                        onClick={() => selectProduct(productId)}
                                        className="h-auto w-full justify-start gap-3 px-3 py-2.5 text-left whitespace-normal"
                                    >
                                        <span
                                            className={cn(
                                                'grid size-8 shrink-0 place-items-center rounded-lg border bg-muted/40',
                                                isSelected &&
                                                    'border-primary bg-primary/10 text-primary',
                                            )}
                                        >
                                            {isSelected ? (
                                                <Check className="size-4" />
                                            ) : (
                                                <PackageSearch className="size-4" />
                                            )}
                                        </span>
                                        <span className="grid min-w-0 flex-1 gap-0.5">
                                            <span className="font-medium break-words">
                                                {product.name}
                                            </span>
                                            <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                                <span>
                                                    {product.category_name}
                                                </span>
                                                <span>·</span>
                                                <span>
                                                    {formatCurrency(
                                                        product.sale_price_cents,
                                                    )}
                                                </span>
                                                {isRecent && query === '' && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="h-5 px-1.5 py-0 text-[10px]"
                                                    >
                                                        Recente
                                                    </Badge>
                                                )}
                                            </span>
                                        </span>
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .trim();
}

import { Link } from '@inertiajs/react';
import {
    BadgePercent,
    ChartNoAxesCombined,
    ChartPie,
    Ellipsis,
    LayoutDashboard,
    Megaphone,
    Package,
    Plus,
    Settings,
    ShoppingBag,
    Tags,
    WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';

const moreItems: Array<{
    label: string;
    href: string;
    icon: LucideIcon;
}> = [
    { label: 'Consolidado', href: '/consolidado', icon: ChartPie },
    { label: 'Campanhas', href: '/campanhas', icon: Megaphone },
    { label: 'Produtos', href: '/produtos', icon: Package },
    { label: 'Categorias', href: '/categorias', icon: Tags },
    { label: 'Descontos', href: '/descontos', icon: BadgePercent },
    {
        label: 'Regras financeiras',
        href: '/settings/financial',
        icon: ChartNoAxesCombined,
    },
    {
        label: 'Configurações',
        href: '/settings/profile',
        icon: Settings,
    },
];

export function MobileBottomNav() {
    const { isCurrentOrParentUrl, isCurrentUrl } = useCurrentUrl();
    const isNewSale = isCurrentUrl('/vendas/nova');
    const isMoreActive = moreItems.some((item) =>
        isCurrentOrParentUrl(item.href),
    );

    return (
        <nav
            className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(0,0,0,0.06)] backdrop-blur md:hidden"
            aria-label="Navegação principal"
        >
            <div className="grid h-16 grid-cols-5 items-stretch">
                <MobileNavLink
                    href="/dashboard"
                    label="Dashboard"
                    icon={LayoutDashboard}
                    active={isCurrentUrl('/dashboard')}
                />
                <MobileNavLink
                    href="/vendas"
                    label="Vendas"
                    icon={ShoppingBag}
                    active={isCurrentOrParentUrl('/vendas') && !isNewSale}
                />
                <Link
                    href="/vendas/nova"
                    prefetch
                    aria-current={isNewSale ? 'page' : undefined}
                    className="group relative flex min-w-0 flex-col items-center justify-end gap-0.5 pb-1.5 text-[10px] font-medium"
                >
                    <span
                        className={cn(
                            'absolute -top-4 grid size-12 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-md transition-transform group-active:scale-95',
                            isNewSale && 'ring-2 ring-primary/25',
                        )}
                    >
                        <Plus className="size-5" />
                    </span>
                    <span>Nova venda</span>
                </Link>
                <MobileNavLink
                    href="/investimentos"
                    label="Mídia"
                    icon={WalletCards}
                    active={isCurrentOrParentUrl('/investimentos')}
                />
                <Sheet>
                    <SheetTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                                'h-full min-w-0 flex-col gap-0.5 rounded-none px-1 py-1.5 text-[10px] text-muted-foreground',
                                isMoreActive &&
                                    'bg-primary/8 text-primary hover:bg-primary/10 hover:text-primary',
                            )}
                            aria-label="Abrir mais opções"
                        >
                            <Ellipsis className="size-5" />
                            <span>Mais</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent
                        side="bottom"
                        className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
                    >
                        <SheetHeader className="border-b text-left">
                            <SheetTitle>Mais opções</SheetTitle>
                            <SheetDescription>
                                Acesse o catálogo, relatórios e configurações.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                            {moreItems.map((item) => (
                                <SheetClose key={item.href} asChild>
                                    <Link
                                        href={item.href}
                                        prefetch
                                        className={cn(
                                            'flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
                                            isCurrentOrParentUrl(item.href) &&
                                                'border-primary/30 bg-primary/8 text-primary',
                                        )}
                                    >
                                        <item.icon className="size-4 shrink-0" />
                                        <span className="min-w-0 truncate">
                                            {item.label}
                                        </span>
                                    </Link>
                                </SheetClose>
                            ))}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </nav>
    );
}

function MobileNavLink({
    href,
    label,
    icon: Icon,
    active,
}: {
    href: string;
    label: string;
    icon: LucideIcon;
    active: boolean;
}) {
    return (
        <Link
            href={href}
            prefetch
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors',
                active && 'bg-primary/8 text-primary',
            )}
        >
            <Icon className="size-5" />
            <span className="max-w-full truncate">{label}</span>
        </Link>
    );
}

import { Link } from '@inertiajs/react';
import {
    BadgePercent,
    ChartNoAxesCombined,
    LayoutDashboard,
    Megaphone,
    Package,
    Settings,
    ShoppingBag,
    Tags,
    WalletCards,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        title: 'Vendas',
        href: '/vendas',
        icon: ShoppingBag,
    },
    {
        title: 'Investimentos',
        href: '/investimentos',
        icon: WalletCards,
    },
    {
        title: 'Campanhas',
        href: '/campanhas',
        icon: Megaphone,
    },
    {
        title: 'Produtos',
        href: '/produtos',
        icon: Package,
    },
    {
        title: 'Categorias',
        href: '/categorias',
        icon: Tags,
    },
    {
        title: 'Descontos',
        href: '/descontos',
        icon: BadgePercent,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Regras financeiras',
        href: '/settings/financial',
        icon: ChartNoAxesCombined,
    },
    {
        title: 'Configurações',
        href: '/settings/profile',
        icon: Settings,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

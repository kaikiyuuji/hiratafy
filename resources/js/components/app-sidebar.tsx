import { Link } from '@inertiajs/react';
import {
    BadgePercent,
    ChartPie,
    ChartNoAxesCombined,
    LayoutDashboard,
    Megaphone,
    Package,
    Settings,
    ShoppingBag,
    Store,
    Tags,
    WalletCards,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import type { NavSection } from '@/components/nav-main';
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
const navSections: NavSection[] = [
    {
        label: 'Relatórios',
        items: [
            {
                title: 'Dashboard',
                href: '/dashboard',
                icon: LayoutDashboard,
            },
            {
                title: 'Consolidado',
                href: '/consolidado',
                icon: ChartPie,
            },
        ],
    },
    {
        label: 'Operação',
        items: [
            {
                title: 'Vendas',
                href: '/vendas',
                icon: ShoppingBag,
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
        ],
    },
    {
        label: 'Marketing',
        items: [
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
        ],
    },
    {
        label: 'Sistema',
        items: [
            {
                title: 'Shopify',
                href: '/integracoes/shopify',
                icon: Store,
            },
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
        ],
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
                <NavMain sections={navSections} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

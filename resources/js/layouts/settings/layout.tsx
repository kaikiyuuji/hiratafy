import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Financeiro',
        href: '/settings/financial',
        icon: null,
    },
    {
        title: 'Perfil',
        href: edit(),
        icon: null,
    },
    {
        title: 'Segurança',
        href: editSecurity(),
        icon: null,
    },
    {
        title: 'Aparência',
        href: editAppearance(),
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="px-3 py-4 sm:px-4 sm:py-6 md:px-6">
            <Heading
                title="Configurações"
                description="Gerencie as regras do app e os dados da sua conta"
            />

            <div className="flex flex-col lg:flex-row lg:space-x-12">
                <aside className="min-w-0 lg:w-48 lg:shrink-0">
                    <nav
                        className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${toUrl(item.href)}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn(
                                    'shrink-0 justify-start lg:w-full',
                                    {
                                        'bg-muted': isCurrentOrParentUrl(
                                            item.href,
                                        ),
                                    },
                                )}
                            >
                                <Link href={item.href}>
                                    {item.icon && (
                                        <item.icon className="h-4 w-4" />
                                    )}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="min-w-0 flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}

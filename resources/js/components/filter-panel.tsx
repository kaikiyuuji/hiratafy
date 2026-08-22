import { Link } from '@inertiajs/react';
import { ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';

export function FilterPanel({
    children,
    summary,
    resetHref,
    quickActions,
}: {
    children: ReactNode;
    summary?: ReactNode;
    resetHref?: string;
    quickActions?: ReactNode;
}) {
    return (
        <Card className="gap-0 py-0 shadow-xs">
            <Collapsible>
                <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <SlidersHorizontal className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium">Filtros</p>
                            {summary && (
                                <div className="truncate text-xs text-muted-foreground">
                                    {summary}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                        {quickActions && (
                            <div className="min-w-0 flex-1 sm:flex-none">
                                {quickActions}
                            </div>
                        )}
                        {resetHref && (
                            <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                            >
                                <Link href={resetHref} replace preserveScroll>
                                    <RotateCcw /> Limpar
                                </Link>
                            </Button>
                        )}
                        <CollapsibleTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="group md:hidden"
                                aria-label="Mostrar ou ocultar filtros"
                            >
                                <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </div>
                <CollapsibleContent
                    forceMount
                    className="filter-panel-content border-t data-[state=closed]:hidden md:!block"
                >
                    {children}
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}

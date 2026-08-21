import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function MetricCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'default',
}: {
    label: string;
    value: string;
    hint?: string;
    icon: LucideIcon;
    tone?: 'default' | 'positive' | 'negative';
}) {
    return (
        <Card className="gap-0 py-0 shadow-xs">
            <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0 space-y-1">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p
                        className={cn(
                            'text-xl font-semibold tracking-tight break-words tabular-nums sm:text-2xl',
                            {
                                'text-emerald-600 dark:text-emerald-400':
                                    tone === 'positive',
                                'text-red-600 dark:text-red-400':
                                    tone === 'negative',
                            },
                        )}
                    >
                        {value}
                    </p>
                    {hint && (
                        <p className="text-xs text-muted-foreground">{hint}</p>
                    )}
                </div>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary dark:bg-primary/15">
                    <Icon className="size-4" />
                </div>
            </CardContent>
        </Card>
    );
}

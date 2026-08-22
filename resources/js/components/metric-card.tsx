import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function MetricCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'default',
    comparison,
}: {
    label: string;
    value: string;
    hint?: string;
    icon: LucideIcon;
    tone?: 'default' | 'positive' | 'negative';
    comparison?: {
        value: string;
        direction: 'up' | 'down' | 'neutral';
        tone?: 'positive' | 'negative' | 'neutral';
        label: string;
    };
}) {
    const ComparisonIcon =
        comparison?.direction === 'up'
            ? TrendingUp
            : comparison?.direction === 'down'
              ? TrendingDown
              : Minus;

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
                    {comparison && (
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 pt-1 text-[11px] text-muted-foreground">
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 font-medium tabular-nums',
                                    comparison.tone === 'positive' &&
                                        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                                    comparison.tone === 'negative' &&
                                        'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
                                )}
                            >
                                <ComparisonIcon className="size-3" />
                                {comparison.value}
                            </span>
                            <span>{comparison.label}</span>
                        </div>
                    )}
                </div>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary dark:bg-primary/15">
                    <Icon className="size-4" />
                </div>
            </CardContent>
        </Card>
    );
}

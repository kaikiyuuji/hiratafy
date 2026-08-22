import { CalendarDays, CalendarRange } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export type DateRange = {
    startDate: string;
    endDate: string;
};

type Props = DateRange & {
    onSelect: (range: DateRange) => void;
    todayLabel?: string;
    showLastThirtyDays?: boolean;
    className?: string;
    disabled?: boolean;
};

export function DateRangeShortcuts({
    startDate,
    endDate,
    onSelect,
    todayLabel = 'Hoje',
    showLastThirtyDays = true,
    className,
    disabled = false,
}: Props) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);

    const todayValue = formatDateInput(today);
    const thirtyDaysAgoValue = formatDateInput(thirtyDaysAgo);
    const selected =
        startDate === todayValue && endDate === todayValue
            ? 'today'
            : showLastThirtyDays &&
                startDate === thirtyDaysAgoValue &&
                endDate === todayValue
              ? 'last-thirty-days'
              : '';

    function select(value: string) {
        if (value === 'today') {
            onSelect({ startDate: todayValue, endDate: todayValue });
        }

        if (value === 'last-thirty-days') {
            onSelect({ startDate: thirtyDaysAgoValue, endDate: todayValue });
        }
    }

    return (
        <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={selected}
            onValueChange={select}
            disabled={disabled}
            aria-label="Períodos rápidos"
            className={cn('w-full sm:w-auto', className)}
        >
            <ToggleGroupItem
                value="today"
                aria-label={todayLabel}
                className="min-w-0 flex-1 px-2.5 text-xs sm:flex-none"
            >
                <CalendarDays />
                {todayLabel}
            </ToggleGroupItem>
            {showLastThirtyDays && (
                <ToggleGroupItem
                    value="last-thirty-days"
                    aria-label="Últimos 30 dias"
                    className="min-w-0 flex-1 px-2.5 text-xs sm:flex-none"
                >
                    <CalendarRange />
                    Últimos 30 dias
                </ToggleGroupItem>
            )}
        </ToggleGroup>
    );
}

export function currentMonthDateRange(): DateRange {
    const today = new Date();

    return {
        startDate: formatDateInput(
            new Date(today.getFullYear(), today.getMonth(), 1),
        ),
        endDate: formatDateInput(today),
    };
}

function formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

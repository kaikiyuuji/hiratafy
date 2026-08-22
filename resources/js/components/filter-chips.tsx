import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type FilterChip = {
    id: string;
    label: string;
    onRemove: () => void;
};

export function FilterChips({ chips }: { chips: FilterChip[] }) {
    if (chips.length === 0) {
        return null;
    }

    return (
        <div
            className="flex flex-wrap items-center gap-2"
            aria-label="Filtros ativos"
        >
            <span className="text-xs font-medium text-muted-foreground">
                Filtros ativos:
            </span>
            {chips.map((chip) => (
                <Badge
                    key={chip.id}
                    variant="secondary"
                    className="h-8 gap-1 py-0 pr-1 pl-2.5 font-normal"
                >
                    <span className="max-w-56 truncate">{chip.label}</span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 rounded-sm text-muted-foreground hover:bg-background/80 hover:text-foreground"
                        onClick={chip.onRemove}
                        aria-label={`Remover filtro ${chip.label}`}
                    >
                        <X className="size-3" />
                    </Button>
                </Badge>
            ))}
        </div>
    );
}

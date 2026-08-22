import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type Props = {
    id: string;
    value: string;
    onValueChange: (value: string) => void;
    min?: number;
    max?: number;
    quickValues?: number[];
};

export function QuantitySelector({
    id,
    value,
    onValueChange,
    min = 1,
    max = 5_000_000,
    quickValues = [1, 2, 3, 6, 12],
}: Props) {
    const parsedValue = Number.parseInt(value, 10);
    const quantity = Number.isNaN(parsedValue) ? null : parsedValue;
    const quickValue =
        quantity !== null && quickValues.includes(quantity)
            ? String(quantity)
            : '';

    function step(amount: number) {
        const nextQuantity =
            quantity === null ? min : Math.min(max, quantity + amount);

        onValueChange(String(Math.max(min, nextQuantity)));
    }

    return (
        <div className="grid min-w-0 gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 shrink-0 sm:size-9"
                    onClick={() => step(-1)}
                    disabled={quantity === null || quantity <= min}
                    aria-label="Diminuir quantidade"
                >
                    <Minus />
                </Button>
                <Input
                    id={id}
                    type="number"
                    min={min}
                    max={max}
                    step="1"
                    inputMode="numeric"
                    value={value}
                    onChange={(event) => onValueChange(event.target.value)}
                    className="min-w-0 flex-1 text-center font-medium tabular-nums"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 shrink-0 sm:size-9"
                    onClick={() => step(1)}
                    disabled={quantity !== null && quantity >= max}
                    aria-label="Aumentar quantidade"
                >
                    <Plus />
                </Button>
            </div>
            <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={quickValue}
                onValueChange={(nextValue) => {
                    if (nextValue) {
                        onValueChange(nextValue);
                    }
                }}
                aria-label="Quantidades rápidas"
                className="w-full"
            >
                {quickValues.map((quickQuantity) => (
                    <ToggleGroupItem
                        key={quickQuantity}
                        value={String(quickQuantity)}
                        aria-label={`Definir quantidade como ${quickQuantity}`}
                        className="min-w-0 flex-1 px-1 text-xs tabular-nums"
                    >
                        {quickQuantity}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
        </div>
    );
}

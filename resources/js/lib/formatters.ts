const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

const numberFormatter = new Intl.NumberFormat('pt-BR');

export function formatCurrency(cents: number): string {
    return currencyFormatter.format(cents / 100);
}

export function centsToInput(cents: number | null | undefined): string {
    return cents === null || cents === undefined
        ? ''
        : (cents / 100).toFixed(2);
}

export function moneyInputToCents(value: string): number {
    const parsed = Number.parseFloat(value);

    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function formatNumber(value: number): string {
    return numberFormatter.format(value);
}

export function formatDate(value: string): string {
    const normalized = value.length === 10 ? `${value}T12:00:00` : value;

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(normalized));
}

export function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function formatPercentage(value: number | null): string {
    return value === null
        ? '—'
        : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)}%`;
}

export function formatBasisPoints(value: number): string {
    return formatPercentage(value / 100);
}

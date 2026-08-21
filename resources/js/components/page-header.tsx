import type { ReactNode } from 'react';

export function PageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {title}
                </h1>
                {description && (
                    <p className="max-w-3xl text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
                    {actions}
                </div>
            )}
        </div>
    );
}

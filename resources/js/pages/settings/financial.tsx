import { Head, useForm } from '@inertiajs/react';
import { BadgeDollarSign, Info, Truck } from 'lucide-react';
import type { FormEvent } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { centsToInput } from '@/lib/formatters';

type Props = {
    settings: {
        currency: string;
        fixed_shipping_cents: number;
        free_shipping_threshold_cents: number;
    };
};

export default function FinancialSettings({ settings }: Props) {
    const form = useForm({
        fixed_shipping: centsToInput(settings.fixed_shipping_cents),
        free_shipping_threshold: centsToInput(
            settings.free_shipping_threshold_cents,
        ),
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.put('/settings/financial', { preserveScroll: true });
    }

    return (
        <>
            <Head title="Regras financeiras" />
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Regras financeiras"
                    description="Configure a moeda e o frete aplicados automaticamente às vendas."
                />

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="currency">Moeda da operação</Label>
                        <div className="relative">
                            <BadgeDollarSign className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                            <Input
                                id="currency"
                                value={settings.currency}
                                disabled
                                className="pl-9"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Este MVP trabalha com todos os valores em dólar
                            americano.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="fixed_shipping">
                            Valor fixo do frete (USD)
                        </Label>
                        <Input
                            id="fixed_shipping"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.data.fixed_shipping}
                            onChange={(event) =>
                                form.setData(
                                    'fixed_shipping',
                                    event.target.value,
                                )
                            }
                        />
                        <InputError message={form.errors.fixed_shipping} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="free_shipping_threshold">
                            Frete grátis a partir de (USD)
                        </Label>
                        <Input
                            id="free_shipping_threshold"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.data.free_shipping_threshold}
                            onChange={(event) =>
                                form.setData(
                                    'free_shipping_threshold',
                                    event.target.value,
                                )
                            }
                        />
                        <InputError
                            message={form.errors.free_shipping_threshold}
                        />
                    </div>

                    <Alert>
                        <Info />
                        <AlertTitle>Ordem do cálculo</AlertTitle>
                        <AlertDescription>
                            O direito ao frete grátis usa o subtotal dos
                            produtos antes dos descontos. O frete é adicionado
                            por último e nunca recebe desconto.
                        </AlertDescription>
                    </Alert>

                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? <Spinner /> : <Truck />}
                        Salvar regras de frete
                    </Button>
                </form>
            </div>
        </>
    );
}

FinancialSettings.layout = {
    breadcrumbs: [{ title: 'Regras financeiras', href: '/settings/financial' }],
};

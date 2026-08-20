import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Megaphone } from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { CampaignRecord } from '@/types';

type CampaignFormData = {
    name: string;
    platform: string;
    is_active: boolean;
    starts_on: string;
    ends_on: string;
    notes: string;
};

export default function CampaignForm({
    campaign,
}: {
    campaign: CampaignRecord | null;
}) {
    const form = useForm<CampaignFormData>({
        name: campaign?.name ?? '',
        platform: campaign?.platform ?? 'Meta Ads',
        is_active: campaign?.is_active ?? true,
        starts_on: campaign?.starts_on ?? '',
        ends_on: campaign?.ends_on ?? '',
        notes: campaign?.notes ?? '',
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (campaign) {
            form.put(`/campanhas/${campaign.id}`);
        } else {
            form.post('/campanhas');
        }
    }

    return (
        <>
            <Head
                title={campaign ? `Editar ${campaign.name}` : 'Nova campanha'}
            />
            <form
                onSubmit={submit}
                className="flex flex-1 flex-col gap-6 p-4 md:p-6"
            >
                <PageHeader
                    title={campaign ? 'Editar campanha' : 'Nova campanha'}
                    description="Uma campanha pode vender qualquer combinação de produtos."
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/campanhas">
                                <ArrowLeft /> Voltar
                            </Link>
                        </Button>
                    }
                />

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,720px)_340px]">
                    <Card className="shadow-xs">
                        <CardHeader>
                            <CardTitle>Dados da campanha</CardTitle>
                            <CardDescription>
                                Use o mesmo nome que aparece no gerenciador de
                                anúncios.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-5 md:grid-cols-2">
                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="name">Nome da campanha</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    placeholder="Ex.: DUMP | Purchase | US"
                                    autoFocus
                                />
                                <InputError message={form.errors.name} />
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="platform">Plataforma</Label>
                                <Input
                                    id="platform"
                                    value={form.data.platform}
                                    onChange={(event) =>
                                        form.setData(
                                            'platform',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Meta Ads"
                                />
                                <InputError message={form.errors.platform} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="starts_on">
                                    Início (opcional)
                                </Label>
                                <Input
                                    id="starts_on"
                                    type="date"
                                    value={form.data.starts_on}
                                    onChange={(event) =>
                                        form.setData(
                                            'starts_on',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.starts_on} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ends_on">Fim (opcional)</Label>
                                <Input
                                    id="ends_on"
                                    type="date"
                                    value={form.data.ends_on}
                                    onChange={(event) =>
                                        form.setData(
                                            'ends_on',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.ends_on} />
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="notes">Observações</Label>
                                <Textarea
                                    id="notes"
                                    value={form.data.notes}
                                    onChange={(event) =>
                                        form.setData(
                                            'notes',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Público, criativo, produto principal ou contexto da campanha."
                                />
                                <InputError message={form.errors.notes} />
                            </div>
                            <div className="flex items-start gap-3 rounded-lg border p-4 md:col-span-2">
                                <Checkbox
                                    id="is_active"
                                    checked={form.data.is_active}
                                    onCheckedChange={(checked) =>
                                        form.setData(
                                            'is_active',
                                            checked === true,
                                        )
                                    }
                                />
                                <div className="grid gap-1">
                                    <Label htmlFor="is_active">
                                        Campanha ativa
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Campanhas pausadas continuam disponíveis
                                        no histórico e em vendas antigas.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-5 xl:sticky xl:top-6">
                        <Alert>
                            <Megaphone />
                            <AlertTitle>Próximo passo</AlertTitle>
                            <AlertDescription>
                                Depois de criar a campanha, informe o orçamento
                                de cada dia na tela de investimentos.
                            </AlertDescription>
                        </Alert>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={form.processing}
                        >
                            {form.processing && <Spinner />}
                            {campaign ? 'Salvar campanha' : 'Criar campanha'}
                        </Button>
                    </div>
                </div>
            </form>
        </>
    );
}

CampaignForm.layout = {
    breadcrumbs: [
        { title: 'Campanhas', href: '/campanhas' },
        { title: 'Cadastro', href: '/campanhas/nova' },
    ],
};

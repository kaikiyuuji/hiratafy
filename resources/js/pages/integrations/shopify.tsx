import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Link2,
    PackageCheck,
    PlugZap,
    RefreshCw,
    Save,
    ShoppingBag,
    Webhook,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { MetricCard } from '@/components/metric-card';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { formatDateTime, formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';

type Integration = {
    shop_domain: string;
    shop_name: string | null;
    default_campaign_id: number | null;
    is_active: boolean;
    last_webhook_at: string | null;
    last_sync_at: string | null;
    webhook_configured: boolean;
    credentials_configured: boolean;
    public_url: string | null;
};

type Option = {
    id: number;
    name: string;
    is_active: boolean;
};

type EventItem = {
    external_key: string;
    name: string;
    quantity: number;
    mapped_product_id: number | null;
    mapped_product_name: string | null;
};

type ShopifyEvent = {
    id: number;
    order_number: string | null;
    occurred_at: string;
    status: 'pending' | 'processed' | 'needs_attention' | 'failed';
    error_message: string | null;
    sale_id: number | null;
    items: EventItem[];
};

type Props = {
    integration: Integration;
    campaigns: Option[];
    products: Option[];
    events: ShopifyEvent[];
    stats: {
        processed: number;
        needs_attention: number;
        mappings: number;
    };
};

const eventStatus = {
    pending: {
        label: 'Na fila',
        className:
            'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
    },
    processed: {
        label: 'Importado',
        className:
            'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    },
    needs_attention: {
        label: 'Requer atenção',
        className:
            'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300',
    },
    failed: {
        label: 'Falhou',
        className:
            'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
    },
} as const;

export default function ShopifyIntegration({
    integration,
    campaigns,
    products,
    events,
    stats,
}: Props) {
    const form = useForm({
        shop_domain: integration.shop_domain,
        default_campaign_id:
            integration.default_campaign_id === null
                ? 'none'
                : String(integration.default_campaign_id),
        is_active: integration.is_active,
    });
    const [action, setAction] = useState<'connect' | 'sync' | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const connected =
        integration.is_active &&
        integration.credentials_configured &&
        integration.webhook_configured;

    function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            default_campaign_id:
                data.default_campaign_id === 'none'
                    ? null
                    : data.default_campaign_id,
        }));
        form.put('/integracoes/shopify', { preserveScroll: true });
    }

    function runAction(type: 'connect' | 'sync') {
        setAction(type);
        setActionError(null);
        router.post(
            type === 'connect'
                ? '/integracoes/shopify/conectar'
                : '/integracoes/shopify/sincronizar',
            {},
            {
                preserveScroll: true,
                onError: (errors) =>
                    setActionError(
                        typeof errors.shopify === 'string'
                            ? errors.shopify
                            : 'Não foi possível concluir a operação.',
                    ),
                onFinish: () => setAction(null),
            },
        );
    }

    return (
        <>
            <Head title="Integração Shopify" />
            <div className="flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4 md:p-6">
                <PageHeader
                    title="Shopify"
                    description="Pedidos pagos entram automaticamente usando somente o nome e a quantidade dos produtos. Todos os valores continuam sendo calculados pelo Hiratafy."
                    actions={
                        <Button
                            variant="outline"
                            onClick={() => router.reload()}
                        >
                            <RefreshCw /> Atualizar status
                        </Button>
                    }
                />

                <div className="grid gap-3 sm:grid-cols-3">
                    <MetricCard
                        label="Pedidos importados"
                        value={formatNumber(stats.processed)}
                        hint="Sem duplicar pedidos da Shopify"
                        icon={ShoppingBag}
                        tone="positive"
                    />
                    <MetricCard
                        label="Requerem atenção"
                        value={formatNumber(stats.needs_attention)}
                        hint="Produtos ainda não vinculados ou falhas"
                        icon={AlertTriangle}
                        tone={
                            stats.needs_attention > 0 ? 'negative' : 'default'
                        }
                    />
                    <MetricCard
                        label="Produtos vinculados"
                        value={formatNumber(stats.mappings)}
                        hint="Vínculos reaproveitados nos próximos pedidos"
                        icon={PackageCheck}
                    />
                </div>

                <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                    <Card className="shadow-xs">
                        <CardHeader className="flex-row items-start justify-between gap-4">
                            <div className="space-y-1.5">
                                <CardTitle>Conexão da loja</CardTitle>
                                <CardDescription>
                                    Configure a loja e a campanha que receberá
                                    todas as vendas automáticas.
                                </CardDescription>
                            </div>
                            <Badge
                                variant="outline"
                                className={cn(
                                    connected
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
                                )}
                            >
                                {connected ? <CheckCircle2 /> : <Clock3 />}
                                {connected
                                    ? 'Conectada'
                                    : 'Configuração pendente'}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={save} className="grid gap-5">
                                <div className="grid gap-2">
                                    <Label htmlFor="shop_domain">
                                        Domínio permanente da Shopify
                                    </Label>
                                    <Input
                                        id="shop_domain"
                                        value={form.data.shop_domain}
                                        onChange={(event) =>
                                            form.setData(
                                                'shop_domain',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="sua-loja.myshopify.com"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Use o endereço myshopify.com, mesmo que
                                        sua loja tenha domínio próprio.
                                    </p>
                                    <InputError
                                        message={form.errors.shop_domain}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Campanha padrão</Label>
                                    <Select
                                        value={form.data.default_campaign_id}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'default_campaign_id',
                                                value,
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecione uma campanha" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                Selecione uma campanha
                                            </SelectItem>
                                            {campaigns.map((campaign) => (
                                                <SelectItem
                                                    key={campaign.id}
                                                    value={String(campaign.id)}
                                                >
                                                    {campaign.name}
                                                    {!campaign.is_active &&
                                                        ' · Inativa'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        A venda será vinculada mesmo que o
                                        investimento do dia ainda não tenha sido
                                        preenchido.
                                    </p>
                                    <InputError
                                        message={
                                            form.errors.default_campaign_id
                                        }
                                    />
                                </div>

                                <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
                                    <Checkbox
                                        checked={form.data.is_active}
                                        onCheckedChange={(checked) =>
                                            form.setData(
                                                'is_active',
                                                checked === true,
                                            )
                                        }
                                    />
                                    <span className="grid gap-1">
                                        <span className="text-sm font-medium">
                                            Importação automática ativa
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Aceita pedidos pagos desta loja e os
                                            envia para a fila local.
                                        </span>
                                    </span>
                                </label>
                                <InputError message={form.errors.is_active} />

                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                    className="sm:w-fit"
                                >
                                    {form.processing ? <Spinner /> : <Save />}
                                    Salvar configuração
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4">
                        <Card className="shadow-xs">
                            <CardHeader>
                                <CardTitle>Ativação</CardTitle>
                                <CardDescription>
                                    O túnel atual registra automaticamente sua
                                    URL na Shopify sempre que for iniciado.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                {!integration.credentials_configured && (
                                    <Alert>
                                        <AlertTriangle />
                                        <AlertTitle>
                                            Credenciais ainda ausentes
                                        </AlertTitle>
                                        <AlertDescription>
                                            Preencha SHOPIFY_CLIENT_ID e
                                            SHOPIFY_CLIENT_SECRET no arquivo
                                            .env. Esses valores nunca aparecem
                                            nesta tela.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="grid gap-3 text-sm">
                                    <StatusRow
                                        done={
                                            integration.credentials_configured
                                        }
                                        label="Credenciais locais"
                                    />
                                    <StatusRow
                                        done={integration.is_active}
                                        label="Integração ativada"
                                    />
                                    <StatusRow
                                        done={integration.webhook_configured}
                                        label="Webhook orders/paid"
                                    />
                                    <StatusRow
                                        done={integration.public_url !== null}
                                        label="Túnel HTTPS em execução"
                                    />
                                </div>

                                {integration.shop_name && (
                                    <div className="rounded-xl bg-muted/60 p-3 text-sm">
                                        <p className="font-medium">
                                            {integration.shop_name}
                                        </p>
                                        <p className="text-xs break-all text-muted-foreground">
                                            {integration.shop_domain}
                                        </p>
                                    </div>
                                )}

                                {actionError && (
                                    <InputError message={actionError} />
                                )}

                                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                    <Button
                                        variant="outline"
                                        disabled={
                                            action !== null ||
                                            !integration.credentials_configured ||
                                            integration.public_url === null
                                        }
                                        onClick={() => runAction('connect')}
                                    >
                                        {action === 'connect' ? (
                                            <Spinner />
                                        ) : (
                                            <PlugZap />
                                        )}
                                        Testar e conectar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={action !== null || !connected}
                                        onClick={() => runAction('sync')}
                                    >
                                        {action === 'sync' ? (
                                            <Spinner />
                                        ) : (
                                            <RefreshCw />
                                        )}
                                        Buscar pendentes
                                    </Button>
                                </div>

                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Ao ligar o computador novamente, o comando
                                    busca pedidos pagos dos últimos dias para
                                    recuperar vendas ocorridas durante uma
                                    queda.
                                </p>
                            </CardContent>
                        </Card>

                        {(integration.last_webhook_at ||
                            integration.last_sync_at) && (
                            <Card className="shadow-xs">
                                <CardContent className="grid gap-3 text-sm">
                                    {integration.last_webhook_at && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Último webhook recebido
                                            </p>
                                            <p className="font-medium">
                                                {formatDateTime(
                                                    integration.last_webhook_at,
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    {integration.last_sync_at && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Última busca de pendentes
                                            </p>
                                            <p className="font-medium">
                                                {formatDateTime(
                                                    integration.last_sync_at,
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                <Card className="gap-0 overflow-hidden py-0 shadow-xs">
                    <CardHeader className="border-b py-5 sm:py-6">
                        <CardTitle>Importações recentes</CardTitle>
                        <CardDescription>
                            O vínculo por nome é automático. Se um nome não
                            coincidir, escolha o produto correto uma única vez.
                        </CardDescription>
                    </CardHeader>
                    {events.length === 0 ? (
                        <EmptyState
                            icon={Webhook}
                            title="Nenhum pedido recebido"
                            description="Depois que a conexão estiver ativa, os pedidos pagos aparecerão aqui."
                        />
                    ) : (
                        <div className="divide-y">
                            {events.map((event) => (
                                <ShopifyEventCard
                                    key={event.id}
                                    event={event}
                                    products={products}
                                />
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </>
    );
}

function StatusRow({ done, label }: { done: boolean; label: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span
                className={cn(
                    'inline-flex items-center gap-1.5 font-medium',
                    done
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400',
                )}
            >
                {done ? (
                    <CheckCircle2 className="size-4" />
                ) : (
                    <Clock3 className="size-4" />
                )}
                {done ? 'Pronto' : 'Pendente'}
            </span>
        </div>
    );
}

function ShopifyEventCard({
    event,
    products,
}: {
    event: ShopifyEvent;
    products: Option[];
}) {
    const status = eventStatus[event.status];
    const [retrying, setRetrying] = useState(false);

    function retry() {
        setRetrying(true);
        router.post(
            `/integracoes/shopify/eventos/${event.id}/tentar-novamente`,
            {},
            { preserveScroll: true, onFinish: () => setRetrying(false) },
        );
    }

    return (
        <div className="grid gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                            Pedido {event.order_number ?? 'sem número'}
                        </p>
                        <Badge variant="outline" className={status.className}>
                            {status.label}
                        </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(event.occurred_at)}
                    </p>
                </div>
                <div className="flex gap-2">
                    {event.sale_id && (
                        <Button asChild size="sm" variant="outline">
                            <Link href={`/vendas/${event.sale_id}/editar`}>
                                <Link2 /> Ver venda
                            </Link>
                        </Button>
                    )}
                    {(event.status === 'needs_attention' ||
                        event.status === 'failed') && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={retry}
                            disabled={retrying}
                        >
                            {retrying ? <Spinner /> : <RefreshCw />}
                            Tentar novamente
                        </Button>
                    )}
                </div>
            </div>

            {event.error_message && (
                <Alert>
                    <AlertTriangle />
                    <AlertTitle>Importação pausada</AlertTitle>
                    <AlertDescription>{event.error_message}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-2">
                {event.items.map((item) => (
                    <div
                        key={item.external_key}
                        className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)] sm:items-center"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                                {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Quantidade: {formatNumber(item.quantity)}
                            </p>
                        </div>
                        {item.mapped_product_name ? (
                            <div className="flex items-center gap-2 text-sm text-emerald-600 sm:justify-end dark:text-emerald-400">
                                <CheckCircle2 className="size-4 shrink-0" />
                                <span className="truncate">
                                    {item.mapped_product_name}
                                </span>
                            </div>
                        ) : (
                            <ProductMappingForm
                                eventId={event.id}
                                item={item}
                                products={products}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProductMappingForm({
    eventId,
    item,
    products,
}: {
    eventId: number;
    item: EventItem;
    products: Option[];
}) {
    const form = useForm({
        external_key: item.external_key,
        product_id: 'none',
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.post(`/integracoes/shopify/eventos/${eventId}/vincular-produto`, {
            preserveScroll: true,
        });
    }

    return (
        <form
            onSubmit={submit}
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
            <Select
                value={form.data.product_id}
                onValueChange={(value) => form.setData('product_id', value)}
            >
                <SelectTrigger
                    className="w-full"
                    aria-label={`Vincular ${item.name}`}
                >
                    <SelectValue placeholder="Escolha o produto" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none" disabled>
                        Escolha o produto
                    </SelectItem>
                    {products.map((product) => (
                        <SelectItem key={product.id} value={String(product.id)}>
                            {product.name}
                            {!product.is_active && ' · Inativo'}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button
                type="submit"
                variant="outline"
                disabled={form.processing || form.data.product_id === 'none'}
            >
                {form.processing ? <Spinner /> : <Link2 />}
                Vincular
            </Button>
            <InputError
                message={form.errors.product_id || form.errors.external_key}
                className="sm:col-span-2"
            />
        </form>
    );
}

ShopifyIntegration.layout = {
    breadcrumbs: [
        { title: 'Integrações', href: '/integracoes/shopify' },
        { title: 'Shopify', href: '/integracoes/shopify' },
    ],
};

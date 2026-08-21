import { Head, Link } from '@inertiajs/react';
import {
    CalendarClock,
    Megaphone,
    Pencil,
    Plus,
    WalletCards,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDate, formatNumber } from '@/lib/formatters';
import type { CampaignRecord } from '@/types';

export default function CampaignsIndex({
    campaigns,
}: {
    campaigns: CampaignRecord[];
}) {
    return (
        <>
            <Head title="Campanhas" />
            <div className="flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4 md:p-6">
                <PageHeader
                    title="Campanhas"
                    description="Organize as campanhas usadas para atribuir investimento e faturamento."
                    actions={
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                            <Button asChild variant="outline">
                                <Link href="/investimentos">
                                    <WalletCards /> Investimentos
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href="/campanhas/nova">
                                    <Plus /> Nova campanha
                                </Link>
                            </Button>
                        </div>
                    }
                />

                <Card className="gap-0 overflow-hidden py-0 shadow-xs">
                    {campaigns.length === 0 ? (
                        <EmptyState
                            icon={Megaphone}
                            title="Nenhuma campanha"
                            description="Crie sua primeira campanha do Facebook para começar a medir retorno."
                            action={
                                <Button asChild>
                                    <Link href="/campanhas/nova">
                                        Criar campanha
                                    </Link>
                                </Button>
                            }
                        />
                    ) : (
                        <Table className="responsive-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Campanha</TableHead>
                                    <TableHead>Plataforma</TableHead>
                                    <TableHead>Período</TableHead>
                                    <TableHead className="text-right">
                                        Dias registrados
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Vendas
                                    </TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-16" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {campaigns.map((campaign) => (
                                    <TableRow key={campaign.id}>
                                        <TableCell
                                            data-primary
                                            className="font-medium"
                                        >
                                            {campaign.name}
                                        </TableCell>
                                        <TableCell data-label="Plataforma">
                                            {campaign.platform}
                                        </TableCell>
                                        <TableCell data-label="Período">
                                            {campaign.starts_on ||
                                            campaign.ends_on ? (
                                                <span className="flex items-center gap-2">
                                                    <CalendarClock className="size-4 text-muted-foreground" />
                                                    {campaign.starts_on
                                                        ? formatDate(
                                                              campaign.starts_on,
                                                          )
                                                        : '—'}{' '}
                                                    –{' '}
                                                    {campaign.ends_on
                                                        ? formatDate(
                                                              campaign.ends_on,
                                                          )
                                                        : 'atual'}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    Não definido
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell
                                            data-label="Dias registrados"
                                            className="text-right"
                                        >
                                            {formatNumber(
                                                campaign.daily_spends_count,
                                            )}
                                        </TableCell>
                                        <TableCell
                                            data-label="Vendas"
                                            className="text-right"
                                        >
                                            {formatNumber(campaign.sales_count)}
                                        </TableCell>
                                        <TableCell data-label="Status">
                                            <Badge
                                                variant={
                                                    campaign.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {campaign.is_active
                                                    ? 'Ativa'
                                                    : 'Pausada'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell data-actions>
                                            <Button
                                                asChild
                                                variant="ghost"
                                                size="icon"
                                            >
                                                <Link
                                                    href={`/campanhas/${campaign.id}/editar`}
                                                    aria-label={`Editar ${campaign.name}`}
                                                >
                                                    <Pencil />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            </div>
        </>
    );
}

CampaignsIndex.layout = {
    breadcrumbs: [{ title: 'Campanhas', href: '/campanhas' }],
};

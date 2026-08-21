import { Head, useForm } from '@inertiajs/react';
import { Pencil, Plus, Tags } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { CategoryRecord } from '@/types';

type FormData = {
    name: string;
    is_active: boolean;
};

export default function CategoriesIndex({
    categories,
}: {
    categories: CategoryRecord[];
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<CategoryRecord | null>(null);
    const form = useForm<FormData>({ name: '', is_active: true });

    function createCategory() {
        setEditing(null);
        form.setData({ name: '', is_active: true });
        form.clearErrors();
        setOpen(true);
    }

    function editCategory(category: CategoryRecord) {
        setEditing(category);
        form.setData({ name: category.name, is_active: category.is_active });
        form.clearErrors();
        setOpen(true);
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        };

        if (editing) {
            form.put(`/categorias/${editing.id}`, options);
        } else {
            form.post('/categorias', options);
        }
    }

    return (
        <>
            <Head title="Categorias" />
            <div className="flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4 md:p-6">
                <PageHeader
                    title="Categorias"
                    description="Agrupe produtos para aplicar descontos por quantidade em todo o carrinho."
                    actions={
                        <Button onClick={createCategory}>
                            <Plus /> Nova categoria
                        </Button>
                    }
                />

                <Card className="gap-0 overflow-hidden py-0 shadow-xs">
                    {categories.length === 0 ? (
                        <EmptyState
                            icon={Tags}
                            title="Nenhuma categoria"
                            description="Crie a primeira categoria antes de cadastrar seus produtos."
                            action={
                                <Button onClick={createCategory}>
                                    Criar categoria
                                </Button>
                            }
                        />
                    ) : (
                        <Table className="responsive-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Produtos
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Descontos
                                    </TableHead>
                                    <TableHead className="w-16" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell
                                            data-primary
                                            className="font-medium"
                                        >
                                            {category.name}
                                        </TableCell>
                                        <TableCell data-label="Status">
                                            <Badge
                                                variant={
                                                    category.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {category.is_active
                                                    ? 'Ativa'
                                                    : 'Inativa'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell
                                            data-label="Produtos"
                                            className="text-right"
                                        >
                                            {category.products_count}
                                        </TableCell>
                                        <TableCell
                                            data-label="Descontos"
                                            className="text-right"
                                        >
                                            {category.discounts_count}
                                        </TableCell>
                                        <TableCell data-actions>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    editCategory(category)
                                                }
                                                aria-label={`Editar ${category.name}`}
                                            >
                                                <Pencil />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <form onSubmit={submit} className="space-y-5">
                        <DialogHeader>
                            <DialogTitle>
                                {editing
                                    ? 'Editar categoria'
                                    : 'Nova categoria'}
                            </DialogTitle>
                            <DialogDescription>
                                Produtos da mesma categoria somam quantidade
                                para alcançar uma faixa de desconto.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome</Label>
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                placeholder="Ex.: DUMP"
                                autoFocus
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="flex items-start gap-3 rounded-lg border p-3">
                            <Checkbox
                                id="is_active"
                                checked={form.data.is_active}
                                onCheckedChange={(checked) =>
                                    form.setData('is_active', checked === true)
                                }
                            />
                            <div className="grid gap-1">
                                <Label htmlFor="is_active">
                                    Categoria ativa
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Categorias inativas continuam preservadas no
                                    histórico.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing && <Spinner />}
                                {editing
                                    ? 'Salvar alterações'
                                    : 'Criar categoria'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

CategoriesIndex.layout = {
    breadcrumbs: [{ title: 'Categorias', href: '/categorias' }],
};

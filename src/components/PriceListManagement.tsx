import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, DollarSign, Percent, TrendingUp, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner@2.0.3';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ListaPreco } from '../types/listaPreco';
import { api } from '../services/api';

interface PriceListManagementProps {
  onNovaListaPreco?: () => void;
  onEditarListaPreco?: (listaId: string) => void;
  onVisualizarListaPreco?: (listaId: string) => void;
  listas?: ListaPreco[];
  onListasChange?: (listas: ListaPreco[]) => void;
}

export function PriceListManagement({
  onNovaListaPreco,
  onEditarListaPreco,
  onVisualizarListaPreco,
  listas: listasExternas,
  onListasChange,
}: PriceListManagementProps) {
  const listas = listasExternas || [];
  const setListas = onListasChange || (() => {});

  // Chamar a edge function ao abrir a página (Listas de Preço) para ter dados atualizados
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get('listas-preco');
        if (!cancelled && onListasChange) {
          onListasChange(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[PRICE-LIST] Erro ao carregar listas:', e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onListasChange]);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
    name: string | null;
  }>({
    open: false,
    id: null,
    name: null,
  });

  const handleDelete = (id: string) => {
    const lista = listas.find((l) => l.id === id);
    if (lista) {
      setDeleteConfirm({
        open: true,
        id,
        name: lista.nome,
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      await api.delete('listas-preco', deleteConfirm.id);
      setListas(listas.filter((l) => l.id !== deleteConfirm.id));
      toast.success(`Lista de preço "${deleteConfirm.name}" excluída com sucesso!`);
    } catch (error) {
      console.error('[PRICE-LIST] Erro ao excluir lista:', error);
      toast.error('Erro ao excluir lista de preço');
    } finally {
      setDeleteConfirm({ open: false, id: null, name: null });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Listas de Preço
              </CardTitle>
              <CardDescription className="mt-2">
                Gerencie as tabelas de preço e regras de comissionamento
              </CardDescription>
            </div>
            <Button onClick={onNovaListaPreco}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Lista de Preço
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Tipo de Comissão</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma lista de preço cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  listas.map((lista) => (
                    <TableRow key={lista.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {lista.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {lista.totalProdutos ?? (lista.produtos ?? []).length} produto(s)
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {lista.tipoComissao === 'fixa' ? 'Alíquota Fixa' : 'Conforme Desconto'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lista.tipoComissao === 'fixa' && (
                          <div className="flex items-center gap-2 text-sm">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            <span>{lista.percentualFixo}%</span>
                          </div>
                        )}
                        {lista.tipoComissao === 'conforme_desconto' && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>{lista.totalFaixas ?? (lista.faixasDesconto ?? []).length} faixa(s)</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onVisualizarListaPreco?.(lista.id)}
                            title="Visualizar lista de preço"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditarListaPreco?.(lista.id)}
                            title="Editar lista de preço"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(lista.id)}
                            title="Excluir lista de preço"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Total: {listas.length} lista(s) cadastrada(s)
          </p>
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <DeleteConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm({ open, id: null, name: null })
        }
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        itemName={deleteConfirm.name || ''}
      />
    </div>
  );
}

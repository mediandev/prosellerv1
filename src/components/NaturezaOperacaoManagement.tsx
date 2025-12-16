import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Tag, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';

import { NaturezaOperacao } from '../types/naturezaOperacao';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { api } from '../services/api';
import { useEffect } from 'react';

export function NaturezaOperacaoManagement() {
  const [naturezas, setNaturezas] = useState<NaturezaOperacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNatureza, setSelectedNatureza] = useState<NaturezaOperacao | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    descricao: '',
    geraComissao: true,
    geraReceita: true,
  });

  // Carregar naturezas
  useEffect(() => {
    carregarNaturezas();
  }, []);

  const carregarNaturezas = async () => {
    try {
      console.log('[NATUREZAS] Carregando naturezas da API...');
      const naturezasAPI = await api.naturezasOperacao.list();
      setNaturezas(Array.isArray(naturezasAPI) ? naturezasAPI : []);
      console.log('[NATUREZAS] Naturezas carregadas:', naturezasAPI?.length || 0);
    } catch (error) {
      console.error('[NATUREZAS] Erro ao carregar naturezas:', error);
      setNaturezas([]);
      toast.error('Erro ao carregar naturezas da API.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      codigo: '',
      descricao: '',
      geraComissao: true,
      geraReceita: true,
    });
  };

  const handleAdd = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome da natureza é obrigatório');
      return;
    }

    try {
      const newNatureza: NaturezaOperacao = {
        id: crypto.randomUUID(),
        nome: formData.nome,
        codigo: formData.codigo,
        descricao: formData.descricao,
        geraComissao: formData.geraComissao,
        geraReceita: formData.geraReceita,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await api.naturezasOperacao.create(newNatureza);
      setNaturezas([...naturezas, newNatureza]);
      toast.success('Natureza de operação cadastrada com sucesso');
      setAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('[NATUREZAS] Erro ao criar natureza:', error);
      toast.error(`Erro ao criar natureza: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleEdit = (natureza: NaturezaOperacao) => {
    setSelectedNatureza(natureza);
    setFormData({
      nome: natureza.nome,
      codigo: natureza.codigo || '',
      descricao: natureza.descricao || '',
      geraComissao: natureza.geraComissao,
      geraReceita: natureza.geraReceita,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!formData.nome.trim() || !selectedNatureza) {
      toast.error('Nome da natureza é obrigatório');
      return;
    }

    try {
      const naturezaAtualizada = {
        ...selectedNatureza,
        nome: formData.nome,
        codigo: formData.codigo,
        descricao: formData.descricao,
        geraComissao: formData.geraComissao,
        geraReceita: formData.geraReceita,
        updatedAt: new Date(),
      };

      await api.naturezasOperacao.update(selectedNatureza.id, naturezaAtualizada);
      setNaturezas(
        naturezas.map((nat) =>
          nat.id === selectedNatureza.id ? naturezaAtualizada : nat
        )
      );
      toast.success('Natureza de operação atualizada com sucesso');
      setEditDialogOpen(false);
      setSelectedNatureza(null);
      resetForm();
    } catch (error: any) {
      console.error('[NATUREZAS] Erro ao atualizar natureza:', error);
      toast.error(`Erro ao atualizar natureza: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedNatureza) return;

    try {
      await api.naturezasOperacao.delete(selectedNatureza.id);
      setNaturezas(naturezas.filter((nat) => nat.id !== selectedNatureza.id));
      toast.success('Natureza de operação excluída com sucesso');
      setDeleteDialogOpen(false);
      setSelectedNatureza(null);
    } catch (error: any) {
      console.error('[NATUREZAS] Erro ao excluir natureza:', error);
      toast.error(`Erro ao excluir natureza: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const openDeleteDialog = (natureza: NaturezaOperacao) => {
    setSelectedNatureza(natureza);
    setDeleteDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Naturezas de Operação
            </CardTitle>
            <CardDescription className="mt-2">
              Configure as naturezas de operação disponíveis para as vendas
            </CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Natureza
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Adicionar Natureza de Operação</DialogTitle>
                <DialogDescription>
                  Cadastre uma nova natureza de operação para ser usada nas vendas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Natureza *</Label>
                    <Input
                      placeholder="Ex: Venda"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Código (CFOP)</Label>
                    <Input
                      placeholder="Ex: 5102"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descrição da natureza de operação..."
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Gera Comissão</Label>
                      <p className="text-sm text-muted-foreground">
                        Vendas com esta natureza geram comissão para o vendedor
                      </p>
                    </div>
                    <Switch
                      checked={formData.geraComissao}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, geraComissao: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Gera Receita</Label>
                      <p className="text-sm text-muted-foreground">
                        Vendas com esta natureza são contabilizadas como receita
                      </p>
                    </div>
                    <Switch
                      checked={formData.geraReceita}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, geraReceita: checked })
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Gera Comissão</TableHead>
              <TableHead className="text-center">Gera Receita</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {naturezas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma natureza de operação cadastrada
                </TableCell>
              </TableRow>
            ) : (
              naturezas.map((natureza) => (
                <TableRow key={natureza.id}>
                  <TableCell>{natureza.nome}</TableCell>
                  <TableCell>{natureza.codigo || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {natureza.descricao || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {natureza.geraComissao ? (
                      <CheckCircle className="h-4 w-4 text-green-600 inline" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400 inline" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {natureza.geraReceita ? (
                      <CheckCircle className="h-4 w-4 text-green-600 inline" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400 inline" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={natureza.ativo ? 'default' : 'secondary'}>
                      {natureza.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(natureza)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(natureza)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Editar Natureza de Operação</DialogTitle>
            <DialogDescription>
              Atualize as informações da natureza de operação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Natureza *</Label>
                <Input
                  placeholder="Ex: Venda"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Código (CFOP)</Label>
                <Input
                  placeholder="Ex: 5102"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição da natureza de operação..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Gera Comissão</Label>
                  <p className="text-sm text-muted-foreground">
                    Vendas com esta natureza geram comissão para o vendedor
                  </p>
                </div>
                <Switch
                  checked={formData.geraComissao}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, geraComissao: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Gera Receita</Label>
                  <p className="text-sm text-muted-foreground">
                    Vendas com esta natureza são contabilizadas como receita
                  </p>
                </div>
                <Switch
                  checked={formData.geraReceita}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, geraReceita: checked })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Excluir Natureza de Operação"
        description={`Tem certeza que deseja excluir a natureza "${selectedNatureza?.nome}"? Esta ação não pode ser desfeita.`}
      />
    </Card>
  );
}
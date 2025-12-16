import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Plus, Edit, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { api } from '../services/api';
import { TipoVeiculo } from '../types/tipoVeiculo';
import { tiposVeiculoPadrao } from '../data/tiposVeiculoPadrao';

export function TipoVeiculoManagement() {
  const [tiposVeiculo, setTiposVeiculo] = useState<TipoVeiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoVeiculo | null>(null);
  const [deletingTipo, setDeletingTipo] = useState<TipoVeiculo | null>(null);
  const [initializingDefaults, setInitializingDefaults] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
  });

  // Carregar tipos de veículo
  const loadTiposVeiculo = async () => {
    try {
      setLoading(true);
      const response = await api.get('tipos-veiculo');
      setTiposVeiculo(response || []);
    } catch (error) {
      console.error('[TIPOS VEÍCULO] Erro ao carregar:', error);
      toast.error('Erro ao carregar tipos de veículo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTiposVeiculo();
  }, []);

  // Inicializar tipos padrão
  const handleInicializarPadrao = async () => {
    try {
      setInitializingDefaults(true);
      
      for (const tipo of tiposVeiculoPadrao) {
        try {
          await api.create('tipos-veiculo', tipo);
        } catch (error: any) {
          // Ignorar se já existir
          if (!error.message?.includes('já existe')) {
            throw error;
          }
        }
      }
      
      toast.success('Tipos de veículo padrão adicionados com sucesso');
      loadTiposVeiculo();
    } catch (error: any) {
      console.error('[TIPOS VEÍCULO] Erro ao inicializar padrão:', error);
      toast.error(error.message || 'Erro ao adicionar tipos padrão');
    } finally {
      setInitializingDefaults(false);
    }
  };

  // Abrir dialog para novo tipo
  const handleNovo = () => {
    setEditingTipo(null);
    setFormData({ nome: '', descricao: '' });
    setDialogOpen(true);
  };

  // Abrir dialog para edição
  const handleEditar = (tipo: TipoVeiculo) => {
    setEditingTipo(tipo);
    setFormData({
      nome: tipo.nome,
      descricao: tipo.descricao || '',
    });
    setDialogOpen(true);
  };

  // Abrir dialog de confirmação de exclusão
  const handleDeletar = (tipo: TipoVeiculo) => {
    setDeletingTipo(tipo);
    setDeleteDialogOpen(true);
  };

  // Confirmar exclusão
  const confirmDelete = async () => {
    if (!deletingTipo) return;

    try {
      await api.delete('tipos-veiculo', deletingTipo.id);
      toast.success('Tipo de veículo removido com sucesso');
      setDeleteDialogOpen(false);
      setDeletingTipo(null);
      loadTiposVeiculo();
    } catch (error: any) {
      console.error('[TIPOS VEÍCULO] Erro ao deletar:', error);
      toast.error(error.message || 'Erro ao remover tipo de veículo');
    }
  };

  // Salvar (criar ou editar)
  const handleSalvar = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editingTipo) {
        // Editar
        await api.update('tipos-veiculo', editingTipo.id, formData);
        toast.success('Tipo de veículo atualizado com sucesso');
      } else {
        // Criar
        await api.create('tipos-veiculo', formData);
        toast.success('Tipo de veículo criado com sucesso');
      }

      setDialogOpen(false);
      setFormData({ nome: '', descricao: '' });
      setEditingTipo(null);
      loadTiposVeiculo();
    } catch (error: any) {
      console.error('[TIPOS VEÍCULO] Erro ao salvar:', error);
      toast.error(error.message || 'Erro ao salvar tipo de veículo');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Tipos de Veículo
              </CardTitle>
              <CardDescription className="mt-2">
                Gerencie os tipos de veículo disponíveis para requisitos logísticos
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleNovo}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Tipo
              </Button>
              {tiposVeiculo.length === 0 && (
                <Button
                  variant="outline"
                  onClick={handleInicializarPadrao}
                  disabled={initializingDefaults}
                >
                  {initializingDefaults ? 'Inicializando...' : 'Inicializar Padrão'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tiposVeiculo.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">Nenhum tipo de veículo cadastrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Clique em "Inicializar Padrão" para adicionar os tipos mais comuns,<br />
                ou em "Novo Tipo" para criar tipos personalizados.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposVeiculo.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell className="font-medium">{tipo.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {tipo.descricao || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditar(tipo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletar(tipo)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criação/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTipo ? 'Editar Tipo de Veículo' : 'Novo Tipo de Veículo'}
            </DialogTitle>
            <DialogDescription>
              {editingTipo
                ? 'Altere as informações do tipo de veículo'
                : 'Adicione um novo tipo de veículo ao sistema'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Ex: Caminhão Refrigerado"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Informações adicionais sobre este tipo de veículo"
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar}>
              {editingTipo ? 'Salvar Alterações' : 'Criar Tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o tipo de veículo "
              {deletingTipo?.nome}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
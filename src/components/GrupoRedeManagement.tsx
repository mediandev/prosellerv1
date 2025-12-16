import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Plus, Edit, Trash2, Store } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { api } from '../services/api';

interface GrupoRede {
  id: string;
  nome: string;
  descricao?: string;
  dataCriacao?: string;
  criadoPor?: string;
  dataAtualizacao?: string;
  atualizadoPor?: string;
}

export function GrupoRedeManagement() {
  const { ehBackoffice } = useAuth();
  const [gruposRedes, setGruposRedes] = useState<GrupoRede[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [dialogExcluir, setDialogExcluir] = useState(false);
  const [grupoRedeEditando, setGrupoRedeEditando] = useState<GrupoRede | null>(null);
  const [grupoRedeExcluindo, setGrupoRedeExcluindo] = useState<GrupoRede | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
  });

  const podeGerenciar = ehBackoffice();

  useEffect(() => {
    carregarGruposRedes();
  }, []);

  const carregarGruposRedes = async () => {
    try {
      setLoading(true);
      const data = await api.get('grupos-redes');
      setGruposRedes(data);
      console.log('[GRUPOS-REDES] Grupos/Redes carregados:', data.length);
    } catch (error: any) {
      console.error('[GRUPOS-REDES] Erro ao carregar:', error);
      toast.error('Erro ao carregar grupos/redes');
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogNovo = () => {
    setGrupoRedeEditando(null);
    setFormData({ nome: '', descricao: '' });
    setDialogAberto(true);
  };

  const abrirDialogEditar = (grupoRede: GrupoRede) => {
    setGrupoRedeEditando(grupoRede);
    setFormData({
      nome: grupoRede.nome,
      descricao: grupoRede.descricao || '',
    });
    setDialogAberto(true);
  };

  const abrirDialogExcluir = (grupoRede: GrupoRede) => {
    setGrupoRedeExcluindo(grupoRede);
    setDialogExcluir(true);
  };

  const handleSalvar = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (grupoRedeEditando) {
        // Editar
        const atualizado = await api.update('grupos-redes', grupoRedeEditando.id, formData);
        setGruposRedes(prev => prev.map(g => g.id === atualizado.id ? atualizado : g));
        toast.success('Grupo/Rede atualizado com sucesso!');
      } else {
        // Criar novo
        const novo = await api.create('grupos-redes', formData);
        setGruposRedes(prev => [...prev, novo]);
        toast.success('Grupo/Rede criado com sucesso!');
      }
      
      setDialogAberto(false);
      setFormData({ nome: '', descricao: '' });
      setGrupoRedeEditando(null);
    } catch (error: any) {
      console.error('[GRUPOS-REDES] Erro ao salvar:', error);
      if (error.message.includes('already exists')) {
        toast.error('Já existe um Grupo/Rede com este nome');
      } else {
        toast.error('Erro ao salvar Grupo/Rede: ' + error.message);
      }
    }
  };

  const handleExcluir = async () => {
    if (!grupoRedeExcluindo) return;

    try {
      await api.delete('grupos-redes', grupoRedeExcluindo.id);
      setGruposRedes(prev => prev.filter(g => g.id !== grupoRedeExcluindo.id));
      toast.success('Grupo/Rede excluído com sucesso!');
      setDialogExcluir(false);
      setGrupoRedeExcluindo(null);
    } catch (error: any) {
      console.error('[GRUPOS-REDES] Erro ao excluir:', error);
      if (error.message.includes('being used by clients')) {
        toast.error('Não é possível excluir - este Grupo/Rede está sendo usado por clientes');
      } else {
        toast.error('Erro ao excluir Grupo/Rede: ' + error.message);
      }
    }
  };

  if (!podeGerenciar) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso Negado</CardTitle>
          <CardDescription>
            Você não tem permissão para gerenciar Grupos/Redes
          </CardDescription>
        </CardHeader>
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
                <Store className="h-5 w-5" />
                Grupos / Redes
              </CardTitle>
              <CardDescription>
                Gerencie os grupos e redes de clientes do sistema
              </CardDescription>
            </div>
            <Button onClick={abrirDialogNovo}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo/Rede
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : gruposRedes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum Grupo/Rede cadastrado.
              <br />
              <Button onClick={abrirDialogNovo} variant="link" className="mt-2">
                Clique aqui para criar o primeiro
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gruposRedes.map((grupoRede) => (
                  <TableRow key={grupoRede.id}>
                    <TableCell>{grupoRede.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {grupoRede.descricao || '-'}
                    </TableCell>
                    <TableCell>
                      {grupoRede.dataCriacao
                        ? new Date(grupoRede.dataCriacao).toLocaleDateString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell>{grupoRede.criadoPor || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirDialogEditar(grupoRede)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirDialogExcluir(grupoRede)}
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

      {/* Dialog para criar/editar */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {grupoRedeEditando ? 'Editar Grupo/Rede' : 'Novo Grupo/Rede'}
            </DialogTitle>
            <DialogDescription>
              {grupoRedeEditando
                ? 'Edite as informações do grupo/rede'
                : 'Preencha os dados do novo grupo/rede'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Grupo Pão de Açúcar"
              />
            </div>
            
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional do grupo/rede"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar}>
              {grupoRedeEditando ? 'Salvar Alterações' : 'Criar Grupo/Rede'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar exclusão */}
      <Dialog open={dialogExcluir} onOpenChange={setDialogExcluir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o grupo/rede "{grupoRedeExcluindo?.nome}"?
              <br />
              <br />
              <span className="text-destructive">
                Esta ação não pode ser desfeita. O grupo/rede não pode ser excluído se estiver sendo usado por algum cliente.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogExcluir(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluir}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

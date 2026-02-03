import { useState, useEffect } from 'react';
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from './ui/pagination';
import { Plus, Edit, Trash2, Store, Search } from 'lucide-react';
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
  
  // Estados de busca e paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [totalRegistros, setTotalRegistros] = useState(0);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
  });

  const podeGerenciar = ehBackoffice();

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm);
      setPaginaAtual(1); // Reset para primeira página ao buscar
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    carregarGruposRedes();
  }, [paginaAtual, itensPorPagina, searchDebounced]);

  const carregarGruposRedes = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: paginaAtual,
        limit: itensPorPagina,
      };
      
      if (searchDebounced.trim()) {
        params.search = searchDebounced.trim();
      }
      
      const data = await api.get('grupos-redes', { params });
      
      // A API pode retornar um array direto ou um objeto com paginação
      if (Array.isArray(data)) {
        // Se retornar array, fazer paginação no frontend (fallback)
        setGruposRedes(data);
        setTotalRegistros(data.length);
      } else if (data && typeof data === 'object' && 'grupos' in data) {
        // Resposta com paginação do backend
        setGruposRedes(data.grupos || []);
        setTotalRegistros(data.total || 0);
      } else {
        setGruposRedes([]);
        setTotalRegistros(0);
      }
      
      const gruposCarregados = Array.isArray(data) ? data.length : (data?.grupos?.length || 0);
      console.log('[GRUPOS-REDES] Grupos/Redes carregados:', gruposCarregados, 'Total:', totalRegistros);
    } catch (error: any) {
      console.error('[GRUPOS-REDES] Erro ao carregar:', error);
      toast.error('Erro ao carregar grupos/redes');
      setGruposRedes([]);
      setTotalRegistros(0);
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
      const msg = error?.message || '';
      if (msg.includes('already exists') || msg.includes('já existe')) {
        toast.error('Já existe um Grupo/Rede com este nome');
      } else {
        toast.error(msg || 'Erro ao salvar Grupo/Rede');
      }
    }
  };

  const handleExcluir = async () => {
    if (!grupoRedeExcluindo) return;

    try {
      await api.delete('grupos-redes', grupoRedeExcluindo.id);
      // Recarregar dados após exclusão
      await carregarGruposRedes();
      toast.success('Grupo/Rede excluído com sucesso!');
      setDialogExcluir(false);
      setGrupoRedeExcluindo(null);
    } catch (error: any) {
      console.error('[GRUPOS-REDES] Erro ao excluir:', error);
      const msg = error?.message || '';
      if (msg.includes('being used by clients') || msg.includes('em uso') || msg.includes('está em uso')) {
        toast.error('Não é possível excluir - este Grupo/Rede está sendo usado por clientes');
      } else {
        toast.error(msg || 'Erro ao excluir Grupo/Rede');
      }
    }
  };

  // Cálculos de paginação
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina);
  const indiceInicial = totalRegistros > 0 ? (paginaAtual - 1) * itensPorPagina + 1 : 0;
  const indiceFinal = Math.min(paginaAtual * itensPorPagina, totalRegistros);

  const goToPage = (page: number) => {
    setPaginaAtual(Math.max(1, Math.min(page, totalPaginas)));
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
          {/* Campo de busca */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : gruposRedes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchDebounced.trim() 
                ? 'Nenhum Grupo/Rede encontrado com os filtros aplicados.'
                : 'Nenhum Grupo/Rede cadastrado.'}
              <br />
              {!searchDebounced.trim() && (
                <Button onClick={abrirDialogNovo} variant="link" className="mt-2">
                  Clique aqui para criar o primeiro
                </Button>
              )}
            </div>
          ) : (
            <>
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
                        {(grupoRede.dataCriacao || (grupoRede as any).createdAt)
                          ? new Date((grupoRede.dataCriacao || (grupoRede as any).createdAt)).toLocaleDateString('pt-BR')
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

              {/* Controles de paginação */}
              {totalRegistros > 0 && (
                <div className="mt-6 space-y-4">
                  {/* Informação de registros */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      Mostrando {indiceInicial} a {indiceFinal} de {totalRegistros} grupo{totalRegistros !== 1 ? 's' : ''}/rede{totalRegistros !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="itensPorPagina" className="text-sm">Itens por página:</Label>
                      <select
                        id="itensPorPagina"
                        value={itensPorPagina}
                        onChange={(e) => {
                          setItensPorPagina(Number(e.target.value));
                          setPaginaAtual(1);
                        }}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  {/* Paginação */}
                  {totalPaginas > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => goToPage(paginaAtual - 1)}
                            className={paginaAtual === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            aria-disabled={paginaAtual === 1}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                          .filter((page) => page === 1 || page === totalPaginas || Math.abs(page - paginaAtual) <= 1)
                          .map((page, index, array) => {
                            const showEllipsis = index > 0 && page - array[index - 1] > 1;
                            return (
                              <React.Fragment key={page}>
                                {showEllipsis && (
                                  <PaginationItem>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() => goToPage(page)}
                                    isActive={paginaAtual === page}
                                    className="cursor-pointer"
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              </React.Fragment>
                            );
                          })}
                        
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => goToPage(paginaAtual + 1)}
                            className={paginaAtual >= totalPaginas ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            aria-disabled={paginaAtual >= totalPaginas}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              )}
            </>
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

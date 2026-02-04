import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Cliente } from '../types/customer';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Building2,
  User,
  Phone,
  Mail,
  Download,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination';
import { CustomerImportExport } from './CustomerImportExport';
import { toast } from 'sonner@2.0.3';
import { api } from '../services/api';
import { Loader2 } from 'lucide-react';

interface CustomersListPageProps {
  onNovoCliente: () => void;
  onVisualizarCliente: (clienteId: string) => void;
  onEditarCliente: (clienteId: string) => void;
}

export function CustomersListPage({
  onNovoCliente,
  onVisualizarCliente,
  onEditarCliente,
}: CustomersListPageProps) {
  const { usuario, temPermissao, ehBackoffice } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [situacaoFiltro, setSituacaoFiltro] = useState<string>('todos');
  const [segmentoFiltro, setSegmentoFiltro] = useState<string>('todos');
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [totalItens, setTotalItens] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [mostrarImportExport, setMostrarImportExport] = useState(false);
  const [sortField, setSortField] = useState<keyof Cliente | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [segmentos, setSegmentos] = useState<Array<{ id: string | number; nome: string }>>([]);

  // Carregar lista de segmentos para o filtro (nome do segmento vindo da API)
  useEffect(() => {
    api.get<Array<{ id: string | number; nome: string }>>('segmentos-cliente').then((data) => {
      setSegmentos(Array.isArray(data) ? data : []);
    }).catch(() => setSegmentos([]));
  }, []);

  // Busca com debounce (declarado antes de carregarClientes para evitar "before initialization")
  const [searchDebounced, setSearchDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Mapear situação (UI) para status_aprovacao (API)
  const situacaoToStatusAprovacao = useCallback((situacao: string): string | undefined => {
    if (!situacao || situacao === 'todos') return undefined;
    const map: Record<string, string> = {
      Ativo: 'aprovado',
      Análise: 'pendente',
      Reprovado: 'rejeitado',
    };
    return map[situacao];
  }, []);

  // Carregar clientes do Supabase com paginação e filtros no servidor
  const carregarClientes = useCallback(async () => {
    setLoading(true);
    try {
      const statusAprovacao = situacaoToStatusAprovacao(situacaoFiltro);
      const params: Record<string, string | number | undefined> = {
        page: paginaAtual,
        limit: itensPorPagina,
        search: searchDebounced.trim() || undefined,
        status_aprovacao: statusAprovacao,
      };
      const data = await api.get<{ clientes: Cliente[]; pagination?: { page: number; limit: number; total: number; total_pages: number } }>('clientes', { params });
      if (data && typeof data === 'object' && 'clientes' in data && Array.isArray(data.clientes)) {
        setClientes(data.clientes);
        const pag = data.pagination;
        setTotalItens(pag?.total ?? data.clientes.length);
        setTotalPaginas(pag?.total_pages ?? 1);
      } else {
        const arr = Array.isArray(data) ? data : [];
        setClientes(arr);
        setTotalItens(arr.length);
        setTotalPaginas(1);
      }
    } catch (error: any) {
      console.error('[CLIENTES-LIST] Erro ao carregar clientes:', error);
      setClientes([]);
      setTotalItens(0);
      setTotalPaginas(1);
      toast.error('Erro ao carregar clientes da API.');
    } finally {
      setLoading(false);
    }
  }, [paginaAtual, itensPorPagina, searchDebounced, situacaoFiltro, situacaoToStatusAprovacao]);

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  // Reset para página 1 quando filtros mudam
  useEffect(() => {
    setPaginaAtual(1);
  }, [itensPorPagina, situacaoFiltro, searchDebounced]);

  const goToPage = (page: number) => {
    setPaginaAtual(Math.max(1, Math.min(page, totalPaginas)));
  };

  // Função para ordenar
  const handleSort = (field: keyof Cliente) => {
    if (sortField === field) {
      // Se já está ordenando por esse campo
      if (sortDirection === "asc") {
        // Primeiro clique foi crescente, agora muda para decrescente
        setSortDirection("desc");
      } else {
        // Segundo clique foi decrescente, agora desativa a ordenação
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      // Se é um novo campo, ordena crescente
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtro client-side apenas por segmento (busca e situação já vêm do servidor)
  const clientesFiltrados = useMemo(() => {
    let resultado = clientes;

    if (!ehBackoffice() && usuario) {
      resultado = resultado.filter((cliente) => {
        if (cliente.statusAprovacao !== 'aprovado') return false;
        if (cliente.vendedorAtribuido) return cliente.vendedorAtribuido.id === usuario.id;
        if (cliente.vendedoresAtribuidos && Array.isArray(cliente.vendedoresAtribuidos)) {
          return cliente.vendedoresAtribuidos.some((v) => v.id === usuario.id);
        }
        return false;
      });
    }

    if (segmentoFiltro && segmentoFiltro !== 'todos') {
      resultado = resultado.filter((cliente) => cliente.segmentoMercado === segmentoFiltro);
    }

    if (sortField) {
      resultado = [...resultado].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue, 'pt-BR');
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return resultado;
  }, [clientes, segmentoFiltro, ehBackoffice, usuario, sortField, sortDirection]);

  const indiceInicial = totalItens === 0 ? 0 : (paginaAtual - 1) * itensPorPagina + 1;
  const indiceFinal = Math.min(paginaAtual * itensPorPagina, totalItens);

  const handleExcluirCliente = async () => {
    if (clienteParaExcluir) {
      try {
        console.log('[CLIENTES-LIST] Excluindo cliente:', clienteParaExcluir.id);
        await api.delete('clientes', clienteParaExcluir.id);
        
        // Atualizar lista local
        setClientes(prev => prev.filter(c => c.id !== clienteParaExcluir.id));
        
        toast.success(`Cliente "${clienteParaExcluir.razaoSocial}" excluído com sucesso!`);
        console.log('[CLIENTES-LIST] Cliente excluído com sucesso');
      } catch (error: any) {
        console.error('[CLIENTES-LIST] Erro ao excluir cliente:', error);
        toast.error(`Erro ao excluir cliente: ${error.message}`);
      } finally {
        setClienteParaExcluir(null);
      }
    }
  };

  const getSituacaoBadge = (situacao: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      Ativo: 'default',
      Inativo: 'secondary',
      Excluído: 'destructive',
      Análise: 'outline',
      Reprovado: 'destructive',
    };
    
    const colors: Record<string, string> = {
      Análise: 'border-orange-500 text-orange-700 bg-orange-50',
      Reprovado: 'border-red-500 text-red-700 bg-red-50',
    };
    
    return (
      <Badge 
        variant={variants[situacao] || 'default'}
        className={colors[situacao] || ''}
      >
        {situacao}
      </Badge>
    );
  };

  // Opções do filtro de segmento: da API (segmentos-cliente) + nomes presentes na página atual
  const segmentosDaApi = segmentos.map((s) => s.nome).filter((n) => n != null && String(n).trim() !== '');
  const segmentosNaLista = Array.from(
    new Set(clientes.map((c) => c.segmentoMercado).filter((s): s is string => s != null && String(s).trim() !== ''))
  );
  const segmentosUnicos = Array.from(new Set([...segmentosDaApi, ...segmentosNaLista])).sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex gap-2">
          <Button 
            onClick={carregarClientes} 
            variant="outline" 
            size="icon"
            title="Atualizar lista"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setMostrarImportExport(!mostrarImportExport)} variant="outline">
            {mostrarImportExport ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Ver Lista
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar/Exportar
              </>
            )}
          </Button>
          {temPermissao('clientes.criar') && (
            <Button onClick={onNovoCliente}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          )}
        </div>
      </div>

      {/* Importação/Exportação */}
      {mostrarImportExport && (
        <CustomerImportExport
          clientes={clientesFiltrados}
          onImportComplete={async (clientesImportados) => {
            try {
              await carregarClientes();
              toast.success(`${clientesImportados.length} cliente(s) importado(s) com sucesso!`);
            } catch (error) {
              console.error('[CLIENTES-LIST] Erro ao recarregar clientes:', error);
            }
            setMostrarImportExport(false);
          }}
        />
      )}

      {!mostrarImportExport && (
        <Card>
          {loading ? (
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Carregando clientes...</span>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px] space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Buscar</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Nome, CNPJ/CPF, e-mail..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Situação</label>
                      <Select value={situacaoFiltro} onValueChange={setSituacaoFiltro}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Situação" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="sit-todos" value="todos">Todas</SelectItem>
                          <SelectItem key="sit-ativo" value="Ativo">Ativo</SelectItem>
                          <SelectItem key="sit-inativo" value="Inativo">Inativo</SelectItem>
                          <SelectItem key="sit-analise" value="Análise">Análise</SelectItem>
                          <SelectItem key="sit-reprovado" value="Reprovado">Reprovado</SelectItem>
                          <SelectItem key="sit-excluido" value="Excluído">Excluído</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Segmento</label>
                      <Select value={segmentoFiltro || 'todos'} onValueChange={setSegmentoFiltro}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Segmento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="seg-todos" value="todos">Todos</SelectItem>
                          {segmentosUnicos.map((segmento) => (
                            <SelectItem key={`seg-${segmento}`} value={segmento}>
                              {segmento}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Por página</label>
                      <Select
                        value={itensPorPagina.toString()}
                        onValueChange={(v) => { setItensPorPagina(parseInt(v)); setPaginaAtual(1); }}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="pag-10" value="10">10</SelectItem>
                          <SelectItem key="pag-25" value="25">25</SelectItem>
                          <SelectItem key="pag-50" value="50">50</SelectItem>
                          <SelectItem key="pag-100" value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort('razaoSocial')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Cliente
                      {sortField === 'razaoSocial' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('tipoPessoa')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Tipo
                      {sortField === 'tipoPessoa' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('cpfCnpj')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      CPF/CNPJ
                      {sortField === 'cpfCnpj' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('segmentoMercado')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Segmento
                      {sortField === 'segmentoMercado' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('situacao')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Situação
                      {sortField === 'situacao' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  clientesFiltrados.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {cliente.tipoPessoa === 'Pessoa Jurídica' ? (
                              <Building2 className="h-5 w-5 text-primary" />
                            ) : (
                              <User className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{cliente.razaoSocial}</div>
                            {cliente.nomeFantasia && (
                              <div className="text-sm text-muted-foreground">
                                {cliente.nomeFantasia}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {cliente.tipoPessoa === 'Pessoa Jurídica' ? 'PJ' : 'PF'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {cliente.cpfCnpj}
                      </TableCell>
                      <TableCell>{cliente.segmentoMercado || '—'}</TableCell>
                      <TableCell>{getSituacaoBadge(cliente.situacao)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {temPermissao('clientes.visualizar') && (
                              <DropdownMenuItem onClick={() => onVisualizarCliente(cliente.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                            )}
                            {temPermissao('clientes.editar') && (
                              <DropdownMenuItem onClick={() => onEditarCliente(cliente.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {temPermissao('clientes.excluir') && (
                              <DropdownMenuItem
                                onClick={() => setClienteParaExcluir(cliente)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {(totalItens > 0 || clientesFiltrados.length > 0) && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {totalItens === 0
                  ? 'Nenhum cliente'
                  : `Mostrando ${indiceInicial} a ${indiceFinal} de ${totalItens} cliente(s)`}
              </div>
              {totalPaginas > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => goToPage(paginaAtual - 1)}
                        className={paginaAtual <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        aria-disabled={paginaAtual <= 1}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                      .filter((page) => page === 1 || page === totalPaginas || Math.abs(page - paginaAtual) <= 1)
                      .map((page, index, array) => {
                        const showEllipsis = index > 0 && page - array[index - 1] > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <PaginationItem key={`ellipsis-${page}`}>
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
        </CardContent>
            </>
          )}
      </Card>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!clienteParaExcluir} onOpenChange={() => setClienteParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente{' '}
              <strong>{clienteParaExcluir?.razaoSocial}</strong>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluirCliente} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
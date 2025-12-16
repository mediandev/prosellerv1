import React, { useState, useMemo, useEffect } from 'react';
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
  const [mostrarImportExport, setMostrarImportExport] = useState(false);
  const [sortField, setSortField] = useState<keyof Cliente | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Carregar clientes do Supabase
  const carregarClientes = async () => {
    setLoading(true);
    try {
      console.log('[CLIENTES-LIST] Carregando clientes...');
      const data = await api.get<Cliente[]>('clientes');
      console.log('[CLIENTES-LIST] Clientes carregados:', data?.length || 0);
      setClientes(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('[CLIENTES-LIST] Erro ao carregar clientes:', error);
      setClientes([]);
      toast.error('Erro ao carregar clientes da API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

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

  // Filtrar clientes baseado nas permissões do usuário
  const clientesFiltrados = useMemo(() => {
    let resultado = clientes;

    // Se for vendedor, mostrar apenas clientes atribuídos E aprovados
    if (!ehBackoffice() && usuario) {
      resultado = resultado.filter((cliente) => {
        // Filtrar apenas clientes com statusAprovacao === 'aprovado'
        if (cliente.statusAprovacao !== 'aprovado') {
          return false;
        }
        
        // Suporta tanto vendedorAtribuido (novo) quanto vendedoresAtribuidos (legado)
        if (cliente.vendedorAtribuido) {
          return cliente.vendedorAtribuido.id === usuario.id;
        }
        if (cliente.vendedoresAtribuidos && Array.isArray(cliente.vendedoresAtribuidos)) {
          return cliente.vendedoresAtribuidos.some((v) => v.id === usuario.id);
        }
        return false;
      });
    }

    // Aplicar filtro de busca
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      resultado = resultado.filter(
        (cliente) =>
          cliente.razaoSocial.toLowerCase().includes(termo) ||
          cliente.nomeFantasia?.toLowerCase().includes(termo) ||
          cliente.cpfCnpj.includes(termo) ||
          cliente.emailPrincipal?.toLowerCase().includes(termo)
      );
    }

    // Aplicar filtro de situação
    if (situacaoFiltro !== 'todos') {
      resultado = resultado.filter((cliente) => cliente.situacao === situacaoFiltro);
    }

    // Aplicar filtro de segmento
    if (segmentoFiltro !== 'todos') {
      resultado = resultado.filter((cliente) => cliente.segmentoMercado === segmentoFiltro);
    }

    // Aplicar ordenação
    if (sortField) {
      resultado = [...resultado].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Tratamento para valores undefined/null
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        // Comparação para strings
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue, 'pt-BR');
          return sortDirection === 'asc' ? comparison : -comparison;
        }

        // Comparação padrão
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return resultado;
  }, [clientes, searchTerm, situacaoFiltro, segmentoFiltro, ehBackoffice, usuario, sortField, sortDirection]);

  // Paginação
  const totalPaginas = Math.ceil(clientesFiltrados.length / itensPorPagina);
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  const clientesPaginados = clientesFiltrados.slice(indiceInicial, indiceFinal);

  // Reset página quando filtros mudam
  useMemo(() => {
    setPaginaAtual(1);
  }, [searchTerm, situacaoFiltro, segmentoFiltro]);

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

  const segmentosUnicos = Array.from(new Set(clientes.map((c) => c.segmentoMercado))).sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">
            Gerencie o cadastro de clientes
            {!ehBackoffice() && ' (seus clientes atribuídos)'}
          </p>
        </div>
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
            // Recarregar clientes do Supabase
            try {
              const data = await api.get<Cliente[]>('clientes');
              setClientes(Array.isArray(data) ? data : []);
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
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, CNPJ/CPF, e-mail..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={situacaoFiltro} onValueChange={setSituacaoFiltro}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="sit-todos" value="todos">Todas situações</SelectItem>
                  <SelectItem key="sit-ativo" value="Ativo">Ativo</SelectItem>
                  <SelectItem key="sit-inativo" value="Inativo">Inativo</SelectItem>
                  <SelectItem key="sit-analise" value="Análise">Análise</SelectItem>
                  <SelectItem key="sit-reprovado" value="Reprovado">Reprovado</SelectItem>
                  <SelectItem key="sit-excluido" value="Excluído">Excluído</SelectItem>
                </SelectContent>
              </Select>
              <Select value={segmentoFiltro} onValueChange={setSegmentoFiltro}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="seg-todos" value="todos">Todos segmentos</SelectItem>
                  {segmentosUnicos.map((segmento) => (
                    <SelectItem key={`seg-${segmento}`} value={segmento}>
                      {segmento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={itensPorPagina.toString()} 
                onValueChange={(value) => {
                  setItensPorPagina(parseInt(value));
                  setPaginaAtual(1);
                }}
              >
                <SelectTrigger className="w-full md:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="pag-10" value="10">10 / página</SelectItem>
                  <SelectItem key="pag-25" value="25">25 / página</SelectItem>
                  <SelectItem key="pag-50" value="50">50 / página</SelectItem>
                  <SelectItem key="pag-100" value="100">100 / página</SelectItem>
                </SelectContent>
              </Select>
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
                  <TableHead>Contato</TableHead>
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
                {clientesPaginados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  clientesPaginados.map((cliente) => (
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
                      <TableCell>{cliente.segmentoMercado}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {cliente.emailPrincipal && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground truncate max-w-[200px]">
                                {cliente.emailPrincipal}
                              </span>
                            </div>
                          )}
                          {cliente.telefoneCelularPrincipal && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {cliente.telefoneCelularPrincipal}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
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

          {clientesFiltrados.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {indiceInicial + 1} a {Math.min(indiceFinal, clientesFiltrados.length)} de {clientesFiltrados.length} cliente(s)
              </div>
              
              {totalPaginas > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                        className={paginaAtual === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                      .filter(page => {
                        // Mostra primeira, última, atual e páginas adjacentes
                        return page === 1 || 
                               page === totalPaginas || 
                               Math.abs(page - paginaAtual) <= 1;
                      })
                      .map((page, index, array) => {
                        // Adiciona ellipsis se houver gap
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
                                onClick={() => setPaginaAtual(page)}
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
                        onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                        className={paginaAtual === totalPaginas ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
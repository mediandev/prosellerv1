import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { Produto } from "../types/produto";
import { Search, Plus, MoreVertical, Eye, Edit, Trash2, Package, ImageIcon, Filter, Tag, Layers, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { api } from "../services/api";
import { ProductFiltersCard } from "./ProductFiltersCard";

interface ProductsListPageProps {
  onNovoProduto: () => void;
  onEditarProduto?: (id: string) => void;
  onVisualizarProduto?: (id: string) => void;
  /** Quando mudar, a lista recarrega (evita duplicação após editar) */
  refreshKey?: number;
}

export function ProductsListPage({
  onNovoProduto,
  onEditarProduto,
  onVisualizarProduto,
  refreshKey = 0,
}: ProductsListPageProps) {
  const { ehVendedor } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMarca, setFilterMarca] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterSituacao, setFilterSituacao] = useState<string>("Ativo");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Produto | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Carregar produtos do Supabase
  const carregarProdutos = async () => {
    setLoading(true);
    try {
      console.log('[PRODUTOS-LIST] Carregando produtos...');
      const data = await api.get<Produto[]>('produtos');
      console.log('[PRODUTOS-LIST] Produtos carregados:', data?.length || 0);
      setProdutos(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('[PRODUTOS-LIST] Erro ao carregar produtos:', error);
      setProdutos([]);
      toast.error('Erro ao carregar produtos da API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, [refreshKey]);

  // Extrair marcas e tipos únicos dos produtos
  const marcasDisponiveis = useMemo(() => {
    const marcasUnicas = Array.from(new Set(produtos.map(p => p.nomeMarca)))
      .sort();
    return marcasUnicas;
  }, [produtos]);

  const tiposDisponiveis = useMemo(() => {
    const tiposUnicos = Array.from(new Set(produtos.map(p => p.nomeTipoProduto)))
      .sort();
    return tiposUnicos;
  }, [produtos]);

  // Manter valores dos filtros válidos (evita erro ao abrir Filtros quando opção não está mais na lista)
  useEffect(() => {
    if (filterMarca !== "all" && !marcasDisponiveis.includes(filterMarca)) {
      setFilterMarca("all");
    }
    if (filterTipo !== "all" && !tiposDisponiveis.includes(filterTipo)) {
      setFilterTipo("all");
    }
    if (filterSituacao !== "all" && !["Ativo", "Inativo", "Excluído"].includes(filterSituacao)) {
      setFilterSituacao("Ativo");
    }
  }, [marcasDisponiveis, tiposDisponiveis, filterMarca, filterTipo, filterSituacao]);

  // Função para ordenar
  const handleSort = (field: keyof Produto) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredProdutos = useMemo(() => {
    let resultado = produtos.filter((produto) => {
      // Vendedores só veem produtos Ativos e Disponíveis
      if (ehVendedor()) {
        if (produto.situacao !== 'Ativo' || !produto.disponivel) {
          return false;
        }
      }

      // Filtro de busca textual
      const matchesSearch = 
        produto.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produto.codigoSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produto.nomeMarca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produto.codigoEan?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de marca
      const matchesMarca = filterMarca === "all" || produto.nomeMarca === filterMarca;

      // Filtro de tipo
      const matchesTipo = filterTipo === "all" || produto.nomeTipoProduto === filterTipo;

      // Filtro de situação
      const matchesSituacao = filterSituacao === "all" || produto.situacao === filterSituacao;

      return matchesSearch && matchesMarca && matchesTipo && matchesSituacao;
    });

    // Aplicar ordenação
    if (sortField) {
      resultado = [...resultado].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        // Tratamento especial para preço
        if (sortField === 'precoCusto' || sortField === 'precoVenda') {
          return sortDirection === 'asc' ? (Number(aValue) - Number(bValue)) : (Number(bValue) - Number(aValue));
        }

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
  }, [produtos, searchTerm, filterMarca, filterTipo, filterSituacao, sortField, sortDirection]);

  const activeFiltersCount = 
    (filterMarca !== "all" ? 1 : 0) + 
    (filterTipo !== "all" ? 1 : 0) + 
    (filterSituacao !== "all" && filterSituacao !== "Ativo" ? 1 : 0);

  const hasActiveFilters = activeFiltersCount > 0;

  const clearFilters = () => {
    setFilterMarca("all");
    setFilterTipo("all");
    setFilterSituacao("Ativo");
  };

  const handleDeleteProduto = (id: string) => {
    setProdutoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (produtoToDelete) {
      try {
        console.log('[PRODUTOS-LIST] Excluindo produto:', produtoToDelete);
        await api.delete('produtos', produtoToDelete);
        
        // Atualizar lista local
        setProdutos(produtos.filter((p) => p.id !== produtoToDelete));
        
        toast.success("Produto excluído com sucesso!");
        console.log('[PRODUTOS-LIST] Produto excluído com sucesso');
      } catch (error: any) {
        console.error('[PRODUTOS-LIST] Erro ao excluir produto:', error);
        toast.error(`Erro ao excluir produto: ${error.message}`);
      } finally {
        setDeleteDialogOpen(false);
        setProdutoToDelete(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex gap-2">
          <Button 
            onClick={carregarProdutos} 
            variant="outline" 
            size="icon"
            title="Atualizar lista"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant={activeFiltersCount > 0 ? "default" : "outline"}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            {activeFiltersCount > 0 ? (
              <>
                <Badge variant="secondary" className="mr-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-white text-primary">
                  {activeFiltersCount}
                </Badge>
                Filtros
              </>
            ) : (
              <>
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </>
            )}
          </Button>
          <Button onClick={onNovoProduto}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Filtros - componente com select nativo (evita erro do Radix Select com value vazio) */}
      {filtersOpen && (
        <ProductFiltersCard
          filterMarca={filterMarca}
          filterTipo={filterTipo}
          filterSituacao={filterSituacao}
          onFilterMarcaChange={setFilterMarca}
          onFilterTipoChange={setFilterTipo}
          onFilterSituacaoChange={setFilterSituacao}
          marcasDisponiveis={marcasDisponiveis}
          tiposDisponiveis={tiposDisponiveis}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Lista de Produtos
              </CardTitle>
              <CardDescription>
                {filteredProdutos.length} {filteredProdutos.length === 1 ? "produto encontrado" : "produtos encontrados"}
                {hasActiveFilters && ` de ${produtos.length} cadastrados`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Carregando produtos...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Barra de busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, SKU, marca ou EAN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="border rounded-lg">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Foto</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('descricao')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Descrição
                        {sortField === 'descricao' ? (
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
                        onClick={() => handleSort('codigoSku')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        SKU
                        {sortField === 'codigoSku' ? (
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
                        onClick={() => handleSort('codigoEan')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        EAN
                        {sortField === 'codigoEan' ? (
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
                        onClick={() => handleSort('nomeMarca')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Marca
                        {sortField === 'nomeMarca' ? (
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
                        onClick={() => handleSort('nomeTipoProduto')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Tipo
                        {sortField === 'nomeTipoProduto' ? (
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
                        onClick={() => handleSort('nomeUnidade')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Unidade
                        {sortField === 'nomeUnidade' ? (
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
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProdutos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProdutos.map((produto) => (
                      <TableRow key={produto.id}>
                        <TableCell>
                          {produto.foto ? (
                            <img
                              src={produto.foto}
                              alt={produto.descricao}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{produto.descricao}</p>
                            {produto.ncm && (
                              <p className="text-xs text-muted-foreground">NCM: {produto.ncm}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{produto.codigoSku}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {produto.codigoEan || "-"}
                        </TableCell>
                        <TableCell>{produto.nomeMarca}</TableCell>
                        <TableCell className="text-sm">{produto.nomeTipoProduto}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{produto.siglaUnidade}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              produto.situacao === 'Ativo' 
                                ? 'default' 
                                : produto.situacao === 'Inativo' 
                                ? 'secondary' 
                                : 'destructive'
                            }
                          >
                            {produto.situacao}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {onVisualizarProduto && (
                                <DropdownMenuItem onClick={() => onVisualizarProduto(produto.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                              )}
                              {onEditarProduto && (
                                <DropdownMenuItem onClick={() => onEditarProduto(produto.id)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteProduto(produto.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Excluir Produto"
        description="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
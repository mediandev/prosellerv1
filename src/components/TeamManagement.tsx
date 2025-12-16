import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { SellerFormPage } from "./SellerFormPage";
import { Seller } from "../types";
import { mockSellers } from "../data/mockSellers";
import { api } from "../services/api";
import { toast } from "sonner@2.0.3";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Target,
  Award,
  Clock,
  DollarSign,
  LayoutGrid,
  List,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from "lucide-react";

const statusConfig = {
  ativo: { label: "Ativo", variant: "default" as const },
  inativo: { label: "Inativo", variant: "secondary" as const },
  excluido: { label: "Excluído", variant: "outline" as const }
};

// Função helper para calcular o progresso da meta
const calcularProgressoMeta = (vendedor: Seller): number => {
  if (!vendedor.vendas?.mes) return 0;
  
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();
  const metaAno = vendedor.metasAnuais?.find(m => m.ano === anoAtual);
  const metaMes = metaAno?.metas.find(m => m.mes === mesAtual);
  
  if (!metaMes || metaMes.valor === 0) return 0;
  
  return Math.round((vendedor.vendas.mes / metaMes.valor) * 100);
};

// Função helper para obter localização do vendedor
const getLocalizacao = (vendedor: Seller): string => {
  if (vendedor.endereco?.municipio && vendedor.endereco?.uf) {
    return `${vendedor.endereco.municipio}, ${vendedor.endereco.uf}`;
  }
  return "Não informado";
};

export function TeamManagement() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendedor, setSelectedVendedor] = useState<Seller | null>(null);
  const [showSellerForm, setShowSellerForm] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Carregar vendedores
  useEffect(() => {
    carregarVendedores();
  }, []);

  const carregarVendedores = async () => {
    try {
      console.log('[TEAM] Carregando vendedores da API...');
      const vendedoresAPI = await api.get('vendedores');
      setSellers(vendedoresAPI);
      console.log('[TEAM] Vendedores carregados:', vendedoresAPI.length);
    } catch (error) {
      console.error('[TEAM] Erro ao carregar vendedores, usando mock:', error);
      setSellers(mockSellers);
      toast.error('Erro ao carregar vendedores. Usando dados de demonstração.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (vendedor: Seller) => {
    setSelectedVendedor(vendedor);
    setShowSellerForm(true);
  };

  const handleBack = () => {
    setShowSellerForm(false);
    setSelectedVendedor(null);
  };

  const handleSaveVendedor = async (vendedorData: Partial<Seller>) => {
    try {
      if (selectedVendedor) {
        // Atualizar vendedor existente
        const vendedorAtualizado = { ...selectedVendedor, ...vendedorData };
        await api.update('vendedores', selectedVendedor.id, vendedorAtualizado);
        setSellers(sellers.map(v => v.id === selectedVendedor.id ? vendedorAtualizado : v));
        toast.success('Vendedor atualizado com sucesso!');
      } else {
        // Criar novo vendedor
        const novoVendedor: Seller = {
          id: crypto.randomUUID(),
          ...vendedorData,
        } as Seller;
        await api.create('vendedores', novoVendedor);
        setSellers([...sellers, novoVendedor]);
        toast.success('Vendedor criado com sucesso!');
      }
      handleBack();
    } catch (error: any) {
      console.error('[TEAM] Erro ao salvar vendedor:', error);
      toast.error(`Erro ao salvar vendedor: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleSyncVendedores = async () => {
    try {
      toast.loading('Sincronizando usuários vendedores...', { id: 'sync' });
      const result = await api.syncVendedores();
      toast.success(result.message, { id: 'sync' });
      
      // Recarregar vendedores
      await carregarVendedores();
    } catch (error: any) {
      console.error('[TEAM] Erro ao sincronizar vendedores:', error);
      toast.error(`Erro ao sincronizar: ${error.message || 'Erro desconhecido'}`, { id: 'sync' });
    }
  };

  // Função para ordenar
  const handleSort = (field: string) => {
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

  // Aplicar ordenação
  const sortedSellers = [...sellers].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'nome':
        aValue = a.nome;
        bValue = b.nome;
        break;
      case 'email':
        aValue = a.email;
        bValue = b.email;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'vendas':
        aValue = a.vendas.mes;
        bValue = b.vendas.mes;
        break;
      case 'fechamentos':
        aValue = a.vendas.qtdFechamentos;
        bValue = b.vendas.qtdFechamentos;
        break;
      case 'positivacao':
        aValue = a.vendas.positivacao;
        bValue = b.vendas.positivacao;
        break;
      case 'meta':
        aValue = calcularProgressoMeta(a);
        bValue = calcularProgressoMeta(b);
        break;
      default:
        return 0;
    }

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

  // Calcular métricas dinâmicas da equipe
  const positivacaoTotal = sellers.reduce((acc, v) => acc + (v.vendas?.positivacao || 0), 0);
  
  const vendasTotaisMes = sellers.reduce((acc, v) => acc + (v.vendas?.mes || 0), 0);
  
  const performanceMedia = sellers.length > 0 ? Math.round(
    sellers.reduce((acc, v) => acc + calcularProgressoMeta(v), 0) / sellers.length
  ) : 0;
  
  const taxaConversaoMedia = sellers.length > 0 ? Math.round(
    sellers.reduce((acc, v) => acc + (v.performance?.taxaConversao || 0), 0) / sellers.length
  ) : 0;

  if (showSellerForm) {
    return (
      <SellerFormPage
        vendedor={selectedVendedor || undefined}
        onBack={handleBack}
        onSave={handleSaveVendedor}
        mode={selectedVendedor ? "view" : "create"}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo da Equipe */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total de Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sellers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {sellers.filter(v => v.status === "ativo").length} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Performance Mdia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMedia}%</div>
            <p className="text-xs text-muted-foreground mt-1">das metas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Vendas Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(vendasTotaisMes / 1000).toFixed(1)}K
            </div>
            <p className="text-xs text-muted-foreground mt-1">este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxaConversaoMedia}%</div>
            <p className="text-xs text-muted-foreground mt-1">média da equipe</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Positivação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positivacaoTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">clientes únicos</p>
          </CardContent>
        </Card>
      </div>

      {/* Toggle de Visualização */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Equipe de Vendas</h2>
        <div className="flex gap-2">
          {sellers.length === 0 && (
            <Button
              onClick={handleSyncVendedores}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar Usuários
            </Button>
          )}
          <Button
            onClick={() => {
              setSelectedVendedor(null);
              setShowSellerForm(true);
            }}
          >
            <Users className="h-4 w-4 mr-2" />
            Novo Vendedor
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Cards
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4 mr-2" />
            Lista
          </Button>
        </div>
      </div>

      {/* Visualização em Cards */}
      {viewMode === "cards" && (
        <>
          {sellers.length === 0 ? (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Nenhum vendedor cadastrado</h3>
                  <p className="text-muted-foreground mt-2">
                    Clique em "Sincronizar Usuários" para importar usuários vendedores existentes<br />
                    ou em "Novo Vendedor" para cadastrar um novo vendedor.
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleSyncVendedores} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar Usuários
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedVendedor(null);
                      setShowSellerForm(true);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Novo Vendedor
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              {sortedSellers.map((vendedor) => (
                <Card 
                  key={vendedor.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
                  onClick={() => handleCardClick(vendedor)}
                >
                  <CardHeader className="flex-none">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarFallback>{vendedor.iniciais}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base truncate">{vendedor.nome}</CardTitle>
                          <p className="text-sm text-muted-foreground truncate">{vendedor.email}</p>
                        </div>
                      </div>
                      <Badge variant={statusConfig[vendedor.status].variant} className="flex-shrink-0">
                        {statusConfig[vendedor.status].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1 flex flex-col justify-end">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Meta Mensal</span>
                        <span className="font-medium">{calcularProgressoMeta(vendedor)}%</span>
                      </div>
                      <Progress value={calcularProgressoMeta(vendedor)} />
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Vendas do Mês</p>
                        <p className="text-sm font-medium">
                          R$ {((vendedor.vendas?.mes || 0) / 1000).toFixed(1)}k
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fechamentos</p>
                        <p className="text-sm font-medium">{vendedor.vendas?.qtdFechamentos || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Positivação</p>
                        <p className="text-sm font-medium">{vendedor.vendas?.positivacao || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Visualização em Lista */}
      {viewMode === "list" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort('nome')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Vendedor
                      {sortField === 'nome' ? (
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
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      E-mail
                      {sortField === 'email' ? (
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
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Status
                      {sortField === 'status' ? (
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
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort('vendas')}
                      className="flex items-center gap-1 hover:text-foreground ml-auto"
                    >
                      Vendas do Mês
                      {sortField === 'vendas' ? (
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
                  <TableHead className="text-center">
                    <button
                      onClick={() => handleSort('fechamentos')}
                      className="flex items-center gap-1 hover:text-foreground mx-auto"
                    >
                      Fechamentos
                      {sortField === 'fechamentos' ? (
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
                  <TableHead className="text-center">
                    <button
                      onClick={() => handleSort('positivacao')}
                      className="flex items-center gap-1 hover:text-foreground mx-auto"
                    >
                      Positivação
                      {sortField === 'positivacao' ? (
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
                  <TableHead className="text-center">
                    <button
                      onClick={() => handleSort('meta')}
                      className="flex items-center gap-1 hover:text-foreground mx-auto"
                    >
                      Meta
                      {sortField === 'meta' ? (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSellers.map((vendedor) => (
                  <TableRow
                    key={vendedor.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleCardClick(vendedor)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-sm">
                            {vendedor.iniciais}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{vendedor.nome}</p>
                          <p className="text-sm text-muted-foreground">{getLocalizacao(vendedor)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{vendedor.email}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[vendedor.status].variant}>
                        {statusConfig[vendedor.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {(vendedor.vendas?.mes || 0).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-center">{vendedor.vendas?.qtdFechamentos || 0}</TableCell>
                    <TableCell className="text-center font-medium">
                      {vendedor.vendas?.positivacao || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Progress value={calcularProgressoMeta(vendedor)} className="h-2 flex-1" />
                        <span className="text-sm font-medium w-12 text-right">
                          {calcularProgressoMeta(vendedor)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
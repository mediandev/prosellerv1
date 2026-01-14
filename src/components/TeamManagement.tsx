import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "./ui/table";
import { 
  Users, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { api } from "../services/api";
import { Seller } from "../types";
import { mockSellers } from "../data/mockSellers";
import { SellerFormPage } from "./SellerFormPage";
import { toast } from "sonner@2.0.3";
import { format } from "date-fns@4.1.0";
import { ptBR } from "date-fns@4.1.0/locale";
import { Label } from "./ui/label";
import { Venda } from "../types/venda";
import { calcularMetricasVendedores, getVendedorMetrics, VendedorMetrics } from "../services/teamMetricsService";

const statusConfig = {
  ativo: { label: "Ativo", variant: "default" as const },
  inativo: { label: "Inativo", variant: "secondary" as const },
  excluido: { label: "Excluído", variant: "outline" as const }
};

export function TeamManagement() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendedor, setSelectedVendedor] = useState<Seller | null>(null);
  const [showSellerForm, setShowSellerForm] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Métricas calculadas do período
  const [vendedorMetrics, setVendedorMetrics] = useState<Map<string, VendedorMetrics>>(new Map());
  
  // Filtro de período - usar mês/ano ao invés de data completa
  const dataAtual = new Date();
  const mesAtual = dataAtual.getMonth() + 1;
  const anoAtual = dataAtual.getFullYear();
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual.toString().padStart(2, '0'));
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual.toString());
  const [editandoPeriodo, setEditandoPeriodo] = useState(false);

  const periodoSelecionado = `${anoSelecionado}-${mesSelecionado}`;

  // Funções para navegação de período
  const avancarMes = () => {
    const mesNum = parseInt(mesSelecionado);
    const anoNum = parseInt(anoSelecionado);
    
    if (mesNum === 12) {
      setMesSelecionado('01');
      setAnoSelecionado((anoNum + 1).toString());
    } else {
      setMesSelecionado((mesNum + 1).toString().padStart(2, '0'));
    }
  };

  const voltarMes = () => {
    const mesNum = parseInt(mesSelecionado);
    const anoNum = parseInt(anoSelecionado);
    
    if (mesNum === 1) {
      setMesSelecionado('12');
      setAnoSelecionado((anoNum - 1).toString());
    } else {
      setMesSelecionado((mesNum - 1).toString().padStart(2, '0'));
    }
  };

  const handlePeriodoInputChange = (valor: string) => {
    // Remove caracteres não numéricos e barra
    const apenasNumeros = valor.replace(/[^\d/]/g, '');
    
    // Se tem barra, divide em mês e ano
    if (apenasNumeros.includes('/')) {
      const [mes, ano] = apenasNumeros.split('/');
      
      if (mes && mes.length <= 2) {
        const mesNum = parseInt(mes);
        if (mesNum >= 1 && mesNum <= 12) {
          setMesSelecionado(mes.padStart(2, '0'));
        }
      }
      
      if (ano && ano.length === 4) {
        setAnoSelecionado(ano);
      }
    }
  };

  const formatPeriodo = (periodo: string) => {
    const [ano, mes] = periodo.split('-');
    if (mes) {
      const data = new Date(parseInt(ano), parseInt(mes) - 1);
      return format(data, "MMMM/yyyy", { locale: ptBR });
    }
    return ano;
  };

  // Carregar vendedores
  useEffect(() => {
    carregarVendedores();
  }, []);
  
  // Recarregar dados quando o período mudar
  useEffect(() => {
    if (mesSelecionado && anoSelecionado) {
      carregarVendedores();
    }
  }, [mesSelecionado, anoSelecionado]);

  const carregarVendedores = async () => {
    try {
      console.log('[TEAM] Carregando vendedores da API...');
      const vendedoresAPI = await api.get('vendedores');
      setSellers(vendedoresAPI);
      console.log('[TEAM] Vendedores carregados:', vendedoresAPI.length);
      console.log('[TEAM] IDs dos vendedores:', vendedoresAPI.map((v: Seller) => ({ id: v.id, nome: v.nome, email: v.email })));
      
      // Calcular métricas reais do período
      console.log('[TEAM] Calculando métricas para período:', periodoSelecionado);
      const metrics = await calcularMetricasVendedores(periodoSelecionado, vendedoresAPI);
      setVendedorMetrics(metrics);
      console.log('[TEAM] Métricas calculadas para período:', periodoSelecionado);
      console.log('[TEAM] Métricas por vendedor:');
      metrics.forEach((metric, vendedorId) => {
        console.log(`  - ${metric.vendedorNome} (${vendedorId}):`, {
          vendasMes: metric.vendasMes,
          qtdFechamentos: metric.qtdFechamentos,
          positivacao: metric.positivacao,
          meta: metric.meta,
          progressoMeta: metric.progressoMeta
        });
      });
      
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
  const positivacaoTotal = sellers.reduce((acc, v) => {
    const metrics = vendedorMetrics.get(v.id);
    return acc + (metrics?.positivacao || 0);
  }, 0);
  
  const vendasTotaisMes = sellers.reduce((acc, v) => {
    const metrics = vendedorMetrics.get(v.id);
    return acc + (metrics?.vendasMes || 0);
  }, 0);
  
  const performanceMedia = sellers.length > 0 ? Math.round(
    sellers.reduce((acc, v) => acc + calcularProgressoMeta(v), 0) / sellers.length
  ) : 0;
  
  const taxaConversaoMedia = sellers.length > 0 ? Math.round(
    sellers.reduce((acc, v) => acc + (v.performance?.taxaConversao || 0), 0) / sellers.length
  ) : 0;

  // Funções auxiliares
  function calcularProgressoMeta(vendedor: Seller): number {
    const metrics = vendedorMetrics.get(vendedor.id);
    if (!metrics || !metrics.meta || metrics.meta === 0) {
      return 0;
    }
    return Math.round((metrics.vendasMes / metrics.meta) * 100);
  }

  function getLocalizacao(vendedor: Seller): string {
    const partes = [];
    if (vendedor.cidade) partes.push(vendedor.cidade);
    if (vendedor.uf) partes.push(vendedor.uf);
    return partes.length > 0 ? partes.join(' - ') : 'Não informado';
  }

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
            <CardTitle className="text-sm">Performance Média</CardTitle>
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

      {/* Filtro de Período */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {/* Label */}
            <Label className="text-sm font-medium">Período</Label>
            
            {/* Seletor de mês/ano com navegação */}
            <div className="flex items-center border rounded-md bg-background">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-r-none border-r"
                onClick={voltarMes}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {editandoPeriodo ? (
                <Input
                  value={`${mesSelecionado}/${anoSelecionado}`}
                  onChange={(e) => handlePeriodoInputChange(e.target.value)}
                  onBlur={() => setEditandoPeriodo(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      setEditandoPeriodo(false);
                    }
                  }}
                  className="h-9 w-[150px] text-center border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                  placeholder="MM/AAAA"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setEditandoPeriodo(true)}
                  className="h-9 px-3 text-center min-w-[150px] hover:bg-accent transition-colors capitalize"
                >
                  {formatPeriodo(periodoSelecionado)}
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-l-none border-l"
                onClick={avancarMes}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
              {sortedSellers.map((vendedor) => {
                const metrics = vendedorMetrics.get(vendedor.id) || {
                  vendedorId: vendedor.id,
                  vendedorNome: vendedor.nome,
                  vendasMes: 0,
                  qtdFechamentos: 0,
                  positivacao: 0,
                  meta: 0,
                  progressoMeta: 0
                };

                return (
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
                        <span className="font-medium">{metrics.progressoMeta}%</span>
                      </div>
                      <Progress value={metrics.progressoMeta} />
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Vendas do Mês</p>
                        <p className="text-sm font-medium">
                          R$ {(metrics.vendasMes / 1000).toFixed(1)}k
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fechamentos</p>
                        <p className="text-sm font-medium">{metrics.qtdFechamentos}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Positivação</p>
                        <p className="text-sm font-medium">{metrics.positivacao}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )})}
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
                {sortedSellers.map((vendedor) => {
                  const metrics = vendedorMetrics.get(vendedor.id) || {
                    vendedorId: vendedor.id,
                    vendedorNome: vendedor.nome,
                    vendasMes: 0,
                    qtdFechamentos: 0,
                    positivacao: 0,
                    meta: 0,
                    progressoMeta: 0
                  };

                  return (
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
                      R$ {metrics.vendasMes.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-center">{metrics.qtdFechamentos}</TableCell>
                    <TableCell className="text-center font-medium">
                      {metrics.positivacao}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Progress value={metrics.progressoMeta} className="h-2 flex-1" />
                        <span className="text-sm font-medium w-12 text-right">
                          {metrics.progressoMeta}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
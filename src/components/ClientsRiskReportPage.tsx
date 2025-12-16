import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  ArrowLeft,
  Settings,
  Calendar as CalendarIcon,
  Filter,
  Loader2
} from "lucide-react";
import { ClientsRiskDashboard } from "./ClientsRiskDashboard";
import { InactiveClientsTable } from "./InactiveClientsTable";
import { SalesReductionTable } from "./SalesReductionTable";
import { PromisingClientsTable } from "./PromisingClientsTable";
import {
  analisarClientesInativos,
  analisarReducaoCompras,
  analisarClientesPromissores,
  calcularMetricasRisco,
} from "../services/clientRiskService";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { toast } from "sonner@2.0.3";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Cliente } from "../types/customer";
import { Venda } from "../types/venda";
import { Seller } from "../types/seller";

interface ClientsRiskReportPageProps {
  onNavigateBack: () => void;
}

export function ClientsRiskReportPage({ onNavigateBack }: ClientsRiskReportPageProps) {
  const { usuario } = useAuth();
  const ehVendedor = usuario?.tipo === 'vendedor';

  // Estados de dados
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendedores, setVendedores] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para filtros
  const [diasInatividade, setDiasInatividade] = useState(90);
  const [percentualMinimoReducao, setPercentualMinimoReducao] = useState(10);
  const [valorMinimo, setValorMinimo] = useState(0);
  const [vendedoresSelecionados, setVendedoresSelecionados] = useState<string[]>([]);
  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);
  const [estadosSelecionados, setEstadosSelecionados] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Períodos para comparação
  const [periodoAtual, setPeriodoAtual] = useState({
    inicio: new Date(new Date().setDate(new Date().getDate() - 30)),
    fim: new Date(),
  });

  const [periodoAnterior, setPeriodoAnterior] = useState({
    inicio: new Date(new Date().setDate(new Date().getDate() - 60)),
    fim: new Date(new Date().setDate(new Date().getDate() - 30)),
  });

  // Carregar dados do Supabase
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      console.log('[CLIENTS-RISK] Carregando dados da API...');
      const [clientesAPI, vendasAPI, vendedoresAPI] = await Promise.all([
        api.get('clientes').catch(() => []),
        api.get('vendas').catch(() => []),
        api.get('vendedores').catch(() => []),
      ]);
      
      setClientes(clientesAPI);
      setVendas(vendasAPI);
      setVendedores(vendedoresAPI);
      console.log('[CLIENTS-RISK] Dados carregados:', {
        clientes: clientesAPI.length,
        vendas: vendasAPI.length,
        vendedores: vendedoresAPI.length
      });
    } catch (error) {
      console.error('[CLIENTS-RISK] Erro ao carregar dados:', error);
      setClientes([]);
      setVendas([]);
      setVendedores([]);
      toast.error('Erro ao carregar dados. Usando dados de demonstração.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar clientes baseado em permissões
  const clientesFiltrados = useMemo(() => {
    if (ehVendedor && usuario) {
      return clientes.filter(c => c.vendedorId === usuario.id || c.vendedorAtribuido?.id === usuario.id);
    }
    return clientes;
  }, [clientes, ehVendedor, usuario]);

  // Análises
  const clientesInativos = useMemo(() => {
    return analisarClientesInativos(
      clientesFiltrados,
      vendas,
      vendedores,
      diasInatividade,
      {
        vendedores: vendedoresSelecionados,
        segmentos: segmentosSelecionados,
        estados: estadosSelecionados,
        valorMinimo,
      }
    );
  }, [clientesFiltrados, vendas, vendedores, diasInatividade, vendedoresSelecionados, segmentosSelecionados, estadosSelecionados, valorMinimo]);

  const clientesReducao = useMemo(() => {
    return analisarReducaoCompras(
      clientesFiltrados,
      vendas,
      vendedores,
      periodoAtual,
      periodoAnterior,
      {
        percentualMinimo: percentualMinimoReducao,
        vendedores: vendedoresSelecionados,
        segmentos: segmentosSelecionados,
        estados: estadosSelecionados,
        valorMinimo,
      }
    );
  }, [clientesFiltrados, vendas, vendedores, periodoAtual, periodoAnterior, percentualMinimoReducao, vendedoresSelecionados, segmentosSelecionados, estadosSelecionados, valorMinimo]);

  const clientesPromissores = useMemo(() => {
    return analisarClientesPromissores(
      clientesFiltrados,
      vendas,
      vendedores,
      periodoAtual,
      periodoAnterior,
      {
        vendedores: vendedoresSelecionados,
        segmentos: segmentosSelecionados,
        estados: estadosSelecionados,
      }
    );
  }, [clientesFiltrados, vendas, vendedores, periodoAtual, periodoAnterior, vendedoresSelecionados, segmentosSelecionados, estadosSelecionados]);

  // Calcular faturamento total para métricas
  const faturamentoTotal = useMemo(() => {
    return vendas
      .filter(v => v.status !== 'Cancelado' && v.status !== 'cancelado')
      .reduce((sum, v) => sum + (v.valorPedido || v.valorTotal || 0), 0);
  }, [vendas]);

  const metricas = useMemo(() => {
    return calcularMetricasRisco(
      clientesInativos,
      clientesReducao,
      clientesFiltrados.length,
      faturamentoTotal
    );
  }, [clientesInativos, clientesReducao, clientesFiltrados.length, faturamentoTotal]);

  // Exportar dados
  const handleExport = (tipo: 'inativos' | 'reducao' | 'promissores') => {
    let data: any[] = [];
    let filename = '';

    switch (tipo) {
      case 'inativos':
        data = clientesInativos;
        filename = 'clientes_inativos';
        break;
      case 'reducao':
        data = clientesReducao;
        filename = 'clientes_reducao_compras';
        break;
      case 'promissores':
        data = clientesPromissores;
        filename = 'clientes_promissores';
        break;
    }

    // Simulação de exportação
    toast.success(`Exportando ${data.length} registros para Excel...`);
    console.log(`Exportando ${filename}:`, data);
  };

  // Opções para filtros
  const vendedoresOptions = vendedores.map(v => ({ id: v.id, nome: v.nome }));
  const segmentosOptions = ['VIP', 'Premium', 'Standard', 'Corporativo', 'PME', 'Startup'];
  const estadosOptions = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO', 'DF', 'ES', 'AM'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onNavigateBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1>Clientes em Risco</h1>
            <p className="text-muted-foreground">
              Análise de clientes inativos, redução de compras e oportunidades
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard de Métricas */}
      <ClientsRiskDashboard metrics={metricas} />

      {/* Filtros Avançados */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros Avançados
                </CardTitle>
                <Settings className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Parâmetros de Análise */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Dias de Inatividade</Label>
                  <Input
                    type="number"
                    value={diasInatividade}
                    onChange={(e) => setDiasInatividade(Number(e.target.value))}
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Clientes sem compras há X dias
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>% Mínimo de Redução</Label>
                  <Input
                    type="number"
                    value={percentualMinimoReducao}
                    onChange={(e) => setPercentualMinimoReducao(Number(e.target.value))}
                    min={0}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mostrar apenas quedas acima de X%
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Valor Mínimo (LTV/Compra)</Label>
                  <Input
                    type="number"
                    value={valorMinimo}
                    onChange={(e) => setValorMinimo(Number(e.target.value))}
                    min={0}
                    step={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Filtrar por valor mínimo em R$
                  </p>
                </div>
              </div>

              {/* Filtros Adicionais (só para backoffice) */}
              {!ehVendedor && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Vendedores</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os vendedores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="vend-all" value="all">Todos</SelectItem>
                        {vendedoresOptions.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Segmentos</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os segmentos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="seg-all" value="all">Todos</SelectItem>
                        {segmentosOptions.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estados</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="est-all" value="all">Todos</SelectItem>
                        {estadosOptions.map(e => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Abas de Análise */}
      <Tabs defaultValue="inativos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inativos">
            Clientes Inativos ({clientesInativos.length})
          </TabsTrigger>
          <TabsTrigger value="reducao">
            Redução de Compras ({clientesReducao.length})
          </TabsTrigger>
          <TabsTrigger value="promissores">
            Clientes Promissores ({clientesPromissores.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inativos">
          <Card>
            <CardHeader>
              <CardTitle>Clientes Inativos</CardTitle>
              <CardDescription>
                Clientes que nunca compraram ou estão há {diasInatividade}+ dias sem comprar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InactiveClientsTable
                clients={clientesInativos}
                onExport={() => handleExport('inativos')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reducao">
          <Card>
            <CardHeader>
              <CardTitle>Redução de Compras</CardTitle>
              <CardDescription>
                Clientes com redução superior a {percentualMinimoReducao}% nas compras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesReductionTable
                clients={clientesReducao}
                onExport={() => handleExport('reducao')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promissores">
          <Card>
            <CardHeader>
              <CardTitle>Clientes Promissores</CardTitle>
              <CardDescription>
                Clientes com aumento significativo nas compras - oportunidades de upsell e cross-sell
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PromisingClientsTable
                clients={clientesPromissores}
                onExport={() => handleExport('promissores')}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
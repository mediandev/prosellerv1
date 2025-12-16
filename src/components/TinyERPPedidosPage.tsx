import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { mockVendas } from '../data/mockVendas';
import { clientes } from '../data/mockCustomers';
import { Venda } from '../types/venda';
import { format } from 'date-fns@4.1.0';
import { ptBR } from 'date-fns@4.1.0/locale';
import { 
  Search, 
  Package, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Truck,
  FileText,
  Calendar,
  Building2,
  User,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '../lib/masks';
import { toast } from 'sonner@2.0.3';

export function TinyERPPedidosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Filtrar apenas vendas que foram enviadas ao Tiny ERP
  const vendasTiny = useMemo(() => {
    // Criar snapshot do array atual para evitar referências mutáveis
    const vendasSnapshot = mockVendas.slice();
    
    return vendasSnapshot.filter(venda => {
      // Verificar se tem integração ERP
      if (!venda.integracaoERP?.erpPedidoId) return false;

      // Aplicar filtro de busca se houver
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          venda.numero.toLowerCase().includes(search) ||
          venda.nomeCliente?.toLowerCase().includes(search) ||
          venda.integracaoERP.erpPedidoId.toLowerCase().includes(search) ||
          venda.integracaoERP.erpNumero?.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [searchTerm, refreshKey]);

  const handleSincronizar = (venda: Venda) => {
    toast.info(`Sincronizando pedido ${venda.numero}...`);
    // Aqui seria feita a sincronização real
    setTimeout(() => {
      toast.success('Pedido sincronizado com sucesso!');
      setRefreshKey(prev => prev + 1); // Forçar atualização
    }, 1000);
  };
  
  const handleRefresh = () => {
    toast.info('Atualizando lista de pedidos...');
    setRefreshKey(prev => prev + 1);
    setTimeout(() => {
      toast.success('Lista atualizada!');
    }, 500);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      'Rascunho': { variant: 'outline', label: 'Rascunho' },
      'Em Análise': { variant: 'secondary', label: 'Em Análise' },
      'Aprovado': { variant: 'default', label: 'Aprovado' },
      'Faturado': { variant: 'default', label: 'Faturado' },
      'Cancelado': { variant: 'destructive', label: 'Cancelado' },
    };

    const config = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getERPStatusBadge = (erpStatus?: string) => {
    if (!erpStatus) return <Badge variant="outline">Aguardando ERP</Badge>;

    const statusMap: Record<string, { variant: any; label: string; icon?: React.ReactNode }> = {
      'aprovado': { variant: 'default', label: 'Aprovado', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      'faturado': { variant: 'default', label: 'Faturado', icon: <FileText className="h-3 w-3 mr-1" /> },
      'enviado': { variant: 'default', label: 'Enviado', icon: <Truck className="h-3 w-3 mr-1" /> },
      'preparando_envio': { variant: 'secondary', label: 'Preparando Envio', icon: <Package className="h-3 w-3 mr-1" /> },
      'cancelado': { variant: 'destructive', label: 'Cancelado' },
    };

    const config = statusMap[erpStatus] || { variant: 'outline', label: erpStatus };
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const estatisticas = useMemo(() => {
    const total = vendasTiny.length;
    const sincronizadas = vendasTiny.filter(v => v.integracaoERP?.dataSincronizacao).length;
    const comErro = vendasTiny.filter(v => v.integracaoERP?.erroSincronizacao).length;
    const valorTotal = vendasTiny.reduce((sum, v) => sum + (v.valorPedido || 0), 0);

    return { total, sincronizadas, comErro, valorTotal };
  }, [vendasTiny]);

  return (
    <div className="flex flex-col min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              Pedidos no Tiny ERP
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize e gerencie os pedidos enviados ao Tiny ERP
            </p>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Pedidos</CardDescription>
              <CardTitle className="text-3xl">{estatisticas.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Enviados ao Tiny ERP
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Sincronizados</CardDescription>
              <CardTitle className="text-3xl">{estatisticas.sincronizadas}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Com última sincronização
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Com Erro</CardDescription>
              <CardTitle className="text-3xl text-destructive">{estatisticas.comErro}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Falhas na sincronização
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Valor Total</CardDescription>
              <CardTitle className="text-3xl">{formatCurrency(estatisticas.valorTotal)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Soma de todos os pedidos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        {estatisticas.total === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nenhum pedido enviado ao Tiny ERP</AlertTitle>
            <AlertDescription>
              Crie um novo pedido com envio automático habilitado ou envie pedidos existentes manualmente.
            </AlertDescription>
          </Alert>
        )}

        {estatisticas.comErro > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atenção: {estatisticas.comErro} pedido(s) com erro</AlertTitle>
            <AlertDescription>
              Alguns pedidos apresentaram erros na sincronização. Verifique os detalhes abaixo.
            </AlertDescription>
          </Alert>
        )}

        {/* Busca e Filtros */}
        {vendasTiny.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Enviados</CardTitle>
              <CardDescription>
                Lista completa de pedidos integrados com o Tiny ERP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Campo de busca */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número do pedido, cliente, ID do Tiny..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  title="Atualizar lista"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Tabela de pedidos */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data Pedido</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status Sistema</TableHead>
                      <TableHead>ID Tiny</TableHead>
                      <TableHead>Status Tiny</TableHead>
                      <TableHead>Última Sync</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasTiny.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          Nenhum pedido encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      vendasTiny.map((venda) => (
                        <TableRow key={venda.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{venda.numero}</span>
                              {venda.ordemCompraCliente && (
                                <span className="text-xs text-muted-foreground">
                                  OC: {venda.ordemCompraCliente}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{venda.nomeCliente}</span>
                              {venda.nomeEmpresaFaturamento && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {venda.nomeEmpresaFaturamento}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(venda.dataPedido), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              {formatCurrency(venda.valorPedido || 0)}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(venda.status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {venda.integracaoERP?.erpPedidoId}
                              </code>
                              {venda.integracaoERP?.erpNumero && (
                                <span className="text-xs text-muted-foreground">
                                  Nº {venda.integracaoERP.erpNumero}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getERPStatusBadge(venda.integracaoERP?.erpStatus)}
                            {venda.integracaoERP?.erroSincronizacao && (
                              <div className="mt-1">
                                <Badge variant="destructive" className="text-xs">
                                  Erro
                                </Badge>
                                <p className="text-xs text-destructive mt-1">
                                  {venda.integracaoERP.erroSincronizacao}
                                </p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {venda.integracaoERP?.dataSincronizacao ? (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(venda.integracaoERP.dataSincronizacao), 'dd/MM HH:mm', { locale: ptBR })}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSincronizar(venda)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

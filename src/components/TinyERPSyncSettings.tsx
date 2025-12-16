import { useState, useEffect } from 'react';
import { tinyERPSyncService, ConfiguracaoSincronizacao, HistoricoSincronizacao } from '../services/tinyERPSync';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { RefreshCw, Clock, CheckCircle, XCircle, Activity, Webhook, History, Settings } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function TinyERPSyncSettings() {
  const [config, setConfig] = useState<ConfiguracaoSincronizacao>(tinyERPSyncService.obterConfiguracao());
  const [historico, setHistorico] = useState<HistoricoSincronizacao[]>([]);
  const [estatisticas, setEstatisticas] = useState(tinyERPSyncService.obterEstatisticas());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    setConfig(tinyERPSyncService.obterConfiguracao());
    setHistorico(tinyERPSyncService.obterHistorico(undefined, 100));
    setEstatisticas(tinyERPSyncService.obterEstatisticas());
  };

  const handleSalvar = () => {
    setSalvando(true);
    
    try {
      tinyERPSyncService.configurar(config);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
      console.error(error);
    } finally {
      setSalvando(false);
    }
  };

  const handleTestarSincronizacao = async () => {
    toast.info('Iniciando sincronização de teste...');
    
    try {
      // Em produção, você passaria as vendas reais aqui
      await tinyERPSyncService.sincronizarTodasVendas([]);
      carregarDados();
      toast.success('Sincronização de teste concluída!');
    } catch (error) {
      toast.error('Erro na sincronização de teste');
      console.error(error);
    }
  };

  const handleLimparHistorico = () => {
    if (confirm('Tem certeza que deseja limpar o histórico de sincronizações?')) {
      tinyERPSyncService.limparHistorico();
      carregarDados();
      toast.success('Histórico limpo com sucesso');
    }
  };

  const formatarDataHora = (data: Date) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Sincronização Tiny ERP</h2>
        <p className="text-muted-foreground">
          Configure a sincronização automática de status de vendas com o Tiny ERP
        </p>
      </div>

      <Tabs defaultValue="configuracao" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuracao">
            <Settings className="h-4 w-4 mr-2" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="estatisticas">
            <Activity className="h-4 w-4 mr-2" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        {/* Aba de Configuração */}
        <TabsContent value="configuracao" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sincronização Automática</CardTitle>
              <CardDescription>
                Configure como e quando o sistema deve sincronizar os status das vendas com o Tiny ERP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Habilitar Sincronização */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="habilitado" className="text-base">
                    Habilitar Sincronização
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Ativa ou desativa completamente a sincronização com o Tiny ERP
                  </p>
                </div>
                <Switch
                  id="habilitado"
                  checked={config.habilitado}
                  onCheckedChange={(checked) => setConfig({ ...config, habilitado: checked })}
                />
              </div>

              <Separator />

              {/* Sincronização Automática */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sincronizarAutomaticamente" className="text-base">
                    Sincronizar Automaticamente
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Atualiza os status das vendas automaticamente em intervalos regulares
                  </p>
                </div>
                <Switch
                  id="sincronizarAutomaticamente"
                  checked={config.sincronizarAutomaticamente}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, sincronizarAutomaticamente: checked })
                  }
                  disabled={!config.habilitado}
                />
              </div>

              {/* Intervalo de Sincronização */}
              {config.sincronizarAutomaticamente && (
                <div className="space-y-2">
                  <Label htmlFor="intervalo">
                    Intervalo de Sincronização (minutos)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="intervalo"
                      type="number"
                      min="5"
                      max="120"
                      value={config.intervaloMinutos}
                      onChange={(e) => 
                        setConfig({ ...config, intervaloMinutos: parseInt(e.target.value) || 15 })
                      }
                      disabled={!config.habilitado}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">minutos</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recomendado: 15-30 minutos para não sobrecarregar a API
                  </p>
                </div>
              )}

              <Separator />

              {/* Notificações */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notificarAlteracoes" className="text-base">
                    Notificar Alterações
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Exibe notificações quando o status de uma venda é atualizado
                  </p>
                </div>
                <Switch
                  id="notificarAlteracoes"
                  checked={config.notificarAlteracoes}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, notificarAlteracoes: checked })
                  }
                  disabled={!config.habilitado}
                />
              </div>

              <Separator />

              {/* Sincronizar Dados Adicionais */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sincronizarDados" className="text-base">
                    Sincronizar Dados Adicionais
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Sincroniza também nota fiscal, código de rastreio e transportadora
                  </p>
                </div>
                <Switch
                  id="sincronizarDados"
                  checked={config.sincronizarDadosAdicionais}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, sincronizarDadosAdicionais: checked })
                  }
                  disabled={!config.habilitado}
                />
              </div>

              <Separator />

              {/* Webhook */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  <Label htmlFor="webhookUrl">URL do Webhook (Opcional)</Label>
                </div>
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://seu-dominio.com/api/webhooks/tiny"
                  value={config.webhookUrl || ''}
                  onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                  disabled={!config.habilitado}
                />
                <p className="text-xs text-muted-foreground">
                  Configure no Tiny ERP para receber notificações instantâneas de mudanças de status
                  (mais eficiente que polling)
                </p>
              </div>

              <Separator />

              {/* Botões de Ação */}
              <div className="flex gap-2">
                <Button onClick={handleSalvar} disabled={salvando || !config.habilitado}>
                  {salvando ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleTestarSincronizacao}
                  disabled={!config.habilitado}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Testar Sincronização
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card de Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status da Sincronização</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Estado</p>
                  <Badge variant={config.habilitado ? 'default' : 'secondary'}>
                    {config.habilitado ? '✅ Ativa' : '⏸️ Desativada'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Modo</p>
                  <Badge variant={config.sincronizarAutomaticamente ? 'default' : 'outline'}>
                    {config.sincronizarAutomaticamente ? '🔄 Automático' : '👆 Manual'}
                  </Badge>
                </div>
                {config.sincronizarAutomaticamente && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Frequência</p>
                    <p className="text-2xl">
                      {config.intervaloMinutos} <span className="text-sm text-muted-foreground">min</span>
                    </p>
                  </div>
                )}
                {config.webhookUrl && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Webhook</p>
                    <Badge variant="outline">
                      <Webhook className="h-3 w-3 mr-1" />
                      Configurado
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Histórico */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Sincronizações</CardTitle>
                  <CardDescription>
                    Últimas {historico.length} sincronizações realizadas
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleLimparHistorico}>
                  Limpar Histórico
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {historico.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma sincronização realizada ainda</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Data/Hora</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[80px]">Resultado</TableHead>
                        <TableHead className="min-w-[250px]">Mensagem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historico.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">
                            {formatarDataHora(item.dataHora)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.vendaId}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {item.statusAnterior}
                              </span>
                              <span>→</span>
                              <Badge variant={item.sucesso ? 'default' : 'secondary'}>
                                {item.statusNovo}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.sucesso ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.mensagem}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Estatísticas */}
        <TabsContent value="estatisticas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Sincronização</CardTitle>
              <CardDescription>
                Resumo geral das sincronizações realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total de Sincronizações</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{estatisticas.total}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Bem-sucedidas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">
                      {estatisticas.sucessos}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Com Erro</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600">
                      {estatisticas.erros}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Taxa de Sucesso</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {estatisticas.taxaSucesso}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {estatisticas.ultimaSincronizacao && (
                <div className="mt-6 p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-1">Última Sincronização</p>
                  <p className="text-muted-foreground">
                    {formatarDataHora(new Date(estatisticas.ultimaSincronizacao))}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

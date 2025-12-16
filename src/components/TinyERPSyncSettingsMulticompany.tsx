import { useState, useEffect } from 'react';
import { tinyERPSyncService, ConfiguracaoSincronizacaoEmpresa, HistoricoSincronizacao } from '../services/tinyERPSync';
import { Company } from '../types/company';
import { useCompanies } from '../hooks/useCompanies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity, 
  Webhook, 
  History, 
  Settings, 
  Building2,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function TinyERPSyncSettingsMulticompany() {
  const { companies: empresas, getActive } = useCompanies();
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Company | null>(null);

  // Selecionar primeira empresa ativa quando as empresas carregarem
  useEffect(() => {
    if (!empresaSelecionada && empresas.length > 0) {
      const empresasAtivas = getActive();
      setEmpresaSelecionada(empresasAtivas[0] || null);
    }
  }, [empresas, empresaSelecionada, getActive]);
  const [configEmpresa, setConfigEmpresa] = useState<Partial<ConfiguracaoSincronizacaoEmpresa> | null>(null);
  const [historico, setHistorico] = useState<HistoricoSincronizacao[]>([]);
  const [estatisticas, setEstatisticas] = useState(tinyERPSyncService.obterEstatisticas());
  const [salvando, setSalvando] = useState(false);
  const [webhookCopiado, setWebhookCopiado] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarConfiguracaoEmpresa(empresaSelecionada.id);
    }
  }, [empresaSelecionada]);

  const carregarDados = () => {
    setHistorico(tinyERPSyncService.obterHistorico(undefined, 100));
    setEstatisticas(tinyERPSyncService.obterEstatisticas());
  };

  const carregarConfiguracaoEmpresa = (empresaId: string) => {
    const empresa = empresas.find(e => e.id === empresaId);
    if (!empresa) return;

    // Buscar configuração existente ou usar padrões da integração ERP
    let configExistente = tinyERPSyncService.obterConfiguracaoEmpresa(empresaId);
    
    if (!configExistente) {
      // Buscar configuração do ERP da empresa
      const erpConfig = empresa.integracoesERP.find(erp => 
        erp.erpNome.toLowerCase().includes('tiny')
      );

      if (erpConfig?.sincronizacao) {
        // Usar configuração salva no ERP
        configExistente = {
          empresaId: empresa.id,
          empresaNome: empresa.nomeFantasia || empresa.razaoSocial,
          apiToken: erpConfig.apiToken,
          ...erpConfig.sincronizacao,
        };
      } else if (erpConfig) {
        // Criar configuração padrão
        configExistente = {
          empresaId: empresa.id,
          empresaNome: empresa.nomeFantasia || empresa.razaoSocial,
          apiToken: erpConfig.apiToken,
          habilitado: erpConfig.ativo,
          intervaloMinutos: 15,
          sincronizarAutomaticamente: true,
          notificarAlteracoes: true,
          sincronizarDadosAdicionais: true,
        };
      }
    }

    setConfigEmpresa(configExistente || {
      empresaId: empresa.id,
      empresaNome: empresa.nomeFantasia || empresa.razaoSocial,
      apiToken: '',
      habilitado: false,
      intervaloMinutos: 15,
      sincronizarAutomaticamente: false,
      notificarAlteracoes: true,
      sincronizarDadosAdicionais: true,
    });
  };

  const handleSalvar = () => {
    if (!empresaSelecionada || !configEmpresa) {
      toast.error('Selecione uma empresa');
      return;
    }

    if (!configEmpresa.apiToken) {
      toast.error('Token de API é obrigatório');
      return;
    }

    setSalvando(true);
    
    try {
      tinyERPSyncService.configurarEmpresa(
        empresaSelecionada.id,
        empresaSelecionada.nomeFantasia || empresaSelecionada.razaoSocial,
        configEmpresa as any
      );
      
      toast.success(`Configurações salvas para ${empresaSelecionada.nomeFantasia}!`);
    } catch (error) {
      toast.error('Erro ao salvar configurações');
      console.error(error);
    } finally {
      setSalvando(false);
    }
  };

  const handleTestarSincronizacao = async () => {
    if (!empresaSelecionada) {
      toast.error('Selecione uma empresa');
      return;
    }

    toast.info('Iniciando sincronização de teste...');
    
    try {
      // Em produção, você buscaria as vendas da empresa
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

  const copiarWebhookUrl = (empresaId: string) => {
    const baseUrl = window.location.origin;
    const webhookUrl = `${baseUrl}/api/webhooks/tiny/${empresaId}`;
    
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setWebhookCopiado(empresaId);
      toast.success('URL do webhook copiada!');
      
      setTimeout(() => {
        setWebhookCopiado(null);
      }, 2000);
    }).catch(() => {
      toast.error('Erro ao copiar URL');
    });
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

  const empresasComTiny = empresas.filter(e => 
    e.integracoesERP.some(erp => erp.erpNome.toLowerCase().includes('tiny'))
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Sincronização Tiny ERP - Multiempresas</h2>
        <p className="text-muted-foreground">
          Configure a sincronização automática de status de vendas para cada empresa
        </p>
      </div>

      {empresasComTiny.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma empresa com Tiny ERP configurado</p>
              <p className="text-sm">Configure a integração com Tiny ERP em cada empresa primeiro</p>
              <Button className="mt-4" variant="outline" onClick={() => window.location.href = '#integracoes'}>
                Ir para Configurações de ERP
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="configuracao" className="space-y-4">
          <TabsList>
            <TabsTrigger value="configuracao">
              <Settings className="h-4 w-4 mr-2" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              <Webhook className="h-4 w-4 mr-2" />
              Webhooks
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
            {/* Seletor de Empresa */}
            <Card>
              <CardHeader>
                <CardTitle>Selecione a Empresa</CardTitle>
                <CardDescription>
                  Escolha a empresa para configurar a sincronização com Tiny ERP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {empresasComTiny.map((empresa) => {
                    const tinyConfig = empresa.integracoesERP.find(erp => 
                      erp.erpNome.toLowerCase().includes('tiny')
                    );
                    const isAtivo = tinyConfig?.ativo;
                    const isSelecionada = empresaSelecionada?.id === empresa.id;

                    return (
                      <div
                        key={empresa.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelecionada 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:border-primary/50 hover:bg-muted/50'
                        }`}
                        onClick={() => setEmpresaSelecionada(empresa)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {empresa.nomeFantasia || empresa.razaoSocial}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {empresa.cnpj}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={isAtivo ? 'default' : 'secondary'}>
                              {isAtivo ? 'Tiny Ativo' : 'Tiny Inativo'}
                            </Badge>
                            {isSelecionada && (
                              <Badge variant="outline">Selecionada</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Configurações da Empresa Selecionada */}
            {empresaSelecionada && configEmpresa && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Configurações de Sincronização - {empresaSelecionada.nomeFantasia}
                  </CardTitle>
                  <CardDescription>
                    Configure como e quando sincronizar vendas desta empresa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Token de API */}
                  <div className="space-y-2">
                    <Label htmlFor="apiToken">Token de API do Tiny ERP</Label>
                    <Input
                      id="apiToken"
                      type="password"
                      placeholder="Insira o token da API"
                      value={configEmpresa.apiToken || ''}
                      onChange={(e) => setConfigEmpresa({ ...configEmpresa, apiToken: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Token obtido no painel do Tiny ERP
                    </p>
                  </div>

                  <Separator />

                  {/* Habilitar Sincronização */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="habilitado" className="text-base">
                        Habilitar Sincronização
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Ativa ou desativa a sincronização para esta empresa
                      </p>
                    </div>
                    <Switch
                      id="habilitado"
                      checked={configEmpresa.habilitado ?? false}
                      onCheckedChange={(checked) => 
                        setConfigEmpresa({ ...configEmpresa, habilitado: checked })
                      }
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
                        Atualiza os status automaticamente em intervalos regulares
                      </p>
                    </div>
                    <Switch
                      id="sincronizarAutomaticamente"
                      checked={configEmpresa.sincronizarAutomaticamente ?? false}
                      onCheckedChange={(checked) => 
                        setConfigEmpresa({ ...configEmpresa, sincronizarAutomaticamente: checked })
                      }
                      disabled={!configEmpresa.habilitado}
                    />
                  </div>

                  {/* Intervalo de Sincronização */}
                  {configEmpresa.sincronizarAutomaticamente && (
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
                          value={configEmpresa.intervaloMinutos || 15}
                          onChange={(e) => 
                            setConfigEmpresa({ 
                              ...configEmpresa, 
                              intervaloMinutos: parseInt(e.target.value) || 15 
                            })
                          }
                          disabled={!configEmpresa.habilitado}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">minutos</span>
                      </div>
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
                        Exibe notificações quando o status é atualizado
                      </p>
                    </div>
                    <Switch
                      id="notificarAlteracoes"
                      checked={configEmpresa.notificarAlteracoes ?? true}
                      onCheckedChange={(checked) => 
                        setConfigEmpresa({ ...configEmpresa, notificarAlteracoes: checked })
                      }
                      disabled={!configEmpresa.habilitado}
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
                        Inclui nota fiscal, rastreio e transportadora
                      </p>
                    </div>
                    <Switch
                      id="sincronizarDados"
                      checked={configEmpresa.sincronizarDadosAdicionais ?? true}
                      onCheckedChange={(checked) => 
                        setConfigEmpresa({ ...configEmpresa, sincronizarDadosAdicionais: checked })
                      }
                      disabled={!configEmpresa.habilitado}
                    />
                  </div>

                  <Separator />

                  {/* URL Customizada do Webhook */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-4 w-4" />
                      <Label htmlFor="webhookUrl">URL Customizada do Webhook (Opcional)</Label>
                    </div>
                    <Input
                      id="webhookUrl"
                      type="url"
                      placeholder={`${window.location.origin}/api/webhooks/tiny/${empresaSelecionada.id}`}
                      value={configEmpresa.webhookUrl || ''}
                      onChange={(e) => setConfigEmpresa({ ...configEmpresa, webhookUrl: e.target.value })}
                      disabled={!configEmpresa.habilitado}
                    />
                    <p className="text-xs text-muted-foreground">
                      Por padrão, cada empresa tem sua própria URL de webhook. 
                      Use este campo apenas se precisar de uma URL diferente.
                    </p>
                  </div>

                  <Separator />

                  {/* Botões de Ação */}
                  <div className="flex gap-2">
                    <Button onClick={handleSalvar} disabled={salvando || !configEmpresa.habilitado}>
                      {salvando ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleTestarSincronizacao}
                      disabled={!configEmpresa.habilitado}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Testar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Aba de Webhooks */}
          <TabsContent value="webhooks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>URLs de Webhook por Empresa</CardTitle>
                <CardDescription>
                  Configure estas URLs no painel do Tiny ERP de cada empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {empresasComTiny.map((empresa) => {
                    const configSalva = tinyERPSyncService.obterConfiguracaoEmpresa(empresa.id);
                    const baseUrl = window.location.origin;
                    const webhookPadrao = `${baseUrl}/api/webhooks/tiny/${empresa.id}`;
                    const webhookUrl = configSalva?.webhookUrl || webhookPadrao;

                    return (
                      <div key={empresa.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {empresa.nomeFantasia || empresa.razaoSocial}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {empresa.cnpj}
                            </p>
                          </div>
                          {configSalva?.habilitado && (
                            <Badge variant="default">Ativo</Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            URL do Webhook:
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              value={webhookUrl}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => copiarWebhookUrl(empresa.id)}
                            >
                              {webhookCopiado === empresa.id ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-xs text-blue-900">
                            <strong>Como configurar no Tiny ERP:</strong><br />
                            1. Acesse Configurações → Integrações → Webhooks<br />
                            2. Crie novo webhook com a URL acima<br />
                            3. Selecione evento: "Mudança de situação do pedido"<br />
                            4. Formato: JSON
                          </p>
                        </div>
                      </div>
                    );
                  })}
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
                  Resumo geral de todas as empresas
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
      )}
    </div>
  );
}

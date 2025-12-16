import { useState, useEffect } from 'react';
import { ERPConfig, ERPType } from '../services/integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { api } from '../services/api';

export function ERPConfigSettings() {
  const [empresaSelecionadaId, setEmpresaSelecionadaId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tinyConfig, setTinyConfig] = useState<ERPConfig>({
    tipo: 'tiny',
    ativo: false,
    credenciais: {
      token: '',
    },
  });

  const [testando, setTestando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [testeResultado, setTesteResultado] = useState<'sucesso' | 'erro' | null>(null);
  
  // Preferências de Integração
  const [transmitirOC, setTransmitirOC] = useState(true);

  // Carregar empresa selecionada e config ao montar
  useEffect(() => {
    const carregarConfiguracao = async () => {
      try {
        // Obter empresa selecionada do localStorage
        const empresaId = localStorage.getItem('empresaSelecionada');
        
        if (!empresaId) {
          toast.error('Nenhuma empresa selecionada. Por favor, selecione uma empresa primeiro.');
          setCarregando(false);
          return;
        }

        setEmpresaSelecionadaId(empresaId);

        // Carregar config do backend
        const config = await api.getERPConfig(empresaId);
        
        if (config) {
          setTinyConfig(config);
          console.log('[ERP Config] Configuração carregada:', { ativo: config.ativo, hasToken: !!config.credenciais?.token });
        }
      } catch (error) {
        console.error('[ERP Config] Erro ao carregar configuração:', error);
        toast.error('Erro ao carregar configuração do ERP');
      } finally {
        setCarregando(false);
      }
    };

    carregarConfiguracao();
  }, []);

  const handleTestarConexaoTiny = async () => {
    if (!tinyConfig.credenciais.token) {
      toast.error('Por favor, informe o token de API');
      return;
    }

    setTestando(true);
    setTesteResultado(null);

    try {
      // Testar conexão via backend
      const resultado = await api.testTinyConnection(tinyConfig.credenciais.token);
      
      if (resultado.success) {
        setTesteResultado('sucesso');
        toast.success('Conexão com Tiny ERP estabelecida com sucesso!');
      } else {
        setTesteResultado('erro');
        toast.error(resultado.error || 'Falha ao conectar com Tiny ERP');
      }
    } catch (error: any) {
      setTesteResultado('erro');
      toast.error(error.message || 'Falha ao conectar com Tiny ERP');
      console.error('[ERP Config] Erro ao testar conexão:', error);
    } finally {
      setTestando(false);
    }
  };

  const handleSalvarConfiguracao = async () => {
    if (!empresaSelecionadaId) {
      toast.error('Nenhuma empresa selecionada');
      return;
    }

    if (!tinyConfig.credenciais.token) {
      toast.error('Por favor, informe o token de API');
      return;
    }

    setSalvando(true);

    try {
      // Salvar configuração no backend
      await api.saveERPConfig(empresaSelecionadaId, {
        ...tinyConfig,
        preferencias: { transmitirOC }
      });
      
      toast.success('Configuração do ERP salva com sucesso!');
      
      // Atualizar localStorage para indicar modo REAL
      if (tinyConfig.ativo) {
        localStorage.setItem('tinyERPMode', 'REAL');
        toast.info('Sistema configurado para modo REAL. Recarregue a página para aplicar as mudanças.', {
          duration: 5000
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configuração do ERP');
      console.error('[ERP Config] Erro ao salvar configuração:', error);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!empresaSelecionadaId) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Nenhuma empresa selecionada. Por favor, selecione uma empresa antes de configurar a integração com ERP.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Integração com ERP</h3>
        <p className="text-sm text-muted-foreground">
          Configure a integração com seu sistema de gestão empresarial
        </p>
      </div>

      <Tabs defaultValue="tiny">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full h-auto">
            <TabsTrigger value="tiny" className="whitespace-nowrap">Tiny ERP</TabsTrigger>
            <TabsTrigger value="totvs" disabled className="whitespace-nowrap">TOTVS</TabsTrigger>
            <TabsTrigger value="sap" disabled className="whitespace-nowrap">SAP</TabsTrigger>
            <TabsTrigger value="omie" disabled className="whitespace-nowrap">Omie</TabsTrigger>
            <TabsTrigger value="bling" disabled className="whitespace-nowrap">Bling</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tiny" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tiny ERP (Olist Tiny)</CardTitle>
                  <CardDescription>
                    Configure as credenciais de acesso à API do Tiny ERP
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={tinyConfig.ativo}
                    onCheckedChange={(checked) =>
                      setTinyConfig({ ...tinyConfig, ativo: checked })
                    }
                  />
                  <Label>
                    {tinyConfig.ativo ? (
                      <Badge variant="default">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Como obter o token:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Acesse sua conta no Tiny ERP</li>
                    <li>Vá em Configurações → API</li>
                    <li>Gere um novo token de acesso</li>
                    <li>Cole o token abaixo</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="tinyToken">Token de API *</Label>
                <Input
                  id="tinyToken"
                  type="password"
                  value={tinyConfig.credenciais.token}
                  onChange={(e) =>
                    setTinyConfig({
                      ...tinyConfig,
                      credenciais: { ...tinyConfig.credenciais, token: e.target.value },
                    })
                  }
                  placeholder="Digite seu token de API"
                />
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  onClick={handleTestarConexaoTiny}
                  disabled={testando || !tinyConfig.credenciais.token}
                  variant="outline"
                >
                  {testando ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Testar Conexão
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSalvarConfiguracao}
                  disabled={!tinyConfig.credenciais.token || salvando}
                >
                  {salvando ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Configuração'
                  )}
                </Button>
              </div>

              {testeResultado && (
                <Alert variant={testeResultado === 'sucesso' ? 'default' : 'destructive'}>
                  {testeResultado === 'sucesso' ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Conexão estabelecida com sucesso! O sistema está pronto para sincronizar dados.
                      </AlertDescription>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        Falha na conexão. Verifique se o token está correto e tente novamente.
                      </AlertDescription>
                    </>
                  )}
                </Alert>
              )}

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Funcionalidades Disponíveis:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Sincronização automática de clientes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Importação de produtos e estoque
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Criação de pedidos de venda
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Consulta de pedidos existentes
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Preferências de Integração */}
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Integração</CardTitle>
              <CardDescription>
                Configure como os dados devem ser transmitidos ao ERP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="transmitirOC" className="text-base">
                    Transmitir OC nas Observações
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, a Ordem de Compra (OC) será incluída nas observações ao transmitir a venda para o ERP
                  </p>
                </div>
                <Switch
                  id="transmitirOC"
                  checked={transmitirOC}
                  onCheckedChange={setTransmitirOC}
                />
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  {transmitirOC ? (
                    <span>
                      ✓ A OC será transmitida junto com as observações da venda no campo de observações do pedido no ERP.
                    </span>
                  ) : (
                    <span>
                      ✗ A OC não será incluída nas observações. Apenas outras informações relevantes serão transmitidas.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outros ERPs viriam aqui */}
        <TabsContent value="totvs">
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p>Integração com TOTVS será implementada em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

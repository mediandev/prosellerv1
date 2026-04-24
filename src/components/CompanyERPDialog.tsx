import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { api } from '../services/api';
import { Company } from '../types/company';
import { NaturezaOperacao } from '../types/naturezaOperacao';
import { tinyNaturezaOperacaoService } from '../services/tinyNaturezaOperacaoService';

interface CompanyERPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onSuccess?: () => void;
}

export function CompanyERPDialog({ open, onOpenChange, company, onSuccess }: CompanyERPDialogProps) {
  const [loading, setLoading] = useState(true);
  const [testando, setTestando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [testeResultado, setTesteResultado] = useState<'sucesso' | 'erro' | null>(null);
  const [naturezas, setNaturezas] = useState<NaturezaOperacao[]>([]);
  const [loadingNaturezas, setLoadingNaturezas] = useState(false);
  const [tinyNaturezaMap, setTinyNaturezaMap] = useState<Record<string, string>>({});
  // F-001 · Dual-ID Simples Nacional. Estado do 2o campo (quando optante) e
  // do toggle por linha. Toggle OFF por default → exibe 1 campo (comportamento
  // pre-F-001). Toggle ON → exibe 2 campos, ambos obrigatorios ao salvar.
  const [tinyNaturezaSimplesMap, setTinyNaturezaSimplesMap] = useState<Record<string, string>>({});
  const [simplesEnabledMap, setSimplesEnabledMap] = useState<Record<string, boolean>>({});
  
  const [config, setConfig] = useState({
    tipo: 'tiny',
    ativo: false,
    credenciais: {
      token: '',
    },
    envioAutomatico: {
      habilitado: true,
      tentativasMaximas: 3,
      intervaloRetentativa: 5,
    },
    preferencias: {
      transmitirOC: true,
    }
  });

  // Preencher token com chave_api da empresa ao abrir (ref_empresas_subsidiarias.chave_api)
  useEffect(() => {
    if (open && company?.chaveApi?.trim()) {
      setConfig((prev) => ({
        ...prev,
        credenciais: { ...prev.credenciais, token: prev.credenciais.token || company.chaveApi!.trim() },
      }));
    }
  }, [open, company?.id, company?.chaveApi]);

  // Carregar configuração ao abrir o diálogo
  useEffect(() => {
    if (open && company) {
      carregarConfiguracao();
      carregarMapeamentoNaturezas();
    }
  }, [open, company]);

  const carregarMapeamentoNaturezas = async () => {
    if (!company) return;

    setLoadingNaturezas(true);
    try {
      const [naturezasResult, mapeamentosResult] = await Promise.allSettled([
        api.naturezasOperacao.list({ apenasAtivas: true }),
        tinyNaturezaOperacaoService.listByEmpresa(company.id),
      ]);

      const naturezasData =
        naturezasResult.status === 'fulfilled' && Array.isArray(naturezasResult.value)
          ? naturezasResult.value
          : [];
      setNaturezas(naturezasData);

      if (mapeamentosResult.status === 'rejected') {
        console.error(
          '[CompanyERPDialog] Erro ao carregar mapeamento da empresa. Mantendo apenas naturezas ativas:',
          mapeamentosResult.reason
        );
      }

      const mapeamentosData =
        mapeamentosResult.status === 'fulfilled' && Array.isArray(mapeamentosResult.value)
          ? mapeamentosResult.value
          : [];

      const mapped = mapeamentosData.reduce(
        (acc: Record<string, string>, item: any) => {
          acc[String(item.naturezaOperacaoId)] = String(item.tinyValor || '');
          return acc;
        },
        {}
      );

      const mappedSimples = mapeamentosData.reduce(
        (acc: Record<string, string>, item: any) => {
          if (item.tinyValorSimples) {
            acc[String(item.naturezaOperacaoId)] = String(item.tinyValorSimples);
          }
          return acc;
        },
        {}
      );

      const enabledInit = mapeamentosData.reduce(
        (acc: Record<string, boolean>, item: any) => {
          if (item.tinyValorSimples) {
            acc[String(item.naturezaOperacaoId)] = true;
          }
          return acc;
        },
        {}
      );

      setTinyNaturezaMap(mapped);
      setTinyNaturezaSimplesMap(mappedSimples);
      setSimplesEnabledMap(enabledInit);
    } catch (error) {
      console.error('[CompanyERPDialog] Erro ao carregar mapeamento de naturezas:', error);
      setTinyNaturezaMap({});
      setTinyNaturezaSimplesMap({});
      setSimplesEnabledMap({});
    } finally {
      setLoadingNaturezas(false);
    }
  };

  const carregarConfiguracao = async () => {
    if (!company) return;
    
    setLoading(true);
    try {
      const configERP = await api.getERPConfig(company.id);
      // Token: prioridade getERPConfig, senão chave_api da empresa (ref_empresas_subsidiarias)
      const token = configERP?.credenciais?.token?.trim() || (company.chaveApi ?? '').trim() || '';
      setConfig({
        ...config,
        ...(configERP || {}),
        credenciais: {
          ...config.credenciais,
          ...(configERP?.credenciais || {}),
          token: token || config.credenciais.token,
        },
      });
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      // Mesmo em erro, preencher token com chave_api da empresa
      if (company.chaveApi?.trim()) {
        setConfig((prev) => ({
          ...prev,
          credenciais: { ...prev.credenciais, token: company.chaveApi!.trim() },
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestarConexao = async () => {
    if (!config.credenciais.token) {
      toast.error('Por favor, informe o token de API');
      return;
    }

    setTestando(true);
    setTesteResultado(null);

    try {
      const resultado = await api.testTinyConnection(config.credenciais.token);
      
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
    } finally {
      setTestando(false);
    }
  };

  const handleSalvar = async () => {
    if (!company) return;

    if (!config.credenciais.token && config.ativo) {
      toast.error('Por favor, informe o token de API');
      return;
    }

    // F-001 · Validar rows com toggle Simples Nacional ligado.
    // Toggle ON exige tinyValor E tinyValorSimples preenchidos (RF-004 / CB-003).
    const linhasInconsistentes = naturezas.filter((n) => {
      if (!simplesEnabledMap[n.id]) return false;
      const padrao = (tinyNaturezaMap[n.id] || '').trim();
      const simples = (tinyNaturezaSimplesMap[n.id] || '').trim();
      return !padrao || !simples;
    });

    if (linhasInconsistentes.length > 0) {
      toast.error(
        `Preencha o ID Tiny padrao e o ID Tiny Simples em: ${linhasInconsistentes
          .map((n) => n.nome)
          .join(', ')}`
      );
      return;
    }

    setSalvando(true);

    try {
      await api.saveERPConfig(company.id, config);

      if (naturezas.length > 0) {
        await tinyNaturezaOperacaoService.saveBulk(
          company.id,
          naturezas.map((natureza) => ({
            naturezaOperacaoId: natureza.id,
            tinyValor: (tinyNaturezaMap[natureza.id] || '').trim(),
            tinyValorSimples: simplesEnabledMap[natureza.id]
              ? (tinyNaturezaSimplesMap[natureza.id] || '').trim() || null
              : null,
            ativo: true,
          }))
        );
      }
      
      toast.success('Configuração do ERP salva com sucesso!');
      
      // Atualizar localStorage para refletir mudanças
      if (config.ativo) {
        const empresaSelecionada = localStorage.getItem('empresaSelecionada');
        if (empresaSelecionada === company.id) {
          localStorage.setItem('tinyERPMode', 'REAL');
          toast.info('Sistema configurado para modo REAL. Recarregue a página para aplicar as mudanças.', {
            duration: 5000
          });
        }
      }
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configuração do ERP');
    } finally {
      setSalvando(false);
    }
  };

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Integração com Tiny ERP</DialogTitle>
          <DialogDescription>
            Configure a integração com o Tiny ERP para {company.nomeFantasia}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status da Integração */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base">Status da Integração</Label>
                <p className="text-sm text-muted-foreground">
                  Ative ou desative a integração com o Tiny ERP
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.ativo}
                  onCheckedChange={(checked) => setConfig({ ...config, ativo: checked })}
                />
                {config.ativo ? (
                  <Badge variant="default">Ativo</Badge>
                ) : (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </div>
            </div>

            {/* Instruções */}
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

            {/* Token de API */}
            <div className="space-y-2">
              <Label htmlFor="tinyToken">Token de API *</Label>
              <Input
                id="tinyToken"
                type="password"
                value={config.credenciais.token}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    credenciais: { ...config.credenciais, token: e.target.value },
                  })
                }
                placeholder="Digite seu token de API do Tiny ERP"
              />
            </div>

            {/* Botão Testar Conexão */}
            <div className="flex gap-2">
              <Button
                onClick={handleTestarConexao}
                disabled={testando || !config.credenciais.token}
                variant="outline"
                type="button"
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
            </div>

            {/* Resultado do Teste */}
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

            <Separator />

            {/* Envio Automático */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Envio Automático de Pedidos</h4>
                <p className="text-sm text-muted-foreground">
                  Configure o comportamento de envio automático de pedidos ao ERP
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="envioAuto" className="text-base">
                    Habilitar Envio Automático
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Os pedidos serão enviados automaticamente ao ERP após a criação
                  </p>
                </div>
                <Switch
                  id="envioAuto"
                  checked={config.envioAutomatico.habilitado}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      envioAutomatico: { ...config.envioAutomatico, habilitado: checked }
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tentativas">Tentativas Máximas</Label>
                  <Input
                    id="tentativas"
                    type="number"
                    min="1"
                    max="10"
                    value={config.envioAutomatico.tentativasMaximas}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        envioAutomatico: {
                          ...config.envioAutomatico,
                          tentativasMaximas: parseInt(e.target.value) || 3
                        }
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intervalo">Intervalo entre Tentativas (min)</Label>
                  <Input
                    id="intervalo"
                    type="number"
                    min="1"
                    max="60"
                    value={config.envioAutomatico.intervaloRetentativa}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        envioAutomatico: {
                          ...config.envioAutomatico,
                          intervaloRetentativa: parseInt(e.target.value) || 5
                        }
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Preferências */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Preferências de Integração</h4>
                <p className="text-sm text-muted-foreground">
                  Configure como os dados devem ser transmitidos ao ERP
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="transmitirOC" className="text-base">
                    Transmitir OC nas Observações
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    A Ordem de Compra será incluída nas observações ao transmitir a venda
                  </p>
                </div>
                <Switch
                  id="transmitirOC"
                  checked={config.preferencias.transmitirOC}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      preferencias: { ...config.preferencias, transmitirOC: checked }
                    })
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Mapeamento Natureza de Operação (Tiny por Empresa)</h4>
                <p className="text-sm text-muted-foreground">
                  Configure o valor de <code>natureza_operacao</code> do Tiny para cada natureza do ProSeller desta empresa.
                </p>
              </div>

              {loadingNaturezas ? (
                <p className="text-sm text-muted-foreground">Carregando naturezas...</p>
              ) : naturezas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma natureza ativa encontrada.</p>
              ) : (
                <div className="space-y-4">
                  {naturezas.map((natureza) => {
                    const simplesOn = Boolean(simplesEnabledMap[natureza.id]);
                    return (
                      <div key={natureza.id} className="border rounded-md p-3 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{natureza.nome}</p>
                            <p className="text-xs text-muted-foreground">Natureza ID {natureza.id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`simples-${natureza.id}`}
                              className="text-xs text-muted-foreground"
                            >
                              Habilitar natureza para Simples Nacional
                            </Label>
                            <Switch
                              id={`simples-${natureza.id}`}
                              checked={simplesOn}
                              onCheckedChange={(checked) => {
                                setSimplesEnabledMap((prev) => ({
                                  ...prev,
                                  [natureza.id]: checked,
                                }));
                                if (!checked) {
                                  setTinyNaturezaSimplesMap((prev) => {
                                    const next = { ...prev };
                                    delete next[natureza.id];
                                    return next;
                                  });
                                }
                              }}
                            />
                          </div>
                        </div>

                        <div className={`grid gap-3 ${simplesOn ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                          <div className="space-y-1">
                            <Label htmlFor={`tiny-${natureza.id}`} className="text-xs text-muted-foreground">
                              ID Tiny padrão
                            </Label>
                            <Input
                              id={`tiny-${natureza.id}`}
                              value={tinyNaturezaMap[natureza.id] || ''}
                              onChange={(e) =>
                                setTinyNaturezaMap((prev) => ({
                                  ...prev,
                                  [natureza.id]: e.target.value,
                                }))
                              }
                              placeholder="Ex: 5102 ou código da natureza no Tiny"
                            />
                          </div>

                          {simplesOn && (
                            <div className="space-y-1">
                              <Label
                                htmlFor={`tiny-simples-${natureza.id}`}
                                className="text-xs text-muted-foreground"
                              >
                                ID Tiny quando optante Simples
                              </Label>
                              <Input
                                id={`tiny-simples-${natureza.id}`}
                                value={tinyNaturezaSimplesMap[natureza.id] || ''}
                                onChange={(e) =>
                                  setTinyNaturezaSimplesMap((prev) => ({
                                    ...prev,
                                    [natureza.id]: e.target.value,
                                  }))
                                }
                                placeholder="Código da natureza no Tiny para clientes Simples"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Funcionalidades */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Funcionalidades Disponíveis:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Envio de pedidos de venda
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Sincronização de status
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Consulta de pedidos existentes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Importação de produtos e clientes
                </li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando || loading}>
            {salvando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configuração'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

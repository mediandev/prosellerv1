import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { api } from '../services/api';
import { toast } from 'sonner@2.0.3';
import { Bug, RefreshCw, Send, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export function VendaDebugger() {
  const [vendaId, setVendaId] = useState('venda-1765486455478');
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analiseTinyERP, setAnaliseTinyERP] = useState<any>(null);
  const [loadingTiny, setLoadingTiny] = useState(false);

  const handleDebug = async () => {
    try {
      setLoading(true);
      console.log('[DEBUG] Buscando venda:', vendaId);
      
      // 1. Buscar venda
      const venda = await api.getById('vendas', vendaId);
      console.log('[DEBUG] Venda encontrada:', venda);
      
      if (!venda) {
        toast.error('Venda não encontrada no banco de dados');
        setDebugData({ error: 'Venda não encontrada' });
        return;
      }
      
      // 2. Buscar configuração ERP da empresa
      let erpConfig = null;
      if (venda.empresaFaturamentoId) {
        try {
          erpConfig = await api.getERPConfig(venda.empresaFaturamentoId);
          console.log('[DEBUG] Config ERP:', erpConfig);
        } catch (error) {
          console.error('[DEBUG] Erro ao buscar config ERP:', error);
        }
      }
      
      // 3. Buscar empresa
      let empresa = null;
      if (venda.empresaFaturamentoId) {
        try {
          empresa = await api.getById('empresas', venda.empresaFaturamentoId);
          console.log('[DEBUG] Empresa:', empresa);
        } catch (error) {
          console.error('[DEBUG] Erro ao buscar empresa:', error);
        }
      }
      
      // 4. Montar relatório de debug
      const relatorio = {
        venda: {
          id: venda.id,
          numero: venda.numero,
          status: venda.status,
          createdAt: venda.createdAt,
          empresaFaturamentoId: venda.empresaFaturamentoId,
          nomeEmpresaFaturamento: venda.nomeEmpresaFaturamento,
          clienteId: venda.clienteId,
          nomeCliente: venda.nomeCliente,
          cnpjCliente: venda.cnpjCliente,
          valorPedido: venda.valorPedido,
          itens: venda.itens?.length || 0,
        },
        integracaoERP: venda.integracaoERP || null,
        erpConfig: erpConfig ? {
          tipo: erpConfig.tipo,
          ativo: erpConfig.ativo,
          hasToken: !!erpConfig.credenciais?.token,
          tokenPreview: erpConfig.credenciais?.token?.substring(0, 20) + '...',
          envioAutomatico: erpConfig.envioAutomatico,
        } : null,
        empresa: empresa ? {
          id: empresa.id,
          razaoSocial: empresa.razaoSocial,
          cnpj: empresa.cnpj,
          integracoesERP: empresa.integracoesERP?.map((erp: any) => ({
            erpNome: erp.erpNome,
            ativo: erp.ativo,
            hasToken: !!erp.apiToken,
            envioAutomatico: erp.envioAutomatico,
          })),
        } : null,
        diagnostico: {
          vendaSalva: true,
          empresaConfigurada: !!empresa,
          erpConfigurado: !!erpConfig,
          tokenConfigured: !!(erpConfig?.credenciais?.token),
          envioAutomaticoHabilitado: erpConfig?.envioAutomatico?.habilitado || false,
          foiEnviadoAoERP: !!(venda.integracaoERP?.erpPedidoId),
          statusIntegracao: venda.integracaoERP?.erpPedidoId 
            ? 'Enviado ao ERP' 
            : 'NÃO enviado ao ERP',
          podeAnalisarTiny: !!(venda.integracaoERP?.erpPedidoId && venda.empresaFaturamentoId)
        }
      };
      
      setDebugData(relatorio);
      toast.success('Debug concluído!');
      
    } catch (error: any) {
      console.error('[DEBUG] Erro:', error);
      toast.error(`Erro: ${error.message}`);
      setDebugData({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReenviar = async () => {
    if (!debugData?.venda) {
      toast.error('Execute o debug primeiro');
      return;
    }

    try {
      setLoading(true);
      toast.info('Reenviando pedido ao Tiny ERP...');
      
      // Buscar venda completa
      const venda = await api.getById('vendas', vendaId);
      
      if (!venda) {
        toast.error('Venda não encontrada');
        return;
      }
      
      // ✅ PROTEÇÃO: NÃO enviar pedidos com status "Rascunho"
      if (venda.status === 'Rascunho') {
        toast.error('Pedidos com status "Rascunho" não podem ser enviados ao ERP');
        setLoading(false);
        return;
      }
      
      // Buscar empresa
      const empresa = await api.getById('empresas', venda.empresaFaturamentoId);
      
      if (!empresa) {
        toast.error('Empresa não encontrada');
        return;
      }
      
      // Importar serviço de envio
      const { erpAutoSendService } = await import('../services/erpAutoSendService');
      
      const resultado = await erpAutoSendService.enviarVenda(venda, empresa);
      
      if (resultado.sucesso && resultado.erpPedidoId) {
        toast.success(`Pedido enviado com sucesso! ID: ${resultado.erpPedidoId}`);
        
        // Atualizar venda com dados de integração
        await api.update('vendas', vendaId, {
          integracaoERP: {
            erpPedidoId: resultado.erpPedidoId,
            erpStatus: 'em_aberto',
            dataEnvio: new Date().toISOString(),
            empresaFaturamentoId: venda.empresaFaturamentoId,
          }
        });
        
        // Atualizar debug
        handleDebug();
      } else {
        toast.error(`Erro ao enviar: ${resultado.erro}`);
      }
      
    } catch (error: any) {
      console.error('[DEBUG] Erro ao reenviar:', error);
      toast.error(`Erro ao reenviar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalisarTinyERP = async () => {
    if (!debugData?.venda) {
      toast.error('Execute o debug primeiro');
      return;
    }

    try {
      setLoadingTiny(true);
      toast.info('Analisando pedido no Tiny ERP...');
      
      // Buscar venda completa
      const venda = await api.getById('vendas', vendaId);
      
      if (!venda) {
        toast.error('Venda não encontrada');
        return;
      }
      
      // Buscar empresa
      const empresa = await api.getById('empresas', venda.empresaFaturamentoId);
      
      if (!empresa) {
        toast.error('Empresa não encontrada');
        return;
      }
      
      // Importar serviço de envio
      const { erpAutoSendService } = await import('../services/erpAutoSendService');
      
      const resultado = await erpAutoSendService.analisarVenda(venda, empresa);
      
      if (resultado.sucesso) {
        toast.success(`Análise concluída com sucesso!`);
        
        setAnaliseTinyERP(resultado);
      } else {
        toast.error(`Erro ao analisar: ${resultado.erro}`);
      }
      
    } catch (error: any) {
      console.error('[DEBUG] Erro ao analisar:', error);
      toast.error(`Erro ao analisar: ${error.message}`);
    } finally {
      setLoadingTiny(false);
    }
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Bug className="size-5 text-purple-600" />
        <h2 className="text-xl">Debug de Venda - Tiny ERP</h2>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          value={vendaId}
          onChange={(e) => setVendaId(e.target.value)}
          placeholder="ID da venda (ex: venda-1765486455478)"
          className="flex-1"
        />
        <Button onClick={handleDebug} disabled={loading}>
          {loading ? <RefreshCw className="size-4 animate-spin" /> : <Bug className="size-4" />}
          Debug
        </Button>
      </div>

      {debugData && (
        <div className="space-y-6">
          {/* Status Geral */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              {debugData.diagnostico?.foiEnviadoAoERP ? (
                <CheckCircle2 className="size-5 text-green-600" />
              ) : (
                <XCircle className="size-5 text-red-600" />
              )}
              Status: {debugData.diagnostico?.statusIntegracao || 'Desconhecido'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Venda salva:</span>
                <span className="ml-2">{debugData.diagnostico?.vendaSalva ? '✅ Sim' : '❌ Não'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Empresa configurada:</span>
                <span className="ml-2">{debugData.diagnostico?.empresaConfigurada ? '✅ Sim' : '❌ Não'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">ERP configurado:</span>
                <span className="ml-2">{debugData.diagnostico?.erpConfigurado ? '✅ Sim' : '❌ Não'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Token configurado:</span>
                <span className="ml-2">{debugData.diagnostico?.tokenConfigured ? '✅ Sim' : '❌ Não'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Envio automático:</span>
                <span className="ml-2">{debugData.diagnostico?.envioAutomaticoHabilitado ? '✅ Habilitado' : '❌ Desabilitado'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Enviado ao ERP:</span>
                <span className="ml-2">{debugData.diagnostico?.foiEnviadoAoERP ? '✅ Sim' : '❌ Não'}</span>
              </div>
            </div>
          </div>

          {/* Dados da Venda */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
            <h3 className="font-semibold mb-3">📋 Dados da Venda</h3>
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              <div>ID:</div>
              <div>{debugData.venda?.id}</div>
              <div>Número:</div>
              <div>{debugData.venda?.numero}</div>
              <div>Status:</div>
              <div>{debugData.venda?.status}</div>
              <div>Empresa:</div>
              <div>{debugData.venda?.nomeEmpresaFaturamento}</div>
              <div>Cliente:</div>
              <div>{debugData.venda?.nomeCliente}</div>
              <div>CNPJ:</div>
              <div>{debugData.venda?.cnpjCliente}</div>
              <div>Itens:</div>
              <div>{debugData.venda?.itens}</div>
              <div>Valor:</div>
              <div>R$ {debugData.venda?.valorPedido?.toFixed(2)}</div>
            </div>
          </div>

          {/* Integração ERP */}
          <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
            <h3 className="font-semibold mb-3">🔗 Integração ERP</h3>
            {debugData.integracaoERP ? (
              <div className="space-y-2 text-sm font-mono">
                <div>ERP Pedido ID: {debugData.integracaoERP.erpPedidoId || 'N/A'}</div>
                <div>ERP Número: {debugData.integracaoERP.erpNumero || 'N/A'}</div>
                <div>ERP Status: {debugData.integracaoERP.erpStatus || 'N/A'}</div>
                <div>Data Envio: {debugData.integracaoERP.dataEnvio || 'N/A'}</div>
                <div>Sinc. Automática: {debugData.integracaoERP.sincronizacaoAutomatica ? 'Sim' : 'Não'}</div>
              </div>
            ) : (
              <div className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <AlertTriangle className="size-4" />
                Pedido não foi enviado ao ERP
              </div>
            )}
          </div>

          {/* Configuração ERP */}
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
            <h3 className="font-semibold mb-3">⚙️ Configuração ERP</h3>
            {debugData.erpConfig ? (
              <div className="space-y-2 text-sm font-mono">
                <div>Tipo: {debugData.erpConfig.tipo}</div>
                <div>Ativo: {debugData.erpConfig.ativo ? 'Sim' : 'Não'}</div>
                <div>Token: {debugData.erpConfig.hasToken ? `${debugData.erpConfig.tokenPreview}` : 'Não configurado'}</div>
                <div>Envio Automático: {JSON.stringify(debugData.erpConfig.envioAutomatico, null, 2)}</div>
              </div>
            ) : (
              <div className="text-sm text-red-600 dark:text-red-400">
                ❌ Configuração ERP não encontrada
              </div>
            )}
          </div>

          {/* Empresa */}
          {debugData.empresa && (
            <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4">
              <h3 className="font-semibold mb-3">🏢 Empresa</h3>
              <div className="space-y-2 text-sm font-mono">
                <div>Razão Social: {debugData.empresa.razaoSocial}</div>
                <div>CNPJ: {debugData.empresa.cnpj}</div>
                <div>Integrações: {JSON.stringify(debugData.empresa.integracoesERP, null, 2)}</div>
              </div>
            </div>
          )}

          {/* Ações */}
          {!debugData.diagnostico?.foiEnviadoAoERP && debugData.diagnostico?.tokenConfigured && (
            <div className="flex justify-end gap-2">
              <Button onClick={handleReenviar} disabled={loading} variant="default">
                <Send className="size-4" />
                Reenviar ao Tiny ERP
              </Button>
            </div>
          )}

          {/* Análise Tiny ERP */}
          {debugData.diagnostico?.podeAnalisarTiny && (
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4 border-2 border-yellow-600">
              <h3 className="font-semibold mb-3 text-yellow-800 dark:text-yellow-200">🔍 Análise de Itens Faturados</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                Este pedido foi enviado ao Tiny ERP. Clique no botão abaixo para analisar se os itens faturados estão sendo carregados corretamente.
              </p>
              <Button onClick={handleAnalisarTinyERP} disabled={loadingTiny} variant="default" className="w-full">
                {loadingTiny ? <RefreshCw className="size-4 animate-spin mr-2" /> : <Bug className="size-4 mr-2" />}
                Analisar Itens Faturados no Tiny ERP
              </Button>
            </div>
          )}

          {/* Resultado Análise Tiny ERP */}
          {analiseTinyERP && (
            <>
              {analiseTinyERP.sucesso ? (
                <div className="space-y-4">
                  {/* Diagnóstico */}
                  <div className="bg-cyan-50 dark:bg-cyan-950 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">📊 Diagnóstico da Análise</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Pedido encontrado:</span>
                        <span className="ml-2">{analiseTinyERP.diagnostico?.pedidoEncontrado ? '✅ Sim' : '❌ Não'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Situação no Tiny:</span>
                        <span className="ml-2 font-semibold">{analiseTinyERP.diagnostico?.situacaoPedido || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Itens do pedido:</span>
                        <span className="ml-2">{analiseTinyERP.diagnostico?.itensPedido || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ID Nota Fiscal:</span>
                        <span className="ml-2 font-mono text-xs">{analiseTinyERP.diagnostico?.notaFiscalId || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">NF ID válido:</span>
                        <span className="ml-2">{analiseTinyERP.diagnostico?.notaFiscalIdValido ? '✅ Sim' : '❌ Não'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">NF encontrada:</span>
                        <span className="ml-2">{analiseTinyERP.diagnostico?.notaFiscalEncontrada ? '✅ Sim' : '❌ Não'}</span>
                      </div>
                      {analiseTinyERP.diagnostico?.motivoNF && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Motivo NF:</span>
                          <span className="ml-2 text-yellow-600 dark:text-yellow-400">{analiseTinyERP.diagnostico.motivoNF}</span>
                        </div>
                      )}
                      {analiseTinyERP.diagnostico?.erroNotaFiscal && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Erro NF:</span>
                          <span className="ml-2 text-red-600 dark:text-red-400">{analiseTinyERP.diagnostico.erroNotaFiscal}</span>
                        </div>
                      )}
                      {analiseTinyERP.diagnostico?.fonteDados && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Fonte dos dados:</span>
                          <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">{analiseTinyERP.diagnostico.fonteDados}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Itens Faturados */}
                  {analiseTinyERP.itensFaturados && analiseTinyERP.itensFaturados.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                      <h3 className="font-semibold mb-3">✅ Itens Faturados ({analiseTinyERP.itensFaturados.length})</h3>
                      <div className="space-y-3">
                        {analiseTinyERP.itensFaturados.slice(0, 5).map((item: any, idx: number) => (
                          <div key={idx} className="bg-white dark:bg-gray-900 rounded p-3 text-sm border">
                            <div className="font-semibold mb-2">{item.descricao || item.item?.descricao}</div>
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                              <div>SKU: {item.codigo || item.item?.codigo || 'N/A'}</div>
                              <div>EAN: {item.gtin || item.item?.gtin || item.codigo_ean || 'N/A'}</div>
                              <div>Qtd: {item.quantidade || item.item?.quantidade || 0}</div>
                              <div>Valor Un.: R$ {parseFloat(item.valor_unitario || item.item?.valor_unitario || 0).toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                        {analiseTinyERP.itensFaturados.length > 5 && (
                          <div className="text-sm text-muted-foreground text-center">
                            + {analiseTinyERP.itensFaturados.length - 5} item(ns) adicional(is)
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Estrutura Completa do Pedido */}
                  <details className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <summary className="font-semibold cursor-pointer hover:text-blue-600">
                      🔎 Ver estrutura completa do pedido (JSON)
                    </summary>
                    <pre className="mt-3 p-3 bg-black text-green-400 rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(analiseTinyERP.pedido, null, 2)}
                    </pre>
                  </details>

                  {/* Estrutura Completa da Nota Fiscal */}
                  {analiseTinyERP.notaFiscal && (
                    <details className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <summary className="font-semibold cursor-pointer hover:text-blue-600">
                        📄 Ver estrutura completa da nota fiscal (JSON)
                      </summary>
                      <pre className="mt-3 p-3 bg-black text-green-400 rounded text-xs overflow-auto max-h-96">
                        {JSON.stringify(analiseTinyERP.notaFiscal, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-red-600 dark:text-red-400 flex items-center gap-2">
                    <XCircle className="size-5" />
                    Erro na Análise
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">{analiseTinyERP.erro}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';
import { api } from '../services/api';
import { Bug, Trash2, RefreshCw } from 'lucide-react';

export function ComissionDebugger() {
  const [vendaId, setVendaId] = useState('venda-1765081145032');
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleDebug = async () => {
    try {
      setLoading(true);
      const response = await api.create('comissoesVendas/debug', { vendaId });
      setDebugData(response);
      toast.success('Debug realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no debug:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComissao = async () => {
    try {
      setLoading(true);
      await api.delete('comissoesVendas', vendaId);
      toast.success('Comissão deletada! Clique em "Calcular" para recalcular.');
      setDebugData(null);
    } catch (error: any) {
      console.error('Erro ao deletar:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalcular = async () => {
    try {
      setLoading(true);
      
      // 1. Deletar comissão existente
      await api.delete('comissoesVendas', vendaId);
      
      // 2. Recalcular
      const resultado = await api.create('comissoesVendas/calcular', {});
      
      toast.success('Comissão recalculada com sucesso!');
      
      // 3. Buscar debug novamente
      const response = await api.create('comissoesVendas/debug', { vendaId });
      setDebugData(response);
      
    } catch (error: any) {
      console.error('Erro ao recalcular:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Debug de Comissão
        </CardTitle>
        <CardDescription>
          Ferramenta de diagnóstico para investigar problemas no cálculo de comissões
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={vendaId}
            onChange={(e) => setVendaId(e.target.value)}
            placeholder="ID da venda"
          />
          <Button onClick={handleDebug} disabled={loading}>
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Button>
          <Button 
            onClick={handleDeleteComissao} 
            disabled={loading || !debugData?.comissaoExistente}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deletar
          </Button>
          <Button 
            onClick={handleRecalcular} 
            disabled={loading}
            variant="secondary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recalcular
          </Button>
        </div>

        {debugData && (
          <div className="space-y-4">
            {/* Venda */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">📄 Venda</h3>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(debugData.venda, null, 2)}
              </pre>
            </div>

            {/* Vendedor */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">👤 Vendedor</h3>
              <div className="text-sm space-y-1">
                <p><strong>Nome:</strong> {debugData.vendedor.nome}</p>
                <p><strong>Regra Aplicável:</strong> {debugData.vendedor.comissoes?.regraAplicavel || 'NÃO DEFINIDA'}</p>
                <p><strong>Alíquota Fixa:</strong> {debugData.vendedor.comissoes?.aliquotaFixa || 0}%</p>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  Ver estrutura completa
                </summary>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40 mt-2">
                  {debugData.vendedor.comissoesCompleta}
                </pre>
              </details>
            </div>

            {/* Lista de Preço */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">💰 Lista de Preço</h3>
              {debugData.listaPreco ? (
                <>
                  <div className="text-sm space-y-1">
                    <p><strong>Nome:</strong> {debugData.listaPreco.nome}</p>
                    <p><strong>Tipo de Comissão:</strong> {debugData.listaPreco.tipoComissao}</p>
                    {debugData.listaPreco.tipoComissao === 'fixa' && (
                      <p><strong>Percentual Fixo:</strong> {debugData.listaPreco.percentualFixo || 0}%</p>
                    )}
                    {debugData.listaPreco.tipoComissao === 'conforme_desconto' && (
                      <div>
                        <p><strong>Faixas de Desconto:</strong></p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40 mt-1">
                          {JSON.stringify(debugData.listaPreco.faixasDesconto, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Lista de preço não encontrada</p>
              )}
            </div>

            {/* Comissão Existente */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">✅ Comissão Existente</h3>
              {debugData.comissaoExistente ? (
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(debugData.comissaoExistente, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma comissão encontrada</p>
              )}
            </div>

            {/* Diagnóstico */}
            <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/10">
              <h3 className="font-semibold mb-2">🔍 Diagnóstico</h3>
              <div className="text-sm space-y-2">
                {/* Informações técnicas */}
                {debugData.diagnostico && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded">
                    <p className="font-medium mb-2">Informações Técnicas:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Total de listas disponíveis: {debugData.diagnostico.totalListasDisponiveis}</li>
                      <li>• Lista procurada: {debugData.diagnostico.listaPrecoIdProcurado || 'NÃO DEFINIDA'}</li>
                      <li>• Regra do vendedor: {debugData.diagnostico.regraVendedor || 'NÃO DEFINIDA'}</li>
                      <li>• Alíquota fixa: {debugData.diagnostico.aliquotaFixaVendedor || 0}%</li>
                    </ul>
                  </div>
                )}
                
                {debugData.vendedor.comissoes?.regraAplicavel === 'aliquota_fixa' && (
                  <div>
                    <p className="font-medium">✓ Regra: Alíquota Fixa do Vendedor</p>
                    <p>Percentual esperado: {debugData.vendedor.comissoes?.aliquotaFixa || 0}%</p>
                    <p>Comissão esperada: R$ {((debugData.venda.valorPedido * (debugData.vendedor.comissoes?.aliquotaFixa || 0)) / 100).toFixed(2)}</p>
                  </div>
                )}
                
                {debugData.vendedor.comissoes?.regraAplicavel === 'lista_preco' && debugData.listaPreco && (
                  <div>
                    <p className="font-medium">✓ Regra: Definida em Lista de Preço</p>
                    {debugData.listaPreco.tipoComissao === 'fixa' && (
                      <>
                        <p>Percentual esperado: {debugData.listaPreco.percentualFixo || 0}%</p>
                        <p>Comissão esperada: R$ {((debugData.venda.valorPedido * (debugData.listaPreco.percentualFixo || 0)) / 100).toFixed(2)}</p>
                      </>
                    )}
                    {debugData.listaPreco.tipoComissao === 'conforme_desconto' && (
                      <>
                        <p>Desconto padrão da venda: {debugData.venda.percentualDescontoPadrao}%</p>
                        {(() => {
                          const faixas = debugData.listaPreco.faixasDesconto || [];
                          const descontoPadrao = debugData.venda.percentualDescontoPadrao || 0;
                          const faixaEncontrada = faixas.find((f: any) => {
                            if (f.descontoMax === null) {
                              return descontoPadrao >= f.descontoMin;
                            }
                            return descontoPadrao >= f.descontoMin && descontoPadrao <= f.descontoMax;
                          });
                          
                          if (faixaEncontrada) {
                            return (
                              <>
                                <p className="text-green-600">Faixa encontrada: {faixaEncontrada.descontoMin}% a {faixaEncontrada.descontoMax !== null ? faixaEncontrada.descontoMax + '%' : 'acima'}</p>
                                <p>Percentual esperado: {faixaEncontrada.percentualComissao}%</p>
                                <p>Comissão esperada: R$ {((debugData.venda.valorPedido * faixaEncontrada.percentualComissao) / 100).toFixed(2)}</p>
                              </>
                            );
                          } else {
                            return <p className="text-red-600">⚠️ Nenhuma faixa compatível encontrada!</p>;
                          }
                        })()}
                      </>
                    )}
                  </div>
                )}
                
                {!debugData.vendedor.comissoes?.regraAplicavel && (
                  <p className="text-red-600">❌ Vendedor não possui regra de comissão definida!</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
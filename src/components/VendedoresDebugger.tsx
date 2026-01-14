import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner@2.0.3';
import { api } from '../services/api';
import { Users, RefreshCw, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function VendedoresDebugger() {
  const [vendedores, setVendedores] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [normalizing, setNormalizing] = useState(false);

  const handleDebug = async () => {
    try {
      setLoading(true);
      const response = await api.get('vendedores/debug');
      setVendedores(response);
      toast.success('Debug realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no debug:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNormalizarComissoes = async () => {
    try {
      setNormalizing(true);
      toast.loading('Normalizando estrutura de comissões...', { id: 'normalizar' });
      
      const response = await api.post('vendedores/normalizar-comissoes', {});
      
      toast.success(response.message, { id: 'normalizar' });
      
      // Recarregar dados após normalização
      await handleDebug();
      
    } catch (error: any) {
      console.error('Erro na normalização:', error);
      toast.error(`Erro: ${error.message}`, { id: 'normalizar' });
    } finally {
      setNormalizing(false);
    }
  };

  const isRegraValida = (regra: string | undefined) => {
    return regra === 'aliquota_fixa' || regra === 'lista_preco';
  };

  const hasProblemas = vendedores?.vendedores?.some((v: any) => !isRegraValida(v.regraAplicavel));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Debug de Vendedores
        </CardTitle>
        <CardDescription>
          Verificar regras de comissão de todos os vendedores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={handleDebug} 
            disabled={loading || normalizing}
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Buscar Vendedores
          </Button>

          {vendedores && hasProblemas && (
            <Button 
              onClick={handleNormalizarComissoes} 
              disabled={loading || normalizing}
              variant="default"
              className="flex-1"
            >
              <Wrench className={`h-4 w-4 mr-2 ${normalizing ? 'animate-spin' : ''}`} />
              Corrigir Estrutura
            </Button>
          )}
        </div>

        {vendedores && (
          <div className="space-y-4 mt-4">
            {/* Alerta se houver problemas */}
            {hasProblemas && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                    Estrutura de Comissões Incorreta Detectada
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    Alguns vendedores possuem estrutura de comissões antiga ou inválida. 
                    Clique em "Corrigir Estrutura" para normalizar os dados.
                  </p>
                </div>
              </div>
            )}

            {/* Status OK */}
            {!hasProblemas && (
              <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900 dark:text-green-100">
                    Estrutura de Comissões OK
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Todos os vendedores possuem estrutura de comissões válida.
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded border">
              <p className="font-medium">Total de vendedores: {vendedores.total}</p>
            </div>

            <div className="space-y-2">
              {vendedores.vendedores.map((v: any) => {
                const regraValida = isRegraValida(v.regraAplicavel);
                
                return (
                  <div 
                    key={v.id} 
                    className={`border rounded-lg p-4 ${
                      regraValida 
                        ? 'bg-gray-50 dark:bg-gray-900/10' 
                        : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{v.nome}</h3>
                      <span className="text-xs text-muted-foreground">{v.id}</span>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Regra:</span>
                        <span className={`font-medium ${regraValida ? 'text-green-600' : 'text-red-500'}`}>
                          {regraValida ? (
                            <>
                              {v.regraAplicavel === 'aliquota_fixa' ? (
                                <>✓ Alíquota Fixa</>
                              ) : (
                                <>✓ Lista de Preço</>
                              )}
                            </>
                          ) : (
                            <>❌ NÃO DEFINIDA</>
                          )}
                        </span>
                      </div>
                      
                      {v.regraAplicavel === 'aliquota_fixa' && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Alíquota:</span>
                          <span className="font-medium">{v.aliquotaFixa || 0}%</span>
                        </div>
                      )}
                      
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                          Ver objeto completo
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                          {JSON.stringify(v.comissoes, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
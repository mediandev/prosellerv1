import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Wrench, AlertTriangle, CheckCircle2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
// Configuração do Supabase removida - funcionalidade desabilitada
import { getAuthToken } from '../services/api';

export function DataMaintenanceTools() {
  const [loading, setLoading] = useState(false);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [diagnostico, setDiagnostico] = useState<any>(null);

  const diagnosticarVendasSemClienteId = async () => {
    try {
      setLoadingDiag(true);
      setDiagnostico(null);
      
      const token = getAuthToken();
      
      if (!token) {
        toast.error('Você precisa estar autenticado para executar esta operação');
        return;
      }
      
      console.log('[DIAGNÓSTICO] Enviando requisição para o servidor...');
      
      // Funcionalidade desabilitada - Supabase removido
      toast.error('Funcionalidade desabilitada. Supabase foi removido do projeto.');
      setDiagnostico({ success: false, message: 'Funcionalidade desabilitada' });
    } catch (error) {
      console.error('[DIAGNÓSTICO] Erro:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao executar diagnóstico');
    } finally {
      setLoadingDiag(false);
    }
  };

  const corrigirVendasSemClienteId = async () => {
    try {
      setLoading(true);
      setResultado(null);
      
      const token = getAuthToken();
      console.log('[MANUTENÇÃO] Token obtido:', token ? 'Presente' : 'Ausente');
      console.log('[MANUTENÇÃO] Primeiros caracteres do token:', token?.substring(0, 30));
      
      if (!token) {
        toast.error('Você precisa estar autenticado para executar esta operação');
        return;
      }
      
      console.log('[MANUTENÇÃO] Enviando requisição para o servidor...');
      
      // Funcionalidade desabilitada - Supabase removido
      toast.error('Funcionalidade desabilitada. Supabase foi removido do projeto.');
      setResultado({ success: false, message: 'Funcionalidade desabilitada' });
    } catch (error) {
      console.error('[MANUTENÇÃO] Erro ao corrigir vendas:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao executar correção. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">Ferramentas de Manutenção de Dados</h3>
        <p className="text-sm text-muted-foreground">
          Utilitários para corrigir inconsistências e migrar dados legados
        </p>
      </div>

      {/* Correção de Vendas sem ClienteId */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Corrigir Vendas sem ClienteId
              </CardTitle>
              <CardDescription className="mt-2">
                Identifica vendas que não possuem clienteId associado e tenta vinculá-las automaticamente
                aos clientes existentes através da correspondência do nome.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Esta operação busca clientes pelo nome exato (ignorando maiúsculas/minúsculas e espaços).
              Vendas cujos clientes não forem encontrados permanecerão sem clienteId.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={corrigirVendasSemClienteId}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4 mr-2" />
                Executar Correção
              </>
            )}
          </Button>

          {/* Resultado da Correção */}
          {resultado && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {resultado.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">{resultado.message}</span>
              </div>

              {(resultado.corrigidas > 0 || resultado.naoCorrigidas > 0) && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Vendas Corrigidas</p>
                    <p className="text-2xl font-bold text-green-600">{resultado.corrigidas}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Não Encontradas</p>
                    <p className="text-2xl font-bold text-amber-600">{resultado.naoCorrigidas}</p>
                  </div>
                </div>
              )}

              {resultado.detalhes && resultado.detalhes.length > 0 && (
                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <h4 className="font-medium mb-3 text-sm">Detalhes da Correção:</h4>
                  <div className="space-y-2">
                    {resultado.detalhes.map((item: any, index: number) => {
                      // Determinar variante do badge baseado no status
                      const getBadgeVariant = (status: string) => {
                        if (status === 'corrigida') return 'default';
                        if (status === 'não encontrado') return 'secondary';
                        if (status === 'sem nome de cliente' || status === 'nome vazio') return 'destructive';
                        return 'outline';
                      };
                      
                      return (
                        <div key={index} className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.nomeCliente}</p>
                            <p className="text-xs text-muted-foreground">Venda ID: {item.vendaId}</p>
                          </div>
                          <Badge variant={getBadgeVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnóstico de Vendas sem ClienteId */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Diagnóstico de Vendas sem ClienteId
              </CardTitle>
              <CardDescription className="mt-2">
                Identifica vendas que não possuem clienteId associado e exibe um resumo do problema.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Esta operação busca clientes pelo nome exato (ignorando maiúsculas/minúsculas e espaços).
              Vendas cujos clientes não forem encontrados permanecerão sem clienteId.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={diagnosticarVendasSemClienteId}
            disabled={loadingDiag}
            className="w-full sm:w-auto"
          >
            {loadingDiag ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Executar Diagnóstico
              </>
            )}
          </Button>

          {/* Resultado do Diagnóstico */}
          {diagnostico && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {diagnostico.vendasSemClienteId === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
                <span className="font-medium">{diagnostico.message}</span>
              </div>

              {(diagnostico.vendasSemClienteId > 0) && (
                <>
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Vendas sem ClienteId</p>
                      <p className="text-2xl font-bold text-amber-600">{diagnostico.vendasSemClienteId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Podem ser Corrigidas</p>
                      <p className="text-2xl font-bold text-green-600">{diagnostico.podeCorrigir || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente Não Encontrado</p>
                      <p className="text-2xl font-bold text-red-600">{diagnostico.naoEncontrados || 0}</p>
                    </div>
                  </div>
                  
                  {diagnostico.podeCorrigir > 0 && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Ação Recomendada:</strong> Execute a correção automática acima para associar {diagnostico.podeCorrigir} vendas aos clientes corretos.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              {diagnostico.vendas && diagnostico.vendas.length > 0 && (
                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <h4 className="font-medium mb-3 text-sm">Detalhes das Vendas sem ClienteId:</h4>
                  <div className="space-y-2">
                    {diagnostico.vendas.map((item: any, index: number) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-muted/30 rounded text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{item.nomeCliente}</p>
                            {item.podeCorrigir && (
                              <Badge variant="default" className="text-xs">
                                ✓ Pode corrigir
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Venda: {item.numero} | Data: {item.data} | Valor: R$ {item.valorPedido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          {item.clienteIdSugerido && (
                            <p className="text-xs text-green-600 mt-1">→ Será associado a: {item.razaoSocialSugerida}</p>
                          )}
                          {!item.podeCorrigir && (
                            <p className="text-xs text-red-600 mt-1">⚠️ Cliente não encontrado no cadastro</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Informativo */}
      <Card>
        <CardHeader>
          <CardTitle>ℹ️ Sobre estas Ferramentas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Estas ferramentas foram criadas para auxiliar na manutenção e correção de dados legados
            que podem estar inconsistentes após migrações ou importações.
          </p>
          <p>
            <strong>Recomendações:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Execute estas correções em horários de baixo uso do sistema</li>
            <li>Sempre verifique os logs do servidor após executar correções</li>
            <li>Mantenha backups atualizados antes de executar operações de manutenção</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
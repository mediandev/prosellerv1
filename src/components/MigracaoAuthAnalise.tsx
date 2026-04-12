import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { AlertCircle, CheckCircle, Info, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { toast } from "sonner@2.0.3";

interface AnaliseResult {
  usuarios: any[];
  vendas: any[];
  vendedoresNasVendas: { nome: string; id: string; count: number }[];
  inconsistencias: { tipo: string; mensagem: string }[];
}

export function MigracaoAuthAnalise() {
  const [loading, setLoading] = useState(false);
  const [analise, setAnalise] = useState<AnaliseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [corrigindoVendedor, setCorrigindoVendedor] = useState(false);

  const analisarDados = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[ANALISE] Iniciando análise de dados...');
      
      // Buscar usuários do KV store
      const usuarios = await api.get('usuarios');
      console.log('[ANALISE] Usuários encontrados:', usuarios.length);
      
      // Buscar vendas do KV store
      const vendas = await api.get('vendas');
      console.log('[ANALISE] Vendas encontradas:', vendas.length);
      
      // Mapear vendedores únicos nas vendas
      const vendedoresMap = new Map<string, { nome: string; id: string; count: number }>();
      
      vendas.forEach((venda: any) => {
        const key = `${venda.vendedorId}|${venda.nomeVendedor}`;
        if (vendedoresMap.has(key)) {
          const existing = vendedoresMap.get(key)!;
          existing.count++;
        } else {
          vendedoresMap.set(key, {
            nome: venda.nomeVendedor,
            id: venda.vendedorId,
            count: 1
          });
        }
      });
      
      const vendedoresNasVendas = Array.from(vendedoresMap.values());
      
      // Identificar inconsistências
      const inconsistencias: { tipo: string; mensagem: string }[] = [];
      
      // Verificar se há vendas com vendedorId mock
      const vendasComMockId = vendas.filter((v: any) => 
        v.vendedorId && v.vendedorId.startsWith('user-')
      );
      
      if (vendasComMockId.length > 0) {
        inconsistencias.push({
          tipo: 'warning',
          mensagem: `${vendasComMockId.length} vendas com vendedorId MOCK (user-X)`
        });
      }
      
      // Verificar se há usuários mock
      const usuariosMock = usuarios.filter((u: any) => 
        u.id && u.id.startsWith('user-')
      );
      
      if (usuariosMock.length > 0) {
        inconsistencias.push({
          tipo: 'warning',
          mensagem: `${usuariosMock.length} usuários com ID MOCK no KV store`
        });
      }
      
      // Verificar vendedores sem usuário correspondente
      vendedoresNasVendas.forEach(vendedor => {
        const usuarioExiste = usuarios.find((u: any) => u.id === vendedor.id);
        if (!usuarioExiste) {
          inconsistencias.push({
            tipo: 'error',
            mensagem: `Vendedor "${vendedor.nome}" (ID: ${vendedor.id}) tem ${vendedor.count} vendas mas não existe como usuário`
          });
        }
      });
      
      // Verificar se há vendedores com mesmo nome mas IDs diferentes
      const nomeMap = new Map<string, string[]>();
      vendedoresNasVendas.forEach(v => {
        if (!nomeMap.has(v.nome)) {
          nomeMap.set(v.nome, []);
        }
        nomeMap.get(v.nome)!.push(v.id);
      });
      
      nomeMap.forEach((ids, nome) => {
        if (ids.length > 1) {
          inconsistencias.push({
            tipo: 'error',
            mensagem: `Vendedor "${nome}" aparece com ${ids.length} IDs diferentes: ${ids.join(', ')}`
          });
        }
      });
      
      setAnalise({
        usuarios,
        vendas,
        vendedoresNasVendas,
        inconsistencias
      });
      
    } catch (err: any) {
      console.error('[ANALISE] Erro ao analisar dados:', err);
      setError(err.message || 'Erro ao analisar dados');
    } finally {
      setLoading(false);
    }
  };

  const corrigirVendedorOrfao = async (vendedorOrigemId: string, vendedorOrigemNome: string) => {
    try {
      setCorrigindoVendedor(true);
      
      // Buscar João Silva
      const joaoSilva = analise?.usuarios.find(u => u.nome === 'João Silva');
      if (!joaoSilva) {
        toast.error('Vendedor "João Silva" não encontrado');
        return;
      }

      console.log('[CORRIGIR] Migrando vendas de', vendedorOrigemNome, 'para João Silva');
      
      const result = await api.corrigirVendedorOrfao(vendedorOrigemId, joaoSilva.id);
      
      toast.success(`✅ ${result.mensagem}`);
      
      // Reexecutar análise
      await analisarDados();
      
    } catch (err: any) {
      console.error('[CORRIGIR] Erro:', err);
      toast.error(err.message || 'Erro ao corrigir vendedor órfão');
    } finally {
      setCorrigindoVendedor(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Análise de Migração de Autenticação</CardTitle>
          <CardDescription>
            Analise o estado atual dos dados antes de migrar para autenticação 100% real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={analisarDados} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Analisando...' : 'Analisar Dados do Supabase'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {analise && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{analise.usuarios.length}</div>
                      <div className="text-sm text-muted-foreground">Usuários no KV</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{analise.vendas.length}</div>
                      <div className="text-sm text-muted-foreground">Vendas no KV</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{analise.vendedoresNasVendas.length}</div>
                      <div className="text-sm text-muted-foreground">Vendedores Únicos</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Inconsistências */}
              {analise.inconsistencias.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Inconsistências Encontradas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analise.inconsistencias.map((inc, idx) => (
                      <Alert key={idx} variant={inc.tipo === 'error' ? 'destructive' : 'default'}>
                        {inc.tipo === 'error' ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Info className="h-4 w-4" />
                        )}
                        <AlertDescription>{inc.mensagem}</AlertDescription>
                      </Alert>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Vendedores nas Vendas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vendedores nas Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analise.vendedoresNasVendas.map((vendedor, idx) => {
                      const usuarioExiste = analise.usuarios.find(u => u.id === vendedor.id);
                      const isMockId = vendedor.id.startsWith('user-');
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex-1">
                            <div className="font-medium">{vendedor.nome || '(sem nome)'}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {vendedor.id || '(vazio)'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {vendedor.count} vendas
                            </Badge>
                            {isMockId && (
                              <Badge variant="secondary">ID Mock</Badge>
                            )}
                            {usuarioExiste ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Usuário existe
                              </Badge>
                            ) : (
                              <>
                                <Badge variant="destructive">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Usuário não existe
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => corrigirVendedorOrfao(vendedor.id, vendedor.nome)}
                                  disabled={corrigindoVendedor}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Migrar para João Silva
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Usuários no KV */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Usuários no KV Store</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analise.usuarios.map((usuario, idx) => {
                      const isMockId = usuario.id.startsWith('user-');
                      const temVendas = analise.vendedoresNasVendas.find(v => v.id === usuario.id);
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex-1">
                            <div className="font-medium">{usuario.nome}</div>
                            <div className="text-sm text-muted-foreground">
                              {usuario.email} • {usuario.tipo}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ID: {usuario.id}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isMockId && (
                              <Badge variant="secondary">ID Mock</Badge>
                            )}
                            {temVendas && (
                              <Badge variant="outline">
                                {temVendas.count} vendas
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Instruções */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Próximos Passos:</strong> Após analisar os dados acima, você poderá executar a migração
                  para criar usuários reais no Supabase Auth e atualizar os vendedorId nas vendas.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
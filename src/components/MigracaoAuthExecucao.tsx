import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { AlertCircle, CheckCircle, Info, Loader2 } from "lucide-react";
import { api } from "../services/api";
import { toast } from "sonner@2.0.3";

interface MigracaoLog {
  etapa: string;
  status: 'pendente' | 'executando' | 'sucesso' | 'erro';
  mensagem: string;
  detalhes?: any;
}

// Função auxiliar para gerar email válido a partir do nome
function gerarEmailValido(nome: string): string {
  // Remove acentos
  const semAcentos = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Converte para lowercase e remove caracteres especiais (mantém apenas letras, números e espaços)
  const limpo = semAcentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
  
  // Converte espaços em pontos
  let email = limpo.replace(/\s+/g, '.');
  
  // Remove pontos duplicados
  email = email.replace(/\.+/g, '.');
  
  // Remove pontos no início e fim
  email = email.replace(/^\.|\.$/g, '');
  
  // Se ficou vazio, usa default
  if (!email) {
    email = 'usuario' + Date.now();
  }
  
  // Limita o tamanho (antes do @)
  if (email.length > 50) {
    email = email.substring(0, 50);
  }
  
  return email + '@empresa.com';
}

export function MigracaoAuthExecucao() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<MigracaoLog[]>([]);
  const [progresso, setProgresso] = useState(0);

  const addLog = (etapa: string, status: MigracaoLog['status'], mensagem: string, detalhes?: any) => {
    setLogs(prev => [...prev, { etapa, status, mensagem, detalhes }]);
    console.log(`[MIGRACAO] ${etapa}: ${mensagem}`, detalhes || '');
  };

  const executarMigracao = async () => {
    setLoading(true);
    setLogs([]);
    setProgresso(0);
    
    try {
      // ETAPA 1: Buscar dados atuais
      addLog('Análise', 'executando', 'Carregando dados do Supabase...');
      setProgresso(10);
      
      const usuarios = await api.get('usuarios');
      const vendas = await api.get('vendas');
      
      addLog('Análise', 'sucesso', `${usuarios.length} usuários e ${vendas.length} vendas encontrados`);
      setProgresso(20);
      
      // ETAPA 2: Mapear vendedores únicos
      addLog('Mapeamento', 'executando', 'Identificando vendedores nas vendas...');
      
      const vendedoresMap = new Map<string, { nome: string; email: string; ids: Set<string>; vendas: number }>();
      
      vendas.forEach((venda: any) => {
        const nome = venda.nomeVendedor;
        if (!vendedoresMap.has(nome)) {
          vendedoresMap.set(nome, {
            nome,
            email: '', // Será inferido
            ids: new Set(),
            vendas: 0
          });
        }
        const vendedor = vendedoresMap.get(nome)!;
        vendedor.ids.add(venda.vendedorId);
        vendedor.vendas++;
      });
      
      addLog('Mapeamento', 'sucesso', `${vendedoresMap.size} vendedores únicos identificados`, 
        Array.from(vendedoresMap.entries()).map(([nome, data]) => ({
          nome,
          idsDistintos: Array.from(data.ids),
          totalVendas: data.vendas
        }))
      );
      setProgresso(30);
      
      // ETAPA 3: Criar/verificar usuários no Supabase Auth
      addLog('Usuários', 'executando', 'Verificando usuários no Supabase Auth...');
      
      const usuariosParaCriar = [];
      const mapeamentoIds = new Map<string, string>(); // oldId -> newId
      
      for (const [nomeVendedor, data] of vendedoresMap.entries()) {
        // Tentar encontrar usuário existente no KV por nome
        let usuarioExistente = usuarios.find((u: any) => u.nome === nomeVendedor);
        
        if (usuarioExistente) {
          // Usuário já existe, mapear todos os IDs antigos para o novo
          data.ids.forEach(oldId => {
            mapeamentoIds.set(oldId, usuarioExistente.id);
          });
          addLog('Usuários', 'sucesso', `Usuário "${nomeVendedor}" já existe (ID: ${usuarioExistente.id})`);
        } else {
          // Usuário não existe, precisará ser criado
          // Gerar email baseado no nome
          const email = gerarEmailValido(nomeVendedor);
          
          usuariosParaCriar.push({
            nome: nomeVendedor,
            email,
            senha: 'senha123', // Senha padrão temporária
            tipo: 'vendedor',
            idsAntigos: Array.from(data.ids)
          });
        }
      }
      
      setProgresso(40);
      
      // Criar usuários que não existem
      if (usuariosParaCriar.length > 0) {
        addLog('Criação', 'executando', `Criando ${usuariosParaCriar.length} novos usuários no Supabase Auth...`);
        
        for (const usuario of usuariosParaCriar) {
          try {
            // Log do email gerado para debug
            console.log('[MIGRACAO] Criando usuário:', {
              nome: usuario.nome,
              email: usuario.email,
              tipo: usuario.tipo
            });
            
            const resultado = await api.auth.signup(
              usuario.email,
              usuario.senha,
              usuario.nome,
              usuario.tipo
            );
            
            // Mapear IDs antigos para o novo ID
            usuario.idsAntigos.forEach(oldId => {
              mapeamentoIds.set(oldId, resultado.user.id);
            });
            
            addLog('Criação', 'sucesso', 
              `Usuário "${usuario.nome}" criado (ID: ${resultado.user.id})`,
              { email: usuario.email, senha: usuario.senha }
            );
          } catch (error: any) {
            addLog('Criação', 'erro', 
              `Erro ao criar usuário "${usuario.nome}" (${usuario.email}): ${error.message}`,
              { usuario, error: error.message }
            );
          }
        }
      } else {
        addLog('Criação', 'sucesso', 'Todos os usuários já existem no Supabase');
      }
      
      setProgresso(60);
      
      // ETAPA 4: Atualizar vendedorId nas vendas
      addLog('Atualização', 'executando', `Atualizando vendedorId em ${vendas.length} vendas...`);
      
      let vendasAtualizadas = 0;
      let vendasComErro = 0;
      
      for (const venda of vendas) {
        const novoId = mapeamentoIds.get(venda.vendedorId);
        
        if (novoId && novoId !== venda.vendedorId) {
          try {
            await api.update('vendas', venda.id, {
              ...venda,
              vendedorId: novoId
            });
            vendasAtualizadas++;
            
            if (vendasAtualizadas % 10 === 0) {
              setProgresso(60 + (vendasAtualizadas / vendas.length) * 30);
            }
          } catch (error: any) {
            vendasComErro++;
            console.error('[MIGRACAO] Erro ao atualizar venda:', venda.id, error);
          }
        }
      }
      
      addLog('Atualização', 'sucesso', 
        `${vendasAtualizadas} vendas atualizadas com sucesso` + 
        (vendasComErro > 0 ? `, ${vendasComErro} com erro` : '')
      );
      setProgresso(90);
      
      // ETAPA 5: Resumo final
      addLog('Resumo', 'sucesso', 'Migração concluída com sucesso!', {
        usuariosCriados: usuariosParaCriar.length,
        vendasAtualizadas,
        mapeamentos: Array.from(mapeamentoIds.entries()).map(([old, novo]) => ({
          idAntigo: old,
          idNovo: novo
        }))
      });
      setProgresso(100);
      
      toast.success('Migração concluída com sucesso!');
      
    } catch (err: any) {
      console.error('[MIGRACAO] Erro durante migração:', err);
      addLog('Erro', 'erro', `Erro fatal: ${err.message}`, err);
      toast.error('Erro durante a migração');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: MigracaoLog['status']) => {
    switch (status) {
      case 'pendente':
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
      case 'executando':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'sucesso':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'erro':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: MigracaoLog['status']) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline">Pendente</Badge>;
      case 'executando':
        return <Badge variant="default" className="bg-blue-500">Executando...</Badge>;
      case 'sucesso':
        return <Badge variant="default" className="bg-green-500">Sucesso</Badge>;
      case 'erro':
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Execução da Migração</CardTitle>
          <CardDescription>
            Migração automática de autenticação MOCK para REAL com Supabase Auth
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Esta operação irá:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Criar usuários reais no Supabase Auth para cada vendedor</li>
                <li>Atualizar o campo vendedorId em todas as vendas</li>
                <li>Mapear IDs mock (user-X) para IDs reais do Supabase</li>
                <li>Preparar o sistema para remoção completa do código mock</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button 
            onClick={executarMigracao} 
            disabled={loading}
            className="w-full"
            variant={loading ? "secondary" : "default"}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executando Migração...
              </>
            ) : (
              'Executar Migração Completa'
            )}
          </Button>

          {loading && progresso > 0 && (
            <div className="space-y-2">
              <Progress value={progresso} className="w-full" />
              <div className="text-sm text-center text-muted-foreground">
                {progresso}% concluído
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Log de Execução</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded">
                      <div className="mt-0.5">
                        {getStatusIcon(log.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{log.etapa}</span>
                          {getStatusBadge(log.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {log.mensagem}
                        </div>
                        {log.detalhes && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Ver detalhes
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(log.detalhes, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
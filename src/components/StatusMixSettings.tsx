import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Save, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { api } from '../services/api';
import { ConfiguracaoStatusMix } from '../types/statusMix';

export function StatusMixSettings() {
  const [config, setConfig] = useState<ConfiguracaoStatusMix>({
    id: 'config-status-mix',
    desativarAutomaticamente: false,
    diasSemPedido: 90,
    dataAtualizacao: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [executandoVerificacao, setExecutandoVerificacao] = useState(false);

  useEffect(() => {
    carregarConfiguracao();
  }, []);

  const carregarConfiguracao = async () => {
    setLoading(true);
    try {
      const data = await api.configStatusMix.get();
      setConfig(data);
    } catch (error) {
      console.error('[CONFIG STATUS MIX] Erro ao carregar:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    // Validação
    if (config.desativarAutomaticamente && config.diasSemPedido < 1) {
      toast.error('Quantidade de dias deve ser maior que zero');
      return;
    }

    setSalvando(true);
    try {
      const updated = await api.configStatusMix.update(config);
      setConfig(updated);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('[CONFIG STATUS MIX] Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSalvando(false);
    }
  };

  const handleExecutarVerificacao = async () => {
    setExecutandoVerificacao(true);
    try {
      const result = await api.statusMix.verificarInativos();
      
      if (result.desativados > 0) {
        toast.success(`${result.desativados} produto(s) desativado(s) automaticamente`);
      } else if (result.message) {
        toast.info(result.message);
      } else {
        toast.info('Nenhum produto foi desativado');
      }
    } catch (error) {
      console.error('[STATUS MIX] Erro ao verificar:', error);
      toast.error('Erro ao executar verificação');
    } finally {
      setExecutandoVerificacao(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Mix - Automação</CardTitle>
          <CardDescription>Carregando configurações...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Mix - Automação</CardTitle>
        <CardDescription>
          Configure a desativação automática de produtos do mix dos clientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informação sobre o Status Mix */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Status Mix</strong> identifica quais produtos fazem parte do mix de cada cliente.
            <br />
            <br />
            <strong>Ativação:</strong> Um produto é ativado automaticamente quando há um pedido concluído
            contendo esse produto para o cliente, ou quando é ativado manualmente na aba "Mix" do cadastro
            do cliente.
            <br />
            <br />
            <strong>Desativação:</strong> Configure abaixo se deseja desativar produtos automaticamente
            quando o cliente passar um período sem fazer pedidos desse produto.
          </AlertDescription>
        </Alert>

        {/* Configurações */}
        <div className="space-y-4">
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="desativar-auto" className="text-base">
                Desativar produtos automaticamente
              </Label>
              <p className="text-sm text-muted-foreground">
                Produtos que ficarem sem pedidos por um período específico serão desativados
                automaticamente do mix do cliente
              </p>
            </div>
            <Switch
              id="desativar-auto"
              checked={config.desativarAutomaticamente}
              onCheckedChange={(checked) =>
                setConfig({ ...config, desativarAutomaticamente: checked })
              }
            />
          </div>

          {config.desativarAutomaticamente && (
            <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
              <Label htmlFor="dias-sem-pedido">
                Quantidade de dias sem pedido para desativação
              </Label>
              <Input
                id="dias-sem-pedido"
                type="number"
                min="1"
                value={config.diasSemPedido}
                onChange={(e) =>
                  setConfig({ ...config, diasSemPedido: parseInt(e.target.value) || 1 })
                }
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">
                Produtos que não tiverem pedidos há mais de {config.diasSemPedido} dias serão
                automaticamente desativados do mix (exceto produtos ativados manualmente)
              </p>
            </div>
          )}
        </div>

        {/* Verificação Manual */}
        {config.desativarAutomaticamente && (
          <div className="space-y-3 rounded-lg border p-4 bg-blue-50">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">Executar verificação manual</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Executa a verificação e desativação de produtos inativos com base nas configurações
                  acima. Esta ação pode ser executada manualmente sempre que necessário.
                </p>
              </div>
            </div>
            <Button
              onClick={handleExecutarVerificacao}
              disabled={executandoVerificacao}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {executandoVerificacao ? (
                <>
                  <Play className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Executar Verificação Agora
                </>
              )}
            </Button>
          </div>
        )}

        {/* Informação sobre produtos ativados manualmente */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> Produtos que foram ativados manualmente (marcados como ativos
            pelo usuário na aba "Mix") <strong>nunca serão desativados automaticamente</strong>,
            independentemente do tempo sem pedidos.
          </AlertDescription>
        </Alert>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

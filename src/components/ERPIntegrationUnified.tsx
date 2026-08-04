import { useState, useEffect } from 'react';
import { tinyERPSyncService, ConfiguracaoSincronizacaoEmpresa, HistoricoSincronizacao } from '../services/tinyERPSync';
import { Company, CompanyERPConfig } from '../types/company';
import { useCompanies } from '../hooks/useCompanies';
import { companyService } from '../services/companyService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Combobox } from './ui/combobox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
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
  Check,
  ChevronDown,
  ChevronRight,
  Plug,
  Key,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

type ERPType = 'tiny' | 'totvs' | 'sap' | 'omie' | 'bling';

interface IntegracaoERP {
  id: string;
  empresaId: string;
  empresaNome: string;
  erpTipo: ERPType;
  erpNome: string;
  apiToken: string;
  apiUrl?: string;
  ativo: boolean;
  testado: boolean;
  statusTeste?: 'sucesso' | 'erro';
  envioAutomatico?: {
    habilitado: boolean;
    tentativasMaximas: number;
    intervaloRetentativa: number;
  };
  configuracaoSincronizacao?: Partial<ConfiguracaoSincronizacaoEmpresa>;
}

const ERP_OPTIONS = [
  { value: 'tiny', label: 'Tiny ERP' },
  { value: 'totvs', label: 'TOTVS Protheus' },
  { value: 'sap', label: 'SAP Business One' },
  { value: 'omie', label: 'Omie ERP' },
  { value: 'bling', label: 'Bling' },
];

export function ERPIntegrationUnified() {
  const { companies: empresas } = useCompanies();
  const [integracoes, setIntegracoes] = useState<IntegracaoERP[]>([]);
  const [integracaoExpandida, setIntegracaoExpandida] = useState<string | null>(null);
  const [testando, setTestando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  
  // Dialog para adicionar nova integração
  const [dialogNovaIntegracao, setDialogNovaIntegracao] = useState(false);
  const [novaIntegracao, setNovaIntegracao] = useState({
    empresaId: '',
    erpTipo: '' as ERPType | '',
  });

  // Dialog para editar integração
  const [dialogEditarIntegracao, setDialogEditarIntegracao] = useState(false);
  const [integracaoEditando, setIntegracaoEditando] = useState<IntegracaoERP | null>(null);

  // Webhook
  const [webhookCopiado, setWebhookCopiado] = useState<string | null>(null);

  // Histórico e estatísticas
  const [historico, setHistorico] = useState<HistoricoSincronizacao[]>([]);
  const [estatisticas, setEstatisticas] = useState(tinyERPSyncService.obterEstatisticas());

  useEffect(() => {
    carregarIntegracoes();
    carregarDadosSincronizacao();
    carregarConfiguracoesBackend();
  }, [empresas]);

  // Carregar configurações do backend e sincronizar com as empresas
  const carregarConfiguracoesBackend = async () => {
    try {
      const { api } = await import('../services/api');
      
      for (const empresa of empresas) {
        try {
          const config = await api.getERPConfig(empresa.id);
          
          if (config && config.credenciais?.token) {
            console.log('[ERP Integration] Config do backend encontrada para empresa:', empresa.id, {
              ativo: config.ativo,
              hasToken: !!config.credenciais?.token
            });
          }
        } catch (error) {
          // Ignorar erro se config não existir
          console.log('[ERP Integration] Sem config no backend para empresa:', empresa.id);
        }
      }
    } catch (error) {
      console.error('[ERP Integration] Erro ao carregar configs do backend:', error);
    }
  };

  const carregarIntegracoes = () => {
    const integracoesCarregadas: IntegracaoERP[] = [];
    
    empresas.forEach((empresa) => {
      empresa.integracoesERP.forEach((erp) => {
        let erpTipo: ERPType = 'tiny';
        const nomeErp = erp.erpNome.toLowerCase();
        
        if (nomeErp.includes('tiny')) erpTipo = 'tiny';
        else if (nomeErp.includes('totvs')) erpTipo = 'totvs';
        else if (nomeErp.includes('sap')) erpTipo = 'sap';
        else if (nomeErp.includes('omie')) erpTipo = 'omie';
        else if (nomeErp.includes('bling')) erpTipo = 'bling';

        const integracao: IntegracaoERP = {
          id: `${empresa.id}-${erpTipo}`,
          empresaId: empresa.id,
          empresaNome: empresa.nomeFantasia || empresa.razaoSocial,
          erpTipo,
          erpNome: erp.erpNome,
          apiToken: erp.apiToken,
          apiUrl: erp.apiUrl,
          ativo: erp.ativo,
          testado: false,
        };

        // Configuração de envio automático
        if (erp.envioAutomatico) {
          integracao.envioAutomatico = erp.envioAutomatico;
        } else {
          // Padrão: desabilitado
          integracao.envioAutomatico = {
            habilitado: false,
            tentativasMaximas: 3,
            intervaloRetentativa: 5,
          };
        }

        // Se for Tiny ERP e tiver configuração de sincronização
        if (erpTipo === 'tiny' && erp.sincronizacao) {
          integracao.configuracaoSincronizacao = erp.sincronizacao;
        }

        integracoesCarregadas.push(integracao);
      });
    });

    setIntegracoes(integracoesCarregadas);
  };

  const carregarDadosSincronizacao = () => {
    setHistorico(tinyERPSyncService.obterHistorico(undefined, 100));
    setEstatisticas(tinyERPSyncService.obterEstatisticas());
  };

  // Função auxiliar para persistir integrações de volta na empresa
  const persistirIntegracoes = (integracoesAtualizadas: IntegracaoERP[]) => {
    // Agrupar integrações por empresa
    const integracoesPorEmpresa = new Map<string, IntegracaoERP[]>();
    
    integracoesAtualizadas.forEach(integracao => {
      if (!integracoesPorEmpresa.has(integracao.empresaId)) {
        integracoesPorEmpresa.set(integracao.empresaId, []);
      }
      integracoesPorEmpresa.get(integracao.empresaId)!.push(integracao);
    });

    // Atualizar cada empresa
    integracoesPorEmpresa.forEach((integracoesEmpresa, empresaId) => {
      const empresa = empresas.find(e => e.id === empresaId);
      if (!empresa) return;

      // Converter IntegracaoERP para CompanyERPConfig
      const integracoesERP: CompanyERPConfig[] = integracoesEmpresa.map(integracao => ({
        erpNome: integracao.erpNome,
        ativo: integracao.ativo,
        apiToken: integracao.apiToken,
        apiUrl: integracao.apiUrl,
        envioAutomatico: integracao.envioAutomatico,
        sincronizacao: integracao.configuracaoSincronizacao ? {
          habilitado: true,
          sincronizarAutomaticamente: integracao.configuracaoSincronizacao.sincronizarAutomaticamente ?? false,
          intervaloMinutos: integracao.configuracaoSincronizacao.intervaloMinutos ?? 15,
          notificarAlteracoes: integracao.configuracaoSincronizacao.notificarAlteracoes ?? true,
          sincronizarDadosAdicionais: integracao.configuracaoSincronizacao.sincronizarDadosAdicionais ?? true,
          webhookUrl: integracao.configuracaoSincronizacao.webhookUrl,
        } : undefined,
      }));

      // Atualizar empresa no service
      companyService.update(empresaId, { integracoesERP });
    });

    // Recarregar integrações
    setIntegracoes(integracoesAtualizadas);
  };

  const handleAdicionarIntegracao = () => {
    if (!novaIntegracao.empresaId || !novaIntegracao.erpTipo) {
      toast.error('Selecione a empresa e o ERP');
      return;
    }

    const empresa = empresas.find(e => e.id === novaIntegracao.empresaId);
    if (!empresa) return;

    // Verificar se já existe integração
    const jaExiste = integracoes.find(
      i => i.empresaId === novaIntegracao.empresaId && i.erpTipo === novaIntegracao.erpTipo
    );

    if (jaExiste) {
      toast.error(`${empresa.nomeFantasia} já possui integração com ${getERPLabel(novaIntegracao.erpTipo)}`);
      return;
    }

    const novaIntegracaoObj: IntegracaoERP = {
      id: `${novaIntegracao.empresaId}-${novaIntegracao.erpTipo}`,
      empresaId: novaIntegracao.empresaId,
      empresaNome: empresa.nomeFantasia || empresa.razaoSocial,
      erpTipo: novaIntegracao.erpTipo,
      erpNome: getERPLabel(novaIntegracao.erpTipo),
      apiToken: '',
      ativo: false,
      testado: false,
      envioAutomatico: {
        habilitado: false,
        tentativasMaximas: 3,
        intervaloRetentativa: 5,
      },
    };

    const integracoesAtualizadas = [...integracoes, novaIntegracaoObj];
    persistirIntegracoes(integracoesAtualizadas);
    
    setDialogNovaIntegracao(false);
    setNovaIntegracao({ empresaId: '', erpTipo: '' });
    setIntegracaoExpandida(novaIntegracaoObj.id);
    toast.success('Integração adicionada! Configure o token de API');
  };

  const handleRemoverIntegracao = (id: string) => {
    const integracao = integracoes.find(i => i.id === id);
    if (!integracao) return;

    if (confirm(`Deseja realmente remover a integração com ${integracao.erpNome} da empresa ${integracao.empresaNome}?`)) {
      const integracoesAtualizadas = integracoes.filter(i => i.id !== id);
      persistirIntegracoes(integracoesAtualizadas);
      toast.success('Integração removida');
    }
  };

  const handleEditarIntegracao = (integracao: IntegracaoERP) => {
    setIntegracaoEditando({ ...integracao });
    setDialogEditarIntegracao(true);
  };

  const handleSalvarEdicao = async () => {
    if (!integracaoEditando) return;

    if (!integracaoEditando.apiToken.trim()) {
      toast.error('Token de API é obrigatório');
      return;
    }

    try {
      const integracoesAtualizadas = integracoes.map(i => 
        i.id === integracaoEditando.id ? integracaoEditando : i
      );
      
      persistirIntegracoes(integracoesAtualizadas);

      // Se for Tiny ERP, salvar também no backend
      if (integracaoEditando.erpTipo === 'tiny') {
        console.log('[ERP Integration] Salvando config editada no backend para empresaId:', integracaoEditando.empresaId);
        
        const { api } = await import('../services/api');
        await api.saveERPConfig(integracaoEditando.empresaId, {
          tipo: 'tiny',
          ativo: integracaoEditando.ativo,
          credenciais: {
            token: integracaoEditando.apiToken,
          },
          envioAutomatico: integracaoEditando.envioAutomatico,
          sincronizacao: integracaoEditando.configuracaoSincronizacao,
        });
        
        console.log('[ERP Integration] Config editada salva no backend com sucesso');
      }

      setDialogEditarIntegracao(false);
      setIntegracaoEditando(null);
      toast.success(`Configuração de ${integracaoEditando.erpNome} salva!`);
    } catch (error) {
      console.error('[ERP Integration] Erro ao salvar config editada:', error);
      toast.error('Erro ao salvar configurações. Tente novamente.');
    }
  };

  const handleTestarConexao = async (id: string) => {
    const integracao = integracoes.find(i => i.id === id);
    if (!integracao || !integracao.apiToken) {
      toast.error('Configure o token de API antes de testar');
      return;
    }

    setTestando(id);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const sucesso = Math.random() > 0.3;

      const integracoesAtualizadas = integracoes.map(i =>
        i.id === id
          ? { ...i, testado: true, statusTeste: sucesso ? 'sucesso' : 'erro' }
          : i
      );
      
      persistirIntegracoes(integracoesAtualizadas);

      if (sucesso) {
        toast.success(`Conexão com ${integracao.erpNome} estabelecida!`);
      } else {
        toast.error(`Falha ao conectar com ${integracao.erpNome}`);
      }
    } catch (error) {
      toast.error('Erro ao testar conexão');
    } finally {
      setTestando(null);
    }
  };

  const handleToggleAtivo = async (id: string) => {
    const integracao = integracoes.find(i => i.id === id);
    if (!integracao) return;

    const novoAtivo = !integracao.ativo;
    
    const integracoesAtualizadas = integracoes.map(i =>
      i.id === id ? { ...i, ativo: novoAtivo } : i
    );
    
    persistirIntegracoes(integracoesAtualizadas);

    // Se for Tiny ERP, atualizar também no backend
    if (integracao.erpTipo === 'tiny' && integracao.apiToken) {
      try {
        console.log('[ERP Integration] Atualizando status ativo no backend:', { empresaId: integracao.empresaId, ativo: novoAtivo });
        
        const { api } = await import('../services/api');
        await api.saveERPConfig(integracao.empresaId, {
          tipo: 'tiny',
          ativo: novoAtivo,
          credenciais: {
            token: integracao.apiToken,
          },
          envioAutomatico: integracao.envioAutomatico,
          sincronizacao: integracao.configuracaoSincronizacao,
        });
        
        console.log('[ERP Integration] Status ativo atualizado no backend');
      } catch (error) {
        console.error('[ERP Integration] Erro ao atualizar status ativo:', error);
        // Não mostrar erro ao usuário, pois a mudança já foi aplicada localmente
      }
    }
  };

  const handleSalvarConfiguracao = async (id: string) => {
    const integracao = integracoes.find(i => i.id === id);
    if (!integracao) return;

    if (!integracao.apiToken) {
      toast.error('Token de API é obrigatório');
      return;
    }

    console.log('[ERP Integration] ===== SALVANDO CONFIGURAÇÃO =====');
    console.log('[ERP Integration] Integração:', {
      id: integracao.id,
      empresaId: integracao.empresaId,
      empresaNome: integracao.empresaNome,
      erpTipo: integracao.erpTipo,
      ativo: integracao.ativo,
      hasToken: !!integracao.apiToken,
      tokenPreview: integracao.apiToken?.substring(0, 20) + '...'
    });

    setSalvando(id);

    try {
      // Persistir as integrações nas empresas (sistema antigo)
      persistirIntegracoes(integracoes);
      
      // Se for Tiny ERP, salvar também no backend (para criar pedidos)
      if (integracao.erpTipo === 'tiny') {
        console.log('[ERP Integration] Salvando config no backend para empresaId:', integracao.empresaId);
        
        const configBackend = {
          tipo: 'tiny',
          ativo: integracao.ativo,
          credenciais: {
            token: integracao.apiToken,
          },
          envioAutomatico: integracao.envioAutomatico,
          sincronizacao: integracao.configuracaoSincronizacao,
        };
        
        console.log('[ERP Integration] Config que será enviada ao backend:', {
          tipo: configBackend.tipo,
          ativo: configBackend.ativo,
          hasToken: !!configBackend.credenciais?.token,
          tokenPreview: configBackend.credenciais?.token?.substring(0, 20) + '...'
        });
        
        const { api } = await import('../services/api');
        const resultado = await api.saveERPConfig(integracao.empresaId, configBackend);
        
        console.log('[ERP Integration] ✅ Config salva no backend com sucesso:', resultado);
        
        // Verificar se foi salva corretamente
        const configVerificacao = await api.getERPConfig(integracao.empresaId);
        console.log('[ERP Integration] 🔍 Verificação - Config no backend:', {
          exists: !!configVerificacao,
          ativo: configVerificacao?.ativo,
          hasToken: !!configVerificacao?.credenciais?.token
        });
      }
      
      setSalvando(null);
      toast.success(`Configurações de ${integracao.erpNome} salvas com sucesso!`);
      
      // Fechar expansão após salvar
      setIntegracaoExpandida(null);
    } catch (error) {
      console.error('[ERP Integration] ❌ Erro ao salvar config:', error);
      setSalvando(null);
      toast.error(`Erro ao salvar configurações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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

  const getERPLabel = (erp: ERPType | string) => {
    return ERP_OPTIONS.find(opt => opt.value === erp)?.label || erp;
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

  // DEBUG: Função para diagnosticar configurações
  const diagnosticarConfiguracoes = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DIAGNÓSTICO DE CONFIGURAÇÕES TINY ERP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      const { api } = await import('../services/api');
      
      // 1. Verificar Backend - Empresas
      console.log('\n1️⃣ VERIFICANDO EMPRESAS NO BACKEND:');
      const empresasBackend = await api.get('empresas');
      if (empresasBackend && empresasBackend.length > 0) {
        console.log('   Total empresas:', empresasBackend.length);
        empresasBackend.forEach((emp: any) => {
          console.log(`   - ${emp.nomeFantasia || emp.razaoSocial} (${emp.id})`);
          if (emp.integracoesERP && emp.integracoesERP.length > 0) {
            emp.integracoesERP.forEach((erp: any) => {
              console.log(`     └─ ERP: ${erp.erpNome || erp.erpTipo}, Ativo: ${erp.ativo}, Token: ${erp.apiToken ? '✅' : '❌'}`);
            });
          } else {
            console.log('     └─ Sem integrações ERP configuradas');
          }
        });
      } else {
        console.log('   ❌ Nenhuma empresa no backend');
      }
      
      // 2. Verificar Backend - Configs ERP
      console.log('\n2️⃣ VERIFICANDO CONFIGS ERP NO BACKEND (KV Store):');
      const debugData = await api.debugListERPConfigs();
      console.log('   Total configs no backend:', debugData.total);
      if (debugData.configs && debugData.configs.length > 0) {
        debugData.configs.forEach((cfg: any) => {
          console.log(`   - ${cfg.key} (empresaId: ${cfg.empresaId}): Ativo=${cfg.ativo}, Token=${cfg.hasToken ? '✅' : '❌'}`);
        });
        
        // Verificar se há configs malformadas
        const malformed = debugData.configs.filter((cfg: any) => 
          !cfg.key || cfg.key === 'erp_config_undefined' || !cfg.hasToken
        );
        
        if (malformed.length > 0) {
          console.log('\n   ⚠️ CONFIGS MALFORMADAS ENCONTRADAS:', malformed.length);
          console.log('   🧹 Limpando configs malformadas...');
          
          const cleanResult = await api.debugCleanERPConfigs();
          console.log(`   ✅ Removidas ${cleanResult.removed} configs malformadas`);
        }
      } else {
        console.log('   ℹ️ Nenhuma config ERP no backend ainda');
      }
      
      // 3. Comparar e sincronizar se necessário
      console.log('\n3️⃣ SINCRONIZANDO CONFIGURAÇÕES:');
      if (empresasBackend && empresasBackend.length > 0) {
        for (const empresa of empresasBackend) {
          if (empresa.integracoesERP && empresa.integracoesERP.length > 0) {
            const tinyIntegracao = empresa.integracoesERP.find((erp: any) => 
              erp.erpNome?.toLowerCase().includes('tiny') || erp.erpTipo === 'tiny'
            );
            
            if (tinyIntegracao && tinyIntegracao.apiToken) {
              console.log(`   🔄 Sincronizando ${empresa.nomeFantasia || empresa.razaoSocial}...`);
              console.log(`      - empresaId: ${empresa.id}`);
              console.log(`      - token: ${tinyIntegracao.apiToken.substring(0, 20)}...`);
              
              await api.saveERPConfig(empresa.id, {
                tipo: 'tiny',
                ativo: tinyIntegracao.ativo !== false,
                credenciais: {
                  token: tinyIntegracao.apiToken,
                },
                envioAutomatico: tinyIntegracao.envioAutomatico,
                sincronizacao: tinyIntegracao.sincronizacao,
              });
              console.log(`   ✅ Sincronizado!`);
            } else {
              console.log(`   ⏭️ ${empresa.nomeFantasia || empresa.razaoSocial} - Sem integração Tiny ou sem token`);
            }
          }
        }
      } else {
        console.log('   ⚠️ Nenhuma empresa para sincronizar');
      }
      
      // 4. Verificar novamente o backend
      console.log('\n4️⃣ VERIFICANDO BACKEND APÓS SINCRONIZAÇÃO:');
      const debugDataApos = await api.debugListERPConfigs();
      console.log('   Total configs no backend:', debugDataApos.total);
      if (debugDataApos.configs) {
        debugDataApos.configs.forEach((cfg: any) => {
          console.log(`   - ${cfg.key}: Ativo=${cfg.ativo}, Token=${cfg.hasToken ? '✅' : '❌'}`);
        });
      }
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ DIAGNÓSTICO CONCLUÍDO');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      toast.success('Diagnóstico concluído! Verifique o console.');
    } catch (error) {
      console.error('❌ Erro no diagnóstico:', error);
      toast.error('Erro ao executar diagnóstico');
    }
  };

  const empresasOptions = empresas.map(e => ({
    value: e.id,
    label: `${e.nomeFantasia || e.razaoSocial} - ${e.cnpj}`,
  }));

  const integracoesPorEmpresa = empresas.map(empresa => {
    const integracoesEmpresa = integracoes.filter(i => i.empresaId === empresa.id);
    return {
      empresa,
      integracoes: integracoesEmpresa,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Integrações ERP</h2>
          <p className="text-muted-foreground">
            Configure integrações com sistemas de gestão empresarial para cada empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={diagnosticarConfiguracoes}>
            <Activity className="h-4 w-4 mr-2" />
            Diagnosticar
          </Button>
          <Button onClick={() => setDialogNovaIntegracao(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Integração
          </Button>
        </div>
      </div>

      {/* Tabela de Integrações por Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Integrações Configuradas
          </CardTitle>
          <CardDescription>
            Gerencie as integrações ERP de cada empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integracoes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Plug className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma integração configurada</p>
              <p className="text-sm mb-4">Adicione uma integração para começar</p>
              <Button onClick={() => setDialogNovaIntegracao(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Integração
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {integracoesPorEmpresa.map(({ empresa, integracoes: integracoesEmpresa }) => {
                if (integracoesEmpresa.length === 0) return null;

                return (
                  <div key={empresa.id} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">{empresa.nomeFantasia || empresa.razaoSocial}</h3>
                      <Badge variant="outline" className="text-xs">{empresa.cnpj}</Badge>
                      {!empresa.ativo && <Badge variant="secondary">Inativa</Badge>}
                    </div>

                    <div className="space-y-2 pl-6">
                      {integracoesEmpresa.map((integracao) => (
                        <div key={integracao.id} className="border rounded-lg">
                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Collapsible
                                  open={integracaoExpandida === integracao.id}
                                  onOpenChange={(open) => 
                                    setIntegracaoExpandida(open ? integracao.id : null)
                                  }
                                >
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                                      {integracaoExpandida === integracao.id ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                </Collapsible>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{integracao.erpNome}</p>
                                    {integracao.ativo && (
                                      <Badge variant="default" className="text-xs">Ativo</Badge>
                                    )}
                                    {integracao.testado && (
                                      <Badge 
                                        variant={integracao.statusTeste === 'sucesso' ? 'default' : 'destructive'}
                                        className="text-xs"
                                      >
                                        {integracao.statusTeste === 'sucesso' ? (
                                          <>
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Testado
                                          </>
                                        ) : (
                                          <>
                                            <XCircle className="h-3 w-3 mr-1" />
                                            Erro
                                          </>
                                        )}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {integracao.apiToken ? 
                                      `Token: ${integracao.apiToken.substring(0, 20)}...` : 
                                      'Token não configurado'
                                    }
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={integracao.ativo}
                                  onCheckedChange={() => handleToggleAtivo(integracao.id)}
                                  disabled={!integracao.apiToken}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditarIntegracao(integracao)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoverIntegracao(integracao.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>

                            <Collapsible
                              open={integracaoExpandida === integracao.id}
                              onOpenChange={(open) => 
                                setIntegracaoExpandida(open ? integracao.id : null)
                              }
                            >
                              <CollapsibleContent className="pt-4 space-y-4">
                                <Separator />

                                {/* Configuração de Envio Automático */}
                                <div className="space-y-4">
                                  <h4 className="text-sm font-medium flex items-center gap-2">
                                    <Send className="h-4 w-4" />
                                    Envio Automático de Pedidos
                                  </h4>

                                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                    <div className="space-y-0.5">
                                      <Label className="text-sm">Enviar Pedidos Automaticamente</Label>
                                      <p className="text-xs text-muted-foreground">
                                        Envia pedidos ao ERP automaticamente ao salvar
                                      </p>
                                    </div>
                                    <Switch
                                      checked={integracao.envioAutomatico?.habilitado ?? false}
                                      onCheckedChange={(checked) => {
                                        const integracoesAtualizadas = integracoes.map(i =>
                                          i.id === integracao.id
                                            ? {
                                                ...i,
                                                envioAutomatico: {
                                                  habilitado: checked,
                                                  tentativasMaximas: i.envioAutomatico?.tentativasMaximas ?? 3,
                                                  intervaloRetentativa: i.envioAutomatico?.intervaloRetentativa ?? 5,
                                                },
                                              }
                                            : i
                                        );
                                        persistirIntegracoes(integracoesAtualizadas);
                                      }}
                                      disabled={!integracao.ativo}
                                    />
                                  </div>

                                  {integracao.envioAutomatico?.habilitado && (
                                    <Alert>
                                      <AlertCircle className="h-4 w-4" />
                                      <AlertTitle>Importante</AlertTitle>
                                      <AlertDescription>
                                        Pedidos serão enviados automaticamente ao ERP quando salvos.
                                        Após o envio, o pedido não poderá mais ser editado.
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </div>

                                <Separator />

                                {/* Configurações Avançadas (Tiny ERP) */}
                                {integracao.erpTipo === 'tiny' && (
                                  <div className="space-y-4">
                                    <h4 className="text-sm font-medium flex items-center gap-2">
                                      <Settings className="h-4 w-4" />
                                      Configurações de Sincronização
                                    </h4>

                                    <div className="grid gap-4">
                                      <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="space-y-0.5">
                                          <Label className="text-sm">Sincronizar Automaticamente</Label>
                                          <p className="text-xs text-muted-foreground">
                                            Atualiza status em intervalos regulares
                                          </p>
                                        </div>
                                        <Switch
                                          checked={integracao.configuracaoSincronizacao?.sincronizarAutomaticamente ?? false}
                                          onCheckedChange={(checked) => {
                                            const integracoesAtualizadas = integracoes.map(i =>
                                              i.id === integracao.id
                                                ? {
                                                    ...i,
                                                    configuracaoSincronizacao: {
                                                      ...i.configuracaoSincronizacao,
                                                      sincronizarAutomaticamente: checked,
                                                    },
                                                  }
                                                : i
                                            );
                                            persistirIntegracoes(integracoesAtualizadas);
                                          }}
                                          disabled={!integracao.ativo}
                                        />
                                      </div>

                                      {integracao.configuracaoSincronizacao?.sincronizarAutomaticamente && (
                                        <div className="space-y-2 pl-3">
                                          <Label className="text-sm">Intervalo (minutos)</Label>
                                          <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <Input
                                              type="number"
                                              min="5"
                                              max="120"
                                              value={integracao.configuracaoSincronizacao?.intervaloMinutos || 15}
                                              onBlur={(e) => {
                                                const integracoesAtualizadas = integracoes.map(i =>
                                                  i.id === integracao.id
                                                    ? {
                                                        ...i,
                                                        configuracaoSincronizacao: {
                                                          ...i.configuracaoSincronizacao,
                                                          intervaloMinutos: parseInt(e.target.value) || 15,
                                                        },
                                                      }
                                                    : i
                                                );
                                                persistirIntegracoes(integracoesAtualizadas);
                                              }}
                                              onChange={(e) => {
                                                setIntegracoes(
                                                  integracoes.map(i =>
                                                    i.id === integracao.id
                                                      ? {
                                                          ...i,
                                                          configuracaoSincronizacao: {
                                                            ...i.configuracaoSincronizacao,
                                                            intervaloMinutos: parseInt(e.target.value) || 15,
                                                          },
                                                        }
                                                      : i
                                                  )
                                                );
                                              }}
                                              className="w-24"
                                            />
                                            <span className="text-sm text-muted-foreground">min</span>
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="space-y-0.5">
                                          <Label className="text-sm">Notificar Alterações</Label>
                                          <p className="text-xs text-muted-foreground">
                                            Exibe notificações de status
                                          </p>
                                        </div>
                                        <Switch
                                          checked={integracao.configuracaoSincronizacao?.notificarAlteracoes ?? true}
                                          onCheckedChange={(checked) => {
                                            const integracoesAtualizadas = integracoes.map(i =>
                                              i.id === integracao.id
                                                ? {
                                                    ...i,
                                                    configuracaoSincronizacao: {
                                                      ...i.configuracaoSincronizacao,
                                                      notificarAlteracoes: checked,
                                                    },
                                                  }
                                                : i
                                            );
                                            persistirIntegracoes(integracoesAtualizadas);
                                          }}
                                          disabled={!integracao.ativo}
                                        />
                                      </div>

                                      <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="space-y-0.5">
                                          <Label className="text-sm">Sincronizar Dados Adicionais</Label>
                                          <p className="text-xs text-muted-foreground">
                                            Nota fiscal, rastreio e transportadora
                                          </p>
                                        </div>
                                        <Switch
                                          checked={integracao.configuracaoSincronizacao?.sincronizarDadosAdicionais ?? true}
                                          onCheckedChange={(checked) => {
                                            const integracoesAtualizadas = integracoes.map(i =>
                                              i.id === integracao.id
                                                ? {
                                                    ...i,
                                                    configuracaoSincronizacao: {
                                                      ...i.configuracaoSincronizacao,
                                                      sincronizarDadosAdicionais: checked,
                                                    },
                                                  }
                                                : i
                                            );
                                            persistirIntegracoes(integracoesAtualizadas);
                                          }}
                                          disabled={!integracao.ativo}
                                        />
                                      </div>
                                    </div>

                                    <Separator />

                                    {/* Webhook */}
                                    <div className="space-y-2">
                                      <Label className="text-sm flex items-center gap-2">
                                        <Webhook className="h-4 w-4" />
                                        URL do Webhook
                                      </Label>
                                      <div className="flex gap-2">
                                        <Input
                                          value={`${window.location.origin}/api/webhooks/tiny/${integracao.empresaId}`}
                                          readOnly
                                          className="font-mono text-xs"
                                        />
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => copiarWebhookUrl(integracao.empresaId)}
                                        >
                                          {webhookCopiado === integracao.empresaId ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <Copy className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        Configure esta URL no painel do Tiny ERP para receber atualizações em tempo real
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <Separator />

                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleSalvarConfiguracao(integracao.id)}
                                    disabled={salvando === integracao.id}
                                  >
                                    <Save className="h-4 w-4 mr-2" />
                                    {salvando === integracao.id ? 'Salvando...' : 'Salvar'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => handleTestarConexao(integracao.id)}
                                    disabled={!integracao.apiToken || testando === integracao.id}
                                  >
                                    {testando === integracao.id ? (
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
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico e Estatísticas (Tiny ERP) */}
      {integracoes.some(i => i.erpTipo === 'tiny') && (
        <Tabs defaultValue="historico" className="space-y-4">
          <TabsList>
            <TabsTrigger value="historico">
              <History className="h-4 w-4 mr-2" />
              Histórico de Sincronizações
            </TabsTrigger>
            <TabsTrigger value="estatisticas">
              <Activity className="h-4 w-4 mr-2" />
              Estatísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Sincronizações (Tiny ERP)</CardTitle>
                <CardDescription>
                  Últimas {historico.length} sincronizações realizadas
                </CardDescription>
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

          <TabsContent value="estatisticas">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Sincronização (Tiny ERP)</CardTitle>
                <CardDescription>Resumo geral</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total</CardDescription>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog: Nova Integração */}
      <Dialog open={dialogNovaIntegracao} onOpenChange={setDialogNovaIntegracao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Integração ERP</DialogTitle>
            <DialogDescription>
              Selecione a empresa e o sistema ERP que deseja integrar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Combobox
                options={empresasOptions}
                value={novaIntegracao.empresaId}
                onValueChange={(value) => 
                  setNovaIntegracao({ ...novaIntegracao, empresaId: value })
                }
                placeholder="Selecione a empresa..."
                searchPlaceholder="Buscar empresa..."
                emptyText="Nenhuma empresa encontrada"
              />
            </div>

            <div className="space-y-2">
              <Label>Sistema ERP</Label>
              <Combobox
                options={ERP_OPTIONS}
                value={novaIntegracao.erpTipo}
                onValueChange={(value) => 
                  setNovaIntegracao({ ...novaIntegracao, erpTipo: value as ERPType })
                }
                placeholder="Selecione o ERP..."
                searchPlaceholder="Buscar ERP..."
                emptyText="Nenhum ERP encontrado"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovaIntegracao(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdicionarIntegracao}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Integração */}
      <Dialog open={dialogEditarIntegracao} onOpenChange={setDialogEditarIntegracao}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              Configurar {integracaoEditando?.erpNome} - {integracaoEditando?.empresaNome}
            </DialogTitle>
            <DialogDescription>
              Configure os parâmetros de acesso à API do {integracaoEditando?.erpNome}
            </DialogDescription>
          </DialogHeader>

          {integracaoEditando && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-token">Token de API *</Label>
                <Input
                  id="edit-token"
                  type="password"
                  placeholder="Insira o token da API"
                  value={integracaoEditando.apiToken}
                  onChange={(e) =>
                    setIntegracaoEditando({ ...integracaoEditando, apiToken: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Token obtido no painel do {integracaoEditando.erpNome}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-url">URL da API (Opcional)</Label>
                <Input
                  id="edit-url"
                  type="url"
                  placeholder="https://api.exemplo.com"
                  value={integracaoEditando.apiUrl || ''}
                  onChange={(e) =>
                    setIntegracaoEditando({ ...integracaoEditando, apiUrl: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para usar a URL padrão
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDialogEditarIntegracao(false);
                setIntegracaoEditando(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicao}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

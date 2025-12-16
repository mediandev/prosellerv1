import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  EmailIntegrationSettings as IEmailIntegrationSettings, 
  EmailProvider,
  defaultEmailSettings,
  ResendConfig,
  SendgridConfig,
  SendflowConfig
} from "../types/emailConfig";
import { emailService } from "../services/emailService";
import { toast } from "sonner@2.0.3";
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Settings,
  Key,
  Shield,
  Zap,
  Info,
  TestTube,
  Save
} from "lucide-react";

export function EmailIntegrationSettings() {
  const [settings, setSettings] = useState<IEmailIntegrationSettings>(defaultEmailSettings);
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Carregar configurações ao montar
  useEffect(() => {
    const saved = localStorage.getItem('emailIntegrationSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Erro ao carregar configurações de e-mail:', error);
      }
    }
  }, []);

  // Salvar configurações
  const handleSave = () => {
    try {
      localStorage.setItem('emailIntegrationSettings', JSON.stringify(settings));
      emailService.updateSettings(settings);
      setHasChanges(false);
      toast.success('Configurações de e-mail salvas com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
      console.error(error);
    }
  };

  // Atualizar provedor ativo
  const handleProviderChange = (provider: EmailProvider) => {
    setSettings(prev => ({
      ...prev,
      activeProvider: provider,
    }));
    setHasChanges(true);
  };

  // Atualizar configuração do Resend
  const updateResendConfig = (updates: Partial<ResendConfig>) => {
    setSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        resend: {
          provider: 'resend',
          enabled: true,
          apiKey: '',
          fromEmail: '',
          fromName: '',
          ...prev.providers.resend,
          ...updates,
        } as ResendConfig,
      },
    }));
    setHasChanges(true);
  };

  // Atualizar configuração do SendGrid
  const updateSendgridConfig = (updates: Partial<SendgridConfig>) => {
    setSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        sendgrid: {
          provider: 'sendgrid',
          enabled: true,
          apiKey: '',
          fromEmail: '',
          fromName: '',
          ...prev.providers.sendgrid,
          ...updates,
        } as SendgridConfig,
      },
    }));
    setHasChanges(true);
  };

  // Atualizar configuração do Sendflow
  const updateSendflowConfig = (updates: Partial<SendflowConfig>) => {
    setSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        sendflow: {
          provider: 'sendflow',
          enabled: true,
          apiKey: '',
          fromEmail: '',
          fromName: '',
          ...prev.providers.sendflow,
          ...updates,
        } as SendflowConfig,
      },
    }));
    setHasChanges(true);
  };

  // Testar conexão
  const handleTest = async () => {
    if (!testEmail) {
      toast.error('Digite um e-mail para teste');
      return;
    }

    if (settings.activeProvider === 'none') {
      toast.error('Selecione um provedor de e-mail primeiro');
      return;
    }

    setIsTesting(true);
    
    try {
      // Salvar temporariamente as configurações para o teste
      emailService.updateSettings(settings);
      
      const providerNames = {
        resend: 'Resend',
        sendgrid: 'SendGrid',
        sendflow: 'Sendflow',
        none: 'Nenhum',
      };
      
      await emailService.enviarEmailTeste(
        testEmail, 
        providerNames[settings.activeProvider]
      );
      
      toast.success('E-mail de teste enviado com sucesso! Verifique sua caixa de entrada.');
    } catch (error) {
      toast.error('Erro ao enviar e-mail de teste');
      console.error(error);
    } finally {
      setIsTesting(false);
    }
  };

  const providerStatus = (provider: EmailProvider) => {
    if (provider === 'none') return null;
    
    const config = settings.providers[provider];
    const isActive = settings.activeProvider === provider;
    const isConfigured = config && config.enabled && config.apiKey && config.fromEmail;
    
    if (isActive && isConfigured) {
      return <Badge className="bg-green-500">Ativo</Badge>;
    }
    if (isConfigured) {
      return <Badge variant="secondary">Configurado</Badge>;
    }
    return <Badge variant="outline">Não Configurado</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header com status */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Integração de E-mail
              </CardTitle>
              <CardDescription>
                Configure serviços de e-mail para notificações automáticas do sistema
              </CardDescription>
            </div>
            {settings.activeProvider !== 'none' && (
              <div className="flex items-center gap-2">
                {settings.enableNotifications ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Notificações Ativas</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-muted-foreground">Notificações Desativadas</span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Ativar Notificações por E-mail</Label>
              <p className="text-sm text-muted-foreground">
                Habilite para enviar e-mails automáticos do sistema
              </p>
            </div>
            <Switch
              checked={settings.enableNotifications}
              onCheckedChange={(checked) => {
                setSettings(prev => ({ ...prev, enableNotifications: checked }));
                setHasChanges(true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alerta informativo */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Modo de Desenvolvimento:</strong> O sistema está configurado em modo MOCK. 
          Os e-mails não serão enviados de fato, mas serão registrados no console do navegador. 
          Para envio real, descomente o código de integração no arquivo <code>emailService.ts</code> e 
          configure suas chaves de API.
        </AlertDescription>
      </Alert>

      {/* Seleção do provedor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Provedor de E-mail
          </CardTitle>
          <CardDescription>
            Selecione o serviço que será usado para envio de e-mails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Resend */}
            <button
              onClick={() => handleProviderChange('resend')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                settings.activeProvider === 'resend'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <span>Resend</span>
                </div>
                {providerStatus('resend')}
              </div>
              <p className="text-sm text-muted-foreground">
                Plataforma moderna de e-mail para desenvolvedores
              </p>
            </button>

            {/* SendGrid */}
            <button
              onClick={() => handleProviderChange('sendgrid')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                settings.activeProvider === 'sendgrid'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  <span>SendGrid</span>
                </div>
                {providerStatus('sendgrid')}
              </div>
              <p className="text-sm text-muted-foreground">
                Serviço confiável de envio de e-mails em escala
              </p>
            </button>

            {/* Sendflow */}
            <button
              onClick={() => handleProviderChange('sendflow')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                settings.activeProvider === 'sendflow'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <span>Sendflow</span>
                </div>
                {providerStatus('sendflow')}
              </div>
              <p className="text-sm text-muted-foreground">
                Solução flexível para automação de e-mails
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Configuração do provedor selecionado */}
      {settings.activeProvider !== 'none' && (
        <Tabs value={settings.activeProvider} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="resend">Resend</TabsTrigger>
            <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
            <TabsTrigger value="sendflow">Sendflow</TabsTrigger>
          </TabsList>

          {/* Configuração Resend */}
          <TabsContent value="resend">
            <Card>
              <CardHeader>
                <CardTitle>Configuração do Resend</CardTitle>
                <CardDescription>
                  Configure as credenciais e dados de envio para o Resend
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resend-apikey">API Key *</Label>
                  <div className="flex gap-2">
                    <Key className="h-4 w-4 mt-2.5 text-muted-foreground" />
                    <Input
                      id="resend-apikey"
                      type="password"
                      placeholder="re_123456789..."
                      value={settings.providers.resend?.apiKey || ''}
                      onChange={(e) => updateResendConfig({ apiKey: e.target.value })}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Obtenha sua chave em{' '}
                    <a 
                      href="https://resend.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      resend.com/api-keys
                    </a>
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="resend-from-email">E-mail Remetente *</Label>
                    <Input
                      id="resend-from-email"
                      type="email"
                      placeholder="noreply@seudominio.com"
                      value={settings.providers.resend?.fromEmail || ''}
                      onChange={(e) => updateResendConfig({ fromEmail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resend-from-name">Nome Remetente *</Label>
                    <Input
                      id="resend-from-name"
                      placeholder="VendasPro"
                      value={settings.providers.resend?.fromName || ''}
                      onChange={(e) => updateResendConfig({ fromName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resend-reply-to">E-mail de Resposta (Reply-To)</Label>
                  <Input
                    id="resend-reply-to"
                    type="email"
                    placeholder="contato@seudominio.com"
                    value={settings.providers.resend?.replyTo || ''}
                    onChange={(e) => updateResendConfig({ replyTo: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuração SendGrid */}
          <TabsContent value="sendgrid">
            <Card>
              <CardHeader>
                <CardTitle>Configuração do SendGrid</CardTitle>
                <CardDescription>
                  Configure as credenciais e dados de envio para o SendGrid
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sendgrid-apikey">API Key *</Label>
                  <div className="flex gap-2">
                    <Key className="h-4 w-4 mt-2.5 text-muted-foreground" />
                    <Input
                      id="sendgrid-apikey"
                      type="password"
                      placeholder="SG.xxxxxxxxxxxxx..."
                      value={settings.providers.sendgrid?.apiKey || ''}
                      onChange={(e) => updateSendgridConfig({ apiKey: e.target.value })}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Obtenha sua chave em{' '}
                    <a 
                      href="https://app.sendgrid.com/settings/api_keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      app.sendgrid.com/settings/api_keys
                    </a>
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sendgrid-from-email">E-mail Remetente *</Label>
                    <Input
                      id="sendgrid-from-email"
                      type="email"
                      placeholder="noreply@seudominio.com"
                      value={settings.providers.sendgrid?.fromEmail || ''}
                      onChange={(e) => updateSendgridConfig({ fromEmail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sendgrid-from-name">Nome Remetente *</Label>
                    <Input
                      id="sendgrid-from-name"
                      placeholder="VendasPro"
                      value={settings.providers.sendgrid?.fromName || ''}
                      onChange={(e) => updateSendgridConfig({ fromName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sendgrid-reply-to">E-mail de Resposta (Reply-To)</Label>
                  <Input
                    id="sendgrid-reply-to"
                    type="email"
                    placeholder="contato@seudominio.com"
                    value={settings.providers.sendgrid?.replyTo || ''}
                    onChange={(e) => updateSendgridConfig({ replyTo: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Modo Sandbox</Label>
                    <p className="text-sm text-muted-foreground">
                      Ative para testar sem enviar e-mails reais
                    </p>
                  </div>
                  <Switch
                    checked={settings.providers.sendgrid?.sandboxMode || false}
                    onCheckedChange={(checked) => updateSendgridConfig({ sandboxMode: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuração Sendflow */}
          <TabsContent value="sendflow">
            <Card>
              <CardHeader>
                <CardTitle>Configuração do Sendflow</CardTitle>
                <CardDescription>
                  Configure as credenciais e dados de envio para o Sendflow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sendflow-apikey">API Key *</Label>
                  <div className="flex gap-2">
                    <Key className="h-4 w-4 mt-2.5 text-muted-foreground" />
                    <Input
                      id="sendflow-apikey"
                      type="password"
                      placeholder="sf_xxxxxxxxxxxxx..."
                      value={settings.providers.sendflow?.apiKey || ''}
                      onChange={(e) => updateSendflowConfig({ apiKey: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sendflow-from-email">E-mail Remetente *</Label>
                    <Input
                      id="sendflow-from-email"
                      type="email"
                      placeholder="noreply@seudominio.com"
                      value={settings.providers.sendflow?.fromEmail || ''}
                      onChange={(e) => updateSendflowConfig({ fromEmail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sendflow-from-name">Nome Remetente *</Label>
                    <Input
                      id="sendflow-from-name"
                      placeholder="VendasPro"
                      value={settings.providers.sendflow?.fromName || ''}
                      onChange={(e) => updateSendflowConfig({ fromName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sendflow-reply-to">E-mail de Resposta (Reply-To)</Label>
                  <Input
                    id="sendflow-reply-to"
                    type="email"
                    placeholder="contato@seudominio.com"
                    value={settings.providers.sendflow?.replyTo || ''}
                    onChange={(e) => updateSendflowConfig({ replyTo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sendflow-endpoint">Endpoint da API (opcional)</Label>
                  <Input
                    id="sendflow-endpoint"
                    placeholder="https://api.sendflow.io/v1/emails"
                    value={settings.providers.sendflow?.endpoint || ''}
                    onChange={(e) => updateSendflowConfig({ endpoint: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Deixe em branco para usar o endpoint padrão
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Configurações de envio automático */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Envios Automáticos
          </CardTitle>
          <CardDescription>
            Configure quais e-mails devem ser enviados automaticamente pelo sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Cliente Pendente de Aprovação</Label>
              <p className="text-sm text-muted-foreground">
                Notificar gestores quando um vendedor cadastrar um cliente
              </p>
            </div>
            <Switch
              checked={settings.autoSend.clientePendenteAprovacao}
              onCheckedChange={(checked) => {
                setSettings(prev => ({
                  ...prev,
                  autoSend: { ...prev.autoSend, clientePendenteAprovacao: checked }
                }));
                setHasChanges(true);
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Cliente Aprovado</Label>
              <p className="text-sm text-muted-foreground">
                Notificar vendedor quando seu cadastro for aprovado
              </p>
            </div>
            <Switch
              checked={settings.autoSend.clienteAprovado}
              onCheckedChange={(checked) => {
                setSettings(prev => ({
                  ...prev,
                  autoSend: { ...prev.autoSend, clienteAprovado: checked }
                }));
                setHasChanges(true);
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Cliente Rejeitado</Label>
              <p className="text-sm text-muted-foreground">
                Notificar vendedor quando seu cadastro for rejeitado
              </p>
            </div>
            <Switch
              checked={settings.autoSend.clienteRejeitado}
              onCheckedChange={(checked) => {
                setSettings(prev => ({
                  ...prev,
                  autoSend: { ...prev.autoSend, clienteRejeitado: checked }
                }));
                setHasChanges(true);
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Relatório de Comissões</Label>
              <p className="text-sm text-muted-foreground">
                Enviar relatório mensal de comissões para vendedores
              </p>
            </div>
            <Switch
              checked={settings.autoSend.relatorioComissoes}
              onCheckedChange={(checked) => {
                setSettings(prev => ({
                  ...prev,
                  autoSend: { ...prev.autoSend, relatorioComissoes: checked }
                }));
                setHasChanges(true);
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Pedido Enviado ao ERP</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando um pedido for enviado ao ERP com sucesso
              </p>
            </div>
            <Switch
              checked={settings.autoSend.pedidoEnviado}
              onCheckedChange={(checked) => {
                setSettings(prev => ({
                  ...prev,
                  autoSend: { ...prev.autoSend, pedidoEnviado: checked }
                }));
                setHasChanges(true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Teste de envio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Testar Integração
          </CardTitle>
          <CardDescription>
            Envie um e-mail de teste para verificar se a configuração está correta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="seu-email@exemplo.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              disabled={settings.activeProvider === 'none'}
            />
            <Button 
              onClick={handleTest} 
              disabled={isTesting || settings.activeProvider === 'none' || !testEmail}
            >
              {isTesting ? 'Enviando...' : 'Enviar Teste'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          disabled={!hasChanges}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!hasChanges}
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}

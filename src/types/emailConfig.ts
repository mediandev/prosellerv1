// Tipos para configuração de integração com serviços de e-mail

export type EmailProvider = 'resend' | 'sendgrid' | 'sendflow' | 'none';

export interface EmailProviderConfig {
  provider: EmailProvider;
  enabled: boolean;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

export interface ResendConfig extends EmailProviderConfig {
  provider: 'resend';
}

export interface SendgridConfig extends EmailProviderConfig {
  provider: 'sendgrid';
  sandboxMode?: boolean;
}

export interface SendflowConfig extends EmailProviderConfig {
  provider: 'sendflow';
  endpoint?: string; // URL customizada se necessário
}

export type ProviderSpecificConfig = ResendConfig | SendgridConfig | SendflowConfig;

export interface EmailIntegrationSettings {
  activeProvider: EmailProvider;
  providers: {
    resend?: ResendConfig;
    sendgrid?: SendgridConfig;
    sendflow?: SendflowConfig;
  };
  // Configurações gerais
  enableNotifications: boolean;
  notificationEmails: string[]; // E-mails que devem receber notificações do sistema
  // Configurações de envio automático
  autoSend: {
    clienteAprovado: boolean;
    clienteRejeitado: boolean;
    clientePendenteAprovacao: boolean;
    relatorioComissoes: boolean;
    pedidoEnviado: boolean;
    pedidoAtualizado: boolean;
  };
}

export const defaultEmailSettings: EmailIntegrationSettings = {
  activeProvider: 'none',
  providers: {},
  enableNotifications: false,
  notificationEmails: [],
  autoSend: {
    clienteAprovado: true,
    clienteRejeitado: true,
    clientePendenteAprovacao: true,
    relatorioComissoes: true,
    pedidoEnviado: false,
    pedidoAtualizado: false,
  },
};

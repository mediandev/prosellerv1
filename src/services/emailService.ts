// Serviço de envio de e-mails com suporte a múltiplos provedores
import { EmailIntegrationSettings, EmailProvider } from '../types/emailConfig';

export interface EmailData {
  to: string[];
  subject: string;
  body: string;
  html?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
}

// Classe principal do serviço de e-mail
class EmailService {
  private settings: EmailIntegrationSettings | null = null;

  constructor() {
    this.loadSettings();
  }

  /**
   * Carrega as configurações do localStorage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('emailIntegrationSettings');
      if (saved) {
        this.settings = JSON.parse(saved);
      }
    } catch (error) {
      console.error('[EMAIL SERVICE] Erro ao carregar configurações:', error);
    }
  }

  /**
   * Atualiza as configurações
   */
  public updateSettings(settings: EmailIntegrationSettings): void {
    this.settings = settings;
    localStorage.setItem('emailIntegrationSettings', JSON.stringify(settings));
  }

  /**
   * Verifica se o serviço de e-mail está configurado
   */
  public isConfigured(): boolean {
    return this.settings !== null && 
           this.settings.activeProvider !== 'none' && 
           this.settings.enableNotifications;
  }

  /**
   * Envia e-mail usando o provedor ativo
   */
  private async sendEmail(emailData: EmailData): Promise<void> {
    if (!this.settings || this.settings.activeProvider === 'none') {
      console.log('[EMAIL SERVICE] Modo MOCK - E-mail não será enviado:', emailData);
      return;
    }

    const providerConfig = this.settings.providers[this.settings.activeProvider];
    
    if (!providerConfig || !providerConfig.enabled || !providerConfig.apiKey) {
      console.warn('[EMAIL SERVICE] Provedor não configurado corretamente. E-mail em modo MOCK:', emailData);
      return;
    }

    try {
      switch (this.settings.activeProvider) {
        case 'resend':
          await this.sendViaResend(emailData, providerConfig);
          break;
        case 'sendgrid':
          await this.sendViaSendgrid(emailData, providerConfig);
          break;
        case 'sendflow':
          await this.sendViaSendflow(emailData, providerConfig);
          break;
        default:
          console.warn('[EMAIL SERVICE] Provedor desconhecido');
      }
    } catch (error) {
      console.error('[EMAIL SERVICE] Erro ao enviar e-mail:', error);
      throw error;
    }
  }

  /**
   * Envia e-mail via Resend
   */
  private async sendViaResend(emailData: EmailData, config: any): Promise<void> {
    console.log('[EMAIL SERVICE] Enviando via Resend...');
    
    // Em produção, fazer requisição real para API do Resend
    // https://resend.com/docs/api-reference/emails/send-email
    
    const payload = {
      from: `${config.fromName} <${config.fromEmail}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html || emailData.body,
      reply_to: emailData.replyTo || config.replyTo,
      attachments: emailData.attachments,
    };

    console.log('[EMAIL SERVICE - RESEND] Payload preparado:', payload);
    console.log('[EMAIL SERVICE - RESEND] ⚠️ MODO MOCK - Para envio real, configure a API Key e descomente o código abaixo');
    
    /*
    // Código para envio real via Resend:
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Resend API Error: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('[EMAIL SERVICE - RESEND] E-mail enviado com sucesso:', result.id);
    */
    
    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('[EMAIL SERVICE - RESEND] ✓ E-mail simulado enviado para:', emailData.to.join(', '));
  }

  /**
   * Envia e-mail via SendGrid
   */
  private async sendViaSendgrid(emailData: EmailData, config: any): Promise<void> {
    console.log('[EMAIL SERVICE] Enviando via SendGrid...');
    
    // Em produção, fazer requisição real para API do SendGrid
    // https://docs.sendgrid.com/api-reference/mail-send/mail-send
    
    const payload = {
      personalizations: [{
        to: emailData.to.map(email => ({ email })),
      }],
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      reply_to: emailData.replyTo ? { email: emailData.replyTo } : config.replyTo ? { email: config.replyTo } : undefined,
      subject: emailData.subject,
      content: [{
        type: 'text/html',
        value: emailData.html || emailData.body,
      }],
      attachments: emailData.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        type: att.type,
      })),
      mail_settings: config.sandboxMode ? {
        sandbox_mode: { enable: true }
      } : undefined,
    };

    console.log('[EMAIL SERVICE - SENDGRID] Payload preparado:', payload);
    console.log('[EMAIL SERVICE - SENDGRID] ⚠️ MODO MOCK - Para envio real, configure a API Key e descomente o código abaixo');
    
    /*
    // Código para envio real via SendGrid:
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API Error: ${error || response.statusText}`);
    }

    console.log('[EMAIL SERVICE - SENDGRID] E-mail enviado com sucesso');
    */
    
    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('[EMAIL SERVICE - SENDGRID] ✓ E-mail simulado enviado para:', emailData.to.join(', '));
  }

  /**
   * Envia e-mail via Sendflow
   */
  private async sendViaSendflow(emailData: EmailData, config: any): Promise<void> {
    console.log('[EMAIL SERVICE] Enviando via Sendflow...');
    
    const endpoint = config.endpoint || 'https://api.sendflow.io/v1/emails';
    
    const payload = {
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      to: emailData.to.map(email => ({ email })),
      subject: emailData.subject,
      html: emailData.html || emailData.body,
      replyTo: emailData.replyTo || config.replyTo,
      attachments: emailData.attachments,
    };

    console.log('[EMAIL SERVICE - SENDFLOW] Payload preparado:', payload);
    console.log('[EMAIL SERVICE - SENDFLOW] ⚠️ MODO MOCK - Para envio real, configure a API Key e descomente o código abaixo');
    
    /*
    // Código para envio real via Sendflow:
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Sendflow API Error: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('[EMAIL SERVICE - SENDFLOW] E-mail enviado com sucesso:', result.id);
    */
    
    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('[EMAIL SERVICE - SENDFLOW] ✓ E-mail simulado enviado para:', emailData.to.join(', '));
  }

  /**
   * Envia e-mail de relatório de comissões
   */
  public async enviarRelatorioComissoes(
    emailVendedor: string,
    vendedorNome: string,
    mesReferencia: string,
    totalComissoes: number,
    detalhesHTML: string
  ): Promise<void> {
    if (!this.settings?.autoSend.relatorioComissoes) {
      console.log('[EMAIL SERVICE] Envio automático de relatório de comissões está desabilitado');
      return;
    }

    const emailData: EmailData = {
      to: [emailVendedor],
      subject: `Relatório de Comissões - ${mesReferencia}`,
      body: `
Olá ${vendedorNome},

Segue seu relatório de comissões referente a ${mesReferencia}:

Total de Comissões: R$ ${totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

Acesse o sistema para mais detalhes.

---
Este é um e-mail automático. Não responda.
      `,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Relatório de Comissões</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${mesReferencia}</p>
            </div>
            
            <div style="padding: 30px; background: white;">
              <p>Olá <strong>${vendedorNome}</strong>,</p>
              <p>Segue seu relatório de comissões referente a <strong>${mesReferencia}</strong>:</p>
              
              <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Total de Comissões</div>
                <div style="font-size: 32px; font-weight: bold; color: #667eea;">
                  R$ ${totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              
              ${detalhesHTML}
              
              <p style="margin-top: 30px;">
                <a href="#" 
                   style="display: inline-block; background-color: #667eea; color: white; 
                          padding: 12px 30px; text-decoration: none; border-radius: 6px; 
                          font-weight: bold;">
                  Acessar Sistema
                </a>
              </p>
            </div>
            
            <div style="padding: 20px; background: #f8f9fa; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                Este é um e-mail automático. Não responda.
              </p>
            </div>
          </body>
        </html>
      `,
    };

    await this.sendEmail(emailData);
  }

  /**
   * Envia e-mail notificando sobre cliente pendente de aprovação
   */
  public async enviarEmailClientePendenteAprovacao(
    emailsDestinatarios: string[],
    clienteNome: string,
    vendedorNome: string,
    linkAprovacao: string
  ): Promise<void> {
    if (!this.settings?.autoSend.clientePendenteAprovacao) {
      console.log('[EMAIL SERVICE] Envio automático de cliente pendente está desabilitado');
      return;
    }

    const emailData: EmailData = {
      to: emailsDestinatarios,
      subject: `Novo cliente aguardando aprovação - ${clienteNome}`,
      body: `
Olá,

Um novo cliente foi cadastrado e está aguardando aprovação:

Cliente: ${clienteNome}
Cadastrado por: ${vendedorNome}
Data: ${new Date().toLocaleString('pt-BR')}

Acesse o sistema para aprovar ou rejeitar o cadastro:
${linkAprovacao}

---
Este é um e-mail automático. Não responda.
      `,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #2563eb;">Novo Cliente Aguardando Aprovação</h2>
            <p>Um novo cliente foi cadastrado e está aguardando aprovação:</p>
            <table style="margin: 20px 0; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; width: 150px;">Cliente:</td>
                <td style="padding: 8px;">${clienteNome}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Cadastrado por:</td>
                <td style="padding: 8px;">${vendedorNome}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Data:</td>
                <td style="padding: 8px;">${new Date().toLocaleString('pt-BR')}</td>
              </tr>
            </table>
            <p>
              <a href="${linkAprovacao}" 
                 style="display: inline-block; background-color: #2563eb; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        font-weight: bold;">
                Acessar Sistema
              </a>
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              Este é um e-mail automático. Não responda.
            </p>
          </body>
        </html>
      `,
    };

    await this.sendEmail(emailData);
  }

  /**
   * Envia e-mail notificando vendedor sobre aprovação
   */
  public async enviarEmailClienteAprovado(
    emailVendedor: string,
    clienteNome: string,
    aprovadoPor: string
  ): Promise<void> {
    if (!this.settings?.autoSend.clienteAprovado) {
      console.log('[EMAIL SERVICE] Envio automático de cliente aprovado está desabilitado');
      return;
    }

    const emailData: EmailData = {
      to: [emailVendedor],
      subject: `Cliente aprovado - ${clienteNome}`,
      body: `
Olá,

Seu cadastro de cliente foi aprovado:

Cliente: ${clienteNome}
Aprovado por: ${aprovadoPor}
Data: ${new Date().toLocaleString('pt-BR')}

O cliente já está disponível no sistema e você pode realizar vendas normalmente.

---
Este é um e-mail automático. Não responda.
      `,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #10b981;">Cliente Aprovado ✓</h2>
            <p>Seu cadastro de cliente foi aprovado:</p>
            <table style="margin: 20px 0; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; width: 150px;">Cliente:</td>
                <td style="padding: 8px;">${clienteNome}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Aprovado por:</td>
                <td style="padding: 8px;">${aprovadoPor}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Data:</td>
                <td style="padding: 8px;">${new Date().toLocaleString('pt-BR')}</td>
              </tr>
            </table>
            <p>O cliente já está disponível no sistema e você pode realizar vendas normalmente.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              Este é um e-mail automático. Não responda.
            </p>
          </body>
        </html>
      `,
    };

    await this.sendEmail(emailData);
  }

  /**
   * Envia e-mail notificando vendedor sobre rejeição
   */
  public async enviarEmailClienteRejeitado(
    emailVendedor: string,
    clienteNome: string,
    rejeitadoPor: string,
    motivoRejeicao: string
  ): Promise<void> {
    if (!this.settings?.autoSend.clienteRejeitado) {
      console.log('[EMAIL SERVICE] Envio automático de cliente rejeitado está desabilitado');
      return;
    }

    const emailData: EmailData = {
      to: [emailVendedor],
      subject: `Cadastro de cliente não aprovado - ${clienteNome}`,
      body: `
Olá,

Seu cadastro de cliente não foi aprovado:

Cliente: ${clienteNome}
Analisado por: ${rejeitadoPor}
Data: ${new Date().toLocaleString('pt-BR')}

Motivo: ${motivoRejeicao}

Entre em contato com o gestor para mais informações.

---
Este é um e-mail automático. Não responda.
      `,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #ef4444;">Cadastro Não Aprovado</h2>
            <p>Seu cadastro de cliente não foi aprovado:</p>
            <table style="margin: 20px 0; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; width: 150px;">Cliente:</td>
                <td style="padding: 8px;">${clienteNome}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Analisado por:</td>
                <td style="padding: 8px;">${rejeitadoPor}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Data:</td>
                <td style="padding: 8px;">${new Date().toLocaleString('pt-BR')}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; vertical-align: top;">Motivo:</td>
                <td style="padding: 8px;">${motivoRejeicao}</td>
              </tr>
            </table>
            <p>Entre em contato com o gestor para mais informações.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              Este é um e-mail automático. Não responda.
            </p>
          </body>
        </html>
      `,
    };

    await this.sendEmail(emailData);
  }

  /**
   * Envia e-mail de teste
   */
  public async enviarEmailTeste(
    email: string,
    providerName: string
  ): Promise<void> {
    const emailData: EmailData = {
      to: [email],
      subject: `Teste de integração - ${providerName}`,
      body: `
Este é um e-mail de teste da integração com ${providerName}.

Se você recebeu este e-mail, a configuração está funcionando corretamente!

Data/Hora: ${new Date().toLocaleString('pt-BR')}
      `,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #10b981; margin-top: 0;">✓ Teste de Integração</h2>
              <p>Este é um e-mail de teste da integração com <strong>${providerName}</strong>.</p>
              <p>Se você recebeu este e-mail, a configuração está funcionando corretamente!</p>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Data/Hora: ${new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          </body>
        </html>
      `,
    };

    await this.sendEmail(emailData);
  }
}

// Exportar instância única (singleton)
export const emailService = new EmailService();

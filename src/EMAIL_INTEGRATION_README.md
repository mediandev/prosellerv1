# Integração de E-mail - VendasPro

## 📧 Visão Geral

O sistema VendasPro possui integração completa com serviços de envio de e-mail para automatizar notificações e comunicações do sistema. Atualmente suporta três provedores principais:

- **Resend** - Plataforma moderna de e-mail para desenvolvedores
- **SendGrid** - Serviço confiável de envio de e-mails em escala
- **Sendflow** - Solução flexível para automação de e-mails

## 🚀 Como Configurar

### 1. Acessar Configurações

1. Faça login no sistema como usuário **backoffice**
2. Navegue até **Configurações** no menu lateral
3. Clique na aba **Integrações**
4. Selecione **E-mail**

### 2. Escolher o Provedor

Selecione um dos três provedores disponíveis clicando no card correspondente:

- **Resend** - Recomendado para novos projetos
- **SendGrid** - Recomendado para alto volume
- **Sendflow** - Recomendado para customização

### 3. Configurar Credenciais

Cada provedor requer as seguintes informações:

#### Configurações Comuns (todos os provedores)

- **API Key** *(obrigatório)* - Chave de autenticação do provedor
- **E-mail Remetente** *(obrigatório)* - E-mail que aparecerá como remetente
- **Nome Remetente** *(obrigatório)* - Nome que aparecerá como remetente
- **E-mail de Resposta** *(opcional)* - E-mail para onde as respostas serão enviadas

#### Configurações Específicas

**SendGrid:**
- **Modo Sandbox** - Ative para testar sem enviar e-mails reais

**Sendflow:**
- **Endpoint da API** - URL customizada (deixe em branco para usar o padrão)

### 4. Obter as API Keys

#### Resend
1. Acesse [resend.com](https://resend.com)
2. Faça login ou crie uma conta
3. Vá em [API Keys](https://resend.com/api-keys)
4. Crie uma nova API Key
5. Copie a chave (formato: `re_123456789...`)

#### SendGrid
1. Acesse [sendgrid.com](https://sendgrid.com)
2. Faça login ou crie uma conta
3. Vá em [Settings > API Keys](https://app.sendgrid.com/settings/api_keys)
4. Crie uma nova API Key com permissões de envio
5. Copie a chave (formato: `SG.xxxxxxxxxxxxx...`)

#### Sendflow
1. Acesse o portal do Sendflow
2. Faça login em sua conta
3. Navegue até as configurações de API
4. Gere uma nova API Key
5. Copie a chave

### 5. Configurar E-mails Automáticos

Ative ou desative os tipos de e-mails que devem ser enviados automaticamente:

- ✅ **Cliente Pendente de Aprovação** - Notifica gestores quando um vendedor cadastra um cliente
- ✅ **Cliente Aprovado** - Notifica vendedor quando seu cadastro é aprovado
- ✅ **Cliente Rejeitado** - Notifica vendedor quando seu cadastro é rejeitado
- ✅ **Relatório de Comissões** - Envia relatório mensal de comissões para vendedores
- ⬜ **Pedido Enviado ao ERP** - Notifica quando um pedido é enviado ao ERP
- ⬜ **Pedido Atualizado** - Notifica quando há atualizações em pedidos

### 6. Testar a Integração

1. Digite seu e-mail no campo de teste
2. Clique em **Enviar Teste**
3. Verifique sua caixa de entrada
4. Se recebeu o e-mail, a configuração está correta! ✅

## 🔧 Modo de Desenvolvimento (MOCK)

### Estado Atual

O sistema está configurado em **modo MOCK** para desenvolvimento. Isso significa:

- ✅ Os e-mails **NÃO** são enviados de fato
- ✅ Todas as chamadas são registradas no **console do navegador**
- ✅ Você pode testar toda a lógica sem consumir créditos
- ✅ Perfeito para desenvolvimento e demonstrações

### Ver os Logs

Para visualizar os e-mails que seriam enviados:

1. Abra o **Console do Navegador** (F12)
2. Execute alguma ação que dispare e-mail
3. Procure por mensagens iniciadas com `[EMAIL SERVICE]`
4. Veja todos os detalhes do e-mail que seria enviado

### Ativar Envio Real

Para ativar o envio real em produção:

1. Abra o arquivo `/services/emailService.ts`
2. Localize os métodos `sendViaResend`, `sendViaSendgrid` e `sendViaSendflow`
3. **Descomente** o código de requisição HTTP (está entre comentários `/* */`)
4. **Comente** ou remova as linhas de simulação
5. Salve o arquivo
6. Configure sua API Key válida
7. Teste novamente

## 📨 Tipos de E-mails Disponíveis

### 1. Cliente Pendente de Aprovação

**Quando é enviado:** Quando um vendedor cadastra um novo cliente que precisa aprovação

**Destinatários:** Usuários backoffice com permissão de aprovar clientes

**Conteúdo:**
- Nome do cliente cadastrado
- Nome do vendedor responsável
- Data do cadastro
- Link para acessar o sistema

---

### 2. Cliente Aprovado

**Quando é enviado:** Quando um gestor aprova o cadastro de um cliente

**Destinatários:** Vendedor que cadastrou o cliente

**Conteúdo:**
- Nome do cliente aprovado
- Nome do gestor que aprovou
- Data da aprovação
- Confirmação de disponibilidade no sistema

---

### 3. Cliente Rejeitado

**Quando é enviado:** Quando um gestor rejeita o cadastro de um cliente

**Destinatários:** Vendedor que cadastrou o cliente

**Conteúdo:**
- Nome do cliente rejeitado
- Nome do gestor que rejeitou
- Motivo da rejeição
- Data da análise
- Orientação para contato com gestor

---

### 4. Relatório de Comissões

**Quando é enviado:** Automaticamente no fechamento mensal ou manualmente

**Destinatários:** Vendedor/representante

**Conteúdo:**
- Período de referência
- Total de comissões do período
- Detalhamento (se configurado)
- Link para acessar o sistema

**Como enviar:**
```typescript
import { emailService } from '../services/emailService';

await emailService.enviarRelatorioComissoes(
  'vendedor@email.com',
  'João Silva',
  'Outubro/2025',
  15420.50,
  '<div>Detalhes HTML aqui</div>'
);
```

---

### 5. E-mail de Teste

**Quando é enviado:** Manualmente pela tela de configurações

**Destinatários:** E-mail informado no campo de teste

**Conteúdo:**
- Confirmação de funcionamento da integração
- Nome do provedor usado
- Data/hora do envio

## 💻 Uso Programático

### Enviar E-mail Customizado

```typescript
import { emailService } from '../services/emailService';

// Verificar se está configurado
if (emailService.isConfigured()) {
  // Enviar e-mail
  await emailService.enviarEmailClienteAprovado(
    'vendedor@example.com',
    'Cliente XYZ Ltda',
    'Gestor João'
  );
}
```

### Atualizar Configurações

```typescript
import { emailService } from '../services/emailService';
import { EmailIntegrationSettings } from '../types/emailConfig';

const novasConfiguracoes: EmailIntegrationSettings = {
  activeProvider: 'resend',
  enableNotifications: true,
  providers: {
    resend: {
      provider: 'resend',
      enabled: true,
      apiKey: 're_123456789...',
      fromEmail: 'noreply@seudominio.com',
      fromName: 'VendasPro',
      replyTo: 'contato@seudominio.com'
    }
  },
  notificationEmails: ['admin@seudominio.com'],
  autoSend: {
    clienteAprovado: true,
    clienteRejeitado: true,
    clientePendenteAprovacao: true,
    relatorioComissoes: true,
    pedidoEnviado: false,
    pedidoAtualizado: false,
  }
};

emailService.updateSettings(novasConfiguracoes);
```

## 🔒 Segurança

### Boas Práticas

1. **Nunca commite API Keys** no código
2. Use **variáveis de ambiente** em produção
3. Configure **domínios autorizados** no provedor
4. Use **modo sandbox** para testes
5. Monitore os **logs de envio**
6. Configure **limites de rate** no provedor

### Armazenamento

As configurações são salvas no **localStorage** do navegador. Em produção, considere:

- Migrar para banco de dados backend
- Criptografar as API Keys
- Implementar controle de acesso
- Adicionar auditoria de alterações

## 📊 Monitoramento

### Logs no Console

Todas as operações são registradas com prefixo `[EMAIL SERVICE]`:

```
[EMAIL SERVICE] Enviando via Resend...
[EMAIL SERVICE - RESEND] Payload preparado: {...}
[EMAIL SERVICE - RESEND] ✓ E-mail simulado enviado para: cliente@example.com
```

### Verificar Status

```typescript
import { emailService } from '../services/emailService';

const configurado = emailService.isConfigured();
console.log('E-mail configurado:', configurado);
```

## 🐛 Troubleshooting

### E-mails não estão sendo enviados

1. Verifique se as notificações estão **ativadas**
2. Confirme se o provedor está **configurado**
3. Valide a **API Key** no console do provedor
4. Verifique o **console do navegador** por erros
5. Teste com o botão **"Enviar Teste"**

### API Key inválida

- Confirme que copiou a chave completa
- Verifique se a chave não expirou
- Certifique-se que tem permissões de envio
- Gere uma nova chave se necessário

### E-mails vão para SPAM

- Configure **SPF, DKIM e DMARC** no seu domínio
- Use um **domínio verificado** no provedor
- Evite conteúdo com **palavras suspeitas**
- Mantenha uma boa **reputação de envio**

## 🔄 Migração Entre Provedores

Para trocar de provedor:

1. Configure o **novo provedor**
2. Teste com **e-mail de teste**
3. Ative o **novo provedor**
4. Desative o **provedor anterior**
5. Monitore os primeiros envios

## 📚 Referências

- [Documentação Resend](https://resend.com/docs)
- [Documentação SendGrid](https://docs.sendgrid.com)
- [Documentação Sendflow](https://sendflow.io/docs)

## 🆘 Suporte

Para dúvidas ou problemas:

1. Verifique este README
2. Consulte o console do navegador
3. Teste a integração
4. Entre em contato com o suporte técnico

---

**Última atualização:** Novembro 2025

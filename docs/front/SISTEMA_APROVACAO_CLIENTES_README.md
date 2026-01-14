# Sistema de Aprovação de Cadastros de Clientes

## Visão Geral

Sistema completo de aprovação de cadastros de clientes com notificações em tempo real e envio automático de e-mails, permitindo que vendedores cadastrem clientes que precisam passar por aprovação de usuários backoffice com permissões específicas.

## Funcionalidades Implementadas

### 1. Status de Aprovação de Clientes

**Tipos de Status:**
- `aprovado`: Cliente aprovado e disponível no sistema
- `pendente`: Cliente aguardando aprovação
- `rejeitado`: Cliente rejeitado com motivo especificado

**Campos Adicionados ao Cliente:**
- `statusAprovacao`: Status atual do cadastro
- `motivoRejeicao`: Motivo da rejeição (quando aplicável)
- `aprovadoPor`: Nome do usuário que aprovou/rejeitou
- `dataAprovacao`: Data da aprovação/rejeição

### 2. Fluxo de Cadastro

#### Para Vendedores:
1. Vendedor cadastra novo cliente normalmente
2. Cliente é criado com `statusAprovacao: 'pendente'`
3. Sistema envia notificação para usuários com permissão de aprovar
4. Sistema envia e-mail automático para todos os usuários com permissão
5. Vendedor recebe notificação quando o cadastro é aprovado ou rejeitado

#### Para Usuários Backoffice:
1. Recebe notificação e e-mail sobre novo cadastro pendente
2. Acessa página "Clientes Pendentes de Aprovação"
3. Visualiza detalhes completos do cadastro
4. Aprova ou rejeita o cadastro (com motivo em caso de rejeição)
5. Sistema notifica o vendedor por e-mail e notificação interna

### 3. Sistema de Notificações

**Componente:** `NotificationsMenu`
- Ícone de sino no header com badge mostrando quantidade de notificações não lidas
- Dropdown com lista de notificações
- Marcação individual ou em massa de notificações como lidas
- Arquivamento de notificações
- Navegação direta ao clicar na notificação

**Tipos de Notificações:**
- `cliente_pendente_aprovacao`: Novo cliente aguardando aprovação
- `cliente_aprovado`: Cliente foi aprovado
- `cliente_rejeitado`: Cliente foi rejeitado
- `pedido_novo`: Novo pedido criado
- `meta_atingida`: Meta foi atingida
- `sistema`: Notificações do sistema

### 4. Serviço de E-mail

**Arquivo:** `/services/emailService.ts`

**Funções Implementadas:**

#### `enviarEmailClientePendenteAprovacao()`
Enviado quando vendedor cadastra novo cliente:
- **Para:** Todos os usuários com permissão `clientes.aprovar`
- **Conteúdo:** Nome do cliente, vendedor, data e link para aprovação
- **Formato:** HTML responsivo com botão de acesso ao sistema

#### `enviarEmailClienteAprovado()`
Enviado quando backoffice aprova cadastro:
- **Para:** E-mail do vendedor que cadastrou
- **Conteúdo:** Nome do cliente, aprovador, data
- **Formato:** HTML com confirmação visual em verde

#### `enviarEmailClienteRejeitado()`
Enviado quando backoffice rejeita cadastro:
- **Para:** E-mail do vendedor que cadastrou
- **Conteúdo:** Nome do cliente, motivo da rejeição, responsável
- **Formato:** HTML com alerta visual em vermelho

### 5. Página de Aprovação

**Componente:** `PendingCustomersApproval`
**Rota:** `clientes-pendentes`

**Recursos:**
- Lista de todos os clientes pendentes
- Filtro de pesquisa por nome, CNPJ, vendedor
- Visualização completa dos dados do cliente
- Botões de aprovação e rejeição
- Dialog de confirmação com campo obrigatório de motivo para rejeição
- Controle de permissões (apenas usuários com `clientes.aprovar`)

### 6. Permissões

**Nova Permissão Criada:**
- `clientes.aprovar`: Permite aprovar/rejeitar cadastros de clientes

**Configuração Padrão:**
- **Admin Backoffice:** Tem permissão `clientes.aprovar`
- **Vendedores:** Não têm permissão `clientes.aprovar`

## Arquivos Criados/Modificados

### Arquivos Criados:
1. `/types/notificacao.ts` - Tipos para sistema de notificações
2. `/data/mockNotificacoes.ts` - Dados mockados de notificações
3. `/services/emailService.ts` - Serviço de envio de e-mails
4. `/components/NotificationsMenu.tsx` - Menu de notificações
5. `/components/PendingCustomersApproval.tsx` - Página de aprovação
6. `/SISTEMA_APROVACAO_CLIENTES_README.md` - Esta documentação

### Arquivos Modificados:
1. `/types/customer.ts` - Adicionados campos de aprovação
2. `/data/mockCustomers.ts` - Adicionados clientes pendentes
3. `/contexts/AuthContext.tsx` - Adicionada permissão `clientes.aprovar`
4. `/App.tsx` - Adicionado menu de notificações e rota de aprovação
5. `/components/CompromissoDialogDetalhes.tsx` - Campo categoria
6. `/components/PagamentoDialogDetalhes.tsx` - Campo categoria
7. `/components/CustomerFormContaCorrente.tsx` - Campo categoria nos filtros e formulários

## Como Usar

### Para Vendedores

1. **Cadastrar Cliente:**
   - Acessar "Clientes" → "Novo Cliente"
   - Preencher formulário normalmente
   - Salvar cadastro
   - Cliente ficará com status "Pendente" aguardando aprovação

2. **Acompanhar Status:**
   - Verificar notificações no ícone de sino
   - Receber e-mail quando cadastro for aprovado/rejeitado
   - Clientes aprovados ficam disponíveis para vendas

### Para Backoffice

1. **Receber Notificações:**
   - Badge no ícone de sino indica novos cadastros pendentes
   - E-mail automático é enviado

2. **Aprovar/Rejeitar:**
   - Clicar na notificação ou acessar menu lateral
   - Visualizar detalhes do cliente
   - Aprovar ou rejeitar (informando motivo se rejeitar)
   - Vendedor é notificado automaticamente

## Dados Mockados

### Clientes Pendentes:
- **Farmácia São José LTDA** (CNPJ: 33.444.555/0001-66)
  - Cadastrado por: João Silva
  - Data: 01/11/2025 09:30

- **Mercearia Central LTDA** (CNPJ: 44.555.666/0001-77)
  - Cadastrado por: João Silva
  - Data: 31/10/2025 15:45

### Notificações:
- 2 notificações não lidas para Admin Backoffice
- 1 notificação lida para João Silva (vendedor)

## Integração com Backend (Produção)

### Endpoints Necessários:

```typescript
// Listar clientes pendentes
GET /api/clientes?statusAprovacao=pendente

// Aprovar cliente
POST /api/clientes/{id}/aprovar
Body: { aprovadoPor: string }

// Rejeitar cliente
POST /api/clientes/{id}/rejeitar
Body: { rejeitadoPor: string, motivoRejeicao: string }

// Listar notificações do usuário
GET /api/notificacoes?usuarioId={id}&status=nao_lida

// Marcar notificação como lida
PATCH /api/notificacoes/{id}
Body: { status: 'lida' }

// Enviar e-mail
POST /api/emails/enviar
Body: { to: string[], subject: string, html: string }
```

### Configuração de E-mail:

Em produção, substituir o serviço mock por integração real com:
- **SendGrid**
- **Amazon SES**
- **Mailgun**
- **SMTP customizado**

Exemplo com SendGrid:
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: emailsDestinatarios,
  from: 'noreply@empresa.com',
  subject: 'Novo cliente aguardando aprovação',
  html: emailData.html,
});
```

## Logs e Monitoramento

O sistema registra logs no console para:
- Envio de e-mails (destinatários e conteúdo)
- Aprovações/rejeições de clientes
- Criação de notificações

Em produção, integrar com:
- **Sentry** para tracking de erros
- **LogRocket** para sessões de usuário
- **DataDog** para métricas e logs

## Segurança

### Validações Implementadas:
- Verificação de permissão `clientes.aprovar`
- Campo obrigatório de motivo em rejeições
- Validação de campos obrigatórios nos formulários

### Recomendações para Produção:
- Rate limiting no envio de e-mails
- Audit log de todas as aprovações/rejeições
- Notificações para múltiplos níveis de aprovação (se necessário)
- Backup automático antes de mudanças de status

## Extensões Futuras

### Sugestões de Melhorias:
1. **Workflow Multi-nível:**
   - Aprovação em 2 ou mais etapas
   - Regras de aprovação por valor/região

2. **Notificações Push:**
   - WebSockets para notificações em tempo real
   - Push notifications para mobile

3. **Analytics:**
   - Dashboard de aprovações
   - Tempo médio de aprovação
   - Taxa de aprovação por vendedor

4. **Comentários:**
   - Thread de discussão em cada cadastro
   - Solicitação de correções antes de aprovar

5. **Histórico Detalhado:**
   - Log completo de todas as ações
   - Anexos e documentos do cliente

## Testando o Sistema

### Teste como Vendedor:
1. Fazer login como João Silva (joao.silva@empresa.com / joao123)
2. Tentar acessar "Clientes Pendentes" (deve mostrar erro de permissão)
3. Ver notificação de cliente aprovado

### Teste como Backoffice:
1. Fazer login como Admin (admin@empresa.com / admin123)
2. Ver notificações de clientes pendentes (badge com número 2)
3. Clicar na notificação ou acessar menu
4. Aprovar/rejeitar cadastros
5. Verificar logs no console mostrando envio de e-mails

## Suporte

Para dúvidas ou problemas:
- Verificar logs no console do navegador
- Conferir permissões do usuário no AuthContext
- Validar dados mockados em `/data/mockNotificacoes.ts`

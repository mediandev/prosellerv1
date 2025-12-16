# Sistema de Aprovação para Vendedores

## Visão Geral

Implementado sistema completo de aprovação de clientes cadastrados por vendedores, garantindo que apenas usuários backoffice possam aprovar novos cadastros antes de liberá-los para uso no sistema.

## Funcionalidades Implementadas

### 1. Cadastro de Cliente por Vendedor

Quando um **vendedor** cadastra um novo cliente:

#### Comportamento Automático:
- ✅ **Status de Aprovação**: Automaticamente definido como `pendente`
- ✅ **Vendedor Atribuído**: Automaticamente atribuído ao vendedor logado
- ✅ **Campo Não Editável**: Vendedor não pode alterar o campo "Vendedor Responsável"
- ✅ **Mensagem Informativa**: Toast informando que o cadastro será submetido à aprovação

#### Mensagem ao Salvar:
```
Cliente "[Nome]" cadastrado com sucesso! 
O cadastro será submetido à aprovação do backoffice.
```

#### Alert Informativo:
Um alert azul aparece na aba "Condição Comercial" informando:
```
O vendedor atribuído é automaticamente definido como você 
([Nome do Vendedor]) e não pode ser alterado.
```

---

### 2. Cadastro de Cliente por Backoffice

Quando um **usuário backoffice** cadastra um novo cliente:

#### Comportamento Automático:
- ✅ **Status de Aprovação**: Automaticamente definido como `aprovado`
- ✅ **Vendedor Atribuído**: Pode selecionar qualquer vendedor disponível
- ✅ **Campo Editável**: Backoffice pode escolher o vendedor responsável
- ✅ **Sem Necessidade de Aprovação**: Cliente já fica disponível imediatamente

---

### 3. Fluxo de Aprovação

#### Para Usuários Backoffice:

**Visualização de Pendentes:**
- Acessar menu "Clientes" → "Aprovações Pendentes"
- Lista mostra todos os clientes com status `pendente`
- Informações exibidas: Nome, CNPJ, Vendedor, Data do Cadastro

**Analisar Cliente:**
1. Clicar em "Analisar" no cliente pendente
2. Sistema abre tela completa de cadastro em modo somente leitura
3. Todas as abas disponíveis para revisão completa

**Opções Disponíveis no Cabeçalho:**

##### Modo Visualização (Inicial):
- **Editar**: Habilita edição dos campos
- **Rejeitar**: Abre dialog para rejeitar com motivo
- **Aprovar**: Aprova o cadastro imediatamente

##### Modo Edição (após clicar em "Editar"):
- **Cancelar**: Descarta alterações e volta para visualização
- **Salvar**: Salva as alterações e volta para visualização

**Alert Informativo:**
```
Este cadastro foi realizado por [Nome do Vendedor] em [Data/Hora].
Revise todas as informações antes de aprovar ou rejeitar.
```

**Alert durante Edição:**
```
Você está editando o cadastro antes da aprovação. 
Lembre-se de salvar as alterações antes de aprovar o cliente.
```

#### Aprovar Cliente:
1. Revisar todas as informações
2. (Opcional) Clicar em "Editar" para complementar dados
3. (Opcional) Salvar as alterações
4. Clicar em "Aprovar"
5. Cliente fica disponível no sistema
6. E-mail enviado ao vendedor notificando aprovação

#### Rejeitar Cliente:
1. Clicar em "Rejeitar"
2. Dialog abre solicitando motivo obrigatório
3. Informar motivo detalhado
4. Confirmar rejeição
5. E-mail enviado ao vendedor com o motivo

---

### 4. Controle de Acesso e Permissões

#### Vendedores:
- ✅ Podem cadastrar novos clientes (status `pendente`)
- ✅ Vendedor é atribuído automaticamente
- ✅ Não podem editar o campo "Vendedor Responsável"
- ✅ Veem apenas seus próprios clientes pendentes
- ❌ Não podem aprovar/rejeitar cadastros

#### Backoffice:
- ✅ Podem cadastrar clientes diretamente (status `aprovado`)
- ✅ Podem escolher qualquer vendedor responsável
- ✅ Veem todos os clientes pendentes de aprovação
- ✅ Podem editar dados antes de aprovar
- ✅ Podem aprovar ou rejeitar cadastros
- ✅ Recebem notificações de novos cadastros pendentes

---

### 5. Integrações

#### Sistema de Notificações:
- ✅ Notificação automática para backoffice quando vendedor cadastra cliente
- ✅ Badge com contador de pendências
- ✅ Menu dropdown com lista de notificações

#### Sistema de E-mail:
- ✅ E-mail enviado ao vendedor quando cliente é aprovado
- ✅ E-mail enviado ao vendedor quando cliente é rejeitado (com motivo)
- ✅ Template profissional com informações relevantes

#### Histórico:
- ✅ Registro de criação do cliente
- ✅ Registro de aprovação/rejeição
- ✅ Registro de quem aprovou/rejeitou
- ✅ Registro de alterações feitas durante aprovação

---

## Componentes Modificados

### `/components/CustomerFormPage.tsx`
- ✅ Lógica de aprovação com estados `editandoNoModoAprovar`
- ✅ Botões dinâmicos no cabeçalho (Editar/Cancelar/Salvar/Aprovar/Rejeitar)
- ✅ Validações antes de salvar no modo edição
- ✅ Mensagens específicas para vendedores
- ✅ Atribuição automática de vendedor para vendedores
- ✅ Status automático (`pendente` para vendedor, `aprovado` para backoffice)

### `/components/CustomerFormCondicaoComercial.tsx`
- ✅ Import do `useAuth` para verificar tipo de usuário
- ✅ Campo "Vendedor Responsável" desabilitado para vendedores
- ✅ Alert informativo para vendedores

### `/components/PendingCustomersApproval.tsx`
- ✅ Lista de clientes pendentes
- ✅ Botão "Analisar" que abre `CustomerFormPage` em modo aprovação

### `/services/integrations.ts`
- ✅ Correção de erros CORS silenciados
- ✅ Melhor tratamento de falhas de API

---

## Estados de Aprovação

```typescript
export type StatusAprovacaoCliente = 'aprovado' | 'pendente' | 'rejeitado';
```

### `pendente`
- Cliente cadastrado por vendedor
- Aguardando revisão do backoffice
- Não aparece em listagens gerais (apenas em "Pendentes")

### `aprovado`
- Cliente aprovado pelo backoffice OU
- Cliente cadastrado diretamente pelo backoffice
- Disponível para todas as operações do sistema

### `rejeitado`
- Cliente rejeitado pelo backoffice
- Vendedor notificado via e-mail com motivo
- Não aparece em listagens (apenas no histórico)

---

## Validações Implementadas

### Ao Salvar no Modo Edição (Aprovação):
1. ✅ Razão Social é obrigatória
2. ✅ CPF/CNPJ é obrigatório
3. ✅ Endereço completo é obrigatório

### Campo Vendedor Responsável:
- ✅ Desabilitado para vendedores
- ✅ Habilitado para backoffice
- ✅ Obrigatório para cadastro

---

## Próximas Melhorias Sugeridas

### Backend/Supabase:
- [ ] Migrar dados mockados para banco de dados real
- [ ] Implementar triggers para notificações automáticas
- [ ] RLS (Row Level Security) para garantir acesso correto

### Relatórios:
- [ ] Relatório de tempo médio de aprovação
- [ ] Dashboard com taxa de aprovação/rejeição
- [ ] Histórico de cadastros por vendedor

### UX:
- [ ] Notificação push quando cliente é aprovado/rejeitado
- [ ] Indicador visual de campos editados durante aprovação
- [ ] Preview side-by-side dos dados originais vs editados

---

## Testes Recomendados

### Como Vendedor:
1. ✅ Cadastrar novo cliente
2. ✅ Verificar que vendedor é atribuído automaticamente
3. ✅ Tentar editar campo vendedor (deve estar desabilitado)
4. ✅ Verificar mensagem de aprovação pendente
5. ✅ Ver apenas clientes próprios na listagem

### Como Backoffice:
1. ✅ Visualizar notificações de pendentes
2. ✅ Acessar lista de aprovações pendentes
3. ✅ Analisar cliente pendente
4. ✅ Editar dados antes de aprovar
5. ✅ Salvar alterações
6. ✅ Aprovar cliente
7. ✅ Rejeitar cliente com motivo
8. ✅ Verificar envio de e-mails

---

## Arquivos Relacionados

- `/components/CustomerFormPage.tsx` - Formulário principal
- `/components/CustomerFormCondicaoComercial.tsx` - Aba condição comercial
- `/components/PendingCustomersApproval.tsx` - Lista de pendentes
- `/components/NotificationsMenu.tsx` - Menu de notificações
- `/services/emailService.ts` - Envio de e-mails
- `/services/historyService.ts` - Registro de histórico
- `/types/customer.ts` - Tipos e interfaces
- `/contexts/AuthContext.tsx` - Contexto de autenticação

---

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs no console do navegador
2. Consulte o histórico do cliente
3. Verifique as permissões do usuário logado
4. Confirme status de aprovação no banco de dados

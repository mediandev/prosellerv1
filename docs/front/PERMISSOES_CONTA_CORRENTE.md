# Permissões de Conta Corrente

## 📋 Visão Geral

Sistema de permissões granulares para gerenciamento de lançamentos de conta corrente, permitindo controle de acesso específico para edição e exclusão de compromissos e pagamentos.

## 🔐 Permissões Implementadas

### Categoria: Financeiro - Conta Corrente

| Permissão | ID | Descrição |
|-----------|----|-----------| 
| **Visualizar Conta Corrente** | `contacorrente.visualizar` | Permite visualizar lançamentos de conta corrente |
| **Criar Lançamentos** | `contacorrente.criar` | Permite criar novos lançamentos de conta corrente |
| **Editar Lançamentos** | `contacorrente.editar` | Permite editar lançamentos de conta corrente |
| **Excluir Lançamentos** | `contacorrente.excluir` | Permite excluir lançamentos de conta corrente |

## ✅ Funcionalidades

### 1. Edição de Lançamentos
- ✅ Botão "Editar" disponível na tabela de lançamentos
- ✅ Dialogs separados para edição de compromissos e pagamentos
- ✅ Validação de permissões antes de permitir edição
- ✅ Preservação dos dados originais
- ✅ Feedback visual claro do modo de edição

### 2. Exclusão de Lançamentos
- ✅ Botão "Excluir" com ícone de lixeira
- ✅ Dialog de confirmação com AlertDialog
- ✅ Aviso especial ao excluir compromissos (exclui pagamentos relacionados)
- ✅ Validação de permissões antes de permitir exclusão
- ✅ Feedback de sucesso após exclusão

### 3. Controles de Acesso
- ✅ Botões visíveis apenas para usuários com permissões adequadas
- ✅ Respeita o modo `readOnly` do formulário
- ✅ Mensagens de erro claras quando usuário não tem permissão
- ✅ Integração completa com o sistema de autenticação

## 🎨 Interface

### Botões na Tabela
```
[👁️ Ver] [✏️ Editar] [🗑️ Excluir]
```

- **Ver**: Sempre visível para visualizar detalhes
- **Editar**: Visível apenas com permissão `contacorrente.editar`
- **Excluir**: Visível apenas com permissão `contacorrente.excluir`

### Dialog de Confirmação de Exclusão
```
⚠️ Confirmar Exclusão

Tem certeza que deseja excluir o compromisso/pagamento "Nome do Item"?

⚠️ Atenção: Esta ação também excluirá todos os pagamentos relacionados. (apenas para compromissos)

Esta ação não pode ser desfeita.

[Cancelar] [Excluir]
```

## 👥 Configuração de Permissões

### Usuário Backoffice (Admin)
```typescript
permissoes: [
  'contacorrente.visualizar',
  'contacorrente.criar',
  'contacorrente.editar',
  'contacorrente.excluir',
]
```

### Vendedor (Permissões Básicas)
```typescript
permissoes: [
  'contacorrente.visualizar',
  'contacorrente.criar',
]
```

## 🔄 Fluxo de Edição

1. Usuário clica em "Editar" na tabela
2. Sistema verifica permissão `contacorrente.editar`
3. Se autorizado, abre dialog com dados do lançamento
4. Usuário modifica os campos desejados
5. Ao salvar, validações são executadas
6. Dados são atualizados e feedback é exibido

## 🗑️ Fluxo de Exclusão

1. Usuário clica em "Excluir" na tabela
2. Sistema verifica permissão `contacorrente.excluir`
3. Se autorizado, abre AlertDialog de confirmação
4. Usuário confirma a exclusão
5. Item é excluído e feedback é exibido

## 📝 Histórico de Alterações

### Alteração 1 - Renomeação "Auditoria" → "Histórico de Alterações"
- Renomeado seção de auditoria para nome mais intuitivo
- Layout em timeline vertical para compromissos
- Layout compacto horizontal para pagamentos
- Ícones destacados em círculos coloridos
- Hierarquia visual clara

### Alteração 2 - Permissões de Edição e Exclusão
- Adicionadas 4 novas permissões na categoria "financeiro"
- Implementados handlers de edição e exclusão
- Criados dialogs de edição para compromissos e pagamentos
- Implementado AlertDialog de confirmação de exclusão
- Integração completa com sistema de permissões

### Alteração 3 - Botão Editar em Visualização de Cliente
- Adicionado botão "Editar" no header da tela de visualização
- Permite alternar entre modo visualização e edição sem voltar
- Estado local gerencia modo atual (visualizar/editar)
- Preserva dados originais para cancelamento
- Botões contextuais: Editar → Salvar/Cancelar
- Verifica permissão `clientes.editar` antes de habilitar edição

## 🔧 Manutenção

Para adicionar novas permissões relacionadas à conta corrente:

1. Adicionar permissão em `/types/user.ts` no array `PERMISSOES_DISPONIVEIS`
2. Adicionar permissão aos usuários mock em `/contexts/AuthContext.tsx`
3. Usar `temPermissao('id.da.permissao')` no componente
4. Condicionar renderização/funcionalidade baseado na permissão

## 🚀 Próximos Passos

- [ ] Implementar histórico de edições dos lançamentos
- [ ] Adicionar filtros por usuário que criou/editou
- [ ] Implementar exportação de relatórios de conta corrente
- [ ] Adicionar notificações de alterações importantes
- [ ] Implementar aprovação de exclusões de valores altos

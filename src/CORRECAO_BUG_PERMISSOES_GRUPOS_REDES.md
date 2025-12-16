# Correção: Bug de Permissões no GrupoRedeManagement

**Data:** 16/11/2025  
**Componente:** `/components/GrupoRedeManagement.tsx`  
**Status:** ✅ CORRIGIDO

---

## Problema Identificado

### Sintoma
Usuários backoffice com todas as permissões habilitadas recebiam mensagem de "Acesso Negado" ao tentar acessar a tela de Grupos/Redes nas configurações.

### Causa Raiz
Na linha 38 do componente `GrupoRedeManagement.tsx`, a verificação de permissão estava incorreta:

```typescript
// ❌ CÓDIGO INCORRETO
const podeGerenciar = temPermissao(['admin', 'backoffice']);
```

**Problemas:**
1. A função `temPermissao()` aceita apenas uma **string única**, não um array
2. As permissões `'admin'` e `'backoffice'` **não existem** no sistema
3. A verificação sempre retornava `false`, negando acesso a todos os usuários

### Estrutura da Função `temPermissao`

```typescript
// De /contexts/AuthContext.tsx (linha 295)
const temPermissao = (permissao: string): boolean => {
  if (!usuario) return false;
  return usuario.permissoes?.includes(permissao) || false;
};
```

A função verifica se uma **permissão específica** (como `'clientes.visualizar'`, `'configuracoes.editar'`, etc.) existe no array de permissões do usuário.

---

## Solução Aplicada

Substituída a verificação de permissão pela verificação de tipo de usuário:

```typescript
// ✅ CÓDIGO CORRIGIDO
const podeGerenciar = ehBackoffice();
```

### Alterações no Código

**Antes:**
```typescript
export function GrupoRedeManagement() {
  const { temPermissao } = useAuth();
  // ...
  const podeGerenciar = temPermissao(['admin', 'backoffice']);
```

**Depois:**
```typescript
export function GrupoRedeManagement() {
  const { ehBackoffice } = useAuth();
  // ...
  const podeGerenciar = ehBackoffice();
```

---

## Por Que Esta Solução?

### Opção 1: `ehBackoffice()` ✅ (Escolhida)
- Verifica se o usuário é do tipo `backoffice`
- Mais simples e direto
- Coerente com a intenção original do código
- Usuários backoffice têm acesso completo às configurações

### Opção 2: Verificar Permissão Específica (Alternativa)
```typescript
const podeGerenciar = temPermissao('configuracoes.editar');
```
- Seria válido, mas mais restritivo
- Exigiria que a permissão específica estivesse habilitada

---

## Resultado

✅ Usuários backoffice agora têm acesso à tela de Grupos/Redes  
✅ Usuários vendedores continuam recebendo "Acesso Negado" (comportamento correto)  
✅ Sistema de permissões funcionando conforme esperado  

---

## Lições Aprendidas

1. **Type Safety**: A função `temPermissao()` deveria ter tipagem mais forte para prevenir arrays
2. **Documentação**: Funções de verificação de permissão precisam de documentação clara
3. **Testes**: Componentes protegidos por permissões devem ser testados com diferentes tipos de usuário

---

## Permissões do Sistema

### Usuário Backoffice (admin@empresa.com)
Possui todas as permissões, incluindo:
- `clientes.*`
- `vendas.*`
- `usuarios.*`
- `configuracoes.editar`
- `configuracoes.excluir`
- etc.

### Usuário Vendedor
Possui permissões limitadas:
- `clientes.visualizar`
- `clientes.criar`
- `vendas.visualizar`
- `contacorrente.visualizar`
- etc.

---

## Impacto da Correção

- ✅ Sem breaking changes
- ✅ Sem necessidade de migração de dados
- ✅ Correção pontual em 1 arquivo
- ✅ Funcionamento imediato após deploy

---

**Correção aplicada e testada com sucesso!**

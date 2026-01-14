# 🔄 Migração de Autenticação MOCK → REAL

## 📋 Visão Geral

Este documento descreve o processo completo de migração da autenticação de MOCK (dados hardcoded) para REAL (100% Supabase Auth).

---

## ⚠️ IMPORTANTE - LEIA ANTES DE EXECUTAR

Esta migração é **irreversível** e afeta componentes críticos do sistema:
- ✅ Sistema de autenticação (login/logout)
- ✅ Filtros de vendas por vendedor
- ✅ Permissões de acesso
- ✅ IDs de usuários em todas as tabelas

**Backup recomendado:** Antes de executar, faça backup dos dados do Supabase KV Store.

---

## 🎯 Objetivos da Migração

1. **Eliminar completamente** o array `USUARIOS_MOCK` do AuthContext
2. **Remover** o fallback para autenticação mock
3. **Remover** suporte a tokens mock (`mock_token_*`) no backend
4. **Criar** usuários reais no Supabase Auth para todos os vendedores
5. **Atualizar** o campo `vendedorId` em todas as vendas com IDs reais
6. **Garantir** que vendedores vejam apenas suas vendas (filtro por ID)

---

## 📊 Estado Atual (Antes da Migração)

### Problema Identificado

**Vendedores não conseguem ver suas vendas** devido a:
- Login usa credenciais mock → retorna `userId = 'user-2'` (ID mock)
- Vendas no Supabase têm `vendedorId` diferente (UUID real ou outro ID)
- Backend filtra por `vendedorId === userId` → nenhuma venda passa

### Dados MOCK Ainda Presentes

1. **AuthContext** (`/contexts/AuthContext.tsx`):
   - Linhas 18-161: Array `USUARIOS_MOCK` com 6 usuários
   - Linhas 268-289: Fallback para autenticação mock
   
2. **Backend** (`/supabase/functions/server/index.tsx`):
   - Linhas 77-82: Aceita tokens mock (`mock_token_*`)

---

## 🛠️ Processo de Migração

### FASE 1: Análise (Sem Alterações)

**Ferramenta:** Configurações → Migração Auth → Aba "1. Análise"

**O que faz:**
1. Lista todos os usuários no KV Store
2. Lista todas as vendas no KV Store
3. Identifica vendedores únicos nas vendas
4. Detecta inconsistências:
   - Vendas com `vendedorId` mock (user-X)
   - Usuários com ID mock no KV
   - Vendedores sem usuário correspondente
   - Mesmo nome com IDs diferentes

**Resultado esperado:**
```
✅ X usuários no KV
✅ Y vendas no KV
✅ Z vendedores únicos
⚠️ Inconsistências encontradas (se houver)
```

### FASE 2: Execução da Migração

**Ferramenta:** Configurações → Migração Auth → Aba "2. Execução"

**Etapas automáticas:**

1. **Análise inicial**
   - Carrega usuários e vendas do Supabase
   - Mapeia vendedores únicos

2. **Mapeamento de IDs**
   - Para cada vendedor nas vendas:
     - Verifica se usuário existe no KV (por nome)
     - Se existe: mapeia IDs antigos → ID existente
     - Se não existe: marca para criar novo usuário

3. **Criação de usuários**
   - Para vendedores sem usuário:
     - Cria usuário no Supabase Auth via `POST /auth/signup`
     - Gera email: `nome.sobrenome@empresa.com`
     - Senha padrão: `senha123` (deve ser alterada)
     - Mapeia IDs antigos → novo UUID do Supabase

4. **Atualização de vendas**
   - Para cada venda:
     - Se `vendedorId` está no mapa de IDs:
       - Atualiza `vendedorId` para o ID real via `PUT /vendas/:id`
   - Log de progresso a cada 10 vendas

5. **Resumo final**
   - Total de usuários criados
   - Total de vendas atualizadas
   - Mapeamentos realizados

**Logs detalhados** são exibidos em tempo real.

### FASE 3: Remoção do Código MOCK

**Após confirmar que a migração foi bem-sucedida**, executar manualmente:

1. **AuthContext** (`/contexts/AuthContext.tsx`):
   ```typescript
   // REMOVER: Linhas 18-161 (array USUARIOS_MOCK)
   // REMOVER: Linhas 268-289 (fallback mock no login)
   // MANTER: Apenas autenticação via Supabase Auth
   ```

2. **Backend** (`/supabase/functions/server/index.tsx`):
   ```typescript
   // REMOVER: Linhas 77-82 (suporte a mock_token_*)
   // MANTER: Apenas verificação de JWT do Supabase
   ```

3. **Componentes de UI**:
   - Remover `/components/DemoModeBadge.tsx`
   - Remover `/components/SetupUsersButton.tsx`
   - Remover import do DemoModeBadge no App.tsx

---

## ✅ Testes Pós-Migração

Após executar a migração, testar:

1. **Login de Vendedor**
   ```
   Email: joao.silva@empresa.com (ou email gerado)
   Senha: senha123
   ```
   - ✅ Deve fazer login com sucesso
   - ✅ Deve receber JWT real do Supabase (não mock_token_*)

2. **Visualização de Vendas**
   - ✅ Vendedor João Silva deve ver SUAS vendas no Dashboard
   - ✅ Métricas devem mostrar valores corretos
   - ✅ Filtro "Minhas Vendas" deve funcionar

3. **Login de Backoffice**
   - ✅ Usuário admin deve ver TODAS as vendas
   - ✅ Filtros por vendedor devem funcionar

4. **Criação de Nova Venda**
   - ✅ Vendedor deve conseguir criar venda
   - ✅ `vendedorId` deve ser preenchido com seu ID real
   - ✅ Venda deve aparecer no Dashboard do vendedor

---

## 🚨 Troubleshooting

### Erro: "Usuário não encontrado após criação"

**Causa:** Delay entre criar usuário no Supabase Auth e aparecer no KV Store

**Solução:** 
- Aguardar alguns segundos
- Executar novamente apenas a "Atualização de vendas"

### Erro: "Email já existe"

**Causa:** Tentativa de criar usuário com email duplicado

**Solução:**
- Verificar se usuário já existe no Supabase Auth
- Se sim, mapear manualmente o ID

### Vendedor ainda não vê vendas

**Possíveis causas:**
1. Migração não concluída (verificar logs)
2. `vendedorId` não foi atualizado nas vendas
3. Token mock ainda em cache (fazer logout/login)

**Solução:**
1. Executar análise novamente
2. Verificar se vendas foram atualizadas
3. Limpar localStorage e fazer novo login

---

## 📝 Notas Técnicas

### Filtro de Vendas por Vendedor

**Backend** (`/supabase/functions/server/index.tsx` linha 1193):
```typescript
if (usuario?.tipo === 'vendedor') {
  return c.json(vendas.filter((v: any) => v.vendedorId === userId));
}
```

Este filtro compara `vendedorId` (string) com `userId` (string).
**Após migração**, ambos serão UUIDs reais do Supabase, garantindo o match correto.

### Estrutura de Dados

**Antes da migração:**
```json
{
  "id": "venda-123",
  "vendedorId": "user-2",  // ❌ ID mock
  "nomeVendedor": "João Silva"
}
```

**Após migração:**
```json
{
  "id": "venda-123",
  "vendedorId": "550e8400-e29b-41d4-a716-446655440000",  // ✅ UUID real
  "nomeVendedor": "João Silva"
}
```

---

## 🎓 Credenciais dos Usuários Criados

Após a migração, usuários terão:

**Email:** `{nome}.{sobrenome}@empresa.com`
- Exemplo: `joao.silva@empresa.com`
- Acentos removidos automaticamente

**Senha:** `senha123`
- ⚠️ ALTERE imediatamente em produção
- Use Perfil → Alterar Senha

**Tipo:** Vendedor ou Backoffice (conforme dados originais)

---

## 📞 Suporte

Se encontrar problemas:
1. Consultar logs detalhados na ferramenta de migração
2. Verificar console do navegador (F12)
3. Verificar logs do backend no Supabase Functions

---

**Última atualização:** 15/12/2025
**Versão do documento:** 1.0

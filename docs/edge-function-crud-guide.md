# Guia Completo: Edge Function CRUD Unificada

Este documento detalha como criar e usar uma única Edge Function do Supabase para realizar todas as operações CRUD (Create, Read, Update, Delete) em um único endpoint, seguindo o padrão arquitetural do projeto.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura da Edge Function](#estrutura-da-edge-function)
3. [Funções RPC: Por Que e Como Criar](#-funções-rpc-por-que-e-como-criar)
4. [Implementação Passo a Passo](#implementação-passo-a-passo)
5. [Configuração RLS para Novas Tabelas](#configuração-rls-para-novas-tabelas)
6. [Evitando Erros de Ambiguidade (Ambiguous)](#evitando-erros-de-ambiguidade-ambiguous)
7. [Chamadas API no Frontend](#chamadas-api-no-frontend)
8. [Exemplo Completo: Natureza de Operação](#exemplo-completo-natureza-de-operação)
9. [Boas Práticas](#boas-práticas)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Uma Edge Function CRUD unificada permite gerenciar todas as operações de um recurso através de um único endpoint, utilizando diferentes métodos HTTP:

- **GET** → Listar todos ou buscar por ID
- **POST** → Criar novo registro
- **PUT** → Atualizar registro existente
- **DELETE** → Excluir registro (soft delete)

### ⚠️ Regra Fundamental: Sempre Criar Funções RPC

**Ao criar uma Edge Function CRUD, SEMPRE crie as funções RPC correspondentes no PostgreSQL.**

A arquitetura recomendada é:

```
Cliente (Frontend)
 ↓
Edge Function (Camada de API)
 ↓
Função RPC (Lógica de Negócio no PostgreSQL)
 ↓
Tabelas com RLS (Camada de Dados)
```

**Por quê?**
- ✅ **Reaproveitamento**: Funções RPC podem ser usadas por múltiplas Edge Functions
- ✅ **Performance**: Execução próxima aos dados, aproveitando índices
- ✅ **Manutenibilidade**: Lógica centralizada facilita correções e melhorias
- ✅ **Testabilidade**: Funções RPC podem ser testadas diretamente no banco

📖 **Ver seção completa**: [Funções RPC: Por Que e Como Criar](#-funções-rpc-por-que-e-como-criar)

### Vantagens

✅ **Simplicidade**: Um único endpoint para todas as operações  
✅ **Consistência**: Padrão uniforme de resposta  
✅ **Manutenibilidade**: Código centralizado e fácil de manter  
✅ **Performance**: Menos overhead de rede  
✅ **Reaproveitamento**: Funções RPC podem ser compartilhadas entre Edge Functions  

---

## ⚠️ Erros Comuns a Evitar

### 1. Erro de Ambiguidade em Funções RPC

**Erro**: `column reference "nome" is ambiguous` ou `column reference "ativo" is ambiguous`

**Causa**: Colunas não qualificadas com aliases nas queries SQL.

**Solução**: **SEMPRE use aliases e qualifique todas as colunas:**

```sql
-- ❌ ERRADO
SELECT 1 FROM public.resource WHERE nome = p_nome

-- ✅ CORRETO
SELECT 1 FROM public.resource r WHERE r.nome = p_nome
```

**Aplicar em:**
- ✅ Funções CREATE (validações de existência)
- ✅ Funções UPDATE (queries de verificação)
- ✅ Queries de verificação de permissões (SELECT de user)
- ✅ Subqueries EXISTS/IN
- ✅ UPDATE statements
- ✅ RETURN QUERY

📖 **Ver seção completa**: [Evitando Erros de Ambiguidade](#evitando-erros-de-ambiguidade-ambiguous)

### 2. Mensagem de Sucesso Antes da Resposta da API

**Erro**: Toast de sucesso aparece mesmo quando API retorna erro 500.

**Causa**: Estado e mensagem são atualizados antes de aguardar resposta da API.

**Solução**: **SEMPRE aguarde a resposta da API antes de atualizar estado:**

```typescript
// ❌ ERRADO
const newItem = { id: crypto.randomUUID(), ...data }
await api.create(newItem)
setItems([...items, newItem])  // Atualiza antes de confirmar!
toast.success('Sucesso')  // Mostra mesmo se API falhar!

// ✅ CORRETO
const newItem = await api.create(data)  // Aguarda resposta
setItems([...items, newItem])  // Só atualiza após sucesso
toast.success('Sucesso')  // Só mostra após confirmação
```

📖 **Ver seção completa**: [Chamadas API no Frontend - Regra de Ouro](#-regra-de-ouro-aguardar-resposta)

### 3. ID Não Extraído do Path

**Erro**: `ID é obrigatório para atualização`

**Causa**: ID não está sendo extraído corretamente da URL.

**Solução**: Verificar lógica de extração e passar ID como path no frontend.

📖 **Ver seção completa**: [Troubleshooting - ID obrigatório](#erro-id-é-obrigatório-para-atualização)

---

## 🏗️ Estrutura da Edge Function

### Localização

```
supabase/
└── functions/
    └── [nome-recurso]-v2/
        └── index.ts
```

### Estrutura Básica

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 1. Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// 2. Interfaces TypeScript
interface AuthenticatedUser {
  id: string
  email: string
  tipo: 'backoffice' | 'vendedor'
  ativo: boolean
}

// 3. Helpers de Autenticação
async function validateJWT(...) { ... }

// 4. Helpers de Resposta
function createAuthErrorResponse(...) { ... }
function createHttpSuccessResponse(...) { ... }
function formatErrorResponse(...) { ... }

// 5. Handler Principal
serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') { ... }
  
  // Autenticação
  // Extração de ID do path
  // Roteamento por método HTTP
  // GET, POST, PUT, DELETE
})
```

---

## 🔄 Funções RPC: Por Que e Como Criar

### Por Que Criar Funções RPC?

Ao criar uma Edge Function CRUD, **SEMPRE crie funções RPC correspondentes** no PostgreSQL. Isso oferece várias vantagens:

#### ✅ Vantagens das Funções RPC

1. **Reaproveitamento de Código**
   - Funções RPC podem ser chamadas de múltiplas Edge Functions
   - Evita duplicação de lógica de negócio
   - Facilita manutenção centralizada

2. **Performance Otimizada**
   - Execução próxima aos dados (no servidor PostgreSQL)
   - Aproveitamento de índices e otimizações do banco
   - Redução de round-trips entre Edge Function e banco

3. **Segurança e Consistência**
   - Lógica de negócio centralizada no banco
   - Validações aplicadas diretamente nos dados
   - Transações atômicas garantidas

4. **Facilidade de Teste**
   - Funções RPC podem ser testadas diretamente no banco
   - Não dependem da Edge Function estar deployada
   - Facilita debugging de queries complexas

5. **Consultas Complexas**
   - Agregações, JOINs e cálculos complexos
   - Paginação eficiente
   - Filtros avançados

### Quando Usar Funções RPC vs Queries Diretas

#### ✅ Use Funções RPC Para:

- **Operações CRUD completas** (CREATE, UPDATE, DELETE)
- **Queries com lógica de negócio complexa**
- **Validações que dependem de múltiplas tabelas**
- **Operações que precisam ser transacionais**
- **Queries que serão reutilizadas em múltiplas Edge Functions**
- **Listagens com filtros, paginação e ordenação**

#### ⚠️ Queries Diretas São Aceitáveis Para:

- **Queries simples de SELECT sem lógica complexa**
- **Operações de leitura que não precisam de validações**
- **Casos onde a performance não é crítica**

### Estrutura de Nomenclatura

Siga este padrão para funções RPC:

```
[nome_recurso]_v2
├── create_[nome_recurso]_v2    → POST
├── get_[nome_recurso]_v2        → GET /:id
├── list_[nome_recurso]_v2      → GET (listar todos)
├── update_[nome_recurso]_v2    → PUT
└── delete_[nome_recurso]_v2     → DELETE
```

**Exemplo**: Para `natureza-operacao-v2`:
- `create_natureza_operacao_v2`
- `get_natureza_operacao_v2`
- `list_natureza_operacao_v2`
- `update_natureza_operacao_v2`
- `delete_natureza_operacao_v2`

### Template de Função RPC CREATE

```sql
CREATE OR REPLACE FUNCTION create_[recurso]_v2(
  p_nome TEXT,
  p_created_by UUID,
  -- outros parâmetros específicos
)
RETURNS TABLE (
  id BIGINT,
  nome TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
  -- outros campos de retorno
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_new_id BIGINT;
BEGIN
  -- 1. VALIDAÇÕES DE ENTRADA
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- 2. VERIFICAÇÕES DE PERMISSÃO
  -- ✅ SEMPRE usar alias 'u' para user
  SELECT u.tipo INTO v_user_tipo
  FROM public.user u
  WHERE u.user_id = p_created_by
  AND u.ativo = TRUE
  AND u.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado ou inativo';
  END IF;

  IF v_user_tipo != 'backoffice' THEN
    RAISE EXCEPTION 'Apenas usuários backoffice podem criar';
  END IF;

  -- 3. VALIDAÇÕES DE NEGÓCIO
  -- ✅ SEMPRE usar alias 'r' para o recurso
  IF EXISTS (
    SELECT 1 FROM public.[tabela] r
    WHERE LOWER(TRIM(r.nome)) = LOWER(TRIM(p_nome))
    AND r.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Já existe um registro com este nome';
  END IF;

  -- 4. INSERÇÃO
  INSERT INTO public.[tabela] (
    nome,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    TRIM(p_nome),
    p_created_by,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_id;

  -- 5. RETORNO
  -- ✅ SEMPRE usar alias no RETURN QUERY
  RETURN QUERY
  SELECT 
    r.id,
    r.nome,
    r.created_at,
    r.updated_at
  FROM public.[tabela] r
  WHERE r.id = v_new_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_[recurso]_v2: %', SQLERRM;
    RAISE;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION create_[recurso]_v2 IS 
'Cria um novo registro com validações de permissão e negócio';

-- Permissões
GRANT EXECUTE ON FUNCTION create_[recurso]_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION create_[recurso]_v2 FROM anon;
```

### Template de Função RPC GET (Buscar por ID)

```sql
CREATE OR REPLACE FUNCTION get_[recurso]_v2(
  p_id BIGINT
)
RETURNS TABLE (
  id BIGINT,
  nome TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- 2. BUSCAR E RETORNAR
  -- ✅ SEMPRE usar alias
  RETURN QUERY
  SELECT 
    r.id,
    r.nome,
    r.created_at,
    r.updated_at
  FROM public.[tabela] r
  WHERE r.id = p_id
  AND r.deleted_at IS NULL;

  -- 3. VERIFICAR SE ENCONTROU
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro não encontrado';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_[recurso]_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_[recurso]_v2 IS 
'Busca um registro por ID';

GRANT EXECUTE ON FUNCTION get_[recurso]_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_[recurso]_v2 TO anon;  -- Se permitir acesso público
```

### Template de Função RPC LIST (Listar com Filtros)

```sql
CREATE OR REPLACE FUNCTION list_[recurso]_v2(
  p_requesting_user_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_apenas_ativas BOOLEAN DEFAULT FALSE,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_items JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  -- 2. CONTAR TOTAL (com filtros)
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.[tabela] r
  WHERE r.deleted_at IS NULL
  AND (p_search IS NULL OR r.nome ILIKE '%' || p_search || '%')
  AND (NOT p_apenas_ativas OR r.ativo = TRUE);

  -- 3. BUSCAR ITENS (com paginação)
  SELECT JSON_BUILD_OBJECT(
    'items', COALESCE(JSON_AGG(item_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit
  )
  INTO v_items
  FROM (
    SELECT JSON_BUILD_OBJECT(
      'id', r.id,
      'nome', r.nome,
      'ativo', r.ativo,
      'created_at', r.created_at,
      'updated_at', r.updated_at
    ) AS item_data
    FROM public.[tabela] r
    WHERE r.deleted_at IS NULL
    AND (p_search IS NULL OR r.nome ILIKE '%' || p_search || '%')
    AND (NOT p_apenas_ativas OR r.ativo = TRUE)
    ORDER BY r.nome ASC
    LIMIT p_limit
    OFFSET v_offset
  ) AS items_subquery;

  -- 4. RETORNAR
  RETURN v_items;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_[recurso]_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION list_[recurso]_v2 IS 
'Lista registros com filtros, paginação e ordenação';

GRANT EXECUTE ON FUNCTION list_[recurso]_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION list_[recurso]_v2 TO anon;  -- Se permitir acesso público
```

### Template de Função RPC UPDATE

```sql
CREATE OR REPLACE FUNCTION update_[recurso]_v2(
  p_id BIGINT,
  p_nome TEXT DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
  -- outros parâmetros opcionais
)
RETURNS TABLE (
  id BIGINT,
  nome TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- 2. VERIFICAR SE EXISTE
  -- ✅ SEMPRE usar alias
  IF NOT EXISTS (
    SELECT 1 FROM public.[tabela] r
    WHERE r.id = p_id AND r.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Registro não encontrado';
  END IF;

  -- 3. VERIFICAR PERMISSÕES
  IF p_updated_by IS NOT NULL THEN
    -- ✅ SEMPRE usar alias 'u' para user
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar';
    END IF;
  END IF;

  -- 4. VALIDAR UNICIDADE (se aplicável)
  IF p_nome IS NOT NULL THEN
    -- ✅ SEMPRE usar alias
    IF EXISTS (
      SELECT 1 FROM public.[tabela] r
      WHERE LOWER(TRIM(r.nome)) = LOWER(TRIM(p_nome))
      AND r.id != p_id
      AND r.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Já existe outro registro com este nome';
    END IF;
  END IF;

  -- 5. ATUALIZAR
  -- ✅ SEMPRE usar alias no UPDATE
  UPDATE public.[tabela] r
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), r.nome),
    updated_at = NOW()
  WHERE r.id = p_id;

  -- 6. RETORNAR
  -- ✅ SEMPRE usar alias no RETURN QUERY
  RETURN QUERY
  SELECT 
    r.id,
    r.nome,
    r.updated_at
  FROM public.[tabela] r
  WHERE r.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_[recurso]_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION update_[recurso]_v2 IS 
'Atualiza um registro existente com validações';

GRANT EXECUTE ON FUNCTION update_[recurso]_v2 TO authenticated;
```

### Template de Função RPC DELETE

```sql
CREATE OR REPLACE FUNCTION delete_[recurso]_v2(
  p_id BIGINT,
  p_deleted_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- 2. VERIFICAR SE EXISTE
  -- ✅ SEMPRE usar alias
  IF NOT EXISTS (
    SELECT 1 FROM public.[tabela] r
    WHERE r.id = p_id AND r.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Registro não encontrado';
  END IF;

  -- 3. VERIFICAR PERMISSÕES
  IF p_deleted_by IS NOT NULL THEN
    -- ✅ SEMPRE usar alias 'u' para user
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir';
    END IF;
  END IF;

  -- 4. VERIFICAR DEPENDÊNCIAS (se aplicável)
  -- Exemplo: verificar se há registros relacionados
  IF EXISTS (
    SELECT 1 FROM public.[tabela_relacionada] tr
    WHERE tr.[recurso]_id = p_id
    AND tr.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir pois existem registros relacionados';
  END IF;

  -- 5. SOFT DELETE (marcar como deletado)
  -- ✅ SEMPRE usar alias no UPDATE
  UPDATE public.[tabela] r
  SET
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE r.id = p_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_[recurso]_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION delete_[recurso]_v2 IS 
'Exclui um registro (soft delete) com validações de dependências';

GRANT EXECUTE ON FUNCTION delete_[recurso]_v2 TO authenticated;
```

### Chamando Funções RPC na Edge Function

```typescript
// GET - Buscar por ID
if (req.method === 'GET' && resourceId) {
  const { data, error } = await supabase
    .rpc('get_resource_v2', {
      p_id: parseInt(resourceId)
    })
  
  if (error) throw new Error(`Database operation failed: ${error.message}`)
  if (!data || data.length === 0) throw new Error('Resource not found')
  
  return createHttpSuccessResponse(data[0], 200)
}

// GET - Listar todos
if (req.method === 'GET' && !resourceId) {
  const { data: rpcData, error } = await supabase
    .rpc('list_resource_v2', {
      p_requesting_user_id: user.id,
      p_search: url.searchParams.get('search') || null,
      p_apenas_ativas: url.searchParams.get('apenas_ativas') === 'true',
      p_page: parseInt(url.searchParams.get('page') || '1'),
      p_limit: Math.min(parseInt(url.searchParams.get('limit') || '100'), 100),
    })
  
  if (error) throw new Error(`Database operation failed: ${error.message}`)
  
  return createHttpSuccessResponse(rpcData, 200)
}

// POST - Criar
if (req.method === 'POST') {
  const body = await req.json()
  
  const { data, error } = await supabase
    .rpc('create_resource_v2', {
      p_nome: body.nome.trim(),
      p_created_by: user.id,
    })
  
  if (error) throw new Error(`Database operation failed: ${error.message}`)
  if (!data || data.length === 0) throw new Error('Erro ao criar recurso')
  
  return createHttpSuccessResponse(data[0], 201)
}

// PUT - Atualizar
if (req.method === 'PUT') {
  const body = await req.json()
  const id = resourceId || body.id
  
  const { data, error } = await supabase
    .rpc('update_resource_v2', {
      p_id: parseInt(id),
      p_nome: body.nome ? body.nome.trim() : null,
      p_updated_by: user.id,
    })
  
  if (error) throw new Error(`Database operation failed: ${error.message}`)
  if (!data || data.length === 0) throw new Error('Resource not found')
  
  return createHttpSuccessResponse(data[0], 200)
}

// DELETE - Excluir
if (req.method === 'DELETE') {
  const id = resourceId || url.searchParams.get('id')
  
  const { error } = await supabase
    .rpc('delete_resource_v2', {
      p_id: parseInt(id),
      p_deleted_by: user.id,
    })
  
  if (error) throw new Error(`Database operation failed: ${error.message}`)
  
  return createHttpSuccessResponse(
    { success: true, message: 'Recurso excluído com sucesso' },
    200
  )
}
```

### Reaproveitamento de Funções RPC

#### Exemplo: Função RPC Reutilizável

Uma função RPC pode ser chamada de múltiplas Edge Functions:

```sql
-- Função RPC genérica para verificar permissões
CREATE OR REPLACE FUNCTION check_user_permission_v2(
  p_user_id UUID,
  p_required_tipo TEXT DEFAULT 'backoffice'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_user_tipo TEXT;
BEGIN
  -- ✅ SEMPRE usar alias
  SELECT u.tipo INTO v_user_tipo
  FROM public.user u
  WHERE u.user_id = p_user_id
  AND u.ativo = TRUE
  AND u.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN v_user_tipo = p_required_tipo;
END;
$$;
```

**Uso em múltiplas funções RPC:**

```sql
-- Na função create_resource_v2
IF NOT check_user_permission_v2(p_created_by, 'backoffice') THEN
  RAISE EXCEPTION 'Apenas usuários backoffice podem criar';
END IF;

-- Na função update_resource_v2
IF NOT check_user_permission_v2(p_updated_by, 'backoffice') THEN
  RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar';
END IF;
```

### Checklist de Criação de Funções RPC

Ao criar uma Edge Function, certifique-se de criar as funções RPC correspondentes:

- [ ] **CREATE**: `create_[recurso]_v2` com validações de permissão e negócio
- [ ] **GET**: `get_[recurso]_v2` para buscar por ID
- [ ] **LIST**: `list_[recurso]_v2` com filtros, paginação e ordenação
- [ ] **UPDATE**: `update_[recurso]_v2` com validações de permissão e unicidade
- [ ] **DELETE**: `delete_[recurso]_v2` com validações de dependências
- [ ] **Aliases**: Todas as queries usam aliases (`r`, `u`, etc.)
- [ ] **Comentários**: Funções documentadas com `COMMENT ON FUNCTION`
- [ ] **Permissões**: `GRANT EXECUTE` configurado corretamente
- [ ] **SECURITY INVOKER**: Usado para executar com permissões do usuário
- [ ] **STABLE/VOLATILE**: `STABLE` para leituras, `VOLATILE` para escritas

### Localização dos Arquivos

```
supabase/
├── functions/
│   └── [recurso]-v2/
│       └── index.ts          ← Edge Function
└── migrations/
    └── XXX_rpc_[recurso]_v2.sql  ← Funções RPC
```

**Exemplo:**
```
supabase/
├── functions/
│   └── natureza-operacao-v2/
│       └── index.ts
└── migrations/
    └── 009_rpc_natureza_operacao_v2.sql
```

### Benefícios do Reaproveitamento

1. **Múltiplas Edge Functions podem usar a mesma função RPC**
   ```typescript
   // Edge Function A
   await supabase.rpc('list_resource_v2', { ... })
   
   // Edge Function B (diferente)
   await supabase.rpc('list_resource_v2', { ... })
   ```

2. **Lógica centralizada facilita manutenção**
   - Mudanças em uma função RPC afetam todas as Edge Functions que a usam
   - Correções de bugs são aplicadas globalmente

3. **Testes isolados**
   - Funções RPC podem ser testadas diretamente no banco
   - Não dependem de Edge Functions estarem deployadas

### Exemplo Prático: Reaproveitamento de Função RPC

**Cenário**: Você tem uma função RPC `list_marcas_v2` que lista marcas com filtros e paginação.

**Uso em múltiplas Edge Functions:**

```typescript
// Edge Function: marcas-v2/index.ts
if (req.method === 'GET' && !marcaId) {
  const { data, error } = await supabase
    .rpc('list_marcas_v2', {
      p_search: url.searchParams.get('search'),
      p_page: parseInt(url.searchParams.get('page') || '1'),
      p_limit: parseInt(url.searchParams.get('limit') || '100'),
    })
  // ...
}

// Edge Function: produtos-v2/index.ts (diferente!)
// Pode usar a mesma função RPC para buscar marcas disponíveis
if (req.method === 'GET' && action === 'get_marcas') {
  const { data, error } = await supabase
    .rpc('list_marcas_v2', {
      p_search: null,
      p_apenas_ativas: true,  // Apenas marcas ativas para produtos
      p_page: 1,
      p_limit: 1000,
    })
  // ...
}
```

**Benefício**: Se você precisar adicionar um novo filtro ou melhorar a performance da listagem de marcas, basta atualizar a função RPC `list_marcas_v2` uma vez, e todas as Edge Functions que a usam serão automaticamente beneficiadas.

---

## 📝 Implementação Passo a Passo

### 1. Configuração Inicial

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}
```

### 2. Helper de Autenticação

```typescript
async function validateJWT(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return { user: null, error: 'Missing authorization header' }
    
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })
    
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) return { user: null, error: 'Invalid or expired token' }
    
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('user_id, email, tipo, ativo')
      .eq('user_id', authUser.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .single()
    
    if (userError || !userData) return { user: null, error: 'User not found or inactive' }
    
    return {
      user: {
        id: userData.user_id,
        email: userData.email || authUser.email || '',
        tipo: userData.tipo as 'backoffice' | 'vendedor',
        ativo: userData.ativo,
      },
      error: null
    }
  } catch (error) {
    return { user: null, error: 'Authentication error' }
  }
}
```

### 3. Helpers de Resposta

```typescript
function createAuthErrorResponse(message: string, statusCode: number = 401): Response {
  return new Response(
    JSON.stringify({ error: message, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function createHttpSuccessResponse<T>(data: T, status: number = 200, meta?: Record<string, any>): Response {
  return new Response(
    JSON.stringify({ success: true, data, meta: { timestamp: new Date().toISOString(), ...meta } }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function formatErrorResponse(error: Error | unknown): Response {
  let statusCode = 500
  let errorMessage = 'Internal server error'
  if (error instanceof Error) {
    errorMessage = error.message
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) statusCode = 401
    else if (error.message.includes('permission') || error.message.includes('forbidden')) statusCode = 403
    else if (error.message.includes('not found')) statusCode = 404
    else if (error.message.includes('validation') || error.message.includes('invalid')) statusCode = 400
  }
  console.error('[ERROR]', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### 4. Extração de ID do Path

**⚠️ IMPORTANTE**: Esta é uma parte crítica para evitar erros!

```typescript
const url = new URL(req.url)
const pathParts = url.pathname.split('/').filter(p => p)
// Exemplo: ['functions', 'v1', 'natureza-operacao-v2', '123']

// Encontrar o índice do nome da função e pegar o próximo elemento como ID
const functionIndex = pathParts.indexOf('natureza-operacao-v2')
const resourceId = functionIndex >= 0 && functionIndex < pathParts.length - 1
  ? pathParts[functionIndex + 1]
  : url.searchParams.get('id')

console.log('[FUNCTION] Request details:', { 
  resourceId, 
  method: req.method, 
  pathParts, 
  functionIndex,
  url: req.url,
  pathname: url.pathname
})
```

### 5. Roteamento por Método HTTP

#### GET - Listar ou Buscar por ID

```typescript
if (req.method === 'GET') {
  if (resourceId) {
    // GET /function-name/:id - Buscar por ID
    const { data, error } = await supabase
      .rpc('get_resource_v2', { p_id: parseInt(resourceId) })
    
    if (error) throw new Error(`Database operation failed: ${error.message}`)
    if (!data || data.length === 0) throw new Error('Resource not found')
    
    return createHttpSuccessResponse(formattedData, 200)
  } else {
    // GET /function-name - Listar todos
    const search = url.searchParams.get('search') || null
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100)
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('list_resource_v2', {
        p_requesting_user_id: user.id,
        p_search: search,
        p_page: page,
        p_limit: limit,
      })
    
    if (rpcError) throw new Error(`Database operation failed: ${rpcError.message}`)
    
    return createHttpSuccessResponse({
      items: formattedItems,
      pagination: { page, limit, total: rpcData?.total || 0 }
    }, 200)
  }
}
```

#### POST - Criar

```typescript
if (req.method === 'POST') {
  const body = await req.json()
  
  // Validações
  if (!body.nome || body.nome.trim().length < 2) {
    throw new Error('Nome deve ter pelo menos 2 caracteres')
  }
  
  // Verificar permissões
  if (user.tipo !== 'backoffice') {
    throw new Error('Apenas usuários backoffice podem criar')
  }
  
  const { data, error } = await supabase
    .rpc('create_resource_v2', {
      p_nome: body.nome.trim(),
      p_codigo: body.codigo ? body.codigo.trim() : null,
      p_created_by: user.id,
    })
  
  if (error) throw new Error(`Database operation failed: ${error.message}`)
  if (!data || data.length === 0) throw new Error('Erro ao criar recurso')
  
  return createHttpSuccessResponse(formattedData, 201)
}
```

#### PUT - Atualizar

```typescript
if (req.method === 'PUT') {
  const body = await req.json()
  // Priorizar ID do path, depois do body
  const id = resourceId || body.id
  
  if (!id) {
    throw new Error('ID é obrigatório para atualização')
  }
  
  // Validar se o ID é um número válido
  const idNum = parseInt(id)
  if (isNaN(idNum) || idNum <= 0) {
    throw new Error(`ID inválido: ${id}`)
  }
  
  // Verificar permissões
  if (user.tipo !== 'backoffice') {
    throw new Error('Apenas usuários backoffice podem atualizar')
  }
  
  const { data, error } = await supabase
    .rpc('update_resource_v2', {
      p_id: idNum,
      p_nome: body.nome ? body.nome.trim() : null,
      p_updated_by: user.id,
    })
  
  if (error) throw new Error(`Database operation failed: ${error.message}`)
  if (!data || data.length === 0) throw new Error('Resource not found')
  
  return createHttpSuccessResponse(formattedData, 200)
}
```

#### DELETE - Excluir

```typescript
if (req.method === 'DELETE') {
  const id = resourceId || url.searchParams.get('id')
  
  if (!id) {
    throw new Error('ID é obrigatório para exclusão')
  }
  
  // Verificar permissões
  if (user.tipo !== 'backoffice') {
    throw new Error('Apenas usuários backoffice podem excluir')
  }
  
  const { error: deleteError } = await supabase
    .rpc('delete_resource_v2', {
      p_id: parseInt(id),
      p_deleted_by: user.id,
    })
  
  if (deleteError) {
    throw new Error(`Database operation failed: ${deleteError.message}`)
  }
  
  return createHttpSuccessResponse(
    { success: true, message: 'Recurso excluído com sucesso' },
    200
  )
}
```

---

## 🔒 Configuração RLS para Novas Tabelas

Ao criar uma nova tabela que será acessada via Edge Function e funções RPC, é obrigatório configurar **Row Level Security (RLS)**. Sem as políticas corretas, operações de INSERT/UPDATE podem falhar com o erro:

```
new row violates row-level security policy for table "nome_tabela"
```

### Quando Configurar RLS

- **Sempre** que criar uma tabela nova usada por uma Edge Function CRUD.
- A Edge Function chama os RPCs com o JWT do usuário → as operações rodam como role **authenticated** (quando as funções usam `SECURITY INVOKER`).
- O RLS precisa permitir que **authenticated** faça SELECT, INSERT e UPDATE (incluindo soft delete) na tabela, conforme as políticas abaixo.

### Políticas Obrigatórias

| Política | Operação | Role | Regra |
|----------|----------|------|--------|
| **SELECT** | `FOR SELECT` | `authenticated` | Ver apenas registros não excluídos: `USING (deleted_at IS NULL)` |
| **INSERT** | `FOR INSERT` | `authenticated` | Permitir inserção: `WITH CHECK (true)`. Quem pode criar é validado no RPC (ex.: backoffice). |
| **UPDATE** | `FOR UPDATE` | `authenticated` | Permitir edição e soft delete: `USING (true)` e `WITH CHECK (true)`. |
| **Service role** | `FOR ALL` | `service_role` | Acesso total (Edge Function com service key, jobs, etc.). |

### Template de Migração RLS

Use o template abaixo na migração da nova tabela (ou em uma migração dedicada, ex.: `XXX_nome_tabela_rls.sql`):

```sql
-- Garantir que RLS está ativo
ALTER TABLE public.nome_tabela ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (evita duplicatas ao reaplicar)
DROP POLICY IF EXISTS "Authenticated can select nome_tabela" ON public.nome_tabela;
DROP POLICY IF EXISTS "Authenticated can insert nome_tabela" ON public.nome_tabela;
DROP POLICY IF EXISTS "Authenticated can update nome_tabela" ON public.nome_tabela;
DROP POLICY IF EXISTS "Service role full access nome_tabela" ON public.nome_tabela;

-- SELECT: usuários autenticados veem apenas registros não excluídos
CREATE POLICY "Authenticated can select nome_tabela"
  ON public.nome_tabela
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- INSERT: usuários autenticados podem inserir (validação de quem pode criar fica no RPC)
CREATE POLICY "Authenticated can insert nome_tabela"
  ON public.nome_tabela
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: edição e soft delete (WITH CHECK (true) permite setar deleted_at)
CREATE POLICY "Authenticated can update nome_tabela"
  ON public.nome_tabela
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role: acesso total
CREATE POLICY "Service role full access nome_tabela"
  ON public.nome_tabela
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

Substitua `nome_tabela` pelo nome real da tabela (ex.: `tipos_veiculo`, `grupos_redes`).

### Se o Erro de RLS Persistir (INSERT/UPDATE/DELETE)

Se mesmo com as políticas acima o erro **"new row violates row-level security policy"** continuar ao criar, editar ou excluir (soft delete), use **SECURITY DEFINER** nas funções RPC que fazem INSERT/UPDATE na tabela:

- **SECURITY INVOKER** (padrão): a função roda com as permissões do usuário que chama (authenticated). O RLS é aplicado e pode bloquear a nova linha em alguns contextos.
- **SECURITY DEFINER**: a função roda com as permissões do **dono** da função (ex.: `postgres`), contornando o RLS. A segurança continua garantida **dentro** da função (validação de backoffice, etc.).

**Migração para alterar as funções de escrita para DEFINER:**

```sql
-- Exemplo: funções que fazem INSERT/UPDATE na tabela
ALTER FUNCTION create_nome_recurso_v2(TEXT, TEXT, UUID) SECURITY DEFINER;
ALTER FUNCTION update_nome_recurso_v2(UUID, TEXT, TEXT, BOOLEAN, UUID) SECURITY DEFINER;
ALTER FUNCTION delete_nome_recurso_v2(UUID, UUID) SECURITY DEFINER;
```

Use as assinaturas reais das funções (tipos dos parâmetros na ordem). As funções de leitura (`list_*`, `get_*`) podem permanecer com **SECURITY INVOKER**.

### Checklist RLS para Nova Tabela

- [ ] RLS ativado: `ALTER TABLE public.nome_tabela ENABLE ROW LEVEL SECURITY;`
- [ ] Política **SELECT** para `authenticated` com `USING (deleted_at IS NULL)` (ou condição equivalente).
- [ ] Política **INSERT** para `authenticated` com `WITH CHECK (true)`.
- [ ] Política **UPDATE** para `authenticated` com `USING (true)` e `WITH CHECK (true)`.
- [ ] Política **ALL** para `service_role` com `USING (true)` e `WITH CHECK (true)`.
- [ ] Se o erro de RLS persistir em create/update/delete: alterar funções RPC de escrita para `SECURITY DEFINER` e manter validações (ex.: backoffice) dentro das funções.

---

## ⚠️ Evitando Erros de Ambiguidade (Ambiguous)

### O Problema

Erros como `column reference "id" is ambiguous` ou `column reference "ativo" is ambiguous` ocorrem quando o PostgreSQL não consegue determinar de qual tabela uma coluna pertence, especialmente em:

- Queries com múltiplas tabelas (JOINs)
- Subqueries (EXISTS, IN)
- UPDATE statements com referências a colunas

### Solução: Sempre Use Aliases

#### ❌ ERRADO - Sem Aliases

```sql
-- Função RPC - ERRADO
CREATE OR REPLACE FUNCTION update_resource_v2(...)
AS $$
BEGIN
  -- ❌ Ambiguidade: qual tabela tem a coluna "id"?
  IF NOT EXISTS (
    SELECT 1 FROM public.resource
    WHERE id = p_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Resource not found';
  END IF;
  
  -- ❌ Ambiguidade: qual tabela tem "ativo"?
  SELECT tipo INTO v_user_tipo
  FROM public.user
  WHERE user_id = p_updated_by
  AND ativo = TRUE;  -- Ambiguidade!
  
  -- ❌ Ambiguidade no UPDATE
  UPDATE public.resource
  SET nome = COALESCE(p_nome, nome)  -- Qual "nome"?
  WHERE id = p_id;  -- Qual "id"?
END;
$$;
```

#### ✅ CORRETO - Com Aliases

```sql
-- Função RPC - CORRETO
CREATE OR REPLACE FUNCTION update_resource_v2(...)
AS $$
BEGIN
  -- ✅ Usando alias 'r' para resource
  IF NOT EXISTS (
    SELECT 1 FROM public.resource r
    WHERE r.id = p_id AND r.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Resource not found';
  END IF;
  
  -- ✅ Usando alias 'u' para user
  SELECT u.tipo INTO v_user_tipo
  FROM public.user u
  WHERE u.user_id = p_updated_by
  AND u.ativo = TRUE
  AND u.deleted_at IS NULL;
  
  -- ✅ Usando alias 'r' no UPDATE
  UPDATE public.resource r
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), r.nome),
    codigo = CASE 
      WHEN p_codigo IS NULL THEN r.codigo
      WHEN TRIM(p_codigo) = '' THEN NULL
      ELSE TRIM(p_codigo)
    END,
    ativo = COALESCE(p_ativo, r.ativo),
    updated_at = NOW()
  WHERE r.id = p_id;
  
  -- ✅ Usando alias no RETURN QUERY
  RETURN QUERY
  SELECT 
    r.id,
    r.nome,
    r.codigo,
    r.ativo,
    r.created_at,
    r.updated_at
  FROM public.resource r
  WHERE r.id = p_id;
END;
$$;
```

### Regras de Ouro para Evitar Ambiguidade

1. **Sempre use aliases em todas as queries**
   ```sql
   SELECT r.id FROM public.resource r  -- ✅
   SELECT id FROM public.resource      -- ❌
   ```

2. **Qualifique todas as colunas com o alias**
   ```sql
   WHERE r.id = p_id AND r.ativo = TRUE  -- ✅
   WHERE id = p_id AND ativo = TRUE     -- ❌
   ```

3. **Use aliases em subqueries (EXISTS, IN)**
   ```sql
   IF EXISTS (
     SELECT 1 FROM public.resource r
     WHERE r.nome = p_nome AND r.id != p_id
   ) THEN  -- ✅
   ```

4. **Use aliases em UPDATE statements**
   ```sql
   UPDATE public.resource r
   SET nome = COALESCE(p_nome, r.nome)
   WHERE r.id = p_id;  -- ✅
   ```

5. **Use aliases em RETURN QUERY**
   ```sql
   RETURN QUERY
   SELECT r.id, r.nome FROM public.resource r
   WHERE r.id = p_id;  -- ✅
   ```

### Exemplo Específico: Função CREATE

**⚠️ ATENÇÃO**: A função CREATE também precisa de aliases, especialmente nas validações de existência:

```sql
-- ❌ ERRADO - Sem aliases na validação
CREATE OR REPLACE FUNCTION create_resource_v2(...)
AS $$
BEGIN
  -- ❌ Ambiguidade: qual tabela tem "nome"?
  IF EXISTS (
    SELECT 1 FROM public.resource
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(p_nome))
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Nome já existe';
  END IF;
  
  -- ❌ Ambiguidade: qual tabela tem "ativo"?
  SELECT tipo INTO v_user_tipo
  FROM public.user
  WHERE user_id = p_created_by
  AND ativo = TRUE;  -- Ambiguidade!
END;
$$;

-- ✅ CORRETO - Com aliases
CREATE OR REPLACE FUNCTION create_resource_v2(...)
AS $$
BEGIN
  -- ✅ Usando alias 'r' para resource
  IF EXISTS (
    SELECT 1 FROM public.resource r
    WHERE LOWER(TRIM(r.nome)) = LOWER(TRIM(p_nome))
    AND r.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Nome já existe';
  END IF;
  
  -- ✅ Usando alias 'u' para user
  SELECT u.tipo INTO v_user_tipo
  FROM public.user u
  WHERE u.user_id = p_created_by
  AND u.ativo = TRUE
  AND u.deleted_at IS NULL;
END;
$$;
```

### Checklist de Verificação

Antes de fazer deploy de uma função RPC, verifique:

- [ ] Todas as tabelas têm aliases definidos
- [ ] Todas as colunas estão qualificadas com o alias
- [ ] Subqueries (EXISTS, IN) usam aliases
- [ ] UPDATE statements usam aliases
- [ ] **Funções CREATE também usam aliases nas validações** ⚠️
- [ ] **Queries de verificação de permissões (SELECT de user) usam aliases** ⚠️
- [ ] RETURN QUERY usa aliases
- [ ] Não há referências a colunas sem qualificação

---

## 🌐 Chamadas API no Frontend

### 1. Helper Function `callEdgeFunction`

Localização: `src/services/api.ts`

```typescript
async function callEdgeFunction(
  functionName: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  path?: string,  // ID do recurso para PUT/DELETE
  queryParams?: Record<string, any>,
  retryOn401: boolean = true
): Promise<any> {
  const token = getAuthToken()
  let url = `${SUPABASE_URL}/functions/v1/${functionName}${path ? `/${path}` : ''}`
  
  // Adicionar query params se fornecidos
  if (queryParams && Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams()
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value))
      }
    })
    if (params.toString()) {
      url += `?${params.toString()}`
    }
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`)
  }
  
  // Edge Functions retornam { success: true, data: {...} }
  if (data.success && data.data) {
    return data.data
  }
  
  return data.data || data
}
```

### 2. Implementação no Service

```typescript
export const api = {
  // ... outros recursos
  
  naturezasOperacao: {
    // Listar todas
    list: async (filters?: { 
      search?: string
      apenasAtivas?: boolean
      page?: number
      limit?: number 
    }) => {
      try {
        const response = await callEdgeFunction(
          'natureza-operacao-v2',
          'GET',
          undefined,
          undefined,
          {
            search: filters?.search,
            apenas_ativas: filters?.apenasAtivas ? 'true' : undefined,
            page: filters?.page?.toString(),
            limit: filters?.limit?.toString(),
          }
        )
        
        // response já vem no formato { naturezas: [...], pagination: {...} }
        return response
      } catch (error) {
        console.error('[API] Erro ao listar naturezas:', error)
        throw error
      }
    },
    
    // Buscar por ID
    get: async (id: string) => {
      try {
        const response = await callEdgeFunction(
          'natureza-operacao-v2',
          'GET',
          undefined,
          id
        )
        return response
      } catch (error) {
        console.error('[API] Erro ao buscar natureza:', error)
        throw error
      }
    },
    
    // Criar
    create: async (data: any) => {
      try {
        const response = await callEdgeFunction(
          'natureza-operacao-v2',
          'POST',
          {
            action: 'create',
            nome: data.nome,
            codigo: data.codigo,
            descricao: data.descricao,
            geraComissao: data.geraComissao,
            geraReceita: data.geraReceita,
            tiny_id: data.tiny_id,
          }
        )
        return response
      } catch (error) {
        console.error('[API] Erro ao criar natureza:', error)
        throw error
      }
    },
    
    // Atualizar
    update: async (id: string, data: any) => {
      try {
        // ⚠️ IMPORTANTE: Passar o ID como path (3º parâmetro)
        const response = await callEdgeFunction(
          'natureza-operacao-v2',
          'PUT',
          {
            nome: data.nome,
            codigo: data.codigo,
            descricao: data.descricao,
            geraComissao: data.geraComissao,
            geraReceita: data.geraReceita,
            ativo: data.ativo,
            tiny_id: data.tiny_id,
          },
          id  // ← ID no path: /natureza-operacao-v2/123
        )
        return response
      } catch (error) {
        console.error('[API] Erro ao atualizar natureza:', error)
        throw error
      }
    },
    
    // Excluir
    delete: async (id: string) => {
      try {
        await callEdgeFunction(
          'natureza-operacao-v2',
          'DELETE',
          undefined,
          id  // ← ID no path: /natureza-operacao-v2/123
        )
        return { success: true }
      } catch (error) {
        console.error('[API] Erro ao excluir natureza:', error)
        throw error
      }
    },
  },
}
```

### 3. Uso no Componente React

```typescript
import { api } from '@/services/api'
import { toast } from 'sonner'

export function NaturezaOperacaoManagement() {
  const [naturezas, setNaturezas] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Listar
  const loadNaturezas = async () => {
    setLoading(true)
    try {
      const response = await api.naturezasOperacao.list({
        apenasAtivas: false,
        page: 1,
        limit: 100
      })
      setNaturezas(response.naturezas || [])
    } catch (error: any) {
      toast.error(`Erro ao carregar: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  // Criar - ✅ CORRETO: Aguarda resposta antes de atualizar
  const handleCreate = async (data: any) => {
    try {
      // Aguardar resposta da API
      const nova = await api.naturezasOperacao.create(data)
      
      // Só atualizar estado após sucesso confirmado
      setNaturezas([...naturezas, nova])
      toast.success('Natureza criada com sucesso')
      setAddDialogOpen(false)
      resetForm()
    } catch (error: any) {
      console.error('[NATUREZAS] Erro ao criar natureza:', error)
      toast.error(`Erro ao criar natureza: ${error.message || 'Erro desconhecido'}`)
    }
  }
  
  // Atualizar - ✅ CORRETO: Aguarda resposta antes de atualizar
  const handleUpdate = async (id: string, data: any) => {
    try {
      // Aguardar resposta da API
      const atualizada = await api.naturezasOperacao.update(id, {
        nome: data.nome,
        codigo: data.codigo,
        descricao: data.descricao,
        geraComissao: data.geraComissao,
        geraReceita: data.geraReceita,
        ativo: data.ativo,
        tiny_id: data.tiny_id,
      })
      
      // Só atualizar estado após sucesso confirmado
      setNaturezas(naturezas.map(n => n.id === id ? atualizada : n))
      toast.success('Natureza atualizada com sucesso')
      setEditDialogOpen(false)
      setSelectedNatureza(null)
      resetForm()
    } catch (error: any) {
      console.error('[NATUREZAS] Erro ao atualizar natureza:', error)
      toast.error(`Erro ao atualizar natureza: ${error.message || 'Erro desconhecido'}`)
    }
  }
  
  // Excluir - ✅ CORRETO: Aguarda resposta antes de atualizar
  const handleDelete = async (id: string) => {
    try {
      // Aguardar resposta da API
      await api.naturezasOperacao.delete(id)
      
      // Só atualizar estado após sucesso confirmado
      setNaturezas(naturezas.filter(n => n.id !== id))
      toast.success('Natureza excluída com sucesso')
      setDeleteDialogOpen(false)
      setSelectedNatureza(null)
    } catch (error: any) {
      console.error('[NATUREZAS] Erro ao excluir natureza:', error)
      toast.error(`Erro ao excluir natureza: ${error.message || 'Erro desconhecido'}`)
    }
  }
  
  return (
    // ... JSX
  )
}
```

---

## 📚 Exemplo Completo: Natureza de Operação

### Edge Function: `supabase/functions/natureza-operacao-v2/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface AuthenticatedUser {
  id: string
  email: string
  tipo: 'backoffice' | 'vendedor'
  ativo: boolean
}

async function validateJWT(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return { user: null, error: 'Missing authorization header' }
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) return { user: null, error: 'Invalid or expired token' }
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('user_id, email, tipo, ativo')
      .eq('user_id', authUser.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .single()
    if (userError || !userData) return { user: null, error: 'User not found or inactive' }
    return {
      user: {
        id: userData.user_id,
        email: userData.email || authUser.email || '',
        tipo: userData.tipo as 'backoffice' | 'vendedor',
        ativo: userData.ativo,
      },
      error: null
    }
  } catch (error) {
    return { user: null, error: 'Authentication error' }
  }
}

function createAuthErrorResponse(message: string, statusCode: number = 401): Response {
  return new Response(
    JSON.stringify({ error: message, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function createHttpSuccessResponse<T>(data: T, status: number = 200, meta?: Record<string, any>): Response {
  return new Response(
    JSON.stringify({ success: true, data, meta: { timestamp: new Date().toISOString(), ...meta } }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function formatErrorResponse(error: Error | unknown): Response {
  let statusCode = 500
  let errorMessage = 'Internal server error'
  if (error instanceof Error) {
    errorMessage = error.message
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) statusCode = 401
    else if (error.message.includes('permission') || error.message.includes('forbidden')) statusCode = 403
    else if (error.message.includes('not found')) statusCode = 404
    else if (error.message.includes('validation') || error.message.includes('invalid')) statusCode = 400
  }
  console.error('[ERROR]', { message: errorMessage, statusCode })
  return new Response(
    JSON.stringify({ success: false, error: errorMessage, timestamp: new Date().toISOString() }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('[NATUREZA-OPERACAO-V2] Request received:', { method: req.method, url: req.url })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' }
    })
  }

  try {
    // 1. AUTENTICAÇÃO
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { user, error: authError } = await validateJWT(req, supabaseUrl, supabaseServiceKey)
    if (authError || !user) {
      return createAuthErrorResponse(authError || 'Unauthorized')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })

    // 2. EXTRAIR ID DO PATH
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    const functionIndex = pathParts.indexOf('natureza-operacao-v2')
    const naturezaId = functionIndex >= 0 && functionIndex < pathParts.length - 1
      ? pathParts[functionIndex + 1]
      : url.searchParams.get('id')

    // 3. ROTEAMENTO POR MÉTODO
    if (req.method === 'GET') {
      if (naturezaId) {
        // GET /natureza-operacao-v2/:id
        const { data: natureza, error } = await supabase
          .rpc('get_natureza_operacao_v2', { p_id: parseInt(naturezaId) })
        if (error) throw new Error(`Database operation failed: ${error.message}`)
        if (!natureza || natureza.length === 0) throw new Error('Natureza não encontrada')
        return createHttpSuccessResponse(formattedNatureza, 200)
      } else {
        // GET /natureza-operacao-v2
        const search = url.searchParams.get('search') || null
        const apenasAtivas = url.searchParams.get('apenas_ativas') === 'true'
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100)
        
        const { data: rpcData, error } = await supabase
          .rpc('list_natureza_operacao_v2', {
            p_requesting_user_id: user.id,
            p_search: search,
            p_apenas_ativas: apenasAtivas,
            p_page: page,
            p_limit: limit,
          })
        if (error) throw new Error(`Database operation failed: ${error.message}`)
        return createHttpSuccessResponse({
          naturezas: formattedNaturezas,
          pagination: { page, limit, total: rpcData?.total || 0 }
        }, 200)
      }
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem criar')
      }
      if (!body.nome || body.nome.trim().length < 2) {
        throw new Error('Nome deve ter pelo menos 2 caracteres')
      }
      const { data: natureza, error } = await supabase
        .rpc('create_natureza_operacao_v2', {
          p_nome: body.nome.trim(),
          p_codigo: body.codigo ? body.codigo.trim() : null,
          p_descricao: body.descricao ? body.descricao.trim() : null,
          p_gera_comissao: body.geraComissao !== undefined ? body.geraComissao : true,
          p_gera_receita: body.geraReceita !== undefined ? body.geraReceita : true,
          p_tiny_id: body.tiny_id ? body.tiny_id.trim() : null,
          p_created_by: user.id,
        })
      if (error) throw new Error(`Database operation failed: ${error.message}`)
      if (!natureza || natureza.length === 0) throw new Error('Erro ao criar')
      return createHttpSuccessResponse(formattedNatureza, 201)
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      const id = naturezaId || body.id
      if (!id) throw new Error('ID é obrigatório para atualização')
      const idNum = parseInt(id)
      if (isNaN(idNum) || idNum <= 0) throw new Error(`ID inválido: ${id}`)
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem atualizar')
      }
      const { data: natureza, error } = await supabase
        .rpc('update_natureza_operacao_v2', {
          p_id: idNum,
          p_nome: body.nome ? body.nome.trim() : null,
          p_codigo: body.codigo !== undefined ? (body.codigo ? body.codigo.trim() : null) : null,
          p_descricao: body.descricao !== undefined ? (body.descricao ? body.descricao.trim() : null) : null,
          p_gera_comissao: body.geraComissao !== undefined ? body.geraComissao : null,
          p_gera_receita: body.geraReceita !== undefined ? body.geraReceita : null,
          p_ativo: body.ativo !== undefined ? body.ativo : null,
          p_tiny_id: body.tiny_id !== undefined ? (body.tiny_id ? body.tiny_id.trim() : null) : null,
          p_updated_by: user.id,
        })
      if (error) throw new Error(`Database operation failed: ${error.message}`)
      if (!natureza || natureza.length === 0) throw new Error('Natureza não encontrada')
      return createHttpSuccessResponse(formattedNatureza, 200)
    }

    if (req.method === 'DELETE') {
      const id = naturezaId || url.searchParams.get('id')
      if (!id) throw new Error('ID é obrigatório para exclusão')
      if (user.tipo !== 'backoffice') {
        throw new Error('Apenas usuários backoffice podem excluir')
      }
      const { error: deleteError } = await supabase
        .rpc('delete_natureza_operacao_v2', {
          p_id: parseInt(id),
          p_deleted_by: user.id,
        })
      if (deleteError) throw new Error(`Database operation failed: ${deleteError.message}`)
      return createHttpSuccessResponse(
        { success: true, message: 'Natureza excluída com sucesso' },
        200
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return formatErrorResponse(error)
  }
})
```

### Função RPC: `supabase/migrations/009_rpc_natureza_operacao_v2.sql`

```sql
CREATE OR REPLACE FUNCTION update_natureza_operacao_v2(
  p_id BIGINT,
  p_nome TEXT DEFAULT NULL,
  p_codigo TEXT DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_gera_comissao BOOLEAN DEFAULT NULL,
  p_gera_receita BOOLEAN DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT NULL,
  p_tiny_id TEXT DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  nome TEXT,
  codigo TEXT,
  descricao TEXT,
  gera_comissao BOOLEAN,
  gera_receita BOOLEAN,
  ativo BOOLEAN,
  tiny_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- ✅ CORRETO: Usando alias 'n' para natureza_operacao
  IF NOT EXISTS (
    SELECT 1 FROM public.natureza_operacao n
    WHERE n.id = p_id AND n.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Natureza de operação não encontrada';
  END IF;

  -- ✅ CORRETO: Usando alias 'n' em subquery
  IF EXISTS (
    SELECT 1 FROM public.natureza_operacao n
    WHERE LOWER(TRIM(n.nome)) = LOWER(TRIM(p_nome))
    AND n.id != p_id
    AND n.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Natureza de operação com este nome já existe';
  END IF;

  -- ✅ CORRETO: Usando alias 'u' para user
  IF p_updated_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar';
    END IF;
  END IF;

  -- ✅ CORRETO: Usando alias 'n' no UPDATE
  UPDATE public.natureza_operacao n
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), n.nome),
    codigo = CASE 
      WHEN p_codigo IS NULL THEN n.codigo
      WHEN TRIM(p_codigo) = '' THEN NULL
      ELSE TRIM(p_codigo)
    END,
    ativo = COALESCE(p_ativo, n.ativo),
    updated_at = NOW()
  WHERE n.id = p_id;

  -- ✅ CORRETO: Usando alias 'n' no RETURN QUERY
  RETURN QUERY
  SELECT 
    n.id,
    n.nome,
    n.codigo,
    n.descricao,
    n.tem_comissao AS gera_comissao,
    n.gera_receita,
    n.ativo,
    n.tiny_id,
    n.created_at,
    n.updated_at
  FROM public.natureza_operacao n
  WHERE n.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_natureza_operacao_v2: %', SQLERRM;
    RAISE;
END;
$$;
```

---

## ✅ Boas Práticas

### 1. Sempre Criar Funções RPC

**⚠️ REGRA DE OURO**: Ao criar uma Edge Function CRUD, **SEMPRE crie as funções RPC correspondentes**.

**Benefícios:**
- ✅ Reaproveitamento de código entre múltiplas Edge Functions
- ✅ Performance otimizada (execução no servidor PostgreSQL)
- ✅ Lógica de negócio centralizada e consistente
- ✅ Facilita testes e debugging
- ✅ Transações atômicas garantidas

**Funções RPC obrigatórias:**
- `create_[recurso]_v2` → Para operações POST
- `get_[recurso]_v2` → Para GET /:id
- `list_[recurso]_v2` → Para GET (listar todos)
- `update_[recurso]_v2` → Para operações PUT
- `delete_[recurso]_v2` → Para operações DELETE

📖 **Ver seção completa**: [Funções RPC: Por Que e Como Criar](#-funções-rpc-por-que-e-como-criar)

### 2. Nomenclatura

- **Edge Function**: `kebab-case` (ex: `natureza-operacao-v2`)
- **Função RPC**: `snake_case` (ex: `update_natureza_operacao_v2`)
- **Parâmetros RPC**: Prefixo `p_` (ex: `p_id`, `p_nome`)
- **Variáveis locais**: Prefixo `v_` (ex: `v_user_tipo`)

### 3. Validações

- ✅ Sempre validar entrada na Edge Function
- ✅ Validar permissões antes de operações
- ✅ Validar existência de registros antes de atualizar/excluir
- ✅ Validar unicidade de campos únicos
- ✅ **Usar funções RPC para validações complexas**

### 4. Logging

- ✅ Logar início e fim de operações
- ✅ Logar erros com contexto
- ✅ Incluir timestamps e duração

### 5. Tratamento de Erros

- ✅ Retornar mensagens de erro claras
- ✅ Mapear erros para status codes apropriados
- ✅ Não expor detalhes internos do banco
- ✅ **Usar `RAISE LOG` nas funções RPC para debugging**

### 6. Performance

- ✅ Usar índices nas colunas de busca
- ✅ Limitar paginação (max 100 itens)
- ✅ **Sempre usar RPC para queries complexas**
- ✅ Usar `STABLE` para funções de leitura, `VOLATILE` para escritas

---

## 🔧 Troubleshooting

### Erro: "ID é obrigatório para atualização"

**Causa**: ID não está sendo extraído corretamente do path.

**Solução**: Verificar a lógica de extração de ID:

```typescript
const functionIndex = pathParts.indexOf('function-name')
const resourceId = functionIndex >= 0 && functionIndex < pathParts.length - 1
  ? pathParts[functionIndex + 1]
  : url.searchParams.get('id')
```

**No Frontend**: Garantir que o ID é passado como 3º parâmetro:

```typescript
callEdgeFunction('function-name', 'PUT', body, id)  // ✅
```

### Erro: "column reference 'X' is ambiguous"

**Causa**: Coluna não qualificada com alias.

**Solução**: Sempre usar aliases e qualificar todas as colunas:

```sql
-- ❌ ERRADO
SELECT id FROM table1 WHERE id = 1

-- ✅ CORRETO
SELECT t1.id FROM table1 t1 WHERE t1.id = 1
```

**Erros comuns específicos:**

1. **"column reference 'nome' is ambiguous"** na função CREATE
   - **Causa**: Validação de existência sem alias
   - **Solução**: 
     ```sql
     -- ❌ ERRADO
     IF EXISTS (
       SELECT 1 FROM public.resource
       WHERE nome = p_nome
     )
     
     -- ✅ CORRETO
     IF EXISTS (
       SELECT 1 FROM public.resource r
       WHERE r.nome = p_nome
     )
     ```

2. **"column reference 'ativo' is ambiguous"** na verificação de permissões
   - **Causa**: SELECT de user sem alias
   - **Solução**:
     ```sql
     -- ❌ ERRADO
     SELECT tipo FROM public.user
     WHERE user_id = p_created_by
     AND ativo = TRUE
     
     -- ✅ CORRETO
     SELECT u.tipo FROM public.user u
     WHERE u.user_id = p_created_by
     AND u.ativo = TRUE
     ```

3. **"column reference 'id' is ambiguous"** no UPDATE
   - **Causa**: UPDATE sem alias ou WHERE sem qualificação
   - **Solução**:
     ```sql
     -- ❌ ERRADO
     UPDATE public.resource
     SET nome = p_nome
     WHERE id = p_id
     
     -- ✅ CORRETO
     UPDATE public.resource r
     SET nome = p_nome
     WHERE r.id = p_id
     ```

### Erro: "Method not allowed"

**Causa**: Método HTTP não implementado ou não suportado.

**Solução**: Verificar se o método está implementado na Edge Function.

### Erro: "new row violates row-level security policy for table \"nome_tabela\""

**Causa**: A tabela tem RLS ativo, mas não há política que permita ao role **authenticated** fazer INSERT ou UPDATE (incluindo soft delete) na nova linha.

**Solução**:

1. **Configurar políticas RLS** conforme a seção [Configuração RLS para Novas Tabelas](#configuração-rls-para-novas-tabelas): SELECT, INSERT, UPDATE para `authenticated` e ALL para `service_role`.
2. **Se o erro continuar**: alterar as funções RPC que fazem INSERT/UPDATE na tabela para **SECURITY DEFINER** (ex.: `create_*_v2`, `update_*_v2`, `delete_*_v2`), mantendo as validações de permissão (ex.: backoffice) dentro das funções.

📖 **Ver seção completa**: [Configuração RLS para Novas Tabelas](#configuração-rls-para-novas-tabelas)

### Erro: "Unauthorized"

**Causa**: Token JWT inválido ou expirado.

**Solução**: Verificar se o token está sendo enviado no header:

```typescript
headers['Authorization'] = `Bearer ${token}`
```

### Erro: Mensagem de sucesso aparece mesmo quando API retorna erro

**Causa**: Estado e mensagem de sucesso são atualizados antes de aguardar resposta da API.

**Sintomas:**
- Toast de sucesso aparece mesmo com erro 500
- Estado é atualizado com dados incorretos
- Console mostra erro mas UI mostra sucesso

**Solução**: **SEMPRE aguardar resposta da API antes de atualizar estado:**

```typescript
// ❌ ERRADO
const handleCreate = async (data: any) => {
  try {
    const newItem = { id: crypto.randomUUID(), ...data }  // ID temporário
    await api.create(newItem)
    setItems([...items, newItem])  // Atualiza antes de confirmar!
    toast.success('Sucesso')  // Mostra mesmo se API falhar!
  } catch (error) {
    toast.error('Erro')  // Mas estado já foi atualizado
  }
}

// ✅ CORRETO
const handleCreate = async (data: any) => {
  try {
    // 1. Aguardar resposta da API
    const newItem = await api.create(data)
    
    // 2. Só atualizar estado após sucesso confirmado
    setItems([...items, newItem])
    
    // 3. Só mostrar sucesso após confirmação
    toast.success('Item criado com sucesso')
  } catch (error: any) {
    // Estado NÃO é atualizado em caso de erro
    toast.error(`Erro: ${error.message}`)
  }
}
```

**Checklist:**
- [ ] Não criar objetos locais com IDs temporários
- [ ] Sempre usar `await` e aguardar resposta
- [ ] Atualizar estado apenas após resposta bem-sucedida
- [ ] Mostrar mensagem de sucesso apenas após confirmação
- [ ] Em caso de erro, não atualizar estado

---

## 📖 Referências

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [PostgreSQL Functions Documentation](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Deno Deploy Documentation](https://deno.com/deploy/docs)

---

**Última atualização**: 2026-01-29  
**Autor**: Equipe de Desenvolvimento

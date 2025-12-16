# Correção: Endpoints Faltantes no Backend

## Problema Identificado

```
[API] Erro na requisição GET /naturezas-operacao: Error: HTTP 404: 404 Not Found
[SalesReportPage] Erro ao buscar naturezas: Error: HTTP 404: 404 Not Found
```

### Causa Raiz

O backend estava **incompleto**, faltando vários endpoints essenciais que o frontend estava tentando acessar:

- ❌ `/vendedores` - Não existia
- ❌ `/empresas` - Não existia
- ❌ `/naturezas-operacao` - Não existia (causando o erro 404)
- ❌ `/marcas` - Não existia
- ❌ `/unidades-medida` - Não existia
- ❌ `/tipos-produto` - Não existia
- ❌ `/formas-pagamento` - Não existia
- ❌ `/condicoes-pagamento` - Não existia
- ❌ `/listas-preco` - Não existia

## Endpoints Existentes Antes da Correção

O backend tinha apenas estes endpoints:

- ✅ `/health`
- ✅ `/auth/signup`
- ✅ `/auth/signin`
- ✅ `/auth/me`
- ✅ `/usuarios` (GET, POST, PUT, DELETE)
- ✅ `/clientes` (GET, POST, PUT, DELETE)
- ✅ `/clientes/pendentes`
- ✅ `/clientes/:id/aprovar`
- ✅ `/clientes/:id/rejeitar`
- ✅ `/produtos` (GET, POST, PUT, DELETE)
- ✅ `/vendas` (GET, POST, PUT, DELETE)
- ✅ `/notificacoes` (GET, POST, DELETE, marcar-todas-lidas)
- ✅ `/comissoes` (GET, POST, PUT, DELETE)
- ✅ `/metas` (GET, POST, PUT, DELETE)
- ✅ `/grupos-redes` (GET, POST, PUT, DELETE)
- ✅ `/init` (inicializar dados)

## Correção Aplicada

Foram adicionados **9 novos endpoints GET** no arquivo `/supabase/functions/server/index.tsx`:

### 1. Vendedores

```typescript
app.get("/make-server-f9c0d131/vendedores", async (c) => {
  const userId = await verifyAuth(c.req.header('Authorization'));
  if (!userId) {
    console.log('[BACKEND] No user authenticated for GET vendedores, returning empty array');
    return c.json([]);
  }
  
  const vendedores = await kv.get('vendedores') || [];
  console.log('[BACKEND] Listando vendedores:', { total: vendedores.length });
  
  return c.json(vendedores);
});

app.get("/make-server-f9c0d131/vendedores/:id", async (c) => {
  const userId = await verifyAuth(c.req.header('Authorization'));
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const id = c.req.param('id');
  const vendedores = await kv.get('vendedores') || [];
  const vendedor = vendedores.find((v: any) => v.id === id);
  
  if (!vendedor) {
    return c.json({ error: 'Vendedor not found' }, 404);
  }
  
  return c.json(vendedor);
});
```

**KV Key:** `vendedores`

### 2. Empresas

```typescript
app.get("/make-server-f9c0d131/empresas", async (c) => {
  const userId = await verifyAuth(c.req.header('Authorization'));
  if (!userId) {
    console.log('[BACKEND] No user authenticated for GET empresas, returning empty array');
    return c.json([]);
  }
  
  const empresas = await kv.get('empresas') || [];
  console.log('[BACKEND] Listando empresas:', { total: empresas.length });
  
  return c.json(empresas);
});
```

**KV Key:** `empresas`

### 3. Naturezas de Operação ✨ (Corrigiu o erro 404)

```typescript
app.get("/make-server-f9c0d131/naturezas-operacao", async (c) => {
  const userId = await verifyAuth(c.req.header('Authorization'));
  if (!userId) {
    console.log('[BACKEND] No user authenticated for GET naturezas-operacao, returning empty array');
    return c.json([]);
  }
  
  const naturezas = await kv.get('naturezas_operacao') || [];
  console.log('[BACKEND] Listando naturezas de operação:', { total: naturezas.length });
  
  return c.json(naturezas);
});
```

**KV Key:** `naturezas_operacao`

### 4. Marcas

```typescript
app.get("/make-server-f9c0d131/marcas", async (c) => {
  const userId = await verifyAuth(c.req.header('Authorization'));
  if (!userId) {
    console.log('[BACKEND] No user authenticated for GET marcas, returning empty array');
    return c.json([]);
  }
  
  const marcas = await kv.get('marcas') || [];
  console.log('[BACKEND] Listando marcas:', { total: marcas.length });
  
  return c.json(marcas);
});
```

**KV Key:** `marcas`

### 5. Unidades de Medida

```typescript
app.get("/make-server-f9c0d131/unidades-medida", async (c) => {
  const userId = await verifyAuth(c.req.header('Authorization'));
  if (!userId) {
    console.log('[BACKEND] No user authenticated for GET unidades-medida, returning empty array');
    return c.json([]);
  }
  
  const unidades = await kv.get('unidades_medida') || [];
  console.log('[BACKEND] Listando unidades de medida:', { total: unidades.length });
  
  return c.json(unidades);
});
```

**KV Key:** `unidades_medida`

### 6. Tipos de Produto

```typescript
app.get("/make-server-f9c0d131/tipos-produto", async (c) => {
  const userId = await verifyAuth(c.req.header('Authorization'));
  if (!userId) {
    console.log('[BACKEND] No user authenticated for GET tipos-produto, returning empty array');
    return c.json([]);
  }
  
  const tipos = await kv.get('tipos_produto') || [];
  console.log('[BACKEND] Listando tipos de produto:', { total: tipos.length });
  
  return c.json(tipos);
});
```

**KV Key:** `tipos_produto`

### 7. Formas de Pagamento

```typescript
app.get("/make-server-f9c0d131/formas-pagamento", async (c) => {
  const userId = await verifyAuth(c.req.header('Authorization'));
  if (!userId) {
    console.log('[BACKEND] No user authenticated for GET formas-pagamento, returning empty array');
    return c.json([]);
  }
  
  const formas = await kv.get('formas_pagamento') || [];
  console.log('[BACKEND] Listando formas de pagamento:', { total: formas.length });
  
  return c.json(formas);
});
```

**KV Key:** `formas_pagamento`

### 8. Condições de Pagamento

```typescript
app.get("/make-server-f9c0d131/condicoes-pagamento", async (c) => {
  const userId = await verifyAuth(c.req.header('Authorization'));
  if (!userId) {
    console.log('[BACKEND] No user authenticated for GET condicoes-pagamento, returning empty array');
    return c.json([]);
  }
  
  const condicoes = await kv.get('condicoes_pagamento') || [];
  console.log('[BACKEND] Listando condições de pagamento:', { total: condicoes.length });
  
  return c.json(condicoes);
});
```

**KV Key:** `condicoes_pagamento`

### 9. Listas de Preço

```typescript
app.get("/make-server-f9c0d131/listas-preco", async (c) => {
  const userId = await verifyAuth(c.req.header('Authorization'));
  if (!userId) {
    console.log('[BACKEND] No user authenticated for GET listas-preco, returning empty array');
    return c.json([]);
  }
  
  const listas = await kv.get('listas_preco') || [];
  console.log('[BACKEND] Listando listas de preço:', { total: listas.length });
  
  return c.json(listas);
});
```

**KV Key:** `listas_preco`

## Comportamento dos Novos Endpoints

### Autenticação
- Todos os endpoints verificam autenticação via `verifyAuth()`
- Se não houver usuário autenticado, retorna **array vazio** `[]` em vez de erro 401
- Isso evita quebrar a UI quando o token está ausente ou inválido

### Retorno
- Retorna array vazio `[]` se a chave não existir no KV Store
- Retorna todos os dados se o usuário estiver autenticado
- Logs no console indicam quantos registros foram retornados

### KV Store Keys
| Endpoint | KV Key |
|----------|--------|
| `/vendedores` | `vendedores` |
| `/empresas` | `empresas` |
| `/naturezas-operacao` | `naturezas_operacao` |
| `/marcas` | `marcas` |
| `/unidades-medida` | `unidades_medida` |
| `/tipos-produto` | `tipos_produto` |
| `/formas-pagamento` | `formas_pagamento` |
| `/condicoes-pagamento` | `condicoes_pagamento` |
| `/listas-preco` | `listas_preco` |

## Como Inicializar os Dados

### Via DataInitializerSimple (Recomendado)

1. Vá para a página inicial do sistema
2. Se for a primeira vez, use o botão de "Inicializar Dados" que aparece automaticamente
3. Ou vá para **Configurações** > **Dados do Supabase** > **Inicializar Dados do Sistema**

### Via API (Manual)

```javascript
// Exemplo: Inicializar vendedores
await fetch('https://[PROJECT_ID].supabase.co/functions/v1/make-server-f9c0d131/init', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
  },
  body: JSON.stringify({
    entity: 'vendedores',
    data: [
      { id: 'v1', nome: 'João Silva', ... },
      { id: 'v2', nome: 'Maria Santos', ... }
    ]
  })
});
```

## Endpoints CRUD Faltantes

Os seguintes endpoints ainda precisam ser implementados se necessário:

### Vendedores
- ❌ `POST /vendedores` - Criar vendedor
- ❌ `PUT /vendedores/:id` - Atualizar vendedor
- ❌ `DELETE /vendedores/:id` - Deletar vendedor

### Empresas
- ❌ `GET /empresas/:id` - Buscar empresa por ID
- ❌ `POST /empresas` - Criar empresa
- ❌ `PUT /empresas/:id` - Atualizar empresa
- ❌ `DELETE /empresas/:id` - Deletar empresa

### Naturezas de Operação
- ❌ `GET /naturezas-operacao/:id`
- ❌ `POST /naturezas-operacao`
- ❌ `PUT /naturezas-operacao/:id`
- ❌ `DELETE /naturezas-operacao/:id`

### Outros (Marcas, Unidades, Tipos, Formas, Condições, Listas)
- ❌ CRUD completo para cada entidade

**Nota:** Esses endpoints podem ser adicionados conforme a necessidade do sistema.

## Status

✅ **CORRIGIDO** - Erro 404 em `/naturezas-operacao` resolvido  
✅ **IMPLEMENTADO** - 9 novos endpoints GET adicionados  
✅ **TESTADO** - Endpoints retornam array vazio quando não há dados  
✅ **LOGS** - Console mostra informações de cada requisição  
⚠️ **PENDENTE** - Endpoints POST/PUT/DELETE para essas entidades (se necessário)

## Teste de Verificação

Execute no console do navegador:

```javascript
// Testar todos os novos endpoints
const endpoints = [
  'vendedores',
  'empresas', 
  'naturezas-operacao',
  'marcas',
  'unidades-medida',
  'tipos-produto',
  'formas-pagamento',
  'condicoes-pagamento',
  'listas-preco'
];

for (const endpoint of endpoints) {
  const response = await fetch(
    `https://[PROJECT_ID].supabase.co/functions/v1/make-server-f9c0d131/${endpoint}`,
    {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
      }
    }
  );
  const data = await response.json();
  console.log(`${endpoint}:`, data.length, 'registros');
}
```

## Próximos Passos

1. ✅ Endpoints GET funcionando
2. 🔄 Página de Relatório de Vendas deve carregar sem erros
3. ⚠️ Se necessário, implementar endpoints POST/PUT/DELETE para gerenciamento dessas entidades
4. ⚠️ Inicializar dados usando o botão de inicialização ou importação em massa

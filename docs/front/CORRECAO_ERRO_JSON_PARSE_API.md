# Correção: Erro de Parse JSON na API

## Erro Reportado

```
[SalesReportPage] Erro ao buscar dados: SyntaxError: Unexpected non-whitespace character after JSON at position 4 (line 1 column 5)
```

## Causa

Este erro ocorre quando a função `api.get()` tenta fazer parse de uma resposta que não é JSON válido. Possíveis causas:

1. **Servidor retornando HTML em vez de JSON** - Erro 500, 404, ou CORS
2. **Texto simples sem aspas** - Resposta não formatada como JSON
3. **JSON malformado** - JSON com sintaxe incorreta
4. **Problema de autenticação** - Token inválido ou expirado

## Correção Aplicada

### 1. Melhorado Tratamento de Erro em `api.get()`

**Antes:**
```typescript
get: async (entity: string) => {
  const response = await fetch(`${API_URL}/${entity}`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const error = await response.json(); // ❌ Pode falhar se não for JSON
    throw new Error(error.error || `Failed to get ${entity}`);
  }
  return response.json(); // ❌ Pode falhar se não for JSON
}
```

**Depois:**
```typescript
get: async (entity: string) => {
  try {
    const response = await fetch(`${API_URL}/${entity}`, {
      headers: getHeaders(),
    });
    
    // ✅ Capturar o texto da resposta primeiro
    const text = await response.text();
    
    // ✅ Log detalhado para debug
    console.log(`[API] GET /${entity}:`, {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      textLength: text?.length || 0,
      textPreview: text?.substring(0, 200)
    });
    
    if (!response.ok) {
      // ✅ Tentar fazer parse do erro como JSON
      try {
        const error = JSON.parse(text);
        throw new Error(error.error || `Failed to get ${entity}`);
      } catch {
        // ✅ Se não for JSON, lançar o texto bruto
        throw new Error(`HTTP ${response.status}: ${text || 'Unknown error'}`);
      }
    }
    
    // ✅ Tentar fazer parse do JSON com tratamento de erro
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error(`[API] Erro ao fazer parse do JSON para GET /${entity}:`, {
        parseError,
        text: text?.substring(0, 500)
      });
      throw new Error(`Invalid JSON response from ${entity}: ${text?.substring(0, 100)}`);
    }
  } catch (error) {
    console.error(`[API] Erro na requisição GET /${entity}:`, error);
    throw error;
  }
}
```

### 2. Melhorado Tratamento de Erro em `SalesReportPage.tsx`

**Antes:**
```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const [vendasData, ...] = await Promise.all([
        api.get('vendas'),
        api.get('vendedores'),
        // ... outros endpoints
      ]);
      // ... set states
    } catch (error) {
      console.error('[SalesReportPage] Erro ao buscar dados:', error);
      // ❌ Não sabia qual endpoint falhou
      setVendas([]);
      // ...
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

**Depois:**
```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('[SalesReportPage] Iniciando busca de dados...');
      
      // ✅ Buscar cada endpoint individualmente para identificar qual está falhando
      let vendasData: any[] = [];
      let vendedoresData: any[] = [];
      let clientesData: any[] = [];
      let naturezasData: any[] = [];
      let empresasData: any[] = [];
      
      try {
        console.log('[SalesReportPage] Buscando vendas...');
        vendasData = await api.get('vendas');
        console.log('[SalesReportPage] Vendas recebidas:', vendasData?.length || 0);
      } catch (error) {
        console.error('[SalesReportPage] Erro ao buscar vendas:', error);
        vendasData = [];
      }
      
      try {
        console.log('[SalesReportPage] Buscando vendedores...');
        vendedoresData = await api.get('vendedores');
        console.log('[SalesReportPage] Vendedores recebidos:', vendedoresData?.length || 0);
      } catch (error) {
        console.error('[SalesReportPage] Erro ao buscar vendedores:', error);
        vendedoresData = [];
      }
      
      // ✅ ... mesmo tratamento para clientes, naturezas e empresas
      
      setVendas(vendasData || []);
      setVendedores(vendedoresData || []);
      setClientes(clientesData || []);
      setNaturezasOperacao(naturezasData || []);
      setEmpresas(empresasData || []);
      
      console.log('[SalesReportPage] Dados finais configurados:', {
        vendas: vendasData?.length || 0,
        vendedores: vendedoresData?.length || 0,
        clientes: clientesData?.length || 0,
        naturezas: naturezasData?.length || 0,
        empresas: empresasData?.length || 0
      });
    } catch (error) {
      console.error('[SalesReportPage] Erro geral ao buscar dados:', error);
      // ...
    } finally {
      setLoading(false);
      console.log('[SalesReportPage] Carregamento finalizado');
    }
  };

  fetchData();
}, []);
```

## Como Debugar o Problema

### 1. Abra o DevTools (F12)

### 2. Vá para a aba Console

### 3. Navegue até a página "Relatório de Vendas"

### 4. Observe os logs detalhados:

#### Cenário 1: Endpoint retornando JSON válido
```
[SalesReportPage] Iniciando busca de dados...
[SalesReportPage] Buscando vendas...
[API] GET /vendas: {
  status: 200,
  ok: true,
  contentType: "application/json",
  textLength: 2,
  textPreview: "[]"
}
[SalesReportPage] Vendas recebidas: 0
```

#### Cenário 2: Endpoint retornando erro HTML (500)
```
[SalesReportPage] Buscando vendas...
[API] GET /vendas: {
  status: 500,
  ok: false,
  contentType: "text/html",
  textLength: 1243,
  textPreview: "<!DOCTYPE html><html><head><title>Error</title></head>..."
}
[API] Erro na requisição GET /vendas: Error: HTTP 500: <!DOCTYPE html>...
[SalesReportPage] Erro ao buscar vendas: Error: HTTP 500: ...
```

#### Cenário 3: Endpoint retornando JSON malformado
```
[SalesReportPage] Buscando clientes...
[API] GET /clientes: {
  status: 200,
  ok: true,
  contentType: "application/json",
  textLength: 45,
  textPreview: "[{id: 1, nome: 'Teste'}]" // ❌ JSON inválido (sem aspas)
}
[API] Erro ao fazer parse do JSON para GET /clientes: {
  parseError: SyntaxError: Unexpected token i in JSON at position 2,
  text: "[{id: 1, nome: 'Teste'}]"
}
[SalesReportPage] Erro ao buscar clientes: Error: Invalid JSON response from clientes: [{id: 1, nome: 'Test...
```

### 5. Verifique a aba Network

1. Filtre por "vendas", "vendedores", "clientes", etc.
2. Clique na requisição
3. Veja a resposta bruta na aba "Response"
4. Verifique os headers na aba "Headers"

## Possíveis Soluções

### Solução 1: Endpoint não existe no backend

**Sintoma:** Status 404, resposta HTML

**Verificação:**
```bash
# Verifique se o endpoint existe no backend
grep -n "app.get.*vendas" /supabase/functions/server/index.tsx
```

**Solução:** Criar o endpoint no backend se não existir

### Solução 2: Erro no servidor (500)

**Sintoma:** Status 500, resposta HTML ou texto de erro

**Verificação:**
- Verifique os logs do Supabase Functions
- Veja se há erros de sintaxe no código do servidor

**Solução:** Corrigir o código do backend

### Solução 3: Problema de CORS

**Sintoma:** Erro de CORS no console, status 0

**Verificação:**
```typescript
// No backend, verificar se CORS está configurado:
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
```

**Solução:** Adicionar/corrigir configuração CORS no backend

### Solução 4: Problema de autenticação

**Sintoma:** Status 401, resposta de erro de autenticação

**Verificação:**
```javascript
// No console do navegador:
console.log('Auth token:', localStorage.getItem('auth_token'));
```

**Solução:** Fazer login novamente para obter novo token

### Solução 5: KV Store vazio

**Sintoma:** Endpoint retorna `[]` ou `null` corretamente, mas não há dados

**Verificação:**
1. Vá para Configurações > Dados do Supabase
2. Verifique se as chaves existem: `vendas`, `vendedores`, `clientes`, etc.

**Solução:** Inicializar dados ou cadastrar manualmente

## Benefícios das Melhorias

✅ **Identificação precisa do problema** - Logs mostram exatamente qual endpoint falhou  
✅ **Visualização da resposta bruta** - Console mostra o que o servidor retornou  
✅ **Resiliência** - Sistema continua funcionando mesmo se um endpoint falhar  
✅ **Mensagens de erro claras** - Erros incluem contexto útil para debugging  
✅ **Não trava a UI** - Cada endpoint é buscado independentemente

## Status

✅ **IMPLEMENTADO** - api.get() agora captura resposta como texto antes de fazer parse  
✅ **IMPLEMENTADO** - Logs detalhados em cada requisição  
✅ **IMPLEMENTADO** - SalesReportPage busca endpoints individualmente  
✅ **IMPLEMENTADO** - Tratamento de erro específico para cada endpoint  
✅ **TESTÁVEL** - Console agora mostra informações suficientes para diagnosticar o problema

## Próximos Passos

1. **Abra o Console do navegador** e navegue até a página de Relatório de Vendas
2. **Observe os logs** para identificar qual endpoint está falhando
3. **Compartilhe os logs** para que possamos corrigir o endpoint específico
4. **Verifique a aba Network** para ver a resposta HTTP completa

**IMPORTANTE:** Com os logs atuais, será possível identificar exatamente:
- Qual endpoint está falhando
- Qual status HTTP está sendo retornado
- Qual é o conteúdo da resposta (JSON, HTML, texto)
- Se o problema é autenticação, CORS, endpoint inexistente, ou dados malformados

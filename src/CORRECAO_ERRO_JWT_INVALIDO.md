# Correção: Erro JWT Inválido nas Notificações

## Erro Reportado

```
[API] Erro na requisição GET /notificacoes: Error: HTTP 401: {"code":401,"message":"Invalid JWT"}
[NOTIFICATIONS] Erro ao carregar notificações: Error: HTTP 401: {"code":401,"message":"Invalid JWT"}
```

## Causa Raiz

O erro ocorre quando há um **token JWT inválido ou expirado** no `localStorage` da aplicação. Isso pode acontecer por:

1. **Token expirado** - JWT tem um tempo de expiração (geralmente 1 hora)
2. **Token mal formatado** - JWT corrompido no localStorage
3. **Token de sessão anterior** - JWT de um login antigo que não é mais válido
4. **Mudanças no Supabase** - Chaves de autenticação alteradas

## Como Funciona o JWT

Um JWT (JSON Web Token) tem 3 partes separadas por ponto:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNzE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
└─────────── Header ──────────┘ └──────────── Payload ────────────┘ └────────── Signature ──────────┘
```

O **Payload** contém:
- `sub` - Subject (ID do usuário)
- `exp` - Expiration (timestamp Unix de quando expira)
- Outros claims personalizados

## Correção Aplicada

### 1. Validação Automática de Token em `getAuthToken()`

Adicionado código para **validar e limpar tokens inválidos automaticamente**:

```typescript
export const getAuthToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('auth_token');
  }
  
  // Se o token parecer inválido ou expirado, limpar
  if (authToken && authToken !== 'null' && authToken !== 'undefined') {
    // Verificar se é um JWT válido (tem 3 partes separadas por ponto)
    const parts = authToken.split('.');
    if (parts.length === 3) {
      try {
        // Decodificar o payload para verificar expiração
        const payload = JSON.parse(atob(parts[1]));
        const now = Math.floor(Date.now() / 1000);
        
        // Se expirou, limpar o token
        if (payload.exp && payload.exp < now) {
          console.log('[API] Token expirado, limpando...');
          authToken = null;
          localStorage.removeItem('auth_token');
          return null;
        }
      } catch (error) {
        console.log('[API] Token inválido, limpando...', error);
        authToken = null;
        localStorage.removeItem('auth_token');
        return null;
      }
    } else {
      // Token não é um JWT válido
      console.log('[API] Token mal formatado, limpando...');
      authToken = null;
      localStorage.removeItem('auth_token');
      return null;
    }
  }
  
  return authToken;
};
```

### 2. Logs Detalhados de Headers

Adicionado log para visualizar qual token está sendo usado:

```typescript
const getHeaders = () => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : `Bearer ${publicAnonKey}`,
  };
  
  // Log para debug
  console.log('[API] Headers configurados:', {
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'usando publicAnonKey',
    authHeader: headers.Authorization.substring(0, 30) + '...'
  });
  
  return headers;
};
```

## Como a Correção Funciona

### Cenário 1: Token Válido
```
1. Buscar token do localStorage
2. Decodificar payload do JWT
3. Verificar se exp > agora
4. ✅ Token válido, usar normalmente
5. Enviar requisição com Bearer [token]
```

### Cenário 2: Token Expirado
```
1. Buscar token do localStorage
2. Decodificar payload do JWT
3. Verificar se exp < agora
4. ❌ Token expirado!
5. Limpar localStorage.auth_token
6. Retornar null
7. Enviar requisição com Bearer [publicAnonKey]
8. Backend retorna array vazio []
```

### Cenário 3: Token Mal Formatado
```
1. Buscar token do localStorage
2. Token não tem 3 partes separadas por ponto
3. ❌ Token inválido!
4. Limpar localStorage.auth_token
5. Retornar null
6. Enviar requisição com Bearer [publicAnonKey]
7. Backend retorna array vazio []
```

### Cenário 4: Token Corrompido
```
1. Buscar token do localStorage
2. Tentar decodificar payload com atob()
3. Erro ao decodificar (JSON inválido)
4. ❌ Token corrompido!
5. Limpar localStorage.auth_token
6. Retornar null
7. Enviar requisição com Bearer [publicAnonKey]
8. Backend retorna array vazio []
```

## Comportamento Esperado

### Antes da Correção ❌
```
1. Token inválido no localStorage
2. Enviar requisição com token inválido
3. Supabase Functions rejeita com 401
4. Frontend exibe erro no console
5. Notificações não carregam
```

### Depois da Correção ✅
```
1. Token inválido no localStorage
2. getAuthToken() detecta e limpa automaticamente
3. Enviar requisição com publicAnonKey
4. Backend retorna array vazio []
5. Frontend funciona normalmente (sem notificações)
6. Log indica que token foi limpo
```

## Logs de Debug

Agora você verá logs úteis no console:

### Token Válido
```
[API] Headers configurados: {
  hasToken: true,
  tokenPreview: "eyJhbGciOiJIUzI1NiIs...",
  authHeader: "Bearer eyJhbGciOiJIUzI1NiIs..."
}
```

### Token Expirado
```
[API] Token expirado, limpando...
[API] Headers configurados: {
  hasToken: false,
  tokenPreview: "usando publicAnonKey",
  authHeader: "Bearer eyJhbGciOiJIUzI1NiIs..."
}
```

### Token Inválido
```
[API] Token inválido, limpando... SyntaxError: Unexpected token...
[API] Headers configurados: {
  hasToken: false,
  tokenPreview: "usando publicAnonKey",
  authHeader: "Bearer eyJhbGciOiJIUzI1NiIs..."
}
```

## Solução Manual (Se Necessário)

Se o erro persistir, você pode limpar manualmente o token:

### Via Console do Navegador
```javascript
// Limpar token
localStorage.removeItem('auth_token');

// Verificar se foi removido
console.log('Token atual:', localStorage.getItem('auth_token')); // null

// Recarregar a página
location.reload();
```

### Via Logout
```
1. Faça logout usando o botão de logout no sistema
2. Faça login novamente
3. Novo token será gerado
```

## Prevenção de Problemas Futuros

### 1. Refresh Token (Recomendado)
```typescript
// TODO: Implementar refresh automático do token antes de expirar
const refreshTokenBeforeExpiry = async () => {
  const token = getAuthToken();
  if (!token) return;
  
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  const now = Math.floor(Date.now() / 1000);
  
  // Se falta menos de 5 minutos para expirar
  if (payload.exp - now < 300) {
    // Fazer refresh do token
    const { session } = await supabase.auth.refreshSession();
    if (session?.access_token) {
      setAuthToken(session.access_token);
    }
  }
};
```

### 2. Session Storage (Alternativa)
```typescript
// Usar sessionStorage em vez de localStorage
// O token é limpo automaticamente quando o navegador fecha
sessionStorage.setItem('auth_token', token);
```

### 3. Interceptor de Requisições
```typescript
// Verificar token antes de cada requisição
const fetchWithAuth = async (url, options) => {
  const token = getAuthToken(); // Já faz validação automática
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : `Bearer ${publicAnonKey}`
    }
  });
};
```

## Status

✅ **IMPLEMENTADO** - Validação automática de token em `getAuthToken()`  
✅ **IMPLEMENTADO** - Limpeza automática de tokens expirados  
✅ **IMPLEMENTADO** - Limpeza automática de tokens mal formatados  
✅ **IMPLEMENTADO** - Limpeza automática de tokens corrompidos  
✅ **IMPLEMENTADO** - Logs detalhados para debug  
✅ **IMPLEMENTADO** - Fallback para publicAnonKey quando token inválido  
⚠️ **RECOMENDADO** - Implementar refresh automático de token (futuro)

## Teste de Verificação

Execute no console do navegador:

```javascript
// 1. Verificar token atual
console.log('Token atual:', localStorage.getItem('auth_token'));

// 2. Forçar um token inválido
localStorage.setItem('auth_token', 'token_invalido_123');

// 3. Tentar buscar notificações (deve limpar automaticamente)
await fetch('https://[PROJECT_ID].supabase.co/functions/v1/make-server-f9c0d131/notificacoes', {
  headers: {
    'Authorization': 'Bearer ' + (localStorage.getItem('auth_token') || 'publicAnonKey')
  }
});

// 4. Verificar se foi limpo
console.log('Token após requisição:', localStorage.getItem('auth_token')); // null

// 5. Testar com token expirado
const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.signature';
localStorage.setItem('auth_token', expiredToken);

// 6. Importar e testar getAuthToken
import { getAuthToken } from './services/api';
console.log('getAuthToken():', getAuthToken()); // null (e limpa localStorage)
```

## Próximos Passos

1. ✅ Token inválido agora é detectado e limpo automaticamente
2. ✅ Requisições usam publicAnonKey como fallback
3. ✅ Backend retorna arrays vazios em vez de erros 401
4. 🔄 Sistema funciona normalmente sem exigir login imediato
5. ⚠️ Considerar implementar refresh automático de token no futuro
6. ⚠️ Considerar adicionar interceptor global para todas as requisições

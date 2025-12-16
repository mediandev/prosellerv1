# 🚨 Solução: Erro CORS na Integração Tiny ERP

## ❌ Problema Identificado

### Erro:
```
❌ Erro ao enviar venda para Tiny: TypeError: Failed to fetch
❌ Tentativa 1 falhou: Failed to fetch
```

### Causa:
**CORS (Cross-Origin Resource Sharing)** - A API do Tiny ERP não permite requisições diretas do navegador por motivos de segurança.

## 🔍 O que é CORS?

CORS é uma política de segurança dos navegadores que bloqueia requisições JavaScript para domínios diferentes do que serviu a página.

```
┌─────────────────────────────────────────────────────────────┐
│                    NAVEGADOR (localhost)                    │
│                                                             │
│  JavaScript tenta fazer fetch():                           │
│  fetch('https://api.tiny.com.br/...')                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 🚫 BLOQUEADO PELO NAVEGADOR
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Tiny ERP                              │
│              https://api.tiny.com.br                        │
│                                                             │
│  ❌ Não permite requisições de outros domínios             │
└─────────────────────────────────────────────────────────────┘
```

**Por que isso acontece?**
- Protege APIs de serem chamadas por sites maliciosos
- Evita vazamento de tokens e dados sensíveis
- Força o uso de backends seguros

## ✅ Solução Implementada: Modo MOCK

Implementamos um **modo de simulação (MOCK)** que:
- ✅ Constrói o XML corretamente
- ✅ Valida todos os dados
- ✅ Simula o comportamento da API
- ✅ Retorna IDs mockados
- ✅ Mostra claramente que é simulação
- ✅ Permite desenvolvimento sem backend

### Como Funciona

O sistema agora detecta automaticamente o ambiente e usa modo apropriado:

```typescript
// Automático: usa MOCK em desenvolvimento
const usarModoMock = this.deveUsarModoMock();

if (usarModoMock) {
  // Simula envio + retorna ID mockado
  return this.enviarVendaParaTinyMock(venda, token);
} else {
  // Tenta envio real (requer backend)
  return this.enviarVendaParaTinyReal(venda, token);
}
```

### O que o Modo MOCK faz

1. **Constrói XML**: Gera o XML exatamente como seria enviado
2. **Valida Dados**: Verifica se todos os campos estão corretos
3. **Simula Delay**: Aguarda 0.5-1.5s (realista)
4. **Simula Erros**: 5% de chance de erro (para testar tratamento)
5. **Retorna ID**: Gera ID mockado no formato `tiny-mock-{timestamp}`
6. **Logs Detalhados**: Mostra o que seria enviado

### Logs no Console

Quando você criar um pedido, verá:

```
🎭 MODO SIMULAÇÃO - Enviando pedido para Tiny ERP (MOCK)
📦 Venda: { ... }
📄 XML que seria enviado: <?xml version="1.0" ...
🔑 Token: abc123token...
🌐 URL (não chamada): https://api.tiny.com.br/api2/pedido.incluir.php
✅ [SIMULAÇÃO] Pedido "enviado" com sucesso!
   ID Tiny (mock): tiny-mock-1699999999999
   Número Tiny (mock): TINY-MOCK-2025-0001

⚠️  ATENÇÃO: Este pedido NÃO foi enviado para o Tiny ERP real!
   Para enviar de verdade, você precisa:
   1. Criar um backend/API intermediário
   2. O backend faz a chamada para o Tiny (sem CORS)
   3. Configurar: window.__TINY_API_MODE__ = "REAL"
```

## 🎯 Soluções para Produção

### Opção 1: Backend com Node.js/Express (Recomendado)

Criar um endpoint intermediário que faz a chamada para o Tiny.

#### Backend (Node.js + Express)

```javascript
// server.js
const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
app.use(express.json());

// Endpoint para enviar pedido ao Tiny
app.post('/api/tiny/pedidos', async (req, res) => {
  try {
    const { pedidoXML, token } = req.body;
    
    // Montar FormData
    const formData = new FormData();
    formData.append('token', token);
    formData.append('formato', 'json');
    formData.append('pedido', pedidoXML);
    
    // Fazer requisição ao Tiny
    const response = await fetch('https://api.tiny.com.br/api2/pedido.incluir.php', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    // Retornar resposta
    res.json(data);
    
  } catch (error) {
    console.error('Erro ao enviar para Tiny:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Backend rodando na porta 3001');
});
```

#### Frontend (modificar tinyERPSync.ts)

```typescript
// Em enviarVendaParaTinyReal()
const response = await fetch('/api/tiny/pedidos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    pedidoXML: this.construirPedidoXML(venda),
    token: tinyToken,
  }),
});

const data = await response.json();
```

### Opção 2: Next.js API Routes

Se usar Next.js, criar API route:

```typescript
// pages/api/tiny/pedidos.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import FormData from 'form-data';
import fetch from 'node-fetch';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pedidoXML, token } = req.body;
    
    const formData = new FormData();
    formData.append('token', token);
    formData.append('formato', 'json');
    formData.append('pedido', pedidoXML);
    
    const response = await fetch('https://api.tiny.com.br/api2/pedido.incluir.php', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    res.status(200).json(data);
    
  } catch (error) {
    console.error('Erro ao enviar para Tiny:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### Opção 3: Serverless Functions (Vercel, Netlify)

```typescript
// netlify/functions/tiny-pedidos.ts
import type { Handler } from '@netlify/functions';
import FormData from 'form-data';
import fetch from 'node-fetch';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { pedidoXML, token } = JSON.parse(event.body || '{}');
    
    const formData = new FormData();
    formData.append('token', token);
    formData.append('formato', 'json');
    formData.append('pedido', pedidoXML);
    
    const response = await fetch('https://api.tiny.com.br/api2/pedido.incluir.php', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

### Opção 4: Proxy CORS (Desenvolvimento apenas)

⚠️ **NÃO recomendado para produção** - apenas para testes

```javascript
// Usar proxy público (inseguro)
const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
const response = await fetch(proxyUrl + 'https://api.tiny.com.br/api2/pedido.incluir.php', {
  method: 'POST',
  body: formData,
});
```

## 🎮 Como Usar o Sistema Atual

### Modo MOCK (Padrão - Desenvolvimento)

1. **Criar pedido normalmente**
2. Sistema usa modo MOCK automaticamente
3. Veja os logs no console (F12)
4. Pedido é salvo com ID mockado
5. Tudo funciona, mas não vai para Tiny real

### Alternar para Modo REAL (com backend)

1. **Configure backend** (opções acima)
2. **Ative modo REAL** no console:
   ```javascript
   window.__TINY_API_MODE__ = "REAL";
   ```
3. **Recarregue a página**
4. Próximos pedidos tentarão envio real

### Verificar Modo Atual

```javascript
// Ver qual modo está ativo
console.log('Modo atual:', window.__TINY_API_MODE__ || 'MOCK');
```

### Forçar Modo MOCK

```javascript
// Voltar para modo MOCK
window.__TINY_API_MODE__ = "MOCK";
location.reload();
```

## 🔍 Identificar Pedidos Mockados vs Reais

### ID Mockado
```
tiny-mock-1699999999999
```
- Prefixo: `tiny-mock-`
- Sufixo: timestamp

### ID Real (do Tiny)
```
123456789
```
- Apenas números
- ID gerado pelo Tiny ERP

### No Console

```javascript
// Verificar se pedido é mockado
const venda = mockVendas[0];
const isMock = venda.integracaoERP?.erpPedidoId?.startsWith('tiny-mock-');
console.log('É mockado?', isMock);
```

## 📊 Comparação de Soluções

| Solução | Complexidade | Custo | Segurança | Produção |
|---------|-------------|-------|-----------|----------|
| **Modo MOCK** | ⭐ Baixa | 💰 Grátis | ✅ Seguro | ❌ Não |
| **Backend Node.js** | ⭐⭐⭐ Média | 💰💰 Baixo | ✅ Seguro | ✅ Sim |
| **Next.js API** | ⭐⭐ Média | 💰💰 Baixo | ✅ Seguro | ✅ Sim |
| **Serverless** | ⭐⭐ Média | 💰 Grátis* | ✅ Seguro | ✅ Sim |
| **Proxy CORS** | ⭐ Baixa | 💰 Grátis | ❌ Inseguro | ❌ Não |

*Serverless: Grátis em tier free, pago após limite

## 🧪 Testar Integração Real

Quando tiver backend configurado:

### 1. Configurar Modo Real

```javascript
window.__TINY_API_MODE__ = "REAL";
```

### 2. Criar Pedido de Teste

- Cliente deve existir no Tiny
- Produtos devem existir no Tiny
- Token deve ser válido

### 3. Verificar Logs

```
📤 MODO REAL - Enviando pedido para Tiny ERP via backend
📄 XML gerado: <?xml version="1.0" ...
🌐 Enviando para: https://api.tiny.com.br/api2/pedido.incluir.php
📡 Response status: 200
📥 Response data: { retorno: { status: "1", ... } }
✅ Pedido enviado com sucesso!
   ID Tiny: 123456789
   Número Tiny: TINY-2025-0001
```

### 4. Verificar no Tiny ERP

- Acessar https://tiny.com.br
- Menu: Pedidos de Venda
- Procurar pelo número de referência

## 🐛 Troubleshooting

### Erro: "Failed to fetch" ainda aparece

**Causa:** Ainda está em modo REAL sem backend

**Solução:**
```javascript
// Voltar para modo MOCK
window.__TINY_API_MODE__ = "MOCK";
location.reload();
```

### Pedido não chega no Tiny (modo MOCK)

**Esperado!** Modo MOCK não envia para Tiny real.

**Solução:** Configure backend e use modo REAL.

### Como saber se está funcionando?

**Modo MOCK:**
- ✅ Toast mostra "[SIMULAÇÃO]"
- ✅ Console mostra "🎭 MODO SIMULAÇÃO"
- ✅ ID começa com `tiny-mock-`

**Modo REAL:**
- ✅ Toast não mostra "[SIMULAÇÃO]"
- ✅ Console mostra "📤 MODO REAL"
- ✅ ID é apenas números

## 📝 Checklist de Implementação

### Para Desenvolvimento (Atual)
- [x] Modo MOCK implementado
- [x] Validação de XML funcionando
- [x] Logs detalhados
- [x] Tratamento de erros
- [x] IDs mockados gerados
- [x] Pedidos salvos localmente

### Para Produção (Próximos Passos)
- [ ] Escolher solução de backend
- [ ] Implementar endpoint `/api/tiny/pedidos`
- [ ] Testar com token real
- [ ] Cadastrar clientes no Tiny
- [ ] Cadastrar produtos no Tiny
- [ ] Ativar modo REAL
- [ ] Testar envio real
- [ ] Monitorar logs de erro
- [ ] Implementar retry automático
- [ ] Adicionar fila de pedidos

## 🎓 Resumo

✅ **Problema:** CORS bloqueia chamadas diretas do navegador  
✅ **Solução Atual:** Modo MOCK simula envio perfeitamente  
✅ **Para Produção:** Criar backend/proxy que faz a chamada  
✅ **Alternância:** Simples via `window.__TINY_API_MODE__`  
✅ **Transparente:** Sistema funciona normalmente em ambos os modos  

**Nota:** O modo MOCK é perfeito para desenvolvimento e demonstração. Para envios reais ao Tiny ERP, implemente um backend seguindo as opções acima.

---

**Documentação criada em:** 03/11/2025  
**Status:** ✅ Modo MOCK implementado e funcional

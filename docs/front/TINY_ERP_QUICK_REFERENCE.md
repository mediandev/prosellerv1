# 🚀 Tiny ERP - Referência Rápida

## 📍 Atalhos Rápidos

### Configurar Integração
```
Configurações → Empresas → Botão ⚙️ → Inserir Token → Salvar
```

### Ver Status
```
Configurações → Empresas → Card da empresa → Badge "Integração ERP"
```

### Criar Pedido
```
Vendas → Novo Pedido → Preencher → ✓ Enviar para ERP → Salvar
```

### Verificar Modo
```
Rodapé da página → "Tiny ERP: REAL" ou "MOCK"
```

---

## 🔧 Configuração Rápida

### 1. Obter Token
```
tiny.com.br → Login → Configurações → API → Gerar Token
```

### 2. Configurar no Sistema
```typescript
// Interface
Configurações → Empresas → ⚙️
  
// Cole o token
// Clique "Testar Conexão"
// Configure preferências
// Salve
```

### 3. Ativar Modo REAL
```javascript
// Recarregue a página após salvar
// Ou force no console:
localStorage.setItem('tinyERPMode', 'REAL');
location.reload();
```

---

## 📡 API Backend

### Base URL
```
https://${projectId}.supabase.co/functions/v1/make-server-f9c0d131
```

### Endpoints

#### Configuração
```typescript
// Buscar config
GET /erp-config/:empresaId

// Salvar config
POST /erp-config/:empresaId
Body: {
  tipo: 'tiny',
  ativo: true,
  credenciais: { token: 'xxx' },
  envioAutomatico: { ... },
  preferencias: { ... }
}

// Testar conexão
POST /tiny/test-connection
Body: { token: 'xxx' }
```

#### Operações
```typescript
// Produtos
GET /tiny/produtos?empresaId=xxx
GET /tiny/produto/:id?empresaId=xxx

// Clientes
GET /tiny/clientes?empresaId=xxx

// Pedidos
POST /tiny/pedido
Body: { empresaId: 'xxx', pedidoXML: '...' }

GET /tiny/pedido/:id?empresaId=xxx
GET /tiny/pedidos?empresaId=xxx&dataInicial=xxx&dataFinal=xxx
```

---

## 💻 Código Frontend

### Configurar ERP
```typescript
import { api } from './services/api';

// Buscar configuração
const config = await api.getERPConfig(empresaId);

// Salvar configuração
await api.saveERPConfig(empresaId, {
  tipo: 'tiny',
  ativo: true,
  credenciais: { token: 'seu-token-aqui' },
  envioAutomatico: {
    habilitado: true,
    tentativasMaximas: 3,
    intervaloRetentativa: 5
  },
  preferencias: {
    transmitirOC: true
  }
});

// Testar conexão
const result = await api.testTinyConnection('seu-token');
console.log(result.success); // true ou false
```

### Enviar Pedido
```typescript
import { tinyERPSyncService } from './services/tinyERPSync';

// Enviar venda para Tiny ERP
const erpPedidoId = await tinyERPSyncService.enviarVendaParaTiny(
  venda, 
  token
);

console.log('Pedido criado no ERP:', erpPedidoId);
```

### Consultar Status
```typescript
import { api } from './services/api';

const empresaId = 'uuid-empresa';
const pedidoId = '123456';

const pedido = await api.tinyObterPedido(empresaId, pedidoId);
console.log('Status:', pedido.pedido.situacao);
```

---

## 🔍 Debugging

### Console do Navegador
```javascript
// Ver modo atual
console.log(localStorage.getItem('tinyERPMode'));

// Forçar modo REAL
localStorage.setItem('tinyERPMode', 'REAL');
location.reload();

// Forçar modo MOCK
localStorage.setItem('tinyERPMode', 'MOCK');
location.reload();

// Ver empresa selecionada
console.log(localStorage.getItem('empresaSelecionada'));

// Ver logs do Tiny ERP
// Abra o console e procure por: [TINY ERP]
```

### Logs Úteis
```
[TINY ERP] Buscando config para empresa: xxx
[TINY ERP] Config encontrada: { ativo: true, hasToken: true }
[TINY ERP] Enviando pedido...
[TINY ERP] XML gerado: <?xml...
[TINY ERP] Pedido criado com sucesso: { id: "123" }
```

---

## ⚠️ Troubleshooting

### Token Inválido
```bash
# Problema: "Token inválido"
# Solução:
1. Gere novo token no Tiny ERP
2. Teste com api.testTinyConnection(novoToken)
3. Salve nova configuração
```

### Ainda em Modo MOCK
```javascript
// Forçar modo REAL
localStorage.setItem('tinyERPMode', 'REAL');
localStorage.setItem('empresaSelecionada', 'seu-uuid-empresa');
location.reload();
```

### Config Não Salva
```typescript
// Verificar no backend
const config = await api.getERPConfig(empresaId);
console.log('Config atual:', config);

// Salvar novamente
await api.saveERPConfig(empresaId, novaConfig);

// Verificar se salvou
const configAtualizada = await api.getERPConfig(empresaId);
console.log('Config atualizada:', configAtualizada);
```

### Pedido Não Envia
```javascript
// Verificar configuração
const empresaId = localStorage.getItem('empresaSelecionada');
const config = await api.getERPConfig(empresaId);
console.log('Config:', config);
console.log('Ativo?', config.ativo);
console.log('Tem token?', !!config.credenciais?.token);

// Verificar modo
console.log('Modo:', localStorage.getItem('tinyERPMode'));

// Tentar enviar manualmente
await tinyERPSyncService.enviarVendaParaTiny(venda, config.credenciais.token);
```

---

## 📊 Status Badges

### ERPStatusBadge
```tsx
import { ERPStatusBadge } from './components/ERPStatusBadge';

// Em qualquer lugar
<ERPStatusBadge empresaId={company.id} />

// Sem detalhes
<ERPStatusBadge empresaId={company.id} showDetails={false} />
```

### Possíveis Status
- 🟢 **TINY Ativo** - Funcionando
- 🔴 **ERP Inativo** - Não configurado
- ⚠️ **ERP Erro** - Problema na config
- ⏳ **Carregando...** - Buscando status

---

## 🎯 Casos de Uso Comuns

### Caso 1: Primeira Configuração
```
1. Login no Tiny ERP
2. Gerar token
3. Configurações → Empresas → ⚙️
4. Colar token
5. Testar Conexão
6. Salvar
7. Recarregar página
8. Pronto! ✅
```

### Caso 2: Múltiplas Empresas
```typescript
// Configurar cada empresa separadamente
const empresas = ['uuid1', 'uuid2', 'uuid3'];

for (const empresaId of empresas) {
  await api.saveERPConfig(empresaId, {
    tipo: 'tiny',
    ativo: true,
    credenciais: { token: tokens[empresaId] }
  });
}
```

### Caso 3: Alternar Entre Empresas
```typescript
// Ao trocar empresa no sistema
const novaEmpresaId = 'uuid-nova-empresa';
localStorage.setItem('empresaSelecionada', novaEmpresaId);

// Verificar config da nova empresa
const config = await api.getERPConfig(novaEmpresaId);

// Sistema automaticamente usará o token correto
```

---

## 🔐 Segurança

### Boas Práticas
```typescript
// ✅ FAZER
- Armazenar token no backend (KV Store)
- Nunca expor token no frontend
- Usar HTTPS sempre
- Autenticar usuário antes de salvar config

// ❌ NÃO FAZER
- Hardcodar tokens no código
- Compartilhar tokens entre ambientes
- Logar tokens completos no console
- Enviar tokens via URL params
```

---

## 📚 Arquivos Importantes

### Backend
```
/supabase/functions/server/index.tsx
  ↳ Rotas de configuração (linha ~2556)
  ↳ Rotas Tiny ERP (linha ~2556 a ~2950)
```

### Frontend
```
/services/api.ts
  ↳ Métodos de API (linha ~453)

/services/tinyERPSync.ts
  ↳ Lógica de sincronização

/services/erpAutoSendService.ts
  ↳ Envio automático
```

### Componentes
```
/components/CompanyERPDialog.tsx
  ↳ Diálogo de configuração

/components/ERPStatusBadge.tsx
  ↳ Badge de status

/components/CompanySettings.tsx
  ↳ Lista de empresas com botão config
```

### Documentação
```
/INTEGRACAO_TINY_ERP.md
  ↳ Guia completo técnico

/SETUP_TINY_ERP_PASSO_A_PASSO.md
  ↳ Guia passo a passo visual

/TINY_ERP_QUICK_REFERENCE.md
  ↳ Este arquivo (referência rápida)
```

---

## 🎓 Comandos Úteis

### LocalStorage
```javascript
// Ver todos os dados
console.table({
  modo: localStorage.getItem('tinyERPMode'),
  empresa: localStorage.getItem('empresaSelecionada'),
  authToken: localStorage.getItem('auth_token')?.substring(0, 20) + '...'
});

// Limpar tudo (reset)
localStorage.clear();
location.reload();
```

### Fetch Manual
```typescript
// Testar endpoint diretamente
const projectId = 'seu-project-id';
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-f9c0d131/tiny/test-connection`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({ token: 'seu-token' })
  }
);
const data = await response.json();
console.log(data);
```

---

## 🎉 Dicas Pro

### Dica 1: Atalho de Teclado
```javascript
// Adicione ao console para acesso rápido
window.tinyDebug = {
  modo: () => console.log(localStorage.getItem('tinyERPMode')),
  real: () => { 
    localStorage.setItem('tinyERPMode', 'REAL'); 
    location.reload(); 
  },
  mock: () => { 
    localStorage.setItem('tinyERPMode', 'MOCK'); 
    location.reload(); 
  },
  config: async (empresaId) => {
    const { api } = await import('./services/api');
    return await api.getERPConfig(empresaId);
  }
};

// Uso: tinyDebug.real()
```

### Dica 2: Watch Mode
```javascript
// Monitorar mudanças de modo
window.addEventListener('tinyERPModeChanged', (e) => {
  console.log('Modo mudou para:', e.detail);
});
```

### Dica 3: Bulk Config
```typescript
// Configurar várias empresas de uma vez
const bulkConfig = async (empresas: string[], token: string) => {
  for (const empresaId of empresas) {
    await api.saveERPConfig(empresaId, {
      tipo: 'tiny',
      ativo: true,
      credenciais: { token }
    });
    console.log(`✅ ${empresaId} configurado`);
  }
};

// Uso
await bulkConfig(['uuid1', 'uuid2'], 'token-compartilhado');
```

---

## 📞 Suporte

### Links Úteis
- [API Tiny ERP](https://tiny.com.br/api-docs)
- [Supabase Docs](https://supabase.com/docs)
- [Documentação Completa](/INTEGRACAO_TINY_ERP.md)

### Contato
- Issues: GitHub Repository
- Email: suporte@sistema.com.br
- Chat: Slack #tiny-erp

---

**Última atualização:** Novembro 2024  
**Versão:** 1.0

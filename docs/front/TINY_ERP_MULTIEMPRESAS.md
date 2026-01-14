# Sincronização Tiny ERP - Configuração Multiempresas

## 📋 Visão Geral

Este documento detalha como funciona a configuração de sincronização com Tiny ERP em um ambiente **multiempresas**, onde cada empresa pode ter suas próprias configurações independentes.

## 🏢 Arquitetura Multiempresas

### Estrutura de Dados

Cada empresa (`Company`) possui:
- **Múltiplas integrações ERP** (`integracoesERP[]`)
- Cada integração pode ser um ERP diferente (Tiny, TOTVS, SAP, etc)
- Para o Tiny ERP, incluímos configurações de sincronização

```typescript
interface CompanyERPConfig {
  erpNome: string;           // "Tiny ERP"
  ativo: boolean;            // Se a integração está ativa
  apiToken: string;          // Token único da empresa no Tiny
  apiUrl?: string;           // URL da API (se customizada)
  
  // Configurações de Sincronização
  sincronizacao?: {
    habilitado: boolean;
    sincronizarAutomaticamente: boolean;
    intervaloMinutos: number;
    notificarAlteracoes: boolean;
    sincronizarDadosAdicionais: boolean;
    webhookUrl?: string;     // URL customizada (opcional)
  };
}
```

## 🔑 Webhooks Únicos por Empresa

### Por que URLs diferentes?

1. **Isolamento de Dados**
   - Cada empresa opera em contas separadas do Tiny ERP
   - Pedidos de uma empresa não devem interferir em outra

2. **Configurações Independentes**
   - Cada empresa pode ter intervalo de polling diferente
   - Notificações podem estar ativas em uma e desativas em outra

3. **Tokens de API Diferentes**
   - Cada empresa tem seu próprio token do Tiny
   - Segurança: token de uma empresa não acessa dados de outra

4. **Rastreabilidade**
   - Fácil identificar qual empresa originou a notificação
   - Logs e auditoria separados por empresa

### Formato das URLs

```
Padrão: {baseUrl}/api/webhooks/tiny/{empresaId}

Exemplos:
┌─────────────────────────────────────────────────────────────┐
│ Empresa Matriz                                              │
│ ID: empresa-001                                             │
│ URL: https://app.exemplo.com/api/webhooks/tiny/empresa-001 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Filial São Paulo                                            │
│ ID: empresa-002                                             │
│ URL: https://app.exemplo.com/api/webhooks/tiny/empresa-002 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Filial Rio de Janeiro                                       │
│ ID: empresa-003                                             │
│ URL: https://app.exemplo.com/api/webhooks/tiny/empresa-003 │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Configuração no Sistema

### Interface de Configuração

**Configurações → Integrações → Sincronização Tiny ERP**

### Fluxo de Configuração

```
1. Selecionar Empresa
   ↓
2. Informar Token de API (da conta Tiny dessa empresa)
   ↓
3. Configurar Parâmetros de Sincronização
   ↓
4. Salvar
   ↓
5. Copiar URL do Webhook gerada
   ↓
6. Configurar no Tiny ERP da empresa
```

### Abas Disponíveis

#### 1. Configuração
- Seletor de empresa
- Token de API
- Habilitar/desabilitar sincronização
- Intervalo de polling
- Notificações
- Dados adicionais

#### 2. Webhooks
- Lista todas as empresas com Tiny configurado
- Mostra URL de webhook de cada uma
- Botão de copiar para facilitar
- Instruções de configuração no Tiny

#### 3. Histórico
- Sincronizações de todas as empresas
- Filtro por empresa (futuro)
- Status de cada sincronização

#### 4. Estatísticas
- Métricas agregadas de todas as empresas
- Total de sincronizações
- Taxa de sucesso

## 🔄 Fluxo de Sincronização Multiempresas

### Polling Automático

```
Timer (15 min) → Para cada empresa configurada:
                   ├─ Buscar vendas da empresa
                   ├─ Filtrar vendas com integração ativa
                   ├─ Usar token da empresa
                   └─ Sincronizar status
```

### Webhook (Recomendado)

```
Tiny ERP Empresa A → POST /api/webhooks/tiny/empresa-001
                     ├─ Identificar empresa pelo ID na URL
                     ├─ Buscar configuração da empresa
                     ├─ Validar token/assinatura
                     ├─ Processar payload
                     └─ Atualizar status da venda
```

## 📊 Exemplo Prático

### Cenário: 3 Empresas

#### Empresa Matriz
- **Nome:** Matriz SP
- **ID:** `emp-matriz-sp`
- **Token Tiny:** `abc123xyz...`
- **Webhook:** `https://app.com/api/webhooks/tiny/emp-matriz-sp`
- **Polling:** 15 minutos
- **Status:** Ativo

#### Filial 1
- **Nome:** Filial RJ
- **ID:** `emp-filial-rj`
- **Token Tiny:** `def456uvw...`
- **Webhook:** `https://app.com/api/webhooks/tiny/emp-filial-rj`
- **Polling:** 30 minutos
- **Status:** Ativo

#### Filial 2
- **Nome:** Filial MG
- **ID:** `emp-filial-mg`
- **Token Tiny:** `ghi789rst...`
- **Webhook:** `https://app.com/api/webhooks/tiny/emp-filial-mg`
- **Polling:** Desabilitado (só webhook)
- **Status:** Ativo

### Configuração no Tiny ERP

Para cada empresa, configurar no respectivo painel do Tiny:

**Matriz SP:**
```
Tiny ERP → Configurações → Webhooks
├─ Nome: Sincronização App
├─ URL: https://app.com/api/webhooks/tiny/emp-matriz-sp
├─ Evento: Mudança de situação do pedido
└─ Formato: JSON
```

**Filial RJ:**
```
Tiny ERP → Configurações → Webhooks
├─ Nome: Sincronização App
├─ URL: https://app.com/api/webhooks/tiny/emp-filial-rj
├─ Evento: Mudança de situação do pedido
└─ Formato: JSON
```

**Filial MG:**
```
Tiny ERP → Configurações → Webhooks
├─ Nome: Sincronização App
├─ URL: https://app.com/api/webhooks/tiny/emp-filial-mg
├─ Evento: Mudança de situação do pedido
└─ Formato: JSON
```

## 🔐 Segurança

### Isolamento de Tokens

✅ **Correto:**
- Cada empresa usa seu próprio token
- Token armazenado em `empresa.integracoesERP[].apiToken`
- Sincronização usa token específico da empresa

❌ **Errado:**
- Usar mesmo token para todas as empresas
- Misturar dados de diferentes empresas

### Validação de Webhooks

```typescript
// Endpoint de webhook
POST /api/webhooks/tiny/:empresaId

// Validações:
1. Verificar se empresaId existe
2. Verificar se empresa tem Tiny ERP configurado
3. Verificar se sincronização está habilitada
4. Validar assinatura do webhook (se Tiny fornecer)
5. Processar apenas se todas validações passarem
```

## 📝 Código de Exemplo

### Configurar Empresa

```typescript
import { tinyERPSyncService } from '../services/tinyERPSync';

// Configurar sincronização para uma empresa
tinyERPSyncService.configurarEmpresa(
  'emp-matriz-sp',              // ID da empresa
  'Matriz São Paulo',           // Nome da empresa
  {
    apiToken: 'abc123...',      // Token do Tiny desta empresa
    habilitado: true,
    intervaloMinutos: 15,
    sincronizarAutomaticamente: true,
    notificarAlteracoes: true,
    sincronizarDadosAdicionais: true,
    webhookUrl: undefined,      // Usa padrão: /api/webhooks/tiny/emp-matriz-sp
  }
);
```

### Sincronizar Venda de Empresa Específica

```typescript
// Sincronizar venda fornecendo o ID da empresa
const vendaAtualizada = await tinyERPSyncService.sincronizarVenda(
  venda,
  'emp-matriz-sp'  // ID da empresa
);

// O serviço irá:
// 1. Buscar configuração da empresa
// 2. Usar o token correto
// 3. Aplicar as configurações específicas (notificações, etc)
```

### Processar Webhook

```typescript
// API Route: /api/webhooks/tiny/:empresaId
app.post('/api/webhooks/tiny/:empresaId', async (req, res) => {
  const { empresaId } = req.params;
  const payload = req.body;

  try {
    // Validar empresa existe e tem configuração
    const config = tinyERPSyncService.obterConfiguracaoEmpresa(empresaId);
    
    if (!config || !config.habilitado) {
      return res.status(404).json({ error: 'Empresa não configurada' });
    }

    // Processar webhook
    await tinyERPSyncService.processarWebhook(payload);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});
```

## 🎯 Benefícios da Abordagem Multiempresas

### ✅ Vantagens

1. **Isolamento Completo**
   - Dados de cada empresa separados
   - Configurações independentes
   - Tokens e credenciais isolados

2. **Flexibilidade**
   - Cada empresa pode ter intervalo diferente
   - Ativar/desativar por empresa
   - Customizar comportamento

3. **Escalabilidade**
   - Adicionar novas empresas facilmente
   - Não impacta empresas existentes

4. **Segurança**
   - Token comprometido afeta só uma empresa
   - Logs e auditoria por empresa

5. **Rastreabilidade**
   - Fácil identificar origem dos dados
   - Debug facilitado

### 📊 Comparação

| Aspecto | Single Webhook | Multi Webhook (Implementado) |
|---------|---------------|------------------------------|
| URL | 1 para todas | 1 por empresa ✅ |
| Token | Compartilhado | Independente ✅ |
| Configuração | Global | Por empresa ✅ |
| Segurança | Baixa | Alta ✅ |
| Isolamento | Não | Sim ✅ |
| Escalabilidade | Limitada | Excelente ✅ |

## 🚨 Troubleshooting

### Webhook não funciona para uma empresa

**Verificar:**
1. ✅ Empresa tem integração Tiny configurada?
2. ✅ Token de API está correto?
3. ✅ Sincronização está habilitada?
4. ✅ URL do webhook está configurada no Tiny?
5. ✅ Empresa ID na URL está correto?

### Sincronização funciona para uma empresa mas não para outra

**Possíveis causas:**
- Tokens diferentes com permissões diferentes
- Configurações de intervalo muito altas
- Sincronização desabilitada em uma delas
- Erros específicos daquela conta no Tiny

### Como testar?

```typescript
// 1. Verificar configuração
const config = tinyERPSyncService.obterConfiguracaoEmpresa('emp-001');
console.log('Configuração:', config);

// 2. Testar sincronização manual
const resultado = await tinyERPSyncService.sincronizarManual(venda);
console.log('Resultado:', resultado);

// 3. Verificar histórico
const historico = tinyERPSyncService.obterHistorico();
console.log('Últimas sincronizações:', historico.slice(0, 10));
```

## 📚 Próximos Passos

- [ ] Dashboard de status por empresa
- [ ] Relatórios comparativos entre empresas
- [ ] Alertas específicos por empresa
- [ ] Sincronização em lote por empresa
- [ ] Backup de configurações
- [ ] Importação/exportação de configs

## 💡 Melhores Práticas

1. **Configure webhook sempre que possível**
   - Mais eficiente que polling
   - Atualizações em tempo real
   - Reduz carga no servidor

2. **Use intervalos adequados**
   - 15-30 min para empresas com alto volume
   - 60+ min para empresas com baixo volume
   - Ajuste conforme necessidade

3. **Monitore regularmente**
   - Verifique estatísticas semanalmente
   - Revise histórico de erros
   - Ajuste configurações conforme padrões

4. **Documente tokens**
   - Mantenha registro seguro dos tokens
   - Documente qual conta do Tiny pertence a qual empresa
   - Planeje renovação de tokens

5. **Teste antes de produção**
   - Configure em homologação primeiro
   - Teste webhook com ferramentas (Postman, curl)
   - Valide com pedidos de teste

---

**Versão:** 1.0.0  
**Última atualização:** Novembro 2025  
**Autor:** Sistema de Gestão Comercial

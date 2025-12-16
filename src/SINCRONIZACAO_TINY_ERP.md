# Sistema de Sincronização Automática com Tiny ERP

## 📋 Visão Geral

Sistema completo de sincronização automática de status de vendas com o Tiny ERP, permitindo que os pedidos sejam atualizados automaticamente conforme o andamento no sistema ERP, incluindo faturamento, emissão de nota fiscal, rastreio de envio e outros dados relevantes.

## 🎯 Objetivo

Manter o status das vendas no sistema sempre atualizado com o status real no Tiny ERP, automatizando o acompanhamento de pedidos e reduzindo trabalho manual.

## ✨ Funcionalidades

### 1. Sincronização Automática de Status
- ✅ Polling automático em intervalos configuráveis (5-120 minutos)
- ✅ Webhook para receber notificações instantâneas do Tiny ERP
- ✅ Mapeamento inteligente de status entre sistemas
- ✅ Sincronização manual sob demanda
- ✅ Retry automático em caso de falhas

### 2. Mapeamento de Status

| Status Tiny ERP | Status Interno | Descrição |
|----------------|----------------|-----------|
| `aberto` | Em Análise | Pedido aguardando aprovação |
| `aprovado` | Aprovado | Pedido aprovado |
| `preparando_envio` | Em Separação | Pedido em processo de separação |
| `pronto_envio` | Em Separação | Pedido pronto para envio |
| `faturado` | Faturado | Pedido faturado com NF-e emitida |
| `enviado` | Enviado | Pedido enviado/entregue |
| `entregue` | Enviado | Pedido entregue ao cliente |
| `cancelado` | Cancelado | Pedido cancelado |
| `nao_aprovado` | Cancelado | Pedido não aprovado |

### 3. Dados Sincronizados

#### Dados Básicos (sempre)
- Status atual do pedido
- Número do pedido no ERP
- Data da última sincronização

#### Dados Adicionais (configurável)
- **Nota Fiscal:**
  - Número da NF-e
  - Chave de acesso
  - URL para download da DANFE
  - Data de faturamento
  
- **Rastreio:**
  - Código de rastreio
  - URL de rastreamento
  
- **Transportadora:**
  - Nome da transportadora
  - CNPJ da transportadora

### 4. Histórico e Auditoria
- ✅ Registro completo de todas as sincronizações
- ✅ Status anterior e novo para cada alteração
- ✅ Timestamp de cada sincronização
- ✅ Registro de erros e tentativas
- ✅ Estatísticas de sucesso/erro

### 5. Notificações
- ✅ Notificações em tempo real sobre mudanças de status
- ✅ Diferentes tipos de notificação por status (sucesso/info/warning)
- ✅ Ícones visuais para cada tipo de alteração
- ✅ Opção de ativar/desativar notificações

## 🔧 Configuração

### Localização
**Configurações → Integrações → Sincronização Tiny ERP**

### Modelo Multiempresas ⭐

O sistema suporta **configuração independente por empresa**, permitindo que:
- Cada empresa tenha seu próprio token de API do Tiny
- Cada empresa tenha sua própria URL de webhook
- Configurações de sincronização sejam individualizadas
- Intervalos de polling diferentes por empresa
- Ativação/desativação independente

### URLs de Webhook por Empresa

Cada empresa possui sua própria URL de webhook no formato:
```
https://seu-dominio.com/api/webhooks/tiny/{empresaId}
```

**Exemplo:**
- Empresa Matriz (ID: emp-001): `/api/webhooks/tiny/emp-001`
- Empresa Filial SP (ID: emp-002): `/api/webhooks/tiny/emp-002`
- Empresa Filial RJ (ID: emp-003): `/api/webhooks/tiny/emp-003`

Isso permite que o sistema identifique automaticamente qual empresa está enviando a notificação e use as configurações corretas.

### Parâmetros Disponíveis

#### 1. Habilitar Sincronização
- Ativa ou desativa completamente o sistema
- **Padrão:** Habilitado

#### 2. Sincronizar Automaticamente
- Ativa polling automático em intervalos regulares
- **Padrão:** Habilitado

#### 3. Intervalo de Sincronização
- Define frequência do polling (5-120 minutos)
- **Padrão:** 15 minutos
- **Recomendado:** 15-30 minutos

#### 4. Notificar Alterações
- Exibe toast notifications quando status muda
- **Padrão:** Habilitado

#### 5. Sincronizar Dados Adicionais
- Inclui NF-e, rastreio e transportadora
- **Padrão:** Habilitado

#### 6. Token de API do Tiny ERP
- Token específico da empresa no Tiny
- Obtido no painel do Tiny ERP
- **Obrigatório** para sincronização

#### 7. URL do Webhook (Automático)
- **Gerada automaticamente** por empresa: `/api/webhooks/tiny/{empresaId}`
- Mais eficiente que polling
- Pode ser customizada se necessário
- Cada empresa tem sua própria URL

## 📊 Estrutura de Dados

### Interface IntegracaoERPVenda
```typescript
interface IntegracaoERPVenda {
  // Identificação
  erpPedidoId?: string;           // ID do pedido no Tiny
  erpNumero?: string;             // Número do pedido no Tiny
  erpStatus?: TinyERPStatus;      // Status atual no Tiny
  
  // Controle de Sincronização
  dataSincronizacao?: Date;       // Última sincronização
  sincronizacaoAutomatica: boolean;
  tentativasSincronizacao: number;
  erroSincronizacao?: string;
  
  // Nota Fiscal
  notaFiscalNumero?: string;
  notaFiscalChave?: string;
  notaFiscalUrl?: string;
  dataFaturamento?: Date;
  
  // Rastreio
  codigoRastreio?: string;
  transportadoraNome?: string;
}
```

### Interface HistoricoSincronizacao
```typescript
interface HistoricoSincronizacao {
  id: string;
  vendaId: string;
  dataHora: Date;
  statusAnterior: StatusVenda;
  statusNovo: StatusVenda;
  erpStatusAnterior?: TinyERPStatus;
  erpStatusNovo?: TinyERPStatus;
  sucesso: boolean;
  mensagem: string;
  detalhes?: any;
}
```

## 🚀 Como Usar

### 1. Configuração Inicial

```typescript
// Importar serviço
import { tinyERPSyncService } from '../services/tinyERPSync';

// Configurar sincronização
tinyERPSyncService.configurar({
  habilitado: true,
  intervaloMinutos: 15,
  sincronizarAutomaticamente: true,
  notificarAlteracoes: true,
  sincronizarDadosAdicionais: true,
});
```

### 2. Enviar Pedido para o Tiny

```typescript
// Ao criar/aprovar uma venda
const erpPedidoId = await tinyERPSyncService.enviarVendaParaTiny(
  venda,
  tinyToken
);

// Atualizar venda com dados de integração
venda.integracaoERP = {
  erpPedidoId,
  sincronizacaoAutomatica: true,
  tentativasSincronizacao: 0,
};
```

### 3. Sincronização Manual

```typescript
// Sincronizar uma venda específica
const vendaAtualizada = await tinyERPSyncService.sincronizarManual(venda);
```

### 4. Sincronizar Todas as Vendas

```typescript
// Sincronizar todas as vendas ativas
await tinyERPSyncService.sincronizarTodasVendas(vendas);
```

### 5. Receber Webhook

```typescript
// Endpoint para receber webhook do Tiny
app.post('/api/webhooks/tiny', async (req, res) => {
  try {
    await tinyERPSyncService.processarWebhook(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## 📈 Monitoramento

### Estatísticas Disponíveis
- Total de sincronizações realizadas
- Sincronizações bem-sucedidas
- Sincronizações com erro
- Taxa de sucesso (%)
- Data/hora da última sincronização

### Histórico
- Visualização de todas as sincronizações
- Filtro por pedido
- Detalhes de cada alteração
- Mensagens de erro quando aplicável

## ⚙️ Configuração do Webhook no Tiny ERP

### Importante: Configure por Empresa 🏢

Cada empresa deve ter sua própria configuração de webhook no Tiny ERP.

### Passos para Configurar:

1. **Acesse o painel do Tiny ERP da empresa específica**
2. Vá em **Configurações → Integrações → Webhooks**
3. Crie um novo webhook com:
   - **URL:** Use a URL específica da empresa (copie da aba "Webhooks")
     - Exemplo: `https://seu-dominio.com/api/webhooks/tiny/emp-001`
   - **Eventos:** Mudança de situação do pedido
   - **Formato:** JSON
   - **Método:** POST

4. Salve e teste o webhook

### Copiar URL do Webhook

Na aba **"Webhooks"** da configuração de sincronização:
- Cada empresa tem sua URL listada
- Clique no botão de copiar para obter a URL completa
- Cole no campo de webhook do Tiny ERP daquela empresa

## 🔄 Fluxo de Sincronização

```
┌─────────────────────────────────────────────────────────────┐
│                    Criar/Aprovar Venda                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Enviar para Tiny ERP (API)                     │
│              Retorna: erpPedidoId                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Salvar erpPedidoId na venda                         │
│         Habilitar sincronização automática                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
┌───────────────────┐    ┌───────────────────────┐
│  Polling Timer    │    │   Webhook Recebido    │
│  (15 em 15 min)   │    │   (Instantâneo)       │
└─────────┬─────────┘    └───────────┬───────────┘
          │                          │
          └───────────┬──────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│        Consultar Status no Tiny ERP (API)                   │
│        GET /pedido.obter.php?id={erpPedidoId}               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Comparar Status Atual vs Novo                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                ┌────────┴────────┐
                │                 │
                ▼                 ▼
         [Sem Mudança]      [Status Mudou]
                │                 │
                │                 ▼
                │    ┌────────────────────────────┐
                │    │  Atualizar Status          │
                │    │  Registrar no Histórico     │
                │    │  Notificar Usuário         │
                │    └────────────────────────────┘
                │                 │
                └────────┬────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Atualizar dataSincronizacao                    │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Interface de Usuário

### Tela de Configuração
- **Aba Configuração:** Parâmetros de sincronização
- **Aba Histórico:** Log de todas as sincronizações
- **Aba Estatísticas:** Métricas e KPIs

### Indicadores na Listagem de Vendas
- Badge de status sincronizado com o ERP
- Ícone indicando última sincronização
- Tooltip com detalhes da integração

### Botões de Ação
- **Sincronizar Manual:** Força sincronização imediata
- **Ver NF-e:** Quando disponível, link para DANFE
- **Rastrear Pedido:** Link para rastreamento

## 🔒 Segurança

### Validações
- ✅ Token de API do Tiny validado
- ✅ Webhook com assinatura verificável
- ✅ Rate limiting para evitar abuso
- ✅ Logs de todas as requisições

### Tratamento de Erros
- ✅ Retry automático (até 3 tentativas)
- ✅ Backoff exponencial
- ✅ Registro de erros no histórico
- ✅ Alertas para admin em caso de falhas recorrentes

## 📝 Logs e Debug

### Console Logs
```javascript
// Ativar logs detalhados
console.log('Sincronizando venda ${numero}...');
console.log('✅ Status atualizado: ${anterior} → ${novo}');
console.log('❌ Erro ao sincronizar: ${erro}');
```

### Histórico Persistente
- Últimas 1000 sincronizações mantidas
- Exportação em CSV/JSON
- Filtros por período, status, sucesso/erro

## 🚨 Troubleshooting

### Problema: Sincronização não está funcionando
**Solução:**
1. Verificar se está habilitada nas configurações
2. Checar token de API do Tiny
3. Verificar logs de erro no histórico
4. Testar sincronização manual

### Problema: Status não atualiza
**Solução:**
1. Verificar se `sincronizacaoAutomatica` está `true` na venda
2. Confirmar que venda tem `erpPedidoId`
3. Testar consulta manual no Tiny
4. Verificar mapeamento de status

### Problema: Webhook não funciona
**Solução:**
1. Verificar URL configurada no Tiny
2. Testar endpoint com Postman
3. Verificar logs do servidor
4. Confirmar eventos configurados no Tiny

## 📚 API do Tiny ERP

### Endpoints Utilizados

#### Criar Pedido
```
POST /api2/pedido.incluir.php
Parameters:
  - token: string
  - formato: 'json'
  - pedido: XML com dados do pedido
```

#### Consultar Pedido
```
GET /api2/pedido.obter.php
Parameters:
  - token: string
  - formato: 'json'
  - id: string (erpPedidoId)
```

#### Listar Pedidos
```
GET /api2/pedidos.pesquisa.php
Parameters:
  - token: string
  - formato: 'json'
  - dataInicio: string (opcional)
  - dataFim: string (opcional)
```

### Documentação Oficial
https://tiny.com.br/api-docs

## 🎯 Próximos Passos

### Fase 1 - Melhorias Básicas ✅
- [x] Sincronização automática de status
- [x] Mapeamento de status
- [x] Histórico de sincronizações
- [x] Interface de configuração
- [x] Notificações de mudança

### Fase 2 - Dados Adicionais ✅
- [x] Sincronizar NF-e
- [x] Sincronizar código de rastreio
- [x] Sincronizar transportadora

### Fase 3 - Avançado 🚧
- [ ] Sincronização bidirecional (status do app → Tiny)
- [ ] Sincronização de estoque
- [ ] Sincronização de produtos
- [ ] Webhook robusto com assinatura
- [ ] Dashboard de integrações
- [ ] Alertas inteligentes (ex: pedido parado há X dias)

### Fase 4 - Otimizações 📋
- [ ] Cache de consultas
- [ ] Batch processing para múltiplas vendas
- [ ] Fila de sincronização com prioridade
- [ ] Sincronização diferencial (apenas mudanças)
- [ ] Compressão de payloads

## 💡 Dicas de Uso

1. **Use webhook sempre que possível** - É mais eficiente que polling
2. **Configure intervalo adequado** - 15-30 min para não sobrecarregar API
3. **Monitore as estatísticas** - Taxa de sucesso deve estar >95%
4. **Revise o histórico periodicamente** - Identificar padrões de erro
5. **Teste antes de produção** - Use ambiente de homologação do Tiny

## 🤝 Suporte

Para dúvidas sobre:
- **Sistema de sincronização:** Ver histórico e logs
- **API do Tiny ERP:** https://tiny.com.br/suporte
- **Configuração de webhook:** Documentação do Tiny

---

**Última atualização:** Novembro 2025  
**Versão:** 1.0.0

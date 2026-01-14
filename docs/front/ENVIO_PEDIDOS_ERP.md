# 📤 Envio de Pedidos ao ERP - Documentação Completa

## 📋 Resumo Executivo

**SITUAÇÃO ATUAL:** O sistema **NÃO possui envio automático** de pedidos ao ERP integrado. O envio é **manual** e deve ser feito explicitamente.

---

## 🔍 Análise do Sistema Atual

### ✅ O que está implementado:

1. **Sincronização de STATUS** (ERP → Sistema)
   - ✅ Sincronização automática de status de pedidos já enviados
   - ✅ Polling configurável (5-120 minutos)
   - ✅ Webhook para atualizações em tempo real
   - ✅ Atualização de NF-e, rastreio, transportadora

2. **Função de Envio Manual**
   - ✅ `tinyERPSyncService.enviarVendaParaTiny(venda, token)`
   - ✅ Retorna `erpPedidoId` quando bem-sucedido
   - ✅ Tratamento de erros e toast notifications

3. **Configurações de Preferências**
   - ✅ Controle de transmissão da OC nas observações
   - ✅ Configuração por empresa (multiempresas)
   - ✅ Tokens de API individuais

### ❌ O que NÃO está implementado:

1. **Envio Automático de Pedidos**
   - ❌ Não há trigger automático quando pedido é criado
   - ❌ Não há trigger automático quando status muda
   - ❌ Não há fila de envio automático
   - ❌ Não há configuração para ativar/desativar envio automático

---

## 🎯 Como o Sistema Funciona Atualmente

### Fluxo Atual (Manual)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Vendedor cria pedido no sistema                         │
│    - Seleciona cliente, produtos, condições                │
│    - Status inicial: "Rascunho"                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Pedido salvo no sistema                                  │
│    - Número do pedido gerado                                │
│    - integracaoERP: undefined (ainda não enviado)           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AÇÃO MANUAL NECESSÁRIA                                   │
│    - Usuário precisa clicar em "Enviar para ERP"            │
│    - Ou usar botão/API específico para envio                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Envio ao ERP (quando ação manual executada)              │
│    erpPedidoId = enviarVendaParaTiny(venda, token)          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Atualizar venda com dados de integração                  │
│    venda.integracaoERP = {                                  │
│      erpPedidoId: "tiny-123456",                            │
│      sincronizacaoAutomatica: true                          │
│    }                                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. A partir daqui: Sincronização automática ATIVA           │
│    - Polling de status (15 em 15 min)                       │
│    - Webhook de atualizações                                │
│    - Atualização de NF-e, rastreio, etc.                    │
└─────────────────────────────────────────────────────────────┘
```

### Condições para Sincronização Automática de Status

**Apenas pedidos que JÁ FORAM enviados ao ERP são sincronizados:**

```typescript
// Filtro aplicado na sincronização
const vendasParaSincronizar = vendas.filter(
  v => v.integracaoERP?.sincronizacaoAutomatica &&   // ✅ Flag ativada
       v.integracaoERP?.erpPedidoId &&               // ✅ Tem ID do ERP
       v.status !== 'Rascunho' &&                    // ✅ Não é rascunho
       v.status !== 'Cancelado'                      // ✅ Não está cancelado
);
```

**Ou seja:**
- ❌ Pedido sem `erpPedidoId` → **NÃO sincroniza**
- ❌ Pedido em "Rascunho" → **NÃO sincroniza**
- ❌ Pedido cancelado → **NÃO sincroniza**
- ✅ Pedido com `erpPedidoId` e status ativo → **Sincroniza automaticamente**

---

## 🚀 Como Implementar Envio Automático

### Opção 1: Envio Automático ao Salvar Pedido

**Trigger:** Quando vendedor salva o pedido (sai de "Rascunho")

```typescript
// Em SaleFormPage.tsx ou similar
const handleSalvarPedido = async () => {
  // 1. Salvar pedido normalmente
  const pedidoSalvo = await salvarVenda(formData);
  
  // 2. Se configurado para envio automático E pedido não é rascunho
  const config = await buscarConfigERP(formData.empresaFaturamentoId);
  
  if (config.envioAutomatico && formData.status !== 'Rascunho') {
    try {
      // 3. Enviar para o ERP
      const erpPedidoId = await tinyERPSyncService.enviarVendaParaTiny(
        pedidoSalvo,
        config.apiToken
      );
      
      // 4. Atualizar venda com dados de integração
      pedidoSalvo.integracaoERP = {
        erpPedidoId,
        sincronizacaoAutomatica: true,
        tentativasSincronizacao: 0,
      };
      
      await atualizarVenda(pedidoSalvo);
      
      toast.success('Pedido salvo e enviado ao ERP!');
    } catch (error) {
      toast.error('Pedido salvo, mas falha ao enviar ao ERP. Tente novamente.');
      console.error(error);
    }
  } else {
    toast.success('Pedido salvo!');
  }
};
```

### Opção 2: Envio Automático por Mudança de Status

**Trigger:** Quando pedido muda de status específico (ex: "Em Análise" → "Aprovado")

```typescript
// Configurar status que disparam envio
const STATUS_QUE_ENVIAM_ERP = ['Aprovado', 'Em Análise'];

const handleMudarStatus = async (vendaId: string, novoStatus: StatusVenda) => {
  // 1. Atualizar status
  const venda = await buscarVenda(vendaId);
  venda.status = novoStatus;
  await atualizarVenda(venda);
  
  // 2. Se status deve enviar E ainda não foi enviado
  if (STATUS_QUE_ENVIAM_ERP.includes(novoStatus) && !venda.integracaoERP?.erpPedidoId) {
    const config = await buscarConfigERP(venda.empresaFaturamentoId);
    
    if (config.envioAutomaticoAoAprovar) {
      try {
        const erpPedidoId = await tinyERPSyncService.enviarVendaParaTiny(
          venda,
          config.apiToken
        );
        
        venda.integracaoERP = {
          erpPedidoId,
          sincronizacaoAutomatica: true,
          tentativasSincronizacao: 0,
        };
        
        await atualizarVenda(venda);
        toast.success(`Pedido ${novoStatus} e enviado ao ERP!`);
      } catch (error) {
        toast.error(`Status atualizado, mas falha ao enviar ao ERP.`);
      }
    }
  }
};
```

### Opção 3: Fila de Envio em Background

**Trigger:** Adicionar pedidos a uma fila que processa em lote

```typescript
class FilaEnvioERP {
  private fila: Venda[] = [];
  private processando = false;
  
  // Adicionar pedido à fila
  adicionar(venda: Venda) {
    if (!venda.integracaoERP?.erpPedidoId) {
      this.fila.push(venda);
      toast.info('Pedido adicionado à fila de envio ao ERP');
      
      // Processar se não estiver processando
      if (!this.processando) {
        this.processar();
      }
    }
  }
  
  // Processar fila em lote
  async processar() {
    this.processando = true;
    
    while (this.fila.length > 0) {
      const venda = this.fila.shift()!;
      
      try {
        const config = await buscarConfigERP(venda.empresaFaturamentoId);
        
        const erpPedidoId = await tinyERPSyncService.enviarVendaParaTiny(
          venda,
          config.apiToken
        );
        
        venda.integracaoERP = {
          erpPedidoId,
          sincronizacaoAutomatica: true,
          tentativasSincronizacao: 0,
        };
        
        await atualizarVenda(venda);
        toast.success(`Pedido ${venda.numero} enviado ao ERP!`);
        
        // Aguardar 2s entre envios (evitar rate limit)
        await new Promise(r => setTimeout(r, 2000));
        
      } catch (error) {
        console.error(`Erro ao enviar pedido ${venda.numero}:`, error);
        // Retentar depois ou adicionar à fila de erros
      }
    }
    
    this.processando = false;
  }
  
  // Obter status da fila
  obterStatus() {
    return {
      tamanho: this.fila.length,
      processando: this.processando,
    };
  }
}

export const filaEnvioERP = new FilaEnvioERP();
```

---

## ⚙️ Configurações Necessárias para Envio Automático

### 1. Adicionar Configuração de Envio Automático

```typescript
// Em types/company.ts ou similar
interface ConfiguracaoERPEmpresa {
  // ... configurações existentes ...
  
  // NOVO: Configurações de envio automático
  envioAutomatico: {
    habilitado: boolean;                    // Ativar/desativar envio automático
    trigger: 'criar' | 'aprovar' | 'manual'; // Quando enviar
    statusGatilho?: StatusVenda[];          // Status que disparam envio
    tentativasMaximas: number;              // Quantas vezes retentar em caso de erro
    intervaloRetentativa: number;           // Minutos entre retentativas
  };
}
```

### 2. Interface de Configuração

```typescript
// Em ERPIntegrationUnified.tsx ou similar

<Card>
  <CardHeader>
    <CardTitle>Envio Automático de Pedidos</CardTitle>
    <CardDescription>
      Configure quando os pedidos devem ser enviados automaticamente ao ERP
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="space-y-0.5">
        <Label className="text-sm">Ativar Envio Automático</Label>
        <p className="text-xs text-muted-foreground">
          Envia pedidos ao ERP sem necessidade de ação manual
        </p>
      </div>
      <Switch
        checked={envioAutomatico}
        onCheckedChange={setEnvioAutomatico}
      />
    </div>

    {envioAutomatico && (
      <>
        <div className="space-y-2">
          <Label>Quando enviar?</Label>
          <Select value={trigger} onValueChange={setTrigger}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="criar">Ao criar pedido (sair de rascunho)</SelectItem>
              <SelectItem value="aprovar">Ao aprovar pedido</SelectItem>
              <SelectItem value="manual">Apenas manualmente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {trigger === 'aprovar' && (
          <div className="space-y-2">
            <Label>Status que disparam envio</Label>
            <div className="grid grid-cols-2 gap-2">
              {['Em Análise', 'Aprovado', 'Em Separação'].map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={status}
                    checked={statusGatilho.includes(status)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setStatusGatilho([...statusGatilho, status]);
                      } else {
                        setStatusGatilho(statusGatilho.filter(s => s !== status));
                      }
                    }}
                  />
                  <Label htmlFor={status} className="text-sm">{status}</Label>
                </div>
              ))}
            </div>
          </div>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            {trigger === 'criar' && 
              'Pedidos serão enviados automaticamente ao ERP assim que salvos (exceto rascunhos).'
            }
            {trigger === 'aprovar' && 
              'Pedidos serão enviados automaticamente ao ERP quando mudarem para os status selecionados.'
            }
            {trigger === 'manual' && 
              'Pedidos só serão enviados quando você clicar em "Enviar para ERP".'
            }
          </AlertDescription>
        </Alert>
      </>
    )}
  </CardContent>
</Card>
```

---

## 📊 Comparação: Manual vs Automático

| Aspecto | Envio Manual (Atual) | Envio Automático (Proposto) |
|---------|---------------------|----------------------------|
| **Quando envia** | Quando usuário clicar | Configurável (criar/aprovar/status) |
| **Intervenção** | Sempre necessária | Opcional |
| **Esquecimento** | Risco alto | Risco baixo |
| **Controle** | Total | Configurável |
| **Adequado para** | Processos com revisão | Processos padronizados |
| **Performance** | 1 pedido por vez | Lote/fila |
| **Erros** | Visível imediatamente | Necessita monitoramento |

---

## 🎯 Recomendações

### Para Diferentes Cenários de Negócio:

#### 1. **Vendas B2B com Aprovação**
```
Configuração Recomendada:
  ✅ Envio Automático: ATIVADO
  ✅ Trigger: Ao aprovar pedido
  ✅ Status gatilho: "Aprovado"
  
Justificativa:
  - Pedidos passam por revisão antes de enviar
  - Automatiza após aprovação
  - Reduz trabalho manual
```

#### 2. **Vendas B2C Diretas**
```
Configuração Recomendada:
  ✅ Envio Automático: ATIVADO
  ✅ Trigger: Ao criar pedido
  ✅ Status gatilho: N/A
  
Justificativa:
  - Pedidos não precisam aprovação
  - Envio imediato ao ERP
  - Integração em tempo real
```

#### 3. **Vendas Complexas/Customizadas**
```
Configuração Recomendada:
  ❌ Envio Automático: DESATIVADO
  ✅ Trigger: Manual
  
Justificativa:
  - Pedidos precisam revisão detalhada
  - Podem ter negociações após criação
  - Controle total sobre quando enviar
```

#### 4. **Sistema Multiempresas (Misto)**
```
Configuração por Empresa:
  - Empresa A (B2B): Envio ao aprovar
  - Empresa B (B2C): Envio ao criar
  - Empresa C (Projetos): Manual
  
Justificativa:
  - Cada empresa tem seu processo
  - Configuração individualizada
  - Flexibilidade máxima
```

---

## 🔧 Checklist de Implementação

### Fase 1: Planejamento
- [ ] Definir quais triggers serão suportados
- [ ] Definir configurações necessárias
- [ ] Mapear casos de erro e retry
- [ ] Documentar fluxos

### Fase 2: Backend
- [ ] Adicionar campo `envioAutomatico` na configuração ERP
- [ ] Implementar lógica de trigger (criar/aprovar/status)
- [ ] Implementar fila de envio (opcional)
- [ ] Implementar retry com backoff exponencial
- [ ] Adicionar logs de auditoria

### Fase 3: Frontend
- [ ] Criar interface de configuração de envio automático
- [ ] Adicionar switches e selects para configurar triggers
- [ ] Exibir status de fila de envio (se aplicável)
- [ ] Implementar botão "Reenviar" para pedidos com erro
- [ ] Adicionar indicadores visuais (enviado/pendente/erro)

### Fase 4: Monitoramento
- [ ] Dashboard de pedidos pendentes de envio
- [ ] Alertas para erros recorrentes
- [ ] Estatísticas de envio (sucesso/erro/tempo médio)
- [ ] Log de auditoria de envios

### Fase 5: Testes
- [ ] Testar envio automático ao criar
- [ ] Testar envio automático ao aprovar
- [ ] Testar retry em caso de erro
- [ ] Testar com múltiplas empresas
- [ ] Testar fila de envio em lote

---

## 📝 Observações Importantes

### 1. Diferença entre Envio e Sincronização

**ENVIO (Sistema → ERP):**
- Criar pedido no ERP
- Acontece UMA VEZ por pedido
- Gera o `erpPedidoId`
- Pode ser manual ou automático (precisa implementar)

**SINCRONIZAÇÃO (ERP → Sistema):**
- Atualizar status, NF-e, rastreio
- Acontece PERIODICAMENTE
- Requer `erpPedidoId` existente
- JÁ está implementado e automático

### 2. Status Inicial do Pedido no ERP

Quando enviado ao Tiny ERP, o pedido geralmente inicia como:
- `aberto` = "Em Análise" (no sistema)

O ERP então muda o status conforme o processo:
- `aberto` → `aprovado` → `preparando_envio` → `faturado` → `enviado`

### 3. Tratamento de Erros

Erros comuns ao enviar:
- Token de API inválido
- Dados obrigatórios faltando
- Produto não cadastrado no ERP
- Cliente não cadastrado no ERP
- Rate limit da API

**Solução:**
- Implementar retry com backoff
- Fila de pedidos com erro
- Interface para corrigir e reenviar
- Notificações para o administrador

---

## 🚀 Próximos Passos Sugeridos

### Curto Prazo (Imediato)
1. ✅ Documentar situação atual (este documento)
2. ⬜ Decidir se envio automático é necessário
3. ⬜ Definir qual trigger usar (criar/aprovar/status)
4. ⬜ Criar interface de configuração

### Médio Prazo (1-2 semanas)
1. ⬜ Implementar lógica de envio automático
2. ⬜ Adicionar configuração por empresa
3. ⬜ Implementar retry e tratamento de erros
4. ⬜ Testes com ambiente de homologação

### Longo Prazo (1 mês+)
1. ⬜ Implementar fila de envio em background
2. ⬜ Dashboard de monitoramento
3. ⬜ Sincronização bidirecional completa
4. ⬜ Integração com outros ERPs (TOTVS, SAP, etc)

---

## 📞 Perguntas para Decisão

Antes de implementar, definir:

1. **Quando enviar pedidos ao ERP?**
   - [ ] Ao criar pedido (sair de rascunho)
   - [ ] Ao aprovar pedido
   - [ ] Ao mudar para status específico
   - [ ] Apenas manualmente
   - [ ] Misto (configurável por empresa)

2. **Como tratar erros?**
   - [ ] Retry automático (quantas vezes?)
   - [ ] Alertar usuário
   - [ ] Fila de pendentes
   - [ ] Envio manual após erro

3. **Deve ser configurável?**
   - [ ] Sim, por empresa
   - [ ] Sim, global
   - [ ] Não, sempre automático
   - [ ] Não, sempre manual

4. **Performance:**
   - [ ] Envio síncrono (espera resposta)
   - [ ] Envio assíncrono (fila em background)
   - [ ] Lote (vários pedidos de uma vez)

---

**Última atualização:** Novembro 2025  
**Status:** ⚠️ Envio automático NÃO implementado - Apenas sincronização de status está ativa  
**Autor:** Documentação Técnica

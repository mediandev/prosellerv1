# 💳 Formas de Pagamento - Sistema de Configuração

## ✅ Implementação Concluída

Novo sistema centralizado de **Formas de Pagamento** que serve como base para dois módulos principais do sistema: **Conta Corrente** (investimentos/ressarcimentos) e **Condições de Pagamento** (vendas).

---

## 📍 Localização

**Caminho no Sistema:**
```
Configurações → Aba: Formas de Pagamento
```

**Estrutura de Navegação:**
```
┌─ Configurações
   ├─ Aba: Naturezas de Operação
   ├─ Aba: Segmentos de Cliente
   ├─ 💳 Aba: Formas de Pagamento (NOVO)
   ├─ Aba: Integração ERP
   ├─ Aba: Testes de API
   └─ Aba: Automação
```

---

## 🎯 Objetivo

Centralizar o cadastro de formas de pagamento em um único local, permitindo controlar onde cada forma será utilizada:

1. **Conta Corrente:** Pagamentos de investimentos e ressarcimentos aos clientes
2. **Condições de Pagamento:** Condições comerciais nas vendas

---

## 📋 Estrutura de Dados

### **Campos da Forma de Pagamento:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| **ID** | string | Identificador único |
| **Nome** | string | Nome da forma de pagamento (ex: PIX, Boleto) |
| **Descrição** | string | Descrição detalhada |
| **Ativo** | boolean | Se está ativa no sistema |
| **Usar em Conta Corrente** | boolean | Disponível para pagamentos de investimentos/ressarcimentos |
| **Usar em Condições de Pagamento** | boolean | Disponível para condições comerciais de vendas |
| **Data Criação** | datetime | Data de cadastro |
| **Data Atualização** | datetime | Última atualização |

---

## 🎨 Interface de Cadastro

### **Dialog "Nova Forma de Pagamento":**

```
┌─────────────────────────────────────────────────┐
│ Adicionar Forma de Pagamento                    │
├─────────────────────────────────────────────────┤
│                                                  │
│ Nome da Forma de Pagamento *                    │
│ ┌─────────────────────────────────────────┐    │
│ │ Ex: PIX, Cartão de Crédito, Boleto...   │    │
│ └─────────────────────────────────────────┘    │
│                                                  │
│ Descrição                                        │
│ ┌─────────────────────────────────────────┐    │
│ │ Breve descrição da forma de pagamento   │    │
│ └─────────────────────────────────────────┘    │
│                                                  │
│ ─────────────────────────────────────────       │
│                                                  │
│ Usar esta forma de pagamento em:                │
│                                                  │
│ ┌───────────────────────────────────────┐      │
│ │ Conta Corrente                  [ ON ]│      │
│ │ Pagamentos de investimentos e         │      │
│ │ ressarcimentos                         │      │
│ └───────────────────────────────────────┘      │
│                                                  │
│ ┌───────────────────────────────────────┐      │
│ │ Condições de Pagamento         [ ON ]│      │
│ │ Condições comerciais de vendas        │      │
│ └───────────────────────────────────────┘      │
│                                                  │
│                     [Cancelar]  [Salvar]        │
└─────────────────────────────────────────────────┘
```

---

## 📊 Tabela de Formas de Pagamento

### **Colunas:**

| Nome | Descrição | Conta Corrente | Condições Pagto | Status | Ações |
|------|-----------|----------------|-----------------|--------|-------|
| PIX | Pagamento instantâneo | ✅ | ✅ | Ativo | 🗑️ |
| Abatimento em Boleto | Desconto aplicado em boleto | ✅ | ❌ | Ativo | 🗑️ |
| Transferência Bancária | TED/PIX para conta do cliente | ✅ | ✅ | Ativo | 🗑️ |
| Cartão de Crédito | Pagamento via cartão de crédito | ❌ | ✅ | Ativo | 🗑️ |

### **Legenda:**

- ✅ **CheckCircle (Verde):** Disponível neste contexto
- ❌ **XCircle (Cinza):** Não disponível neste contexto
- **Badge Ativo/Inativo:** Clicável para alternar status

---

## 💼 Formas de Pagamento Pré-cadastradas

### **1. Abatimento em Boleto**
- **Descrição:** Desconto aplicado em boleto a receber do cliente
- **Conta Corrente:** ✅ Sim
- **Condições Pagamento:** ❌ Não
- **Uso típico:** Compensar investimento/ressarcimento diretamente no boleto

---

### **2. Pagamento via Boleto**
- **Descrição:** Empresa emite boleto para pagamento ao cliente
- **Conta Corrente:** ✅ Sim
- **Condições Pagamento:** ❌ Não
- **Uso típico:** Cliente recebe valor através de boleto bancário

---

### **3. Transferência Bancária**
- **Descrição:** Transferência via TED/PIX para conta do cliente
- **Conta Corrente:** ✅ Sim
- **Condições Pagamento:** ✅ Sim
- **Uso típico:** Pagamento direto para conta do cliente / Recebimento de vendas

---

### **4. Dinheiro**
- **Descrição:** Pagamento em espécie
- **Conta Corrente:** ❌ Não
- **Condições Pagamento:** ✅ Sim
- **Uso típico:** Vendas à vista em dinheiro

---

### **5. Cartão de Crédito**
- **Descrição:** Pagamento via cartão de crédito
- **Conta Corrente:** ❌ Não
- **Condições Pagamento:** ✅ Sim
- **Uso típico:** Vendas parceladas no cartão

---

### **6. Cartão de Débito**
- **Descrição:** Pagamento via cartão de débito
- **Conta Corrente:** ❌ Não
- **Condições Pagamento:** ✅ Sim
- **Uso típico:** Vendas à vista no débito

---

### **7. PIX**
- **Descrição:** Pagamento instantâneo via PIX
- **Conta Corrente:** ✅ Sim
- **Condições Pagamento:** ✅ Sim
- **Uso típico:** Pagamentos rápidos (ambos os contextos)

---

### **8. Cheque**
- **Descrição:** Pagamento via cheque
- **Conta Corrente:** ❌ Não
- **Condições Pagamento:** ✅ Sim
- **Uso típico:** Vendas a prazo

---

### **9. Depósito Bancário**
- **Descrição:** Depósito em conta corrente
- **Conta Corrente:** ✅ Sim
- **Condições Pagamento:** ✅ Sim
- **Uso típico:** Depósito direto em conta

---

### **10. Crédito em Conta**
- **Descrição:** Crédito direto na conta corrente do cliente
- **Conta Corrente:** ✅ Sim
- **Condições Pagamento:** ❌ Não
- **Uso típico:** Compensação via crédito contábil

---

## 🔄 Integração com Conta Corrente

### **Como Funciona:**

1. **Filtro Automático:** Apenas formas de pagamento com `usarEmContaCorrente = true` e `ativo = true` aparecem

2. **Localização:** Dialog "Registrar Pagamento" na aba Conta Corrente

3. **Dropdown Dinâmico:**
```tsx
<Select>
  <SelectContent>
    {formasPagamentoDisponiveis.map((forma) => (
      <SelectItem value={forma.nome}>
        {forma.nome}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

4. **Validação:** Se não houver formas de pagamento disponíveis, exibe mensagem orientando a configurar

---

## 🔄 Integração com Condições de Pagamento

### **Como Funciona:**

1. **Filtro Automático:** Apenas formas de pagamento com `usarEmCondicoesPagamento = true` e `ativo = true` aparecem

2. **Localização:** Cadastro de condições de pagamento comercial (a ser implementado)

3. **Uso Futuro:** Base para cadastro de condições como "30/60/90 dias", "À vista com desconto", etc.

---

## ✨ Funcionalidades Implementadas

### **1. Cadastro de Nova Forma**

✅ **Campos obrigatórios e opcionais validados**
✅ **Switches independentes para cada contexto**
✅ **Feedback visual com toast de sucesso**
✅ **Dialog fecha automaticamente após salvar**

---

### **2. Listagem Completa**

✅ **Tabela com todas as formas cadastradas**
✅ **Ícones visuais (✅/❌) para cada contexto**
✅ **Badge de status clicável**
✅ **Contador de formas totais e ativas**

---

### **3. Ativar/Desativar**

✅ **Clique no badge de status para alternar**
✅ **Formas inativas ficam opacas na tabela**
✅ **Não aparecem nos dropdowns dos módulos**
✅ **Data de atualização registrada**

---

### **4. Exclusão**

✅ **Botão de deletar com ícone de lixeira**
✅ **Toast confirmando exclusão**
✅ **Remove da listagem imediatamente**

---

## 🎯 Casos de Uso

### **Caso 1: Empresa Só Usa PIX e Transferência**

**Cenário:**
- Empresa moderna, 100% digital
- Não aceita cheque, cartão ou dinheiro
- Quer simplificar opções

**Ação:**
1. Desativar todas as formas exceto PIX e Transferência Bancária
2. Formas desativadas somem dos dropdowns
3. Interface fica mais limpa

---

### **Caso 2: Nova Forma de Pagamento Customizada**

**Cenário:**
- Empresa criou programa de "Vale-Compra"
- Clientes podem usar vale nas compras
- Precisa registrar como forma de pagamento

**Ação:**
1. Clicar em "Nova Forma de Pagamento"
2. Nome: "Vale-Compra"
3. Descrição: "Programa de vale-compra da empresa"
4. Marcar apenas "Condições de Pagamento"
5. Salvar

**Resultado:**
- Vale-Compra aparece nas condições comerciais
- Não aparece na conta corrente
- Totalmente customizado

---

### **Caso 3: Separação de Contextos**

**Cenário:**
- "Abatimento em Boleto" só faz sentido em conta corrente
- Não é forma de venda ao cliente
- Precisa estar visível apenas no contexto correto

**Configuração:**
- Marcar apenas "Conta Corrente"
- Desmarcar "Condições de Pagamento"

**Resultado:**
- Aparece em: Registro de pagamentos de investimentos
- Não aparece em: Cadastro de condições comerciais

---

## 🔧 Detalhes Técnicos

### **Arquivos Criados/Modificados:**

```
📁 /types/formaPagamento.ts (NOVO)
   - Interface FormaPagamento
   - Interface NovaFormaPagamento

📁 /data/mockFormasPagamento.ts (NOVO)
   - 10 formas de pagamento pré-cadastradas
   - Configurações de contexto definidas

📁 /components/SettingsPage.tsx (MODIFICADO)
   - Nova aba "Formas de Pagamento"
   - Estado e handlers para gerenciar formas
   - Dialog de cadastro
   - Tabela de listagem

📁 /components/CustomerFormContaCorrente.tsx (MODIFICADO)
   - Import das formas de pagamento
   - Filtro dinâmico (ativas + conta corrente)
   - Select populado dinamicamente

📁 /types/contaCorrente.ts (MODIFICADO)
   - Removido enum FormaPagamento
   - Campo formaPagamento agora é string
```

---

### **Estrutura TypeScript:**

```typescript
export interface FormaPagamento {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  usarEmContaCorrente: boolean;
  usarEmCondicoesPagamento: boolean;
  dataCriacao: string;
  dataAtualizacao: string;
}
```

---

### **Filtro para Conta Corrente:**

```typescript
const formasPagamentoDisponiveis = useMemo(() => {
  return formasPagamentoMock.filter(
    f => f.ativo && f.usarEmContaCorrente
  );
}, []);
```

---

### **Filtro para Condições de Pagamento (futuro):**

```typescript
const formasPagamentoDisponiveis = useMemo(() => {
  return formasPagamentoMock.filter(
    f => f.ativo && f.usarEmCondicoesPagamento
  );
}, []);
```

---

## 📱 Responsividade

### **Desktop:**
- Tabela completa com todas as colunas
- Dialog centralizado
- Grid de switches lado a lado

### **Tablet:**
- Tabela com scroll horizontal se necessário
- Dialog responsivo
- Switches mantêm layout

### **Mobile:**
- Tabela simplificada ou em cards
- Dialog full-screen
- Switches em coluna

---

## 🔐 Validações

### **Cadastro:**

- ✅ Nome é obrigatório
- ✅ Ao menos um contexto deve ser marcado (conta corrente OU condições pagamento)
- ✅ Não permitir duplicatas de nome (a implementar no backend)

### **Exclusão:**

- ⚠️ Verificar se forma está em uso antes de deletar (a implementar)
- ⚠️ Opção: Inativar ao invés de deletar se estiver em uso

### **Status:**

- ✅ Formas inativas não aparecem em dropdowns
- ✅ Formas podem ser reativadas a qualquer momento

---

## 🚀 Melhorias Futuras

### **Curto Prazo:**

1. **Validação de Uso:**
   - Antes de deletar, verificar se forma está sendo usada
   - Sugerir inativar ao invés de deletar
   - Mostrar onde está sendo usada

2. **Ordenação:**
   - Permitir reordenar formas (drag & drop)
   - Ordem personalizada nos dropdowns
   - Salvar preferência do usuário

3. **Ícones Personalizados:**
   - Adicionar ícone para cada forma (💳 💰 📱)
   - Melhor identificação visual
   - Biblioteca de ícones pré-definida

---

### **Médio Prazo:**

4. **Configurações Avançadas:**
   - Taxa de processamento por forma
   - Prazo de compensação
   - Limite mínimo/máximo por forma
   - Campos customizados por forma

5. **Integração com ERP:**
   - Mapear formas locais com formas do ERP
   - Sincronização bidirecional
   - Validação de compatibilidade

6. **Relatórios:**
   - Uso por forma de pagamento
   - Mais populares
   - Tendências ao longo do tempo

---

### **Longo Prazo:**

7. **Regras de Negócio:**
   - Forma disponível apenas para certos clientes
   - Forma disponível apenas acima de X valor
   - Forma disponível apenas em certos dias/horários

8. **Machine Learning:**
   - Sugerir forma de pagamento baseado em histórico
   - Alertar sobre formas com alta taxa de problema
   - Otimizar mix de formas

9. **Marketplace de Formas:**
   - Integração com gateways de pagamento
   - Novas formas via marketplace
   - Ativação plug-and-play

---

## 📖 API Endpoints (Futuros)

```typescript
// Formas de Pagamento
GET    /api/formas-pagamento
POST   /api/formas-pagamento
PUT    /api/formas-pagamento/{id}
DELETE /api/formas-pagamento/{id}
PATCH  /api/formas-pagamento/{id}/ativar
PATCH  /api/formas-pagamento/{id}/desativar

// Filtros
GET    /api/formas-pagamento?contexto=conta-corrente
GET    /api/formas-pagamento?contexto=condicoes-pagamento
GET    /api/formas-pagamento?ativo=true
```

---

## 🗄️ Estrutura de Dados Backend

```sql
CREATE TABLE formas_pagamento (
  id UUID PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  usar_em_conta_corrente BOOLEAN DEFAULT true,
  usar_em_condicoes_pagamento BOOLEAN DEFAULT true,
  ordem_exibicao INT DEFAULT 0,
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  criado_por UUID,
  atualizado_por UUID
);

-- Índices
CREATE INDEX idx_formas_ativas ON formas_pagamento(ativo);
CREATE INDEX idx_formas_conta_corrente ON formas_pagamento(usar_em_conta_corrente);
CREATE INDEX idx_formas_condicoes ON formas_pagamento(usar_em_condicoes_pagamento);
```

---

## 🎓 Guia de Uso

### **Como Cadastrar Nova Forma:**

1. Ir em Configurações
2. Clicar na aba "Formas de Pagamento"
3. Clicar em "Nova Forma de Pagamento"
4. Preencher nome (obrigatório) e descrição (opcional)
5. Marcar os contextos onde será usada
6. Clicar em "Salvar"

---

### **Como Desativar Temporariamente:**

1. Na tabela, localizar a forma de pagamento
2. Clicar no badge "Ativo" na coluna Status
3. Status muda para "Inativo" automaticamente
4. Forma some dos dropdowns mas continua no cadastro

---

### **Como Reativar:**

1. Na tabela, localizar a forma inativa (linha opaca)
2. Clicar no badge "Inativo"
3. Status volta para "Ativo"
4. Forma volta a aparecer nos dropdowns

---

### **Como Excluir:**

1. Na tabela, localizar a forma de pagamento
2. Clicar no ícone de lixeira (🗑️)
3. Forma é removida da lista
4. Toast confirma a exclusão

⚠️ **Atenção:** Não é possível desfazer a exclusão. Se a forma estiver em uso, considere inativar ao invés de excluir.

---

## ✅ Checklist de Implementação

- [x] Tipo TypeScript criado
- [x] Mock data com 10 formas pré-cadastradas
- [x] Aba no SettingsPage
- [x] Dialog de cadastro
- [x] Tabela de listagem
- [x] Switches de contexto
- [x] Badge de status clicável
- [x] Exclusão de formas
- [x] Integração com Conta Corrente
- [x] Filtro dinâmico por contexto
- [x] Validações básicas
- [x] Toasts de feedback
- [x] Documentação completa
- [ ] Integração com Condições de Pagamento (futuro)
- [ ] Backend/API (futuro)
- [ ] Validação de uso antes de deletar (futuro)

---

## 🌟 Benefícios do Sistema

### **Para Administradores:**

✅ **Controle Total:** Gerenciar todas as formas em um único lugar  
✅ **Flexibilidade:** Ativar/desativar conforme necessidade  
✅ **Organização:** Separação clara de contextos  
✅ **Customização:** Criar formas específicas da empresa  

---

### **Para Usuários Finais:**

✅ **Simplicidade:** Apenas opções relevantes nos dropdowns  
✅ **Consistência:** Mesmas formas em todo o sistema  
✅ **Clareza:** Descrições ajudam a escolher corretamente  

---

### **Para o Sistema:**

✅ **Manutenibilidade:** Fonte única de verdade  
✅ **Escalabilidade:** Fácil adicionar novas formas  
✅ **Integração:** Base para múltiplos módulos  

---

**Data de Implementação:** 27/10/2025  
**Versão:** 1.0  
**Status:** ✅ Implementado e Funcional

---

## 📞 Suporte

Para dúvidas sobre Formas de Pagamento:
- Consulte esta documentação
- Acesse Configurações → Formas de Pagamento
- Entre em contato com a equipe de desenvolvimento

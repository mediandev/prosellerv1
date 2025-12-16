# Diagnóstico: Dashboard Desconectado dos Dados Reais

**Data:** 16/11/2025  
**Componentes Analisados:**
- `/components/DashboardMetrics.tsx` (Dashboard)
- `/components/SalesPage.tsx` (Tela de Vendas)
- `/components/mockTransactions.ts` (Dados mockados)
**Status:** 🔴 PROBLEMA CRÍTICO IDENTIFICADO

---

## Problema Relatado

O usuário identificou que:
1. **Dashboard** mostra R$ 0,0k em vendas totais
2. **Tela de Vendas** mostra R$ 1,0k em vendas (1 transação real)
3. **Tela de Clientes** tem 40 clientes cadastrados (30 ativos, 10 inativos)
4. Os dados não refletem a realidade entre as telas

---

## Causa Raiz Identificada

### 🚨 Dashboard Usa Dados MOCKADOS, Não Dados Reais

#### 1. Dashboard (DashboardMetrics.tsx)

**Linha 13-21:**
```typescript
import { 
  transactions7Days, 
  transactions30Days, 
  transactionsPrevious7Days, 
  transactionsPrevious30Days,
  calculateMetricsWithComparison, 
  Transaction,
  VENDEDOR_TO_USER_ID
} from "./mockTransactions";
```

**O que acontece:**
- Dashboard importa dados MOCKADOS do arquivo `mockTransactions.ts`
- Esses dados são arrays fixos de transações hardcoded
- **NÃO carrega dados reais do Supabase**
- **NÃO usa `api.get('vendas')`**

**Linha 310-348: Função `getTransactionsForPeriod()`**
```typescript
const getTransactionsForPeriod = (period: string): { current: Transaction[], previous: Transaction[] } => {
  // Parsear o período no formato YYYY-MM
  if (!period || !period.includes('-')) {
    return { current: transactions30Days, previous: transactionsPrevious30Days };
  }
  
  const [year, month] = period.split('-');
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  
  // Filtrar transações do período atual
  const current = transactions30Days.filter(transaction => {
    // Parsear data no formato DD/MM/YYYY
    const [day, transMonth, transYear] = transaction.data.split('/');
    const transYearNum = parseInt(transYear);
    const transMonthNum = parseInt(transMonth);
    
    return transYearNum === yearNum && transMonthNum === monthNum;
  });
  
  // ... filtra também período anterior
}
```

**Problema:**
- Filtra apenas as transações mockadas por mês/ano
- Período selecionado: **Novembro 2025** (conforme imagem do dashboard)
- Transações mockadas: todas de **Outubro 2025**
- Resultado: **array vazio = R$ 0,0k**

---

#### 2. Tela de Vendas (SalesPage.tsx)

**Linha 289:**
```typescript
const vendasAPI = await api.get('vendas');
```

**O que acontece:**
- Carrega dados REAIS do Supabase
- Por isso mostra corretamente:
  - 1 venda: `venda-1763258194469`
  - Cliente: BANCO DO BRASIL SA
  - Valor: R$ 980
  - Data: 15/11/2025

---

#### 3. Dados Mockados (mockTransactions.ts)

**Amostra das transações:**
```typescript
export const transactions30Days: Transaction[] = [
  // Semana 4 (14-20 Out - mais recente)
  { id: "#VD-1240", cliente: "Startup Inovação", vendedor: "Pedro Costa", 
    valor: 9800, data: "20/10/2025", periodo: "Sem 4" },
  { id: "#VD-1241", cliente: "Tech Solutions", vendedor: "João Silva", 
    valor: 5200, data: "20/10/2025", periodo: "Sem 4" },
  // ... todas as datas são de outubro 2025
]
```

**Problema:**
- Todas as transações mockadas são de **outubro/2025**
- Dashboard está configurado para **novembro/2025**
- Filtro retorna **zero transações** = todos os valores zerados

---

## Fluxo Atual vs. Esperado

### ❌ Fluxo Atual (INCORRETO)

```
DASHBOARD
↓
Importa mockTransactions.ts (dados fixos de out/2025)
↓
Filtra por novembro/2025
↓
Nenhuma transação encontrada
↓
Exibe R$ 0,0k
```

```
TELA DE VENDAS
↓
api.get('vendas') → Supabase
↓
Retorna venda real de nov/2025
↓
Exibe R$ 1,0k
```

**Resultado:** Dados inconsistentes entre as telas

---

### ✅ Fluxo Esperado (CORRETO)

```
DASHBOARD
↓
api.get('vendas') → Supabase
↓
Filtra por período selecionado
↓
Calcula métricas dos dados reais
↓
Exibe valores corretos
```

```
TELA DE VENDAS
↓
api.get('vendas') → Supabase
↓
Exibe vendas reais
↓
Mesmos dados do dashboard
```

**Resultado:** Dados consistentes em todas as telas

---

## Por Que Isso Aconteceu?

### Contexto Histórico

1. **Fase de Desenvolvimento Inicial:**
   - Dashboard foi criado com dados mockados para prototipação rápida
   - Facilitava desenvolvimento sem depender de backend

2. **Migração para Supabase:**
   - Outras telas (Vendas, Clientes, etc.) foram migradas para usar dados reais
   - Dashboard **NÃO foi atualizado** e continuou usando mocks

3. **Problema Não Detectado:**
   - Durante testes, possivelmente o período selecionado era outubro
   - Ou testes focaram em outras funcionalidades
   - Dashboard nunca foi testado com dados reais de novembro

---

## Impacto

### 🔴 Crítico

1. **Tomada de Decisão Incorreta:**
   - Gerentes veem R$ 0,0k e pensam que não há vendas
   - Na realidade, há R$ 1,0k em vendas

2. **Perda de Confiança:**
   - Usuários percebem inconsistência entre telas
   - Duvidam da confiabilidade de todos os dados do sistema

3. **Métricas Inúteis:**
   - Vendas Totais: R$ 0,0k ❌
   - Ticket Médio: R$ 0,0k ❌
   - Produtos Vendidos: 0 ❌
   - Positivação: 0,0% ❌
   - Vendedores Ativos: 0 ❌
   - Meta do Período: 0% ❌

4. **Gráficos e Relatórios:**
   - Performance de Vendas: vazio
   - Top Vendedores: vazio
   - Vendas por Segmento: vazio
   - Todos baseados nos mesmos dados mockados

---

## Dados do Dashboard que SÃO Reais

Curiosamente, o dashboard mostra alguns dados corretos:

### ✅ Carteira de Clientes (Segunda Imagem)
- 40 clientes total
- 30 ativos (75%)
- 10 inativos (25%)

**Por quê funciona?**
Provavelmente há um componente separado (`CustomerWalletCard.tsx` ou similar) que carrega clientes do Supabase independentemente.

---

## Comparação Detalhada

| Métrica | Dashboard Mostra | Realidade (Vendas) | Fonte Dashboard | Fonte Vendas |
|---------|------------------|---------------------|-----------------|--------------|
| Vendas Totais | R$ 0,0k | R$ 1,0k | mockTransactions.ts (out/25) | api.get('vendas') |
| Transações | 0 | 1 | mockTransactions.ts filtrado | Supabase real |
| Período | Nov 2025 | Nov 2025 | Correto | Correto |
| Dados | Mockados | Reais | ❌ Incorreto | ✅ Correto |

---

## Solução Necessária

### O que precisa ser feito:

1. **Remover dependência de mockTransactions.ts no Dashboard**
2. **Implementar carregamento de dados reais via `api.get('vendas')`**
3. **Converter estrutura de dados reais para formato do dashboard**
4. **Manter fallback para dados mock apenas em caso de erro de conexão**
5. **Garantir consistência de filtros entre dashboard e outras telas**

### Arquivos que Precisam Ser Modificados:

1. `/components/DashboardMetrics.tsx`
   - Adicionar `useEffect` para carregar vendas reais
   - Remover dependência direta de mockTransactions
   - Implementar conversão de dados reais para métricas

2. Possivelmente outros componentes do dashboard:
   - `/components/TopSellersCard.tsx`
   - `/components/SalesChart.tsx`
   - `/components/SegmentSalesCard.tsx`
   - `/components/ABCCurveCard.tsx`
   - etc.

---

## Estrutura de Dados

### Transação Mockada (mockTransactions.ts)
```typescript
interface Transaction {
  id: string;           // "#VD-1240"
  cliente: string;      // "Startup Inovação"
  vendedor: string;     // "Pedro Costa"
  valor: number;        // 9800
  natureza: string;     // "Venda Direta"
  segmento: string;     // "Startup"
  statusCliente: string; // "Ativo"
  uf: string;           // "SP"
  data: string;         // "20/10/2025"
  periodo: string;      // "Sem 4"
}
```

### Venda Real (Supabase - tipo Venda)
```typescript
interface Venda {
  id: string;                    // "venda-1763258194469"
  numero: string;                // "PV-2025-0001"
  clienteId: string;             // ID do cliente
  nomeCliente: string;           // "BANCO DO BRASIL SA"
  vendedorId: string;            // ID do vendedor
  nomeVendedor: string;          // Nome do vendedor
  valorPedido: number;           // 980
  status: StatusVenda;           // "Em Andamento"
  dataPedido: Date;              // Date(2025-11-15)
  naturezaOperacaoId: string;
  nomeNaturezaOperacao: string;
  // ... muitos outros campos
}
```

**Conversão necessária:** Venda → Transaction para reutilizar lógica existente do dashboard

---

## Próximos Passos

**AGUARDANDO AUTORIZAÇÃO DO USUÁRIO** para:

1. Implementar carregamento de dados reais no Dashboard
2. Criar função de conversão Venda → Transaction
3. Manter compatibilidade com filtros e período
4. Testar consistência entre todas as telas
5. Documentar mudanças

---

## Observações Importantes

1. **Não é um bug de cálculo:** A lógica de cálculo das métricas está correta
2. **Não é um problema de filtro:** Os filtros funcionam corretamente
3. **É um problema de FONTE DE DADOS:** Dashboard usa fonte errada (mock vs real)

4. **Clientes funcionam:** Porque provavelmente carregam de fonte diferente

5. **Todas as métricas zeradas:** Porque todas dependem das mesmas transações mockadas

---

**Diagnóstico Completo Finalizado**
**Aguardando autorização para correção**

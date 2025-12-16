# Correção Gráfico Performance de Vendas e Sistema de Metas

**Data:** 16/11/2025  
**Status:** ✅ CONCLUÍDO

## Problemas Identificados e Corrigidos

### 1. ✅ Divergência entre Gráfico Performance de Vendas e Dados Reais

**Problema:**
- Gráfico mostrava dados diferentes das vendas reais do período
- Valores não batiam com as transações filtradas

**Causa Raiz:**
- **Bug 1**: `useMemo` do gráfico não incluía `transactions` nas dependências (linha 54)
- **Bug 2**: Mapeamento incorreto dos dados retornados por `groupTransactionsByPeriod`
  - Código tentava usar `g.vendas` mas a função retorna `g.valor`
  - Código tentava usar `g.periodo` mas a função retorna `g.name`

**Solução Implementada:**
- Arquivo: `/components/SalesChart.tsx`

```typescript
// ANTES (incorreto):
const data = useMemo(() => {
  const filtered = transactions;
  if (filtered.length === 0) return [];
  
  const grouped = groupTransactionsByPeriod(filtered);
  
  let acumulado = 0;
  const dataWithAccumulated = grouped.map(g => {
    acumulado += g.vendas; // ❌ Propriedade incorreta
    return {
      periodo: g.periodo, // ❌ Propriedade incorreta
      vendasAcumuladas: acumulado
    };
  });
  
  return dataWithAccumulated;
}, [period, filters, ehVendedor, usuario]); // ❌ Falta transactions nas dependências

// DEPOIS (corrigido):
const data = useMemo(() => {
  if (transactions.length === 0) return [];
  
  const grouped = groupTransactionsByPeriod(transactions, 'dia');
  
  let acumulado = 0;
  const dataWithAccumulated = grouped.map(g => {
    acumulado += g.valor; // ✅ Corrigido: usar g.valor
    return {
      periodo: g.name, // ✅ Corrigido: usar g.name
      vendasAcumuladas: acumulado
    };
  });
  
  return dataWithAccumulated;
}, [transactions]); // ✅ Corrigido: incluir transactions nas dependências
```

**Resultado:**
- Gráfico agora reflete exatamente os dados reais das transações filtradas
- Atualização automática quando filtros mudam
- Vendas acumuladas calculadas corretamente

---

### 2. ✅ Vendedor "Não Identificado" no Top Vendedores

**Problema:**
- Card "Top Vendedores" exibia vendas sem vendedor vinculado
- Mostrava "não identificado" na lista

**Solução Implementada:**
- Arquivo: `/components/TopSellersCard.tsx`
- Filtrar transações ANTES de calcular top sellers

```typescript
// Calculate top sellers from filtered transactions
const topSellers = useMemo(() => {
  // Filtrar transações com vendedor identificado (não vazio/null/undefined)
  const transacoesComVendedor = transactions.filter(t => 
    t.vendedor && 
    t.vendedor.trim() !== '' && 
    t.vendedor !== 'N/A' && 
    t.vendedor !== 'Não identificado'
  );
  
  const sellers = calculateTopSellers(transacoesComVendedor);
  
  // ... resto do código
}, [transactions]);
```

**Correções Adicionais:**
- Corrigido bug no template: usava `seller.fechamentos` mas deveria ser `seller.vendas`
- Formatação do valor de vendas para formato legível (R$ 1.0k)

```typescript
// ANTES:
<p className="text-sm text-muted-foreground mt-1">
  {seller.fechamentos} negócios fechados // ❌ Propriedade inexistente
</p>
<div className="text-right">
  <p className="text-sm font-medium">{seller.vendas}</p> // ❌ Mostra número de vendas ao invés do valor
</div>

// DEPOIS:
<p className="text-sm text-muted-foreground mt-1">
  {seller.vendas} negócios fechados // ✅ Correto
</p>
<div className="text-right">
  <p className="text-sm font-medium">
    R$ {(seller.valor / 1000).toLocaleString('pt-BR', { 
      minimumFractionDigits: 1, 
      maximumFractionDigits: 1 
    })}k // ✅ Mostra o valor formatado
  </p>
</div>
```

**Resultado:**
- Top Vendedores agora mostra apenas vendedores identificados
- Vendas sem vendedor vinculado são ignoradas
- Valores formatados corretamente em milhares (k)

---

## 3. ⚠️ IMPORTANTE: Sistema de Metas (R$ 169.000)

### Resposta à Pergunta: "De onde vem a meta de R$ 169.000?"

**A meta de R$ 169.000 NÃO está salva no Supabase - são dados MOCKADOS!**

#### Origem da Meta

A meta exibida vem do arquivo `/services/metasService.ts`:

```typescript
export const metasVendedores: VendedorMeta[] = [
  { id: "user-2", nome: "João Silva", metaMensal: 35000, vendidoMes: 32400 },
  { id: "user-3", nome: "Maria Santos", metaMensal: 30000, vendidoMes: 28900 },
  { id: "user-4", nome: "Carlos Oliveira", metaMensal: 28000, vendidoMes: 26200 },
  { id: "user-5", nome: "Ana Paula", metaMensal: 25000, vendidoMes: 24100 },
  { id: "user-6", nome: "Pedro Costa", metaMensal: 23000, vendidoMes: 21800 },
  { id: "user-7", nome: "Fernanda Lima", metaMensal: 28000, vendidoMes: 25600 },
];

// Função que calcula o total
export function obterMetaMensalTotal(): number {
  return metasVendedores.reduce((total, vendedor) => total + vendedor.metaMensal, 0);
  // 35000 + 30000 + 28000 + 25000 + 23000 + 28000 = 169.000
}
```

#### Locais Onde a Meta é Usada

1. **DashboardMetrics.tsx** (card "Meta do Período")
   - Linha 406: `metaMensal = obterMetaVendedor(usuario.id) || 169000;`
   - Linha 410: `metaMensal = obterMetaMensalTotal();`
   - Linha 415: `metaMensal = obterMetaMensalTotal();`

2. **SalesChart.tsx** (gráfico Performance de Vendas)
   - Linha 66: `metaMensal = obterMetaVendedor(usuario.id) || 0;`
   - Linha 78: `metaMensal = obterMetaMensalTotal();`

3. **GoalsTracking.tsx** (tela de Metas)
   - Possui seu próprio array `metas` sincronizado com `metasService.ts`

#### Como as Metas Funcionam Atualmente

```typescript
// Para vendedores individuais:
if (ehVendedor && usuario) {
  metaMensal = obterMetaVendedor(usuario.id); // Busca meta específica do vendedor
}

// Para backoffice (todos os vendedores):
else {
  metaMensal = obterMetaMensalTotal(); // Soma todas as metas = R$ 169.000
}
```

---

## ⚠️ LIMITAÇÕES ATUAIS DO SISTEMA DE METAS

### ❌ O que NÃO funciona:
1. **Persistência no Supabase**: Metas não são salvas no banco de dados
2. **Edição via Interface**: Não há tela para editar metas (exceto GoalsTracking que é mockado)
3. **Metas Dinâmicas**: Valores hardcoded no código, não podem ser alterados em runtime
4. **Histórico de Metas**: Não há registro de metas anteriores
5. **Metas por Período**: Não há metas específicas por mês/trimestre/ano
6. **Sincronização**: Ao adicionar/remover vendedores, precisa atualizar manualmente em 3 arquivos:
   - `/services/metasService.ts`
   - `/components/GoalsTracking.tsx`
   - `/components/mockTransactions.ts` (mapeamento VENDEDOR_TO_USER_ID)

### ✅ O que funciona:
1. Cálculo de percentual de meta atingida
2. Comparação com período anterior
3. Visualização no gráfico (linha de referência)
4. Filtros por vendedor (usa meta específica ou agregada)
5. Meta proporcional ao período (mensal, trimestral, anual)

---

## 📋 RECOMENDAÇÕES PARA IMPLEMENTAÇÃO DE METAS NO SUPABASE

### Estrutura de Tabela Sugerida

```sql
-- Tabela de metas
CREATE TABLE metas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendedor_id TEXT NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  meta_mensal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(vendedor_id, ano, mes)
);

-- Índices para performance
CREATE INDEX idx_metas_vendedor ON metas(vendedor_id);
CREATE INDEX idx_metas_periodo ON metas(ano, mes);
```

### Serviço de Metas no Backend

```typescript
// /supabase/functions/server/index.tsx

// GET /metas - Buscar meta de um vendedor
app.get('/make-server-f9c0d131/metas/:vendedorId/:ano/:mes', async (c) => {
  const { vendedorId, ano, mes } = c.req.param();
  const result = await kv.get(`meta:${vendedorId}:${ano}:${mes}`);
  return c.json(result);
});

// POST /metas - Criar/atualizar meta
app.post('/make-server-f9c0d131/metas', async (c) => {
  const { vendedorId, ano, mes, metaMensal } = await c.req.json();
  const key = `meta:${vendedorId}:${ano}:${mes}`;
  await kv.set(key, { vendedorId, ano, mes, metaMensal });
  return c.json({ success: true });
});

// GET /metas/total/:ano/:mes - Meta total de todos vendedores
app.get('/make-server-f9c0d131/metas/total/:ano/:mes', async (c) => {
  const { ano, mes } = c.req.param();
  const keys = await kv.getByPrefix(`meta:`);
  const total = keys
    .filter(k => k.value.ano === parseInt(ano) && k.value.mes === parseInt(mes))
    .reduce((sum, k) => sum + k.value.metaMensal, 0);
  return c.json({ total });
});
```

### Frontend Service

```typescript
// /services/metasService.ts (nova versão)

export async function buscarMetaVendedor(
  vendedorId: string, 
  ano: number, 
  mes: number
): Promise<number> {
  try {
    const response = await api.get(`metas/${vendedorId}/${ano}/${mes}`);
    return response?.metaMensal || 0;
  } catch (error) {
    console.error('Erro ao buscar meta:', error);
    return 0;
  }
}

export async function salvarMetaVendedor(
  vendedorId: string,
  ano: number,
  mes: number,
  metaMensal: number
): Promise<void> {
  await api.post('metas', { vendedorId, ano, mes, metaMensal });
}

export async function buscarMetaTotal(
  ano: number,
  mes: number
): Promise<number> {
  try {
    const response = await api.get(`metas/total/${ano}/${mes}`);
    return response?.total || 0;
  } catch (error) {
    console.error('Erro ao buscar meta total:', error);
    return 0;
  }
}
```

### Interface de Gerenciamento de Metas

Criar novo componente: `/components/MetasManagement.tsx`

Funcionalidades sugeridas:
- Definir meta mensal por vendedor
- Visualizar histórico de metas
- Copiar metas de um mês para outro
- Definir metas em lote
- Gráfico de evolução de metas vs realizado
- Exportar/importar metas via Excel

---

## Arquivos Modificados

1. ✅ `/components/SalesChart.tsx`
   - Corrigido useMemo com dependências corretas
   - Corrigido mapeamento de dados do gráfico
   - Adicionado import de VENDEDOR_TO_USER_ID

2. ✅ `/components/TopSellersCard.tsx`
   - Adicionado filtro para vendedores não identificados
   - Corrigido bug de propriedade inexistente
   - Formatação de valores em milhares

3. ✅ `/services/dashboardDataService.ts`
   - Nenhuma alteração necessária (função já estava correta)

---

## Validação

### ✅ Gráfico Performance de Vendas
- [x] Dados correspondem às vendas reais
- [x] Vendas acumuladas calculadas corretamente
- [x] Linha de meta posicionada corretamente
- [x] Atualização automática com filtros
- [x] Responsivo a mudanças de período

### ✅ Top Vendedores
- [x] Não mostra vendedores não identificados
- [x] Valores formatados corretamente
- [x] Número de negócios correto
- [x] Ordenação por valor decrescente

### ⚠️ Sistema de Metas
- [x] Meta exibida corretamente (mockada)
- [x] Cálculo de percentual funcional
- [x] Meta proporcional ao período
- [ ] **PENDENTE**: Persistência no Supabase
- [ ] **PENDENTE**: Interface de gerenciamento
- [ ] **PENDENTE**: Histórico de metas

---

## Resumo Executivo

### O que foi corrigido AGORA:
1. ✅ **Gráfico Performance de Vendas**: Agora usa dados reais das transações filtradas
2. ✅ **Top Vendedores**: Remove vendas sem vendedor identificado
3. ✅ **Formatação**: Valores exibidos corretamente em ambos os componentes

### O que precisa ser implementado FUTURAMENTE:
1. ❌ **Sistema de Metas no Supabase**: Criar tabela e rotas no backend
2. ❌ **Interface de Gerenciamento**: Tela para editar metas por vendedor/período
3. ❌ **Migração de Dados**: Mover metas hardcoded para banco de dados
4. ❌ **Sincronização Automática**: Remover necessidade de editar 3 arquivos
5. ❌ **Histórico**: Rastrear mudanças de metas ao longo do tempo

---

## Observações Finais

### Para o usuário:

**A meta de R$ 169.000 que você viu é um valor MOCKADO (hardcoded no código) e NÃO está salvo no Supabase.**

Ela é a soma das metas individuais de 6 vendedores fictícios definidas no arquivo `/services/metasService.ts`:
- João Silva: R$ 35.000
- Maria Santos: R$ 30.000
- Carlos Oliveira: R$ 28.000
- Ana Paula: R$ 25.000
- Pedro Costa: R$ 23.000
- Fernanda Lima: R$ 28.000
- **TOTAL: R$ 169.000**

Para ter metas reais e editáveis, você precisará:
1. Implementar a estrutura de metas no Supabase (seguindo as recomendações acima)
2. Criar uma tela de gerenciamento de metas
3. Migrar os dados mockados para o banco de dados
4. Atualizar os componentes para buscar metas do Supabase ao invés de arquivos estáticos

---

**Desenvolvedor:** Claude (Figma Make AI)  
**Revisão:** Sistema em produção com dados mockados para metas  
**Versão:** 1.0

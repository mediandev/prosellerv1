# Plano Completo de Correção de Persistência

## ✅ CORREÇÕES APLICADAS

### 1. Servidor Backend - Entidades Adicionadas ✅
**Arquivo:** `/supabase/functions/server/index.tsx`

Entidades adicionadas:
- `produtos` ✅
- `lancamentosComissao` ✅
- `pagamentosComissao` ✅
- `relatoriosComissao` ✅
- `segmentosCliente` ✅
- `tiposArquivoContaCorrente` ✅
- `vendas` ✅
- `vendedores` ✅
- `compromissosContaCorrente` ✅
- `pagamentosContaCorrente` ✅

---

### 2. ProductFormPage.tsx ✅
- Adição rápida de marcas persiste no Supabase
- Adição rápida de tipos de produto persiste no Supabase
- Adição rápida de unidades de medida persiste no Supabase

---

### 3. NaturezaOperacaoManagement.tsx ✅
- Carregamento via API
- CREATE com api.create()
- UPDATE com api.update()
- DELETE com api.delete()
- Tratamento de erros completo

---

### 4. CategoriaContaCorrenteManagement.tsx ✅
- Carregamento via API
- CREATE com api.create()
- UPDATE com api.update()
- DELETE com api.delete()
- Toggle de status persiste
- Tratamento de erros completo

---

### 5. App.tsx ✅
- Listas de preço persistem com api.create() e api.update()
- Produtos persistem com api.create() e api.update()

---

### 6. TeamManagement.tsx ✅
- Carregamento de vendedores via API
- Callback handleSaveVendedor implementado
- CREATE e UPDATE de vendedores com persistência
- Métricas calculadas a partir de dados reais
- Tratamento de erros

---

## ⏳ CORREÇÕES PENDENTES (CRÍTICAS)

### 7. SaleFormPage.tsx - ALTA PRIORIDADE 🔴
**Status:** Ainda usando localStorage

**Problemas identificados:**
- Linha 502-503: Salvamento no localStorage em vez de Supabase
- Dados mockados: mockVendas, clientesMock, mockProdutos, mockNaturezasOperacao, condicoesPagamentoMock

**Correções necessárias:**

#### A. Imports e Estado
```typescript
import { api } from '../services/api';
import { useEffect } from 'react';

// No componente:
const [clientes, setClientes] = useState<Cliente[]>([]);
const [produtos, setProdutos] = useState<Produto[]>([]);
const [naturezas, setNaturezas] = useState<NaturezaOperacao[]>([]);
const [condicoes, setCondicoes] = useState<CondicaoPagamento[]>([]);
const [loading, setLoading] = useState(true);
```

#### B. Carregamento Inicial
```typescript
useEffect(() => {
  carregarDados();
}, []);

const carregarDados = async () => {
  try {
    const [
      clientesAPI,
      produtosAPI,
      naturezasAPI,
      condicoesAPI
    ] = await Promise.all([
      api.get('clientes'),
      api.get('produtos'),
      api.get('naturezasOperacao'),
      api.get('condicoesPagamento')
    ]);
    
    setClientes(clientesAPI);
    setProdutos(produtosAPI);
    setNaturezas(naturezasAPI);
    setCondicoes(condicoesAPI);
  } catch (error) {
    console.error('[VENDAS] Erro ao carregar dados:', error);
    // Fallback para mocks
    setClientes(clientesMock);
    setProdutos(mockProdutos);
    setNaturezas(mockNaturezasOperacao);
    setCondicoes(condicoesPagamentoMock);
  } finally {
    setLoading(false);
  }
};
```

#### C. Salvamento de Venda
Substituir linhas 502-503 por:
```typescript
try {
  if (vendaId) {
    // Atualizar venda existente
    await api.update('vendas', vendaId, vendaCompleta);
  } else {
    // Criar nova venda
    await api.create('vendas', vendaCompleta);
  }
  
  toast.success(modoAtual === 'criar' ? 'Pedido criado com sucesso!' : 'Pedido atualizado com sucesso!');
  
  // ... resto do código
} catch (error: any) {
  console.error('[VENDAS] Erro ao salvar venda:', error);
  toast.error(`Erro ao salvar pedido: ${error.message || 'Erro desconhecido'}`);
}
```

---

### 8. SalesPage.tsx - ALTA PRIORIDADE 🔴
**Status:** Precisa verificar

**Verificar:**
- Se está carregando vendas do Supabase ou mock
- Se tem função de exclusão de vendas
- Se atualiza lista após criar/editar venda

**Correções necessárias:**
```typescript
import { api } from '../services/api';
import { useEffect } from 'react';

const [vendas, setVendas] = useState<Venda[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  carregarVendas();
}, []);

const carregarVendas = async () => {
  try {
    const vendasAPI = await api.get('vendas');
    setVendas(vendasAPI);
  } catch (error) {
    console.error('[VENDAS] Erro ao carregar vendas:', error);
    setVendas(mockVendas);
  } finally {
    setLoading(false);
  }
};
```

---

### 9. GoalsTracking.tsx - ALTA PRIORIDADE 🔴
**Status:** Dados hardcoded

**Problemas:**
- Array `metas` hardcoded (linhas 34-118)
- Não há CRUD para gerenciar metas
- Dados fictícios que não refletem realidade

**Correções necessárias:**

#### A. Carregar Metas da API
```typescript
import { api } from '../services/api';
import { useEffect } from 'react';

const [vendedoresMeta, setVendedoresMeta] = useState<VendedorMeta[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  carregarMetas();
}, []);

const carregarMetas = async () => {
  try {
    // Buscar vendedores e suas metas
    const vendedores = await api.get('vendedores');
    const metas = await api.get('metas');
    const vendas = await api.get('vendas');
    
    // Combinar dados e calcular métricas
    const vendedoresComMetas = vendedores.map(v => {
      const metaVendedor = metas.find(m => m.vendedorId === v.id);
      const vendasVendedor = vendas.filter(venda => venda.vendedorId === v.id);
      
      // Calcular vendido no mês, trimestre, etc.
      const vendidoMes = calcularVendasMes(vendasVendedor);
      const vendidoTrimestre = calcularVendasTrimestre(vendasVendedor);
      
      return {
        id: v.id,
        nome: v.nome,
        iniciais: v.iniciais,
        cargo: v.cargo,
        metaMensal: metaVendedor?.valorMensal || 0,
        vendidoMes,
        progresso: metaVendedor ? (vendidoMes / metaVendedor.valorMensal) * 100 : 0,
        // ... outros campos
      };
    });
    
    setVendedoresMeta(vendedoresComMetas);
  } catch (error) {
    console.error('[METAS] Erro ao carregar metas:', error);
  } finally {
    setLoading(false);
  }
};
```

#### B. Sistema de Edição de Metas
Criar componente `MetasManagement.tsx` para CRUD de metas:
- Definir meta mensal/trimestral/anual por vendedor
- Histórico de metas
- Ajustes de metas

---

### 10. CommissionsManagement.tsx - ALTA PRIORIDADE 🔴
**Status:** Parcialmente implementado

**Problemas:**
- Linhas 80-83: Estados inicializados com mock
- Linha 283: setLancamentosManuais sem API
- Linha 332: setPagamentos sem API

**Correções necessárias:**

#### A. Carregamento Inicial
```typescript
import { api } from '../services/api';
import { useEffect } from 'react';

const [relatorios, setRelatorios] = useState<RelatorioPeriodoComissoes[]>([]);
const [comissoesVendas, setComissoesVendas] = useState<ComissaoVenda[]>([]);
const [lancamentosManuais, setLancamentosManuais] = useState<LancamentoManual[]>([]);
const [pagamentos, setPagamentos] = useState<PagamentoPeriodo[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  carregarComissoes();
}, []);

const carregarComissoes = async () => {
  try {
    const [
      relatoriosAPI,
      comissoesAPI,
      lancamentosAPI,
      pagamentosAPI
    ] = await Promise.all([
      api.get('relatoriosComissao'),
      api.get('comissoesVendas'), // Pode ser calculado a partir de vendas
      api.get('lancamentosComissao'),
      api.get('pagamentosComissao')
    ]);
    
    setRelatorios(relatoriosAPI);
    setComissoesVendas(comissoesAPI);
    setLancamentosManuais(lancamentosAPI);
    setPagamentos(pagamentosAPI);
  } catch (error) {
    console.error('[COMISSOES] Erro ao carregar comissões:', error);
    // Fallback
    setRelatorios(mockRelatoriosComissoes);
    setComissoesVendas(mockComissoesVendas);
    setLancamentosManuais(mockLancamentosManuais);
    setPagamentos(mockPagamentos);
  } finally {
    setLoading(false);
  }
};
```

#### B. Salvar Lançamento Manual
Substituir linha 283:
```typescript
try {
  const novoLancamento: LancamentoManual = {
    id: crypto.randomUUID(),
    // ... dados do lançamento
  };
  
  await api.create('lancamentosComissao', novoLancamento);
  setLancamentosManuais([...lancamentosManuais, novoLancamento]);
  recalcularRelatorio(relatorioSelecionado.relatorio.id);
  toast.success(`Lançamento de ${formLancamento.tipo} registrado com sucesso!`);
  setDialogLancamento(false);
} catch (error: any) {
  console.error('[COMISSOES] Erro ao salvar lançamento:', error);
  toast.error(`Erro ao salvar lançamento: ${error.message}`);
}
```

#### C. Salvar Pagamento
Substituir linha 332:
```typescript
try {
  const novoPagamento: PagamentoPeriodo = {
    id: crypto.randomUUID(),
    // ... dados do pagamento
  };
  
  await api.create('pagamentosComissao', novoPagamento);
  setPagamentos([...pagamentos, novoPagamento]);
  recalcularRelatorio(relatorioSelecionado.relatorio.id);
  toast.success("Pagamento registrado com sucesso!");
  setDialogPagamento(false);
} catch (error: any) {
  console.error('[COMISSOES] Erro ao salvar pagamento:', error);
  toast.error(`Erro ao salvar pagamento: ${error.message}`);
}
```

---

### 11. ContaCorrenteOverview.tsx - ALTA PRIORIDADE 🔴
**Status:** Usando dados mock

**Problemas:**
- Linhas 24-27: Imports de dados mock
- Não há salvamento de compromissos/pagamentos

**Correções necessárias:**

#### A. Imports e Estado
```typescript
import { api } from '../services/api';
import { useEffect } from 'react';

const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
const [clientes, setClientes] = useState<Cliente[]>([]);
const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
const [categorias, setCategorias] = useState<CategoriaContaCorrente[]>([]);
const [loading, setLoading] = useState(true);
```

#### B. Carregamento
```typescript
useEffect(() => {
  carregarContaCorrente();
}, []);

const carregarContaCorrente = async () => {
  try {
    const [
      compromissosAPI,
      pagamentosAPI,
      clientesAPI,
      formasAPI,
      categoriasAPI
    ] = await Promise.all([
      api.get('compromissosContaCorrente'),
      api.get('pagamentosContaCorrente'),
      api.get('clientes'),
      api.get('formasPagamento'),
      api.get('categoriasContaCorrente')
    ]);
    
    setCompromissos(compromissosAPI);
    setPagamentos(pagamentosAPI);
    setClientes(clientesAPI);
    setFormasPagamento(formasAPI);
    setCategorias(categoriasAPI);
  } catch (error) {
    console.error('[CONTA-CORRENTE] Erro ao carregar:', error);
    // Fallback para mocks
  } finally {
    setLoading(false);
  }
};
```

#### C. Salvar Compromisso/Pagamento
Implementar funções de CREATE, UPDATE, DELETE com persistência

---

## 📊 RESUMO DE PROGRESSO

| Componente | Status | Prioridade |
|------------|--------|------------|
| ProductFormPage | ✅ Corrigido | ✅ |
| NaturezaOperacaoManagement | ✅ Corrigido | ✅ |
| CategoriaContaCorrenteManagement | ✅ Corrigido | ✅ |
| App.tsx (Listas/Produtos) | ✅ Corrigido | ✅ |
| TeamManagement | ✅ Corrigido | ✅ |
| SaleFormPage | ⏳ Pendente | 🔴 CRÍTICO |
| SalesPage | ⏳ Pendente | 🔴 CRÍTICO |
| GoalsTracking | ⏳ Pendente | 🔴 CRÍTICO |
| CommissionsManagement | ⏳ Pendente | 🔴 CRÍTICO |
| ContaCorrenteOverview | ⏳ Pendente | 🔴 CRÍTICO |
| UserManagement | ⏳ Pendente | 🟡 ALTO |
| SettingsPage | ⏳ Pendente | 🟢 MÉDIO |
| CustomerFormContaCorrente | ⏳ Pendente | ⚪ BAIXO |

---

## 🎯 PRÓXIMOS PASSOS RECOMENDADOS

### Ordem de Implementação:

1. **SaleFormPage.tsx** - Sistema core de vendas
2. **SalesPage.tsx** - Listagem de vendas
3. **CommissionsManagement.tsx** - Sistema financeiro
4. **GoalsTracking.tsx** - Sistema de metas
5. **ContaCorrenteOverview.tsx** - Conta corrente

### Estimativa de Tempo:
- SaleFormPage: 2-3 horas
- SalesPage: 1 hora
- CommissionsManagement: 2-3 horas
- GoalsTracking: 2-3 horas
- ContaCorrenteOverview: 2-3 horas

**Total estimado: 9-13 horas de desenvolvimento**

---

## 🧪 TESTES NECESSÁRIOS

Para cada componente corrigido:

1. ✅ Criar novo registro
2. ✅ Editar registro existente
3. ✅ Excluir registro
4. ✅ Recarregar página (F5)
5. ✅ Verificar se dados persistiram
6. ✅ Verificar console por erros
7. ✅ Testar em modo incógnito (sem cache)

---

## ⚠️ IMPORTANTE

**NÃO** implementar todas as correções de uma vez. Fazer uma por vez:
1. Corrigir componente
2. Testar completamente
3. Commit
4. Próximo componente

Isso facilita identificar problemas e fazer rollback se necessário.

# Plano de Migração Completa Mock → Supabase

## Status da Migração

### ✅ Já Integrados com Supabase
1. **Autenticação** - Funcionando com Supabase Auth + fallback mock
2. **CustomerFormPage** - Carrega/salva clientes no Supabase
3. **TeamManagement** - Carrega/salva vendedores no Supabase
4. **GoalsTracking** - Carrega/salva metas no Supabase
5. **ContaCorrenteOverview** - Integrado com API
6. **UserManagement** - Integrado com API

### ⚠️ CRÍTICOS - Parcialmente Integrados (PRIORIDADE ALTA)

#### 1. **SalesPage.tsx**
- **Problema**: Linha 291 mistura dados API com mock hardcoded
- **Solução**: Remover dados mock hardcoded, usar apenas API
- **Impacto**: Usuário vê vendas mockadas em vez de dados reais

#### 2. **SaleFormPage.tsx**
- **Problema**: Campos não persistem (vendedor, lista preço, condição pagamento)
- **Status**: Parcialmente corrigido, precisa validação
- **Solução**: Garantir que todos os campos "nome" sejam salvos

### 🔴 NÃO INTEGRADOS - Usando 100% Mock (PRIORIDADE ALTA)

#### 3. **ClientsRiskReportPage.tsx**
- Usa: `mockVendas`, `mockSellers`
- **Ação**: Converter para API

#### 4. **CommissionsManagement.tsx**
- Usa: `mockComissoes`, `mockSellers`
- **Ação**: Converter para API

#### 5. **CustomerABCReport.tsx & CustomerABCReportPage.tsx**
- Usa: `mockVendas`, `mockSellers`, `clientes mock`, `mockNaturezasOperacao`
- **Ação**: Converter para API

#### 6. **ProductABCReport.tsx & ProductABCReportPage.tsx**
- Provavelmente usa mocks
- **Ação**: Verificar e converter para API

#### 7. **SalesReport.tsx & SalesReportPage.tsx**
- Provavelmente usa mocks
- **Ação**: Verificar e converter para API

#### 8. **DashboardMetrics.tsx**
- Provavelmente usa mocks
- **Ação**: Verificar e converter para API

#### 9. **RecentSalesTable.tsx**
- Provavelmente usa mocks
- **Ação**: Verificar e converter para API

### 🟡 DADOS DE REFERÊNCIA (PRIORIDADE MÉDIA)

Estes dados são relativamente estáticos e podem usar mock com opção de API:

- **mockNaturezasOperacao** - Naturezas de operação fiscal
- **mockCondicoesPagamento** - Condições de pagamento
- **mockListasPreco** - Listas de preço
- **mockProdutos** - Catálogo de produtos
- **mockFormasPagamento** - Formas de pagamento
- **mockMarcas** - Marcas de produtos
- **mockTiposProduto** - Tipos de produto
- **mockUnidadesMedida** - Unidades de medida

**Ação**: Criar endpoints no backend para cada um, com fallback para mock

### 🟢 DADOS ESTÁTICOS (BAIXA PRIORIDADE)

- **municipios.ts** - Lista de municípios brasileiros (pode permanecer estático)
- **mockBanks.ts** - Lista de bancos (pode permanecer estático)
- **gruposRedes, segmentosMercado** - Listas de referência (podem usar mock)

## Ordem de Implementação

### Fase 1 - CRÍTICOS (Agora)
1. ✅ Corrigir SalesPage.tsx - remover mock hardcoded
2. ✅ Validar SaleFormPage.tsx - garantir persistência
3. ✅ Converter ClientsRiskReportPage.tsx para API
4. ✅ Converter CommissionsManagement.tsx para API
5. ✅ Converter CustomerABCReport para API

### Fase 2 - Relatórios e Dashboard (Próximo)
6. Converter DashboardMetrics para API
7. Converter SalesReport para API
8. Converter ProductABCReport para API
9. Converter RecentSalesTable para API

### Fase 3 - Dados de Referência (Depois)
10. Criar endpoints para naturezas, condições, listas, produtos
11. Atualizar componentes para usar API com fallback

## Verificações Necessárias

- [ ] Testar criação de venda e verificar se persiste no Supabase
- [ ] Testar edição de venda e verificar se atualiza no Supabase
- [ ] Verificar se lista de vendas mostra dados do Supabase
- [ ] Verificar se dashboard mostra métricas do Supabase
- [ ] Verificar se relatórios usam dados do Supabase

## Comandos para Verificar Dados

```javascript
// No console do navegador:
// Ver vendas no Supabase
api.get('vendas').then(console.log)

// Ver clientes no Supabase
api.get('clientes').then(console.log)

// Ver vendedores no Supabase
api.get('vendedores').then(console.log)

// Ver comissões no Supabase
api.get('comissoes').then(console.log)
```

# Correções de Persistência no Supabase

## ✅ Componentes Corrigidos

### 1. **BrandManagement.tsx** (Gerenciamento de Marcas)
- ✅ Carrega marcas da API via `api.get('marcas')`
- ✅ Salva novas marcas via `api.create('marcas', novaMarca)`
- ✅ Atualiza marcas via `api.update('marcas', id, marcaAtualizada)`
- ✅ Deleta marcas via `api.delete('marcas', id)`
- ✅ Fallback para dados mock em caso de erro

### 2. **ProductTypeManagement.tsx** (Tipos de Produto)
- ✅ Carrega tipos da API via `api.get('tiposProduto')`
- ✅ Salva novos tipos via `api.create('tiposProduto', novoTipo)`
- ✅ Atualiza tipos via `api.update('tiposProduto', id, tipoAtualizado)`
- ✅ Deleta tipos via `api.delete('tiposProduto', id)`
- ✅ Fallback para dados mock em caso de erro

### 3. **UnitManagement.tsx** (Unidades de Medida)
- ✅ Carrega unidades da API via `api.get('unidadesMedida')`
- ✅ Salva novas unidades via `api.create('unidadesMedida', novaUnidade)`
- ✅ Atualiza unidades via `api.update('unidadesMedida', id, unidadeAtualizada)`
- ✅ Deleta unidades via `api.delete('unidadesMedida', id)`
- ✅ Fallback para dados mock em caso de erro

### 4. **ProductFormPage.tsx** (Formulário de Produtos)
- ✅ Carrega marcas, tipos e unidades da API ao montar o componente
- ✅ Carrega e salva produtos via API (já estava correto)
- ✅ Fallback para dados mock em caso de erro

### 5. **ProductsListPage.tsx** (Listagem de Produtos)
- ✅ JÁ ESTAVA CORRETO - usa API completa

### 6. **CustomersListPage.tsx** e **CustomerFormPage.tsx** (Clientes)
- ✅ JÁ ESTAVAM CORRETOS - usam API completa

## ⚠️ Componentes que Ainda Precisam de Correção

### 1. **SalesPage.tsx** e **SaleFormPage.tsx** (Vendas)
**Status**: ❌ Ainda usa `mockVendas`
**Rotas no servidor**: ✅ Já existem (`/vendas`)
**Ação necessária**: Atualizar componentes para usar `api.get('vendas')`, `api.create('vendas')`, etc.

### 2. **CommissionsManagement.tsx** (Comissões)
**Status**: ❌ Ainda usa `mockComissoes`, `mockComissoesVendas`, `mockLancamentosManuais`, `mockPagamentos`
**Rotas no servidor**: ✅ Já existem (`/comissoes`)
**Ação necessária**: Atualizar componente para usar API do Supabase

### 3. **GoalsTracking.tsx** (Metas)
**Status**: ❌ Usa array hardcoded de metas
**Rotas no servidor**: ✅ Já existem (`/metas`)
**Ação necessária**: Atualizar componente para carregar e salvar metas via API

### 4. **Relatórios ABC** (CustomerABCReport, ProductABCReport, etc.)
**Status**: ❌ Ainda usam `mockVendas` para cálculos
**Ação necessária**: Atualizar para buscar vendas da API

### 5. **ClientsRiskReportPage.tsx** (Relatório de Clientes em Risco)
**Status**: ❌ Ainda usa `mockVendas` para cálculos
**Ação necessária**: Atualizar para buscar vendas da API

## 🔧 Métodos Disponíveis na API

O serviço de API (`/services/api.ts`) exporta os seguintes métodos:

### Métodos Gerais (CRUD)
- `api.get(entity)` - Busca todos os registros de uma entidade
- `api.getById(entity, id)` - Busca um registro específico por ID
- `api.create(entity, data)` - Cria um novo registro
- `api.update(entity, id, data)` - Atualiza um registro existente
- `api.delete(entity, id)` - Exclui um registro

### Métodos de Autenticação
- `api.auth.signup(email, password, nome, tipo)` - Criar conta
- `api.auth.signin(email, password)` - Fazer login
- `api.auth.me()` - Buscar dados do usuário logado
- `api.auth.signout()` - Fazer logout

### Métodos Customizados
- `api.clientes.getPendentes()` - Buscar clientes pendentes de aprovação
- `api.clientes.aprovar(id)` - Aprovar cliente
- `api.clientes.rejeitar(id, motivo)` - Rejeitar cliente
- `api.notificacoes.marcarTodasLidas()` - Marcar todas notificações como lidas
- `api.init(entity, data)` - Inicializar dados de uma entidade

**IMPORTANTE**: O método correto é `api.get()`, não `api.getAll()`.

## 📋 Resumo das Rotas Disponíveis no Servidor

O servidor em `/supabase/functions/server/index.tsx` já possui rotas genéricas para:

- ✅ `marcas`
- ✅ `tiposProduto`
- ✅ `unidadesMedida`
- ✅ `naturezasOperacao`
- ✅ `formasPagamento`
- ✅ `condicoesPagamento`
- ✅ `listasPreco`
- ✅ `contaCorrente`
- ✅ `categoriasContaCorrente`
- ✅ `historico`
- ✅ `historicoImportacao`
- ✅ `metas`

E rotas específicas para:

- ✅ `usuarios`
- ✅ `clientes`
- ✅ `vendedores`
- ✅ `produtos`
- ✅ `vendas` (com permissões por tipo de usuário)
- ✅ `comissoes` (com permissões por tipo de usuário)

## 🔧 Padrão de Implementação

Para converter um componente mock para API:

```typescript
// 1. Adicionar imports
import { useState, useEffect } from "react";
import { api } from "../services/api";

// 2. Inicializar estado vazio com loading
const [dados, setDados] = useState<Tipo[]>([]);
const [loading, setLoading] = useState(true);

// 3. Criar função de carregamento
useEffect(() => {
  carregarDados();
}, []);

const carregarDados = async () => {
  try {
    console.log('[COMPONENT] Carregando dados da API...');
    const dadosAPI = await api.get('entidade');
    setDados(dadosAPI);
    console.log('[COMPONENT] Dados carregados:', dadosAPI.length);
  } catch (error) {
    console.error('[COMPONENT] Erro ao carregar dados, usando mock:', error);
    setDados(mockDados); // Fallback
  } finally {
    setLoading(false);
  }
};

// 4. Atualizar funções de CRUD
const handleSave = async () => {
  try {
    if (editing) {
      await api.update('entidade', id, dadoAtualizado);
    } else {
      await api.create('entidade', novoDado);
    }
    await carregarDados(); // Recarregar após salvar
  } catch (error: any) {
    toast.error(`Erro ao salvar: ${error.message}`);
  }
};

const handleDelete = async () => {
  try {
    await api.delete('entidade', id);
    await carregarDados(); // Recarregar após deletar
  } catch (error: any) {
    toast.error(`Erro ao excluir: ${error.message}`);
  }
};
```

## 📝 Próximos Passos Recomendados

1. **Atualizar SalesPage e SaleFormPage** (alta prioridade - dados críticos)
2. **Atualizar CommissionsManagement** (alta prioridade - dados críticos)
3. **Atualizar GoalsTracking** (média prioridade)
4. **Atualizar Relatórios ABC** (média prioridade)
5. **Atualizar ClientsRiskReportPage** (média prioridade)

## 🎯 Benefícios das Correções

- ✅ Persistência real dos dados no Supabase
- ✅ Sincronização entre múltiplos usuários
- ✅ Backup automático dos dados
- ✅ Permissões granulares funcionando corretamente
- ✅ Fallback para mock em caso de erro (desenvolvimento offline)
- ✅ Logs detalhados para debugging

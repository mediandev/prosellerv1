# 📊 Visão Geral de Conta Corrente

## Visão Geral

Página dedicada para visualização e gestão centralizada de todos os lançamentos de conta corrente (compromissos e pagamentos) de todos os clientes, com filtros avançados e funcionalidades completas de edição e exclusão.

## 🎯 Características Principais

### 1. **Acesso Restrito**
- ✅ Disponível apenas para usuários **backoffice**
- ✅ Vendedores continuam acessando conta corrente apenas através da aba dentro do cadastro do cliente
- ✅ Vendedores visualizam apenas seus próprios clientes

### 2. **Cards de Resumo**
Três cards principais exibindo:
- **Total Compromissos**: Soma de todos os compromissos filtrados
- **Total Pagamentos**: Soma de todos os pagamentos realizados
- **Total Pendente**: Saldo a pagar (compromissos - pagamentos)

### 3. **Sistema de Filtros Avançados**

#### Filtros Básicos (Sempre Visíveis)
- **Data Início**: Data inicial do período
- **Data Fim**: Data final do período
- **Busca Geral**: Busca por cliente, título ou grupo/rede

#### Filtros Avançados (Colapsáveis)
- **Tipo**: Todos | Compromissos | Pagamentos
- **Status**: Todos | Pendente | Pago Parcialmente | Pago Integralmente
- **Cliente**: Combobox pesquisável com todos os clientes
- **Grupo/Rede**: Combobox pesquisável com grupos/redes

### 4. **Período Padrão**
Ao carregar a página, o sistema automaticamente aplica:
- **Data Início**: Primeiro dia do mês atual
- **Data Fim**: Último dia do mês atual
- **Outros Filtros**: Sem filtros aplicados

### 5. **Tabela de Dados**
Estrutura otimizada e responsiva com as seguintes colunas:

| Coluna | Descrição |
|--------|-----------|
| **Tipo** | Badge indicando Compromisso ou Pagamento |
| **Data** | Data do lançamento |
| **Cliente** | Nome do cliente + Grupo/Rede (se houver) |
| **Título** | Título do lançamento + Badge do tipo de compromisso + Anexos |
| **Valor** | Valor principal + Valor pendente (para compromissos) |
| **Status** | Status do compromisso (Pendente/Pago Parcialmente/Pago Integralmente) |

#### Características da Tabela
- ✅ Linha inteira clicável
- ✅ Hover visual para melhor UX
- ✅ Sem scroll horizontal necessário
- ✅ Layout responsivo
- ✅ Informações condensadas e bem organizadas

### 6. **Dialogs de Detalhes**

#### Dialog de Compromisso
**Modo Visualização:**
- Resumo de valores (Total, Pago, Pendente)
- Informações do cliente
- Descrição completa
- Histórico de alterações (criação e última atualização)
- Botões: **Editar** e **Excluir** (com permissões)

**Modo Edição:**
- Formulário completo para edição
- Campos: Data, Valor, Tipo, Título, Descrição
- Botões: **Cancelar** e **Salvar Alterações**

#### Dialog de Pagamento
**Modo Visualização:**
- Compromisso relacionado
- Valor do pagamento
- Forma de pagamento
- Observações
- Comprovante anexo (se houver)
- Histórico de alterações
- Botões: **Editar** e **Excluir** (com permissões)

**Modo Edição:**
- Formulário completo para edição
- Campos: Compromisso, Data, Valor, Forma de Pagamento, Observações
- Botões: **Cancelar** e **Salvar Alterações**

### 7. **Sistema de Permissões**
Utiliza as mesmas permissões já implementadas:
- `contacorrente.visualizar` - Necessária para acessar a página
- `contacorrente.editar` - Para editar lançamentos
- `contacorrente.excluir` - Para excluir lançamentos

## 📁 Arquivos Relacionados

### Componentes
- `/components/ContaCorrenteOverview.tsx` - Componente principal da página
- `/components/CustomerFormContaCorrente.tsx` - Aba de conta corrente no cliente

### Dados Mock
- `/data/mockContaCorrente.ts` - Compromissos e pagamentos mock
- `/data/mockCustomers.ts` - Clientes mock
- `/data/mockFormasPagamento.ts` - Formas de pagamento

### Tipos
- `/types/contaCorrente.ts` - Tipos TypeScript para conta corrente

### Navegação
- `/App.tsx` - Rota e item de menu adicionados

## 🎨 Interface

### Menu Lateral
```
Dashboard
Vendas
Pipeline
Equipe
Clientes
Metas
Comissões
💰 Conta Corrente (apenas backoffice)
Produtos
Relatórios
Configurações
```

### Cards de Resumo
```
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│ Total Compromissos   │ │ Total Pagamentos     │ │ Total Pendente       │
│ 💰                   │ │ 💰                   │ │ 💰                   │
│ R$ 34.200,00         │ │ R$ 8.200,00         │ │ R$ 26.000,00        │
│ 6 compromissos       │ │ 5 pagamentos        │ │ Saldo a pagar       │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

### Painel de Filtros
```
┌────────────────────────────────────────────────────────────┐
│ Filtros                              [🔽 Filtros Avançados]│
│                                                             │
│ Data Início: [01/11/2025]  Data Fim: [30/11/2025]         │
│ Buscar: [🔍 Cliente, título, grupo/rede...]               │
│                                                             │
│ ▼ Filtros Avançados                                        │
│ Tipo: [Todos ▼]  Status: [Todos ▼]                        │
│ Cliente: [Todos os clientes ▼]  Grupo: [Todos ▼]          │
│                                               [✖ Limpar]    │
└────────────────────────────────────────────────────────────┘
```

### Tabela de Lançamentos
```
┌──────────────────────────────────────────────────────────────────┐
│ Tipo      │ Data      │ Cliente         │ Título          │ ... │
├──────────────────────────────────────────────────────────────────┤
│ [Comp.]   │ 15/01/25  │ Supermercado    │ Material PDV    │ ... │
│           │           │ Grupo Varejo    │ 🔺 Invest. 📎 1 │     │
├──────────────────────────────────────────────────────────────────┤
│ [Pag.]    │ 01/02/25  │ Supermercado    │ Material PDV    │ ... │
│           │           │                 │ Transf. Banc.   │     │
└──────────────────────────────────────────────────────────────────┘
```

## 🔄 Fluxo de Uso

### Acesso Backoffice
1. Usuário backoffice faz login
2. Acessa menu **"Conta Corrente"**
3. Página carrega automaticamente com período do mês atual
4. Visualiza resumos e lançamentos
5. Aplica filtros conforme necessário
6. Clica em lançamento para ver detalhes
7. Pode editar ou excluir (com permissões)

### Acesso Vendedor
1. Vendedor faz login
2. Menu **"Conta Corrente"** não aparece
3. Acessa **"Clientes"**
4. Visualiza ou edita um cliente
5. Vai para aba **"Conta Corrente"**
6. Vê apenas lançamentos daquele cliente específico

## 🎯 Casos de Uso

### Caso 1: Visão Geral Mensal
**Objetivo:** Visualizar todos os lançamentos do mês atual
```
1. Acessar página (já vem filtrado por mês atual)
2. Analisar cards de resumo
3. Revisar tabela de lançamentos
```

### Caso 2: Buscar Lançamentos de Cliente Específico
**Objetivo:** Encontrar todos os lançamentos de um cliente
```
1. Clicar em "Filtros Avançados"
2. Selecionar cliente no combobox
3. Visualizar lançamentos filtrados
```

### Caso 3: Acompanhar Compromissos Pendentes
**Objetivo:** Ver compromissos que ainda não foram pagos
```
1. Filtrar Tipo: "Compromissos"
2. Filtrar Status: "Pendente"
3. Analisar lista de pendências
```

### Caso 4: Editar Valor de Compromisso
**Objetivo:** Corrigir valor de um compromisso
```
1. Localizar compromisso na tabela
2. Clicar na linha para abrir detalhes
3. Clicar em "Editar"
4. Ajustar valor
5. Salvar alterações
```

### Caso 5: Busca por Texto Livre
**Objetivo:** Encontrar lançamentos por palavra-chave
```
1. Digitar no campo de busca
2. Sistema filtra por: título, cliente e grupo/rede
3. Ver resultados em tempo real
```

## 🔧 Implementação Técnica

### Componente Principal
```typescript
export function ContaCorrenteOverview() {
  // Estados para filtros
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('todos');
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useState(/* mês atual */);
  // ... outros estados
  
  // Unificar compromissos e pagamentos
  const lancamentosUnificados = useMemo(() => {
    // Combinar e ordenar por data
  }, [compromissos, pagamentos]);
  
  // Aplicar filtros
  const lancamentosFiltrados = useMemo(() => {
    // Filtrar por todos os critérios
  }, [lancamentosUnificados, /* ...filtros */]);
  
  return (
    // Interface com cards, filtros e tabela
  );
}
```

### Características Técnicas
- ✅ useMemo para performance
- ✅ Componentes reutilizáveis (Combobox, Dialog)
- ✅ TypeScript completo
- ✅ Responsive design
- ✅ Toast notifications
- ✅ Loading states
- ✅ Error handling

## 🚀 Melhorias Futuras

1. **Exportação de Dados**
   - Exportar para Excel/CSV
   - Exportar para PDF
   - Incluir filtros aplicados no relatório

2. **Gráficos e Visualizações**
   - Gráfico de evolução temporal
   - Gráfico por cliente
   - Gráfico por tipo de compromisso

3. **Notificações**
   - Alertas de compromissos próximos ao vencimento
   - Notificações de novos lançamentos

4. **Batch Operations**
   - Exclusão em lote
   - Edição em lote
   - Exportação seletiva

5. **Auditoria Avançada**
   - Log completo de todas as alterações
   - Histórico de exclusões
   - Relatório de auditoria

## 📝 Notas Importantes

- A página é **exclusiva para backoffice**
- O período padrão é **mês atual**
- A busca funciona em **título, cliente e grupo/rede**
- Os filtros são **cumulativos** (AND logic)
- A tabela é **otimizada** para não ter scroll horizontal
- Os dialogs são **reutilizáveis** com modo visualização/edição
- As **permissões são verificadas** antes de mostrar ações

## ✅ Checklist de Funcionalidades

- [x] Página acessível apenas para backoffice
- [x] Filtro de período com mês atual por padrão
- [x] Filtros avançados colapsáveis
- [x] Busca por texto livre
- [x] Cards de resumo
- [x] Tabela otimizada sem scroll horizontal
- [x] Linha clicável para detalhes
- [x] Dialog de detalhes do compromisso
- [x] Dialog de detalhes do pagamento
- [x] Modo edição inline nos dialogs
- [x] Botões editar/excluir com permissões
- [x] Confirmação de exclusão
- [x] Toast notifications
- [x] Layout responsivo
- [x] Filtro por cliente
- [x] Filtro por grupo/rede
- [x] Filtro por tipo
- [x] Filtro por status
- [x] Limpar filtros

# Sistema de Metas Dinâmicas

## Visão Geral

O sistema de metas dinâmicas foi implementado para integrar automaticamente as metas mensais cadastradas no sistema com os gráficos e métricas do dashboard. As metas semanais e diárias são calculadas automaticamente com base nas metas mensais dos vendedores.

## Arquitetura

### Serviço de Metas (`/services/metasService.ts`)

Centraliza toda a lógica de cálculo de metas dinâmicas:

- **Fonte de dados**: Metas mensais sincronizadas com `GoalsTracking.tsx`
- **Cálculos suportados**:
  - Metas semanais (para períodos de 30 dias)
  - Metas diárias (para períodos de 7 dias)
  - Metas agregadas (múltiplos vendedores)
  - Estratégias de distribuição

### Vendedores e Metas Mensais

```typescript
const metasVendedores = [
  { id: "user-2", nome: "João Silva", metaMensal: 35000 },
  { id: "user-3", nome: "Maria Santos", metaMensal: 30000 },
  { id: "user-4", nome: "Carlos Oliveira", metaMensal: 28000 },
  { id: "user-5", nome: "Ana Paula", metaMensal: 25000 },
  { id: "user-6", nome: "Pedro Costa", metaMensal: 23000 },
  { id: "user-7", nome: "Fernanda Lima", metaMensal: 28000 },
];

// Meta total: R$ 169.000/mês
```

## Estratégias de Distribuição

### 1. Uniforme (Padrão)
Distribui a meta igualmente pelas 4 semanas do mês.

**Exemplo**: Meta mensal de R$ 28.000
- Semana 1: R$ 7.000
- Semana 2: R$ 7.000
- Semana 3: R$ 7.000
- Semana 4: R$ 7.000

### 2. Progressiva
Meta cresce gradualmente ao longo do mês (20%, 22%, 28%, 30%).

**Exemplo**: Meta mensal de R$ 28.000
- Semana 1: R$ 5.600 (20%)
- Semana 2: R$ 6.160 (22%)
- Semana 3: R$ 7.840 (28%)
- Semana 4: R$ 8.400 (30%)

### 3. Acelerada
Meta mais agressiva no início, reduzindo ao final (35%, 30%, 20%, 15%).

**Exemplo**: Meta mensal de R$ 28.000
- Semana 1: R$ 9.800 (35%)
- Semana 2: R$ 8.400 (30%)
- Semana 3: R$ 5.600 (20%)
- Semana 4: R$ 4.200 (15%)

## Metas Diárias (Período de 7 dias)

Considera dias úteis e finais de semana:

**Exemplo**: Meta mensal de R$ 28.000 (22 dias úteis)
- Segunda a Sexta: R$ 1.273/dia
- Sábado: R$ 764/dia (60% da meta diária)
- Domingo: R$ 509/dia (40% da meta diária)

## Integração nos Componentes

### SalesChart (Gráfico de Performance)

O gráfico "Performance de Vendas" calcula automaticamente as metas baseado em:

1. **Vendedor logado**: Usa a meta individual do vendedor
2. **Filtros ativos**: Soma as metas dos vendedores filtrados
3. **Sem filtros (backoffice)**: Usa a meta total de todos os vendedores

```typescript
// Período de 7 dias
const metasDiarias = calcularMetasDiarias7Dias(metaMensal);

// Período de 30 dias
const metasSemanais = calcularMetasSemanais30Dias(metaMensal, 'uniforme');
```

### DashboardMetrics (Cards de Métricas)

Os cards de métricas calculam a porcentagem de meta baseada em:

```typescript
// Vendedor
const metaMensal = obterMetaVendedor(usuario.id);

// Backoffice com filtros
const metaMensal = vendedoresSelecionados.reduce(/* somar metas */);

// Backoffice sem filtros
const metaMensal = obterMetaMensalTotal();
```

## Funções Principais

### `obterMetaMensalTotal()`
Retorna a meta mensal total de todos os vendedores (R$ 169.000).

### `obterMetaVendedor(vendedorId: string)`
Retorna a meta mensal de um vendedor específico pelo ID.

### `obterMetaVendedorPorNome(nomeVendedor: string)`
Retorna a meta mensal de um vendedor específico pelo nome.

### `calcularMetasSemanais30Dias(metaMensal, estrategia)`
Calcula metas semanais para período de 30 dias.

**Parâmetros**:
- `metaMensal`: Valor da meta mensal
- `estrategia`: 'uniforme' | 'progressiva' | 'acelerada'

**Retorna**: Array com 4 valores (meta para cada semana)

### `calcularMetasDiarias7Dias(metaMensal, diasUteis)`
Calcula metas diárias para período de 7 dias.

**Parâmetros**:
- `metaMensal`: Valor da meta mensal
- `diasUteis`: Número de dias úteis no mês (padrão: 22)

**Retorna**: Array com 7 valores (meta para cada dia da semana)

### `calcularMetasSemanaisAgregadas(vendedorIds, estrategia)`
Calcula metas semanais agregadas de múltiplos vendedores.

### `calcularMetasDiariasAgregadas(vendedorIds, diasUteis)`
Calcula metas diárias agregadas de múltiplos vendedores.

## Permissões e Filtros

### Vendedor
- **Dashboard**: Vê apenas sua própria meta individual
- **Gráfico**: Metas calculadas baseadas em sua meta mensal pessoal
- **Métricas**: Porcentagem calculada sobre sua meta individual

### Backoffice
- **Sem filtros**: Vê meta total de todos os vendedores (R$ 169.000/mês)
- **Com filtros**: Vê soma das metas dos vendedores selecionados
- **Flexibilidade**: Pode analisar equipes específicas ou vendedores individuais

## Exemplos de Uso

### Exemplo 1: Gráfico para Vendedor Logado
```typescript
const { usuario } = useAuth();
const metaVendedor = obterMetaVendedor(usuario.id); // R$ 35.000 (João Silva)
const metasSemanais = calcularMetasSemanais30Dias(metaVendedor, 'uniforme');
// Resultado: [8750, 8750, 8750, 8750]
```

### Exemplo 2: Dashboard com Filtros
```typescript
const vendedoresSelecionados = ["João Silva", "Maria Santos"];
const vendedorIds = ["user-2", "user-3"];
const metaTotal = vendedorIds.reduce((sum, id) => 
  sum + (obterMetaVendedor(id) || 0), 0
); // R$ 65.000
```

### Exemplo 3: Métricas Diárias
```typescript
const metaMensal = 28000;
const metasDiarias = calcularMetasDiarias7Dias(metaMensal);
// Resultado: [1273, 1273, 1273, 1273, 1273, 764, 509]
```

## Sincronização com GoalsTracking

As metas definidas em `/services/metasService.ts` devem estar sincronizadas com as metas em `/components/GoalsTracking.tsx`.

**Importante**: Ao atualizar metas mensais, atualizar em ambos os arquivos:
1. `/services/metasService.ts` - array `metasVendedores`
2. `/components/GoalsTracking.tsx` - array `metas`

## Expansões Futuras

### Possíveis melhorias:
1. **Metas por categoria de produto**: Diferentes estratégias por tipo de produto
2. **Ajuste por sazonalidade**: Metas adaptadas a períodos sazonais
3. **Metas por região/UF**: Distribuição geográfica
4. **Dias úteis reais**: Calcular baseado em calendário real
5. **API de metas**: Buscar metas de um backend
6. **Histórico de metas**: Acompanhar evolução de metas ao longo do tempo
7. **Metas por cliente**: Segmentação por tipo de cliente

## Manutenção

### Adicionar novo vendedor
1. Adicionar no array `metasVendedores` em `/services/metasService.ts`
2. Adicionar no array `metas` em `/components/GoalsTracking.tsx`
3. Adicionar no mapeamento `VENDEDOR_TO_USER_ID` em `/components/mockTransactions.ts`

### Atualizar meta mensal
1. Alterar valor `metaMensal` no array `metasVendedores`
2. Alterar valor `metaMensal` no array `metas` do GoalsTracking
3. Sistema recalcula automaticamente metas semanais e diárias

## Notas Técnicas

- Todas as metas são calculadas em tempo de execução (não armazenadas)
- Sistema usa `useMemo` para otimizar recálculos
- Suporta filtros dinâmicos sem perda de performance
- Compatível com sistema de permissões granulares
- Valores sempre em BRL (R$)

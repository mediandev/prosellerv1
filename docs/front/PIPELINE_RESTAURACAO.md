# Documentação para Restauração do Pipeline de Vendas

## Data da Remoção
1 de novembro de 2025

## Componente Removido
`/components/SalesPipeline.tsx`

## Descrição da Funcionalidade
O Pipeline de Vendas era um sistema Kanban de gestão de oportunidades de vendas com drag-and-drop, permitindo mover negociações entre 5 estágios diferentes do funil de vendas.

### Características Principais
- **5 Estágios do Funil**: Prospecção → Qualificação → Proposta → Negociação → Fechamento
- **Drag and Drop**: Implementado com react-dnd e HTML5Backend
- **Cards de Oportunidades**: Exibindo cliente, empresa, vendedor, valor, probabilidade e data de contato
- **Métricas em Tempo Real**: Total do pipeline, oportunidades ativas e taxa de conversão
- **Total por Coluna**: Soma dos valores em cada estágio

### Dependências Utilizadas
```typescript
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
```

### Estrutura de Dados

#### Interface Deal
```typescript
interface Deal {
  id: string;
  cliente: string;
  vendedor: string;
  vendedorIniciais: string;
  valor: number;
  probabilidade: number;
  dataContato: string;
  empresa: string;
}
```

#### Interface Column
```typescript
interface Column {
  id: string;
  title: string;
  deals: Deal[];
  color: string;
}
```

### Dados Mockados (initialData)
```typescript
const initialData: Column[] = [
  {
    id: "prospeccao",
    title: "Prospecção",
    color: "bg-blue-500",
    deals: [
      {
        id: "deal-1",
        cliente: "João Mendes",
        vendedor: "João Silva",
        vendedorIniciais: "JS",
        valor: 15000,
        probabilidade: 20,
        dataContato: "17/10/2025",
        empresa: "Tech Corp"
      },
      {
        id: "deal-2",
        cliente: "Maria Costa",
        vendedor: "Ana Paula",
        vendedorIniciais: "AP",
        valor: 8500,
        probabilidade: 15,
        dataContato: "16/10/2025",
        empresa: "Digital Plus"
      }
    ]
  },
  {
    id: "qualificacao",
    title: "Qualificação",
    color: "bg-purple-500",
    deals: [
      {
        id: "deal-3",
        cliente: "Pedro Santos",
        vendedor: "Maria Santos",
        vendedorIniciais: "MS",
        valor: 22000,
        probabilidade: 40,
        dataContato: "15/10/2025",
        empresa: "Solutions SA"
      },
      {
        id: "deal-4",
        cliente: "Ana Silva",
        vendedor: "Carlos Oliveira",
        vendedorIniciais: "CO",
        valor: 12000,
        probabilidade: 35,
        dataContato: "14/10/2025",
        empresa: "InnovaTech"
      }
    ]
  },
  {
    id: "proposta",
    title: "Proposta",
    color: "bg-yellow-500",
    deals: [
      {
        id: "deal-5",
        cliente: "Carlos Lima",
        vendedor: "Pedro Costa",
        vendedorIniciais: "PC",
        valor: 35000,
        probabilidade: 60,
        dataContato: "13/10/2025",
        empresa: "MegaCorp"
      },
      {
        id: "deal-6",
        cliente: "Lucia Alves",
        vendedor: "João Silva",
        vendedorIniciais: "JS",
        valor: 18000,
        probabilidade: 55,
        dataContato: "12/10/2025",
        empresa: "StartUp XYZ"
      }
    ]
  },
  {
    id: "negociacao",
    title: "Negociação",
    color: "bg-orange-500",
    deals: [
      {
        id: "deal-7",
        cliente: "Roberto Dias",
        vendedor: "Maria Santos",
        vendedorIniciais: "MS",
        valor: 45000,
        probabilidade: 80,
        dataContato: "11/10/2025",
        empresa: "Enterprise Ltd"
      }
    ]
  },
  {
    id: "fechamento",
    title: "Fechamento",
    color: "bg-green-500",
    deals: [
      {
        id: "deal-8",
        cliente: "Sandra Rocha",
        vendedor: "Ana Paula",
        vendedorIniciais: "AP",
        valor: 28000,
        probabilidade: 95,
        dataContato: "10/10/2025",
        empresa: "Global Systems"
      }
    ]
  }
];
```

## Alterações no App.tsx

### Importação Removida (Linha 27)
```typescript
import { SalesPipeline } from "./components/SalesPipeline";
```

### Type Page (Linha 53)
**Remover**: `"pipeline"` do type Page
```typescript
// ANTES:
type Page = "dashboard" | "vendas" | "equipe" | "clientes" | "comissoes" | "contacorrente" | "produtos" | "metas" | "pipeline" | "relatorios" | "configuracoes" | "perfil" | "clientes-pendentes";

// DEPOIS:
type Page = "dashboard" | "vendas" | "equipe" | "clientes" | "comissoes" | "contacorrente" | "produtos" | "metas" | "relatorios" | "configuracoes" | "perfil" | "clientes-pendentes";
```

### MenuItem Removido (Linha 58)
```typescript
{ id: "pipeline", icon: TrendingUp, label: "Pipeline" },
```
**Nota**: O ícone TrendingUp era importado de "lucide-react"

### PageConfig Removido (Linhas 165-168)
```typescript
pipeline: {
  title: "Pipeline de Vendas",
  description: "Gerencie suas oportunidades através do funil de vendas."
},
```

### Case no renderContent Removido (Linhas 593-594)
```typescript
case "pipeline":
  return <SalesPipeline />;
```

## Código Completo do Componente SalesPipeline.tsx

```typescript
import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Building2, DollarSign, Calendar, User } from "lucide-react";

interface Deal {
  id: string;
  cliente: string;
  vendedor: string;
  vendedorIniciais: string;
  valor: number;
  probabilidade: number;
  dataContato: string;
  empresa: string;
}

interface Column {
  id: string;
  title: string;
  deals: Deal[];
  color: string;
}

const initialData: Column[] = [
  {
    id: "prospeccao",
    title: "Prospecção",
    color: "bg-blue-500",
    deals: [
      {
        id: "deal-1",
        cliente: "João Mendes",
        vendedor: "João Silva",
        vendedorIniciais: "JS",
        valor: 15000,
        probabilidade: 20,
        dataContato: "17/10/2025",
        empresa: "Tech Corp"
      },
      {
        id: "deal-2",
        cliente: "Maria Costa",
        vendedor: "Ana Paula",
        vendedorIniciais: "AP",
        valor: 8500,
        probabilidade: 15,
        dataContato: "16/10/2025",
        empresa: "Digital Plus"
      }
    ]
  },
  {
    id: "qualificacao",
    title: "Qualificação",
    color: "bg-purple-500",
    deals: [
      {
        id: "deal-3",
        cliente: "Pedro Santos",
        vendedor: "Maria Santos",
        vendedorIniciais: "MS",
        valor: 22000,
        probabilidade: 40,
        dataContato: "15/10/2025",
        empresa: "Solutions SA"
      },
      {
        id: "deal-4",
        cliente: "Ana Silva",
        vendedor: "Carlos Oliveira",
        vendedorIniciais: "CO",
        valor: 12000,
        probabilidade: 35,
        dataContato: "14/10/2025",
        empresa: "InnovaTech"
      }
    ]
  },
  {
    id: "proposta",
    title: "Proposta",
    color: "bg-yellow-500",
    deals: [
      {
        id: "deal-5",
        cliente: "Carlos Lima",
        vendedor: "Pedro Costa",
        vendedorIniciais: "PC",
        valor: 35000,
        probabilidade: 60,
        dataContato: "13/10/2025",
        empresa: "MegaCorp"
      },
      {
        id: "deal-6",
        cliente: "Lucia Alves",
        vendedor: "João Silva",
        vendedorIniciais: "JS",
        valor: 18000,
        probabilidade: 55,
        dataContato: "12/10/2025",
        empresa: "StartUp XYZ"
      }
    ]
  },
  {
    id: "negociacao",
    title: "Negociação",
    color: "bg-orange-500",
    deals: [
      {
        id: "deal-7",
        cliente: "Roberto Dias",
        vendedor: "Maria Santos",
        vendedorIniciais: "MS",
        valor: 45000,
        probabilidade: 80,
        dataContato: "11/10/2025",
        empresa: "Enterprise Ltd"
      }
    ]
  },
  {
    id: "fechamento",
    title: "Fechamento",
    color: "bg-green-500",
    deals: [
      {
        id: "deal-8",
        cliente: "Sandra Rocha",
        vendedor: "Ana Paula",
        vendedorIniciais: "AP",
        valor: 28000,
        probabilidade: 95,
        dataContato: "10/10/2025",
        empresa: "Global Systems"
      }
    ]
  }
];

interface DealCardProps {
  deal: Deal;
}

function DealCard({ deal }: DealCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "DEAL",
    item: { id: deal.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`bg-card border rounded-lg p-4 mb-3 cursor-move hover:shadow-md transition-shadow ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium mb-1">{deal.cliente}</h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {deal.empresa}
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {deal.probabilidade}%
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            R$ {deal.valor.toLocaleString('pt-BR')}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span className="text-xs">{deal.dataContato}</span>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">{deal.vendedorIniciais}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{deal.vendedor}</span>
        </div>
      </div>
    </div>
  );
}

interface ColumnProps {
  column: Column;
  onDrop: (dealId: string, columnId: string) => void;
}

function PipelineColumn({ column, onDrop }: ColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "DEAL",
    drop: (item: { id: string }) => onDrop(item.id, column.id),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const totalValue = column.deals.reduce((sum, deal) => sum + deal.valor, 0);

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-muted/50 rounded-lg p-4 h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${column.color}`} />
            <h3 className="font-medium">{column.title}</h3>
            <Badge variant="outline" className="ml-2">
              {column.deals.length}
            </Badge>
          </div>
        </div>

        <div className="mb-4 p-3 bg-card rounded-lg">
          <p className="text-xs text-muted-foreground">Total em Negociação</p>
          <p className="text-lg font-medium">
            R$ {totalValue.toLocaleString('pt-BR')}
          </p>
        </div>

        <div
          ref={drop}
          className={`min-h-[400px] ${isOver ? "bg-muted rounded-lg p-2" : ""}`}
        >
          {column.deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SalesPipeline() {
  const [columns, setColumns] = useState(initialData);

  const handleDrop = (dealId: string, targetColumnId: string) => {
    setColumns((prevColumns) => {
      let dealToMove: Deal | null = null;
      let sourceColumnId: string | null = null;

      // Encontrar o deal e a coluna de origem
      prevColumns.forEach((column) => {
        const deal = column.deals.find((d) => d.id === dealId);
        if (deal) {
          dealToMove = deal;
          sourceColumnId = column.id;
        }
      });

      if (!dealToMove || sourceColumnId === targetColumnId) {
        return prevColumns;
      }

      // Remover da coluna de origem e adicionar na coluna de destino
      return prevColumns.map((column) => {
        if (column.id === sourceColumnId) {
          return {
            ...column,
            deals: column.deals.filter((d) => d.id !== dealId),
          };
        }
        if (column.id === targetColumnId) {
          return {
            ...column,
            deals: [...column.deals, dealToMove!],
          };
        }
        return column;
      });
    });
  };

  const totalPipelineValue = columns.reduce(
    (sum, column) => sum + column.deals.reduce((colSum, deal) => colSum + deal.valor, 0),
    0
  );

  const totalDeals = columns.reduce((sum, column) => sum + column.deals.length, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Valor Total do Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalPipelineValue.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Oportunidades Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32%</div>
          </CardContent>
        </Card>
      </div>

      <DndProvider backend={HTML5Backend}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {columns.map((column) => (
              <PipelineColumn key={column.id} column={column} onDrop={handleDrop} />
            ))}
          </div>
        </div>
      </DndProvider>
    </div>
  );
}
```

### Componentes Internos
1. **DealCard**: Card individual de oportunidade com drag functionality
2. **PipelineColumn**: Coluna do Kanban com drop functionality
3. **SalesPipeline**: Componente principal exportado

### Funcionalidades Implementadas
- ✅ Drag and Drop entre colunas
- ✅ Cálculo automático de totais por coluna
- ✅ Cálculo de métricas gerais (total pipeline, oportunidades ativas, taxa conversão)
- ✅ Cards responsivos com informações completas
- ✅ Avatar com iniciais do vendedor
- ✅ Badges de probabilidade
- ✅ Formatação de valores em BRL
- ✅ Scroll horizontal para visualização de todas as colunas
- ✅ Feedback visual durante drag (opacity, highlight da zona de drop)

## Como Restaurar

### 1. Restaurar o Componente
Criar o arquivo `/components/SalesPipeline.tsx` com o código completo (disponível neste documento ou no backup)

### 2. Restaurar as Alterações no App.tsx

#### Adicionar Importação (próximo à linha 27)
```typescript
import { SalesPipeline } from "./components/SalesPipeline";
```

#### Adicionar "pipeline" ao Type Page (linha 53)
```typescript
type Page = "dashboard" | "vendas" | "equipe" | "clientes" | "comissoes" | "contacorrente" | "produtos" | "metas" | "pipeline" | "relatorios" | "configuracoes" | "perfil" | "clientes-pendentes";
```

#### Adicionar Item ao Menu (linha 58, após "vendas")
```typescript
{ id: "pipeline", icon: TrendingUp, label: "Pipeline" },
```

#### Adicionar ao pageConfig (após vendas, ~linha 165)
```typescript
pipeline: {
  title: "Pipeline de Vendas",
  description: "Gerencie suas oportunidades através do funil de vendas."
},
```

#### Adicionar Case no renderContent (após vendas, ~linha 593)
```typescript
case "pipeline":
  return <SalesPipeline />;
```

### 3. Verificar Dependências
As bibliotecas `react-dnd` e `react-dnd-html5-backend` devem estar disponíveis (já estão no ambiente Figma Make)

## Posição Original no Menu
3ª posição, entre "Vendas" e "Equipe"

## Observações
- Não havia integração com backend (dados 100% mockados)
- Não havia persistência de estado (mudanças eram resetadas ao recarregar)
- Não havia filtros por vendedor ou período
- A taxa de conversão era fixa em 32% (não calculada dinamicamente)
- Não havia validação de permissões (visível para todos os usuários)

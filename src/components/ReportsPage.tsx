import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { FileText, TrendingUp, Package, ChevronRight, AlertTriangle, FileBarChart, Target } from "lucide-react";
import { Button } from "./ui/button";

interface ReportsPageProps {
  onNavigateToReport: (reportType: "vendas" | "clientes-abc" | "produtos-abc" | "clientes-risco" | "mix-cliente" | "roi-clientes") => void;
}

export function ReportsPage({ onNavigateToReport }: ReportsPageProps) {
  const reports = [
    {
      id: "vendas" as const,
      icon: FileText,
      title: "Relatório de Vendas",
      description: "Relação completa de vendas com filtros personalizados por período, vendedor, cliente, UF, empresa emitente e natureza de operação. Inclui opções de agrupamento e exportação para Excel.",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      borderColor: "border-blue-200 dark:border-blue-900",
    },
    {
      id: "clientes-abc" as const,
      icon: TrendingUp,
      title: "Curva ABC de Clientes",
      description: "Análise estratégica de clientes por participação no faturamento do período. Identifica os clientes mais importantes (Curva A - 80% do faturamento), intermediários (Curva B - 15%) e demais (Curva C - 5%). Filtros por período, vendedor, grupo/rede, UF e empresa emitente.",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      borderColor: "border-green-200 dark:border-green-900",
    },
    {
      id: "produtos-abc" as const,
      icon: Package,
      title: "Curva ABC de Produtos",
      description: "Análise de produtos por participação no faturamento, permitindo identificar os produtos mais rentáveis e otimizar o mix de vendas. Visualização clara das três curvas (A, B e C) com estatísticas detalhadas. Filtros por período, UF e empresa emitente.",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      borderColor: "border-purple-200 dark:border-purple-900",
    },
    {
      id: "clientes-risco" as const,
      icon: AlertTriangle,
      title: "Clientes em Risco",
      description: "Análise inteligente de clientes inativos, redução de compras e oportunidades. Identifica clientes que nunca compraram, estão sem comprar há muito tempo ou reduziram significativamente suas compras. Inclui também análise de clientes promissores para upsell e cross-sell.",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      borderColor: "border-orange-200 dark:border-orange-900",
    },
    {
      id: "mix-cliente" as const,
      icon: FileBarChart,
      title: "Mix de Produtos por Cliente",
      description: "Análise detalhada dos produtos comprados por cada cliente em um período específico. Permite identificar quais produtos do catálogo foram adquiridos, a quantidade total e o status do mix (ativo/inativo/sem cadastro). Essencial para estratégias de venda cruzada e gestão de relacionamento com clientes.",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
      borderColor: "border-indigo-200 dark:border-indigo-900",
    },
    {
      id: "roi-clientes" as const,
      icon: Target,
      title: "ROI por Cliente",
      description: "Análise do Retorno sobre Investimento (ROI) para cada cliente, identificando quais clientes geram maior valor para a empresa. Filtros por período, vendedor, grupo/rede, UF e empresa emitente.",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/20",
      borderColor: "border-red-200 dark:border-red-900",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1>Relatórios</h1>
          <p className="text-muted-foreground">
            Escolha o tipo de relatório que deseja visualizar
          </p>
        </div>

        {/* Cards de Relatórios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reports.map((report) => (
            <Card
              key={report.id}
              className={`${report.borderColor} hover:shadow-lg transition-shadow cursor-pointer group flex flex-col h-full`}
              onClick={() => onNavigateToReport(report.id)}
            >
              <CardHeader className="flex-1">
                <div className={`w-12 h-12 rounded-lg ${report.bgColor} flex items-center justify-center mb-4`}>
                  <report.icon className={`h-6 w-6 ${report.color}`} />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {report.title}
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToReport(report.id);
                  }}
                >
                  Acessar Relatório
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Informações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle>Sobre os Relatórios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Todos os relatórios disponíveis incluem funcionalidade de <strong>exportação para Excel</strong> no formato CSV com codificação UTF-8, permitindo análises externas detalhadas.
            </p>
            <p>
              Os <strong>filtros são persistentes</strong> durante a sessão de uso, facilitando análises comparativas e ajustes progressivos nos critérios de busca.
            </p>
            <p>
              A <strong>Curva ABC</strong> é uma ferramenta de gestão que classifica itens por importância: 
              Curva A (≤80% acumulado), Curva B (80-95% acumulado) e Curva C (&gt;95% acumulado).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
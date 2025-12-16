// Tipos para indicadores de clientes

export interface MonthlyRevenue {
  year: number;
  month: number; // 1-12
  monthName: string;
  quarter: number; // 1-4
  revenue: number;
  isCurrentMonth: boolean;
  projection?: number; // Apenas para o mês atual
}

export interface QuarterRevenue {
  year: number;
  quarter: number;
  quarterName: string;
  revenue: number;
}

export interface CustomerIndicators {
  clienteId: string;
  
  // ROI
  roi: {
    investimento: number;
    receita: number;
    percentual: number; // (receita - investimento) / investimento * 100
  };
  
  // Mix
  mix: {
    totalDisponivel: number; // Total de produtos disponíveis para venda
    totalAtivo: number; // Total de produtos ativos no mix do cliente
    percentual: number; // (totalAtivo / totalDisponivel) * 100
    variacaoMesAnterior: number; // Diferença em produtos ativos comparado ao mês anterior
  };
  
  // LTV (Lifetime Value)
  ltv: {
    totalReceita: number;
    primeiroPedido?: Date;
    ultimoPedido?: Date;
    totalPedidos: number;
  };
  
  // Performance
  performance: {
    monthlyData: MonthlyRevenue[];
    quarterlyData: QuarterRevenue[];
    averageLast12Months: number; // Média dos últimos 12 meses completos (para projeção)
  };
}

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { FileText } from "lucide-react";
import { DashboardFilters } from "./DashboardMetrics";
import { useAuth } from "../contexts/AuthContext";
import { Transaction } from "../services/dashboardDataService";

interface Sale {
  id: string; // ID real da venda (para navegação)
  numero?: string; // Número formatado do pedido (para exibição)
  cliente: string;
  vendedor: string;
  valor: string;
  status: string;
  data: string;
  natureza: string;
  segmento: string;
  statusCliente: string;
  grupoRede?: string;
  faturado: boolean; // Se é valor faturado ou provisório
}

const statusConfig = {
  "Cancelado": { label: "Cancelado", variant: "destructive" as const },
  cancelada: { label: "Cancelada", variant: "destructive" as const },
};

const periodDescriptions: Record<string, string> = {
  "7": "Transações canceladas dos últimos 7 dias",
  "30": "Transações canceladas dos últimos 30 dias",
  "current_month": "Transações canceladas do mês atual",
  "90": "Transações canceladas dos últimos 90 dias",
  "365": "Transações canceladas do último ano",
  "custom": "Transações canceladas do período selecionado",
};

interface CanceledSalesTableProps {
  period: string;
  filters?: DashboardFilters;
  transactions: Transaction[]; // Receber todas as transações (vamos filtrar por canceladas aqui)
  onVisualizarVenda?: (vendaId: string) => void; // Callback para visualizar pedido
}

export function CanceledSalesTable({ period, filters, transactions, onVisualizarVenda }: CanceledSalesTableProps) {
  const { usuario } = useAuth();
  const ehVendedor = usuario?.tipo === 'vendedor';
  
  // Handler para clique na venda
  const handleClickVenda = (sale: Sale) => {
    console.log('[CANCELED-SALES] 🖱️ Clique na venda cancelada:', {
      id: sale.id,
      cliente: sale.cliente,
      hasCallback: !!onVisualizarVenda
    });
    
    if (onVisualizarVenda) {
      console.log('[CANCELED-SALES] ✅ Chamando onVisualizarVenda com ID:', sale.id);
      onVisualizarVenda(sale.id);
    } else {
      console.warn('[CANCELED-SALES] ⚠️ onVisualizarVenda não está definido!');
    }
  };
  
  // Converter transações para formato de vendas (filtrar apenas canceladas)
  const canceledSales: Sale[] = useMemo(() => {
    // Filtrar apenas vendas canceladas
    const canceledTransactions = transactions.filter(t => 
      t.status === 'Cancelado' || t.status === 'cancelada' || t.status === 'Cancelada'
    );
    
    console.log('[CANCELED-SALES] 📊 Transações canceladas:', {
      total: transactions.length,
      canceladas: canceledTransactions.length
    });
    
    // Ordenar transações por data (mais recente primeiro)
    const sortedTransactions = [...canceledTransactions].sort((a, b) => {
      // Converter data de DD/MM/YYYY para objeto Date
      const [dayA, monthA, yearA] = a.data.split('/').map(Number);
      const [dayB, monthB, yearB] = b.data.split('/').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      
      // Ordenar da mais recente para a mais antiga
      return dateB.getTime() - dateA.getTime();
    });
    
    // Pegar apenas as 10 mais recentes
    const recentTransactions = sortedTransactions.slice(0, 10);
    
    // Converter para formato de Sale
    return recentTransactions.map(t => ({
      id: t.id,
      numero: t.numero,
      cliente: t.cliente,
      vendedor: t.vendedor || 'Não informado',
      valor: typeof t.valor === 'number' ? `R$ ${t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : t.valor,
      status: t.status || 'Cancelado',
      data: t.data,
      natureza: t.natureza || 'Não informado',
      segmento: t.segmento || 'Não informado',
      statusCliente: t.statusCliente || 'Não informado',
      grupoRede: t.grupoRede,
      faturado: false, // Vendas canceladas nunca são faturadas
    }));
  }, [transactions]);
  
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Vendas Canceladas</CardTitle>
        <CardDescription>
          {period.includes('-') 
            ? `Transações canceladas do período selecionado` 
            : (periodDescriptions[period] || periodDescriptions["30"])}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canceledSales.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-center">
            <div>
              <p className="text-muted-foreground">Nenhuma venda cancelada encontrada com os filtros aplicados.</p>
              <p className="text-sm text-muted-foreground mt-1">Excelente! Não há cancelamentos no período.</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Grupo/Rede</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {canceledSales.map((sale) => (
                <TableRow 
                  key={sale.id}
                  className={onVisualizarVenda ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => handleClickVenda(sale)}
                >
                  <TableCell className="font-medium">{sale.numero || sale.id}</TableCell>
                  <TableCell>{sale.cliente}</TableCell>
                  <TableCell className="text-muted-foreground">{sale.grupoRede || "-"}</TableCell>
                  <TableCell>{sale.vendedor}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{sale.valor}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] bg-red-100 text-red-700 hover:bg-red-100">
                              <FileText className="w-3 h-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Venda cancelada (não contabilizada)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>
                    {statusConfig[sale.status as keyof typeof statusConfig] ? (
                      <Badge variant={statusConfig[sale.status as keyof typeof statusConfig].variant}>
                        {statusConfig[sale.status as keyof typeof statusConfig].label}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {sale.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{sale.data}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

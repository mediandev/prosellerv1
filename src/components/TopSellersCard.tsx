import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Trophy, Medal } from "lucide-react";
import { DashboardFilters } from "./DashboardMetrics";
import { useAuth } from "../contexts/AuthContext";
import { 
  Transaction,
  calculateTopSellers,
  TopSeller as Seller
} from "../services/dashboardDataService";

const periodDescriptions: Record<string, string> = {
  "7": "Ranking dos últimos 7 dias",
  "30": "Ranking do último mês",
  "current_month": "Ranking do mês atual",
  "90": "Ranking dos últimos 90 dias",
  "365": "Ranking do último ano",
  "custom": "Ranking do período personalizado",
};

interface TopSellersCardProps {
  period: string;
  filters?: DashboardFilters;
  transactions: Transaction[]; // Receber transações já filtradas
}

export function TopSellersCard({ period, filters, transactions }: TopSellersCardProps) {
  const { usuario } = useAuth();
  const ehVendedor = usuario?.tipo === 'vendedor';
  
  // Ocultar card completamente para vendedores
  if (ehVendedor) {
    return null;
  }
  
  // Calculate top sellers from filtered transactions
  const topSellers = useMemo(() => {
    // Filtrar transações com vendedor identificado (não vazio/null/undefined)
    const transacoesComVendedor = transactions.filter(t => 
      t.vendedor && t.vendedor.trim() !== '' && t.vendedor !== 'N/A' && t.vendedor !== 'Não identificado'
    );
    
    const sellers = calculateTopSellers(transacoesComVendedor);
    
    // Adicionar posição, iniciais e formatar
    return sellers.slice(0, 10).map((seller, index) => {
      const nomes = seller.vendedor.split(' ');
      const iniciais = nomes.length >= 2 
        ? `${nomes[0][0]}${nomes[nomes.length - 1][0]}`
        : seller.vendedor.substring(0, 2);
      
      return {
        nome: seller.vendedor,
        iniciais: iniciais.toUpperCase(),
        posicao: index + 1,
        valor: seller.valor,
        vendas: seller.vendas,
      };
    });
  }, [transactions]);
  
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Vendedores
        </CardTitle>
        <CardDescription>
          {periodDescriptions[period] || periodDescriptions["30"]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {topSellers.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-center">
            <div>
              <p className="text-muted-foreground">Nenhum vendedor encontrado com os filtros aplicados.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {topSellers.map((seller) => (
              <div key={seller.nome} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                  {seller.posicao === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                  {seller.posicao === 2 && <Medal className="h-4 w-4 text-gray-400" />}
                  {seller.posicao === 3 && <Medal className="h-4 w-4 text-amber-700" />}
                  {seller.posicao > 3 && <span className="text-sm text-muted-foreground">{seller.posicao}</span>}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{seller.iniciais}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none">{seller.nome}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {seller.vendas} negócios fechados
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    R$ {(seller.valor / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

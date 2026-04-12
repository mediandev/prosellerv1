import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { AlertTriangle, TrendingDown, UserX, Users, DollarSign, TrendingUp, Activity } from "lucide-react";
import { ClientRiskMetrics } from "../types/clientRisk";

interface ClientsRiskDashboardProps {
  metrics: ClientRiskMetrics;
}

export function ClientsRiskDashboard({ metrics }: ClientsRiskDashboardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Clientes em Risco */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes em Risco</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalClientesEmRisco}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.clientesInativos} inativos + {metrics.clientesComReducao} em redução
          </p>
        </CardContent>
      </Card>

      {/* Nunca Compraram */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Nunca Compraram</CardTitle>
          <UserX className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.clientesNuncaCompraram}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Oportunidades não convertidas
          </p>
        </CardContent>
      </Card>

      {/* Valor em Risco */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Faturamento em Risco</CardTitle>
          <DollarSign className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R$ {(metrics.valorTotalEmRisco / 1000).toLocaleString('pt-BR', { 
              minimumFractionDigits: 1, 
              maximumFractionDigits: 1 
            })}k
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.percentualFaturamentoEmRisco.toFixed(1)}% do faturamento total
          </p>
        </CardContent>
      </Card>

      {/* Taxa de Recuperação */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Recuperação</CardTitle>
          <Activity className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.taxaRecuperacao.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Clientes reativados
          </p>
        </CardContent>
      </Card>

      {/* Redução Média */}
      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Redução Média de Compras</CardTitle>
          <TrendingDown className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.reducaoMediaPercentual.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Entre clientes com redução identificada
          </p>
        </CardContent>
      </Card>

      {/* Clientes Inativos */}
      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes Inativos</CardTitle>
          <Users className="h-4 w-4 text-slate-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.clientesInativos}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Com histórico de compras mas sem atividade recente
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

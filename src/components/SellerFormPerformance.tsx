import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { TrendingUp, Clock, Award, Target, DollarSign } from "lucide-react";
import { Seller, YearlyGoals, MonthlyGoal } from "../types/seller";

interface SellerFormPerformanceProps {
  formData: Partial<Seller>;
  setFormData: (data: Partial<Seller>) => void;
  isEditing: boolean;
  vendedor?: Seller;
}

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function SellerFormPerformance({
  formData,
  setFormData,
  isEditing,
  vendedor,
}: SellerFormPerformanceProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Gerar array de anos (ano atual + 5 anos anteriores + 2 anos futuros)
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  // Obter ou criar metas do ano selecionado
  const getYearlyGoals = (): YearlyGoals => {
    const existing = (formData.metasAnuais || []).find((m) => m.ano === selectedYear);
    if (existing) return existing;

    // Criar novo objeto de metas para o ano
    return {
      ano: selectedYear,
      metas: Array.from({ length: 12 }, (_, i) => ({
        mes: i + 1,
        valor: 0,
      })),
    };
  };

  const yearlyGoals = getYearlyGoals();

  // Atualizar meta de um mês específico
  const handleUpdateMonthGoal = (mes: number, valor: number) => {
    const updatedYearlyGoals = {
      ...yearlyGoals,
      metas: yearlyGoals.metas.map((m) => (m.mes === mes ? { ...m, valor } : m)),
    };

    const updatedMetasAnuais = (formData.metasAnuais || []).filter((m) => m.ano !== selectedYear);
    updatedMetasAnuais.push(updatedYearlyGoals);

    setFormData({
      ...formData,
      metasAnuais: updatedMetasAnuais.sort((a, b) => a.ano - b.ano),
    });
  };

  // Calcular total anual
  const totalAnual = yearlyGoals.metas.reduce((sum, m) => sum + m.valor, 0);

  return (
    <div className="space-y-4">
      {/* Estatísticas do Mês - apenas em modo view/edit com vendedor existente */}
      {vendedor && vendedor.vendas && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estatísticas do Mês</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Vendas Totais</p>
                  <p className="text-2xl">R$ {(vendedor.vendas.mes || 0).toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl">
                    R$ {(vendedor.vendas.ticketMedio || 0).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fechamentos</p>
                  <p className="text-2xl">{vendedor.vendas.qtdFechamentos || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                  <p className="text-2xl">{vendedor.vendas.taxaConversao || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                    <p className="text-xl">{vendedor.performance?.taxaConversao || 0}%</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo Médio</p>
                    <p className="text-xl">{vendedor.performance?.tempoMedioFechamento || 0} dias</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                    <p className="text-xl">{vendedor.performance?.clientesAtivos || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Seção de Metas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Metas Mensais</CardTitle>
              <CardDescription>Defina as metas de vendas por mês</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="year">Ano:</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {yearlyGoals.metas.map((meta) => (
              <div key={meta.mes} className="space-y-2">
                <Label htmlFor={`meta-${meta.mes}`}>{meses[meta.mes - 1]}</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id={`meta-${meta.mes}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={meta.valor || ""}
                    onChange={(e) =>
                      handleUpdateMonthGoal(meta.mes, parseFloat(e.target.value) || 0)
                    }
                    disabled={!isEditing}
                    placeholder="0,00"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total Anual */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-medium">Meta Anual Total ({selectedYear}):</span>
              </div>
              <span className="text-2xl font-bold">
                R$ {totalAnual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {isEditing && (
            <p className="text-xs text-muted-foreground">
              💡 As metas são salvas automaticamente para cada ano. Você pode alternar entre anos
              para visualizar ou editar metas de períodos anteriores ou futuros.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
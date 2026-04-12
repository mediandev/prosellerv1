import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Progress } from "./ui/progress";
import { Seller } from "../types/seller";

interface SellerFormHistoricoVendasProps {
  vendedor?: Seller;
}

export function SellerFormHistoricoVendas({ vendedor }: SellerFormHistoricoVendasProps) {
  if (!vendedor || !vendedor.historico || vendedor.historico.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Histórico de vendas não disponível
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Últimos 5 Meses</CardTitle>
          <CardDescription>Histórico de vendas e metas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vendedor.historico.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{item.mes}</span>
                  <div className="text-right">
                    <p className="font-medium">R$ {item.valor.toLocaleString("pt-BR")}</p>
                    <p className="text-sm text-muted-foreground">
                      Meta: R$ {item.meta.toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                <Progress value={(item.valor / item.meta) * 100} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {((item.valor / item.meta) * 100).toFixed(1)}% da meta
                  </span>
                  <span>
                    {item.valor >= item.meta ? (
                      <span className="text-green-600">✓ Meta atingida</span>
                    ) : (
                      <span>
                        Faltam R$ {(item.meta - item.valor).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card de resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo do Período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Vendido:</span>
            <span className="font-medium">
              R${" "}
              {vendedor.historico
                .reduce((sum, item) => sum + item.valor, 0)
                .toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total de Metas:</span>
            <span className="font-medium">
              R${" "}
              {vendedor.historico
                .reduce((sum, item) => sum + item.meta, 0)
                .toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm text-muted-foreground">Taxa de Atingimento:</span>
            <span className="font-bold text-primary">
              {(
                (vendedor.historico.reduce((sum, item) => sum + item.valor, 0) /
                  vendedor.historico.reduce((sum, item) => sum + item.meta, 0)) *
                100
              ).toFixed(1)}
              %
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
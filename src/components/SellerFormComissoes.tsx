import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Percent } from "lucide-react";
import { Seller, CommissionRule } from "../types/seller";

interface SellerFormComissoesProps {
  formData: Partial<Seller>;
  setFormData: (data: Partial<Seller>) => void;
  isEditing: boolean;
}

export function SellerFormComissoes({
  formData,
  setFormData,
  isEditing,
}: SellerFormComissoesProps) {
  const regraAplicavel = formData.comissoes?.regraAplicavel || "lista_preco";
  const aliquotaFixa = formData.comissoes?.aliquotaFixa || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Regras de Comissionamento</CardTitle>
          <CardDescription>
            Configure como as comissões serão calculadas para este vendedor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="regraAplicavel">
              Regra Aplicável <span className="text-destructive">*</span>
            </Label>
            <Select
              value={regraAplicavel}
              onValueChange={(value: CommissionRule) =>
                setFormData({
                  ...formData,
                  comissoes: {
                    ...formData.comissoes!,
                    regraAplicavel: value,
                    // Limpar aliquotaFixa se mudar para lista_preco
                    aliquotaFixa: value === "lista_preco" ? undefined : formData.comissoes?.aliquotaFixa,
                  },
                })
              }
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aliquota_fixa">Alíquota Fixa</SelectItem>
                <SelectItem value="lista_preco">Definido em Lista de Preço</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {regraAplicavel === "aliquota_fixa"
                ? "As comissões serão calculadas aplicando uma alíquota fixa sobre todas as vendas"
                : "As comissões serão calculadas conforme definido na lista de preço de cada produto"}
            </p>
          </div>

          {/* Mostrar campo de alíquota apenas se for aliquota_fixa */}
          {regraAplicavel === "aliquota_fixa" && (
            <div className="space-y-2">
              <Label htmlFor="aliquotaFixa">
                Alíquota Fixa (%) <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="aliquotaFixa"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={aliquotaFixa || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      comissoes: {
                        ...formData.comissoes!,
                        aliquotaFixa: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  disabled={!isEditing}
                  placeholder="0,00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Percentual que será aplicado sobre o valor das vendas para cálculo da comissão
              </p>
            </div>
          )}

          {/* Informação adicional */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium text-sm">ℹ️ Informação Importante</h4>
            <p className="text-xs text-muted-foreground">
              {regraAplicavel === "aliquota_fixa"
                ? "Com a regra de alíquota fixa, todas as vendas deste vendedor terão a mesma porcentagem de comissão aplicada, independente do produto ou serviço vendido."
                : "Com a regra definida em lista de preço, cada produto ou serviço pode ter uma porcentagem de comissão diferente, configurada individualmente na lista de preços. Isso permite maior flexibilidade no cálculo das comissões."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card de exemplo de cálculo */}
      {regraAplicavel === "aliquota_fixa" && aliquotaFixa > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exemplo de Cálculo</CardTitle>
            <CardDescription>Veja como a comissão será calculada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor da Venda:</span>
                <span className="font-medium">R$ 10.000,00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Alíquota Aplicada:</span>
                <span className="font-medium">{aliquotaFixa}%</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-medium">Comissão:</span>
                <span className="text-xl font-bold text-primary">
                  R$ {((10000 * aliquotaFixa) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

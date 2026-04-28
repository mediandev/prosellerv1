import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Building2, Link } from "lucide-react";
import { Seller } from "../types/seller";

interface SellerFormIntegracoesProps {
  formData: Partial<Seller>;
  setFormData: (data: Partial<Seller>) => void;
  isEditing: boolean;
}

export function SellerFormIntegracoes({
  formData,
  setFormData,
  isEditing,
}: SellerFormIntegracoesProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Integrações com ERP</CardTitle>
          <CardDescription>
            Configure o ID do vendedor no Tiny ERP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <Link className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Como funciona a integração?</p>
              <p className="text-sm text-muted-foreground">
                Ao cadastrar o ID do vendedor no Tiny ERP, os pedidos enviados pelo ProSeller
                serão automaticamente vinculados ao vendedor correto no ERP, facilitando o
                controle e evitando erros de lançamento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tiny ERP
          </CardTitle>
          <CardDescription>
            Esse ID é usado em todos os pedidos enviados ao Tiny, independente da empresa de faturamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="idTiny">ID do vendedor no Tiny</Label>
            <Input
              id="idTiny"
              value={formData.idTiny || ""}
              onChange={(e) => setFormData({ ...formData, idTiny: e.target.value })}
              disabled={!isEditing}
              placeholder="Digite o ID do vendedor no Tiny"
            />
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium">💡 Onde encontrar o ID do vendedor no Tiny?</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Acesse o Tiny ERP</li>
              <li>Vá em Cadastros → Vendedores</li>
              <li>Clique no vendedor desejado</li>
              <li>O ID aparecerá na URL ou no campo "Código" do cadastro</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

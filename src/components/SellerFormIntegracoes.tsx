import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Building2, Link, CheckCircle, Plus, Trash2 } from "lucide-react";
import { Seller } from "../types/seller";
import { useCompanies } from "../hooks/useCompanies";
import { Combobox } from "./ui/combobox";

interface SellerFormIntegracoesProps {
  formData: Partial<Seller>;
  setFormData: (data: Partial<Seller>) => void;
  isEditing: boolean;
}

interface SellerERPCompany {
  id: string;
  empresaId: string;
  empresaNome: string;
  idTiny: string;
}

export function SellerFormIntegracoes({
  formData,
  setFormData,
  isEditing,
}: SellerFormIntegracoesProps) {
  const { companies } = useCompanies();
  
  // Estado local para gerenciar as empresas vinculadas ao vendedor
  const [erpCompanies, setERPCompanies] = useState<SellerERPCompany[]>(() => {
    const tinyIntegration = formData.integracoes?.find((i) => i.erpNome === "Tiny ERP");
    if (tinyIntegration && tinyIntegration.empresas.length > 0) {
      return tinyIntegration.empresas.map((emp) => ({
        id: emp.empresaId,
        empresaId: emp.empresaId,
        empresaNome: emp.empresaNome,
        idTiny: emp.chaveCorrespondente,
      }));
    }
    return [];
  });

  // Adicionar nova empresa
  const handleAddCompany = () => {
    const newCompany: SellerERPCompany = {
      id: Date.now().toString(),
      empresaId: "",
      empresaNome: "",
      idTiny: "",
    };
    setERPCompanies([...erpCompanies, newCompany]);
  };

  // Remover empresa
  const handleRemoveCompany = (id: string) => {
    setERPCompanies(erpCompanies.filter((c) => c.id !== id));
    updateFormData(erpCompanies.filter((c) => c.id !== id));
  };

  // Atualizar empresa
  const handleUpdateCompany = (id: string, empresaId: string, idTiny: string) => {
    const company = companyService.getById(empresaId);
    const updatedCompanies = erpCompanies.map((c) =>
      c.id === id
        ? {
            ...c,
            empresaId,
            empresaNome: company?.nomeFantasia || "",
            idTiny,
          }
        : c
    );
    setERPCompanies(updatedCompanies);
    updateFormData(updatedCompanies);
  };

  // Atualizar apenas o ID Tiny
  const handleUpdateIdTiny = (id: string, idTiny: string) => {
    const updatedCompanies = erpCompanies.map((c) =>
      c.id === id ? { ...c, idTiny } : c
    );
    setERPCompanies(updatedCompanies);
    updateFormData(updatedCompanies);
  };

  // Atualizar formData com as mudanças
  const updateFormData = (companies: SellerERPCompany[]) => {
    const tinyIntegration = {
      erpNome: "Tiny ERP",
      ativo: true,
      empresas: companies.map((c) => ({
        empresaId: c.empresaId,
        empresaNome: c.empresaNome,
        chaveCorrespondente: c.idTiny,
      })),
    };

    const otherIntegrations = (formData.integracoes || []).filter(
      (i) => i.erpNome !== "Tiny ERP"
    );

    setFormData({
      ...formData,
      integracoes: [...otherIntegrations, tinyIntegration],
    });
  };

  // Verificar se a empresa já está na lista
  const isCompanyAlreadyAdded = (empresaId: string, currentId: string) => {
    return erpCompanies.some((c) => c.empresaId === empresaId && c.id !== currentId);
  };

  // Obter empresas disponíveis para seleção
  const getAvailableCompanies = (currentId: string) => {
    return companies
      .filter((company) => {
        // Filtrar empresas que já foram adicionadas, exceto a empresa atual
        const isAdded = isCompanyAlreadyAdded(company.id, currentId);
        return !isAdded;
      })
      .map((company) => ({
        value: company.id,
        label: `${company.nomeFantasia} (${company.cnpj})`,
      }));
  };

  return (
    <div className="space-y-4">
      {/* Informação sobre integrações */}
      <Card>
        <CardHeader>
          <CardTitle>Integrações com ERP</CardTitle>
          <CardDescription>
            Configure os IDs do vendedor em cada empresa no Tiny ERP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <Link className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Como funciona a integração?</p>
              <p className="text-sm text-muted-foreground">
                Ao cadastrar o ID do vendedor no sistema Tiny ERP para cada empresa, os pedidos
                enviados pelo ProSeller serão automaticamente vinculados ao vendedor correto no
                ERP, facilitando o controle e evitando erros de lançamento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção Tiny ERP */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Tiny ERP
              </CardTitle>
              <CardDescription>
                Vincule o vendedor às empresas e informe o ID correspondente
              </CardDescription>
            </div>
            {isEditing && (
              <Button onClick={handleAddCompany} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Empresa
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {erpCompanies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Nenhuma empresa vinculada ao vendedor
              </p>
              {isEditing && (
                <Button onClick={handleAddCompany} variant="outline" size="sm" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeira Empresa
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {erpCompanies.map((company) => (
                <Card key={company.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Empresa e ID Tiny</Label>
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCompany(company.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Empresa</Label>
                          <Combobox
                            options={getAvailableCompanies(company.id)}
                            value={company.empresaId}
                            onValueChange={(value) =>
                              handleUpdateCompany(company.id, value, company.idTiny)
                            }
                            placeholder="Selecione a empresa"
                            searchPlaceholder="Buscar empresa..."
                            emptyText="Nenhuma empresa disponível"
                            disabled={!isEditing}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>ID Tiny</Label>
                          <Input
                            value={company.idTiny}
                            onChange={(e) => handleUpdateIdTiny(company.id, e.target.value)}
                            disabled={!isEditing || !company.empresaId}
                            placeholder="Digite o ID do vendedor no Tiny"
                          />
                        </div>
                      </div>

                      {company.empresaId && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>
                            CNPJ:{" "}
                            {companyService.getById(company.empresaId)?.cnpj || "-"}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

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

      {/* Status da Integração */}
      {erpCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status da Integração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {erpCompanies.map((company) => {
                const configurado = company.empresaId && company.idTiny && company.idTiny.length > 0;

                return (
                  <div key={company.id} className="flex items-center justify-between">
                    <span className="text-sm">
                      {company.empresaNome || "Empresa não selecionada"}
                    </span>
                    {configurado ? (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configurado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
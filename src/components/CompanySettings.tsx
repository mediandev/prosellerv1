import { Company, CompanyBankAccount } from '../types/company';
import { api } from '../services/api';
import { useState, useEffect } from 'react';
import { useCompanies } from '../hooks/useCompanies';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Combobox } from "./ui/combobox";
import { Building2, MapPin, Mail, Phone, FileText, CreditCard, Pencil, Trash2, Plus, Search, X, Save, Check, Edit, Settings } from "lucide-react";
import { applyCNPJMask, applyCEPMask, applyPhoneMask, applyCPFCNPJMask } from '../lib/masks';
import { municipiosPorUF, ufs } from '../data/municipios';
import { toast } from "sonner@2.0.3";
import { companyService } from '../services/companyService';
import { CompanyERPDialog } from './CompanyERPDialog';
import { ERPStatusBadge } from './ERPStatusBadge';
import { mockBanks as bancosDisponiveis, accountTypes, pixKeyTypes } from '../data/mockBanks';

// Componente auxiliar para diálogo de confirmação de exclusão
function DeleteConfirmDialog({ 
  open, 
  onOpenChange, 
  onConfirm,
  title,
  description 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onConfirm: () => void;
  title: string;
  description: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CompanySettings() {
  const { companies, reload: reloadCompanies, updateCompany, deleteCompany, addCompany } = useCompanies();
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [erpDialogOpen, setErpDialogOpen] = useState(false);
  const [companyForERP, setCompanyForERP] = useState<Company | null>(null);

  const [formData, setFormData] = useState<Partial<Company>>({
    cnpj: "",
    razaoSocial: "",
    nomeFantasia: "",
    inscricaoEstadual: "",
    endereco: {
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      uf: "",
      municipio: "",
    },
    contasBancarias: [],
    integracoesERP: [],
    ativo: true,
  });

  const handleBuscarCNPJ = async () => {
    const cnpj = formData.cnpj?.replace(/\D/g, "");
    if (!cnpj || cnpj.length !== 14) {
      toast.error("CNPJ inválido");
      return;
    }

    setLoadingCNPJ(true);
    try {
      const response = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`);
      const data = await response.json();

      if (data.status === 400) {
        toast.error("CNPJ não encontrado");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        razaoSocial: data.razao_social || "",
        nomeFantasia: data.estabelecimento?.nome_fantasia || "",
        // Mantém a inscrição estadual atual - não preenche automaticamente pois a API pode retornar dados incorretos
        inscricaoEstadual: prev.inscricaoEstadual || "",
        endereco: {
          cep: data.estabelecimento?.cep?.replace(/\D/g, "") || "",
          logradouro: data.estabelecimento?.logradouro || "",
          numero: data.estabelecimento?.numero || "",
          complemento: data.estabelecimento?.complemento || "",
          bairro: data.estabelecimento?.bairro || "",
          uf: data.estabelecimento?.estado?.sigla || "",
          municipio: data.estabelecimento?.cidade?.nome || "",
        },
      }));

      toast.success("Dados do CNPJ carregados!");
    } catch (error) {
      toast.error("Erro ao buscar CNPJ");
    } finally {
      setLoadingCNPJ(false);
    }
  };

  const handleBuscarCEP = async () => {
    const cep = formData.endereco?.cep?.replace(/\D/g, "");
    if (!cep || cep.length !== 8) {
      toast.error("CEP inválido");
      return;
    }

    setLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        endereco: {
          ...prev.endereco!,
          logradouro: data.logradouro || "",
          bairro: data.bairro || "",
          uf: data.uf || "",
          municipio: data.localidade || "",
        },
      }));

      toast.success("Endereço encontrado!");
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoadingCEP(false);
    }
  };

  const handleAddBankAccount = () => {
    const newAccount: CompanyBankAccount = {
      id: Date.now().toString(),
      banco: "",
      agencia: "",
      digitoAgencia: "",
      tipoConta: "corrente",
      numeroConta: "",
      digitoConta: "",
      tipoChavePix: "cpf_cnpj",
      chavePix: "",
    };

    setFormData((prev) => ({
      ...prev,
      contasBancarias: [...(prev.contasBancarias || []), newAccount],
    }));
  };

  const handleRemoveBankAccount = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      contasBancarias: (prev.contasBancarias || []).filter((acc) => acc.id !== id),
    }));
  };

  const handleUpdateBankAccount = (
    id: string,
    field: keyof CompanyBankAccount,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      contasBancarias: (prev.contasBancarias || []).map((acc) =>
        acc.id === id ? { ...acc, [field]: value } : acc
      ),
    }));
  };

  const handleSave = async () => {
    if (!formData.cnpj || !formData.razaoSocial) {
      toast.error("Preencha os campos obrigatórios (CNPJ e Razão Social)");
      return;
    }

    try {
      // Verificar CNPJ duplicado
      const exists = await companyService.existsByCNPJ(formData.cnpj, editingCompany?.id);
      if (exists) {
        toast.error("Já existe uma empresa cadastrada com este CNPJ");
        return;
      }

      // Garantir que nomeFantasia tenha valor (usar razaoSocial se estiver vazio)
      const empresaParaSalvar = {
        ...formData,
        nomeFantasia: formData.nomeFantasia?.trim() || formData.razaoSocial,
      };

      if (editingCompany) {
        // Atualizar empresa existente
        const updated = await updateCompany(editingCompany.id, empresaParaSalvar as Company);
        if (updated) {
          toast.success("Empresa atualizada com sucesso!");
        } else {
          toast.error("Erro ao atualizar empresa");
          return;
        }
      } else {
        // Criar nova empresa
        await addCompany(empresaParaSalvar as Omit<Company, 'id' | 'dataCadastro'>);
        toast.success("Empresa cadastrada com sucesso!");
      }

      handleCancel();
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      toast.error("Erro ao salvar empresa");
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData(company);
    setIsCreating(true);
  };

  const handleDelete = (id: string) => {
    setCompanyToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfigureERP = (company: Company) => {
    setCompanyForERP(company);
    setErpDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (companyToDelete) {
      try {
        const success = await deleteCompany(companyToDelete);
        if (success) {
          toast.success("Empresa removida com sucesso!");
        } else {
          toast.error("Erro ao remover empresa");
        }
      } catch (error) {
        console.error('Erro ao remover empresa:', error);
        toast.error("Erro ao remover empresa");
      }
      setCompanyToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingCompany(null);
    setFormData({
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      inscricaoEstadual: "",
      endereco: {
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        uf: "",
        municipio: "",
      },
      contasBancarias: [],
      integracoesERP: [],
      ativo: true,
    });
  };

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl">
            {editingCompany ? "Editar Empresa" : "Nova Empresa"}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Dados Cadastrais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Cadastrais</CardTitle>
            <CardDescription>Informações da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">
                  CNPJ <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cnpj"
                    value={formData.cnpj || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cnpj: applyCNPJMask(e.target.value) }))
                    }
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                  <Button
                    onClick={handleBuscarCNPJ}
                    disabled={loadingCNPJ}
                    size="icon"
                    variant="outline"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                <Input
                  id="inscricaoEstadual"
                  value={formData.inscricaoEstadual || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, inscricaoEstadual: e.target.value.replace(/\D/g, "") }))
                  }
                  placeholder="Somente números"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="razaoSocial">
                  Razão Social <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="razaoSocial"
                  value={formData.razaoSocial || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, razaoSocial: e.target.value }))}
                  placeholder="Razão social da empresa"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                <Input
                  id="nomeFantasia"
                  value={formData.nomeFantasia || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nomeFantasia: e.target.value }))}
                  placeholder="Nome fantasia da empresa"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Localização da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="flex gap-2">
                  <Input
                    id="cep"
                    value={formData.endereco?.cep || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        endereco: {
                          ...prev.endereco!,
                          cep: applyCEPMask(e.target.value),
                        },
                      }))
                    }
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  <Button
                    onClick={handleBuscarCEP}
                    disabled={loadingCEP}
                    size="icon"
                    variant="outline"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.endereco?.numero || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endereco: { ...prev.endereco!, numero: e.target.value },
                    }))
                  }
                  placeholder="Nº"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  value={formData.endereco?.logradouro || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endereco: { ...prev.endereco!, logradouro: e.target.value },
                    }))
                  }
                  placeholder="Rua, avenida, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={formData.endereco?.complemento || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endereco: { ...prev.endereco!, complemento: e.target.value },
                    }))
                  }
                  placeholder="Apto, sala, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.endereco?.bairro || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endereco: { ...prev.endereco!, bairro: e.target.value },
                    }))
                  }
                  placeholder="Bairro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Combobox
                  options={ufs.map((uf) => ({ value: uf, label: uf }))}
                  value={formData.endereco?.uf || ""}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      endereco: { ...prev.endereco!, uf: value, municipio: "" },
                    }));
                  }}
                  placeholder="Selecione a UF"
                  searchPlaceholder="Buscar UF..."
                  emptyText="UF não encontrada"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="municipio">Município</Label>
                <Combobox
                  options={
                    formData.endereco?.uf
                      ? municipiosPorUF[formData.endereco.uf]?.map((m) => ({
                          value: m,
                          label: m,
                        })) || []
                      : []
                  }
                  value={formData.endereco?.municipio || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      endereco: { ...prev.endereco!, municipio: value },
                    }))
                  }
                  placeholder="Selecione o município"
                  searchPlaceholder="Buscar município..."
                  emptyText="Município não encontrado"
                  disabled={!formData.endereco?.uf}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contas Bancárias */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Contas Bancárias</CardTitle>
                <CardDescription>Dados bancários da empresa</CardDescription>
              </div>
              <Button onClick={handleAddBankAccount} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Conta
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(formData.contasBancarias || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma conta bancária cadastrada
              </p>
            ) : (
              <div className="space-y-4">
                {(formData.contasBancarias || []).map((conta) => (
                  <Card key={conta.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Conta Bancária</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBankAccount(conta.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-3 space-y-2">
                            <Label>Banco</Label>
                            <Combobox
                              options={bancosDisponiveis.map((b) => ({
                                value: b.codigo,
                                label: b.nomeCompleto,
                              }))}
                              value={conta.banco}
                              onValueChange={(value) =>
                                handleUpdateBankAccount(conta.id, "banco", value)
                              }
                              placeholder="Selecione o banco"
                              searchPlaceholder="Buscar banco..."
                              emptyText="Nenhum banco encontrado"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Agência</Label>
                            <Input
                              value={conta.agencia}
                              onChange={(e) =>
                                handleUpdateBankAccount(
                                  conta.id,
                                  "agencia",
                                  e.target.value.replace(/\D/g, "")
                                )
                              }
                              placeholder="0000"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Dígito</Label>
                            <Input
                              value={conta.digitoAgencia}
                              onChange={(e) =>
                                handleUpdateBankAccount(
                                  conta.id,
                                  "digitoAgencia",
                                  e.target.value.replace(/\D/g, "")
                                )
                              }
                              placeholder="0"
                              maxLength={1}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select
                              value={conta.tipoConta}
                              onValueChange={(value: any) =>
                                handleUpdateBankAccount(conta.id, "tipoConta", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {accountTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Conta</Label>
                            <Input
                              value={conta.numeroConta}
                              onChange={(e) =>
                                handleUpdateBankAccount(
                                  conta.id,
                                  "numeroConta",
                                  e.target.value.replace(/\D/g, "")
                                )
                              }
                              placeholder="00000"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Dígito</Label>
                            <Input
                              value={conta.digitoConta}
                              onChange={(e) =>
                                handleUpdateBankAccount(
                                  conta.id,
                                  "digitoConta",
                                  e.target.value.replace(/\D/g, "")
                                )
                              }
                              placeholder="0"
                              maxLength={2}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Tipo Chave Pix</Label>
                            <Select
                              value={conta.tipoChavePix}
                              onValueChange={(value: any) =>
                                handleUpdateBankAccount(conta.id, "tipoChavePix", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {pixKeyTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-2 space-y-2">
                            <Label>Chave Pix</Label>
                            <Input
                              value={conta.chavePix}
                              onChange={(e) => {
                                let value = e.target.value;
                                if (conta.tipoChavePix === "cpf_cnpj") {
                                  value = applyCPFCNPJMask(value);
                                } else if (conta.tipoChavePix === "telefone") {
                                  value = applyPhoneMask(value);
                                }
                                handleUpdateBankAccount(conta.id, "chavePix", value);
                              }}
                              placeholder={
                                conta.tipoChavePix === "cpf_cnpj"
                                  ? "00.000.000/0000-00"
                                  : conta.tipoChavePix === "email"
                                  ? "email@exemplo.com"
                                  : conta.tipoChavePix === "telefone"
                                  ? "(00) 00000-0000"
                                  : "Chave aleatória"
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl">Empresas</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as empresas do sistema
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{company.nomeFantasia}</CardTitle>
                    <p className="text-sm text-muted-foreground">{company.cnpj}</p>
                  </div>
                </div>
                <Badge variant={company.ativo ? "default" : "secondary"}>
                  {company.ativo ? "Ativa" : "Inativa"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Razão Social</p>
                <p className="text-sm font-medium">{company.razaoSocial}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Localização</p>
                <p className="text-sm font-medium">
                  {company.endereco.municipio}, {company.endereco.uf}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Contas Bancárias</p>
                <p className="text-sm font-medium">
                  {company.contasBancarias.length}{" "}
                  {company.contasBancarias.length === 1 ? "conta" : "contas"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Integração ERP</p>
                <div className="mt-1">
                  <ERPStatusBadge empresaId={company.id} />
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(company)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConfigureERP(company)}
                  title="Configurar Integração ERP"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(company.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CompanyERPDialog
        open={erpDialogOpen}
        onOpenChange={setErpDialogOpen}
        company={companyForERP}
        onSuccess={() => reloadCompanies()}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Excluir Empresa"
        description="Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
import { useState, useEffect } from "react";
import { Combobox } from "./ui/combobox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { User, Mail, Phone, MapPin, Calendar, CreditCard, Building2, Trash2, Plus, Search } from "lucide-react";
import { municipiosPorUF, ufs } from "../data/municipios";
import { api } from '../services/api';
import { applyCPFMask, applyCEPMask, applyPhoneMask, applyCPFCNPJMask, applyCNPJMask } from '../lib/masks';
import { toast } from "sonner";
import type { Seller, SellerBankAccount, AdditionalContact, AccountType, PixKeyType } from '../types/seller';

// Constantes locais (anteriormente em mockBanks)
const accountTypes = [
  { value: "corrente", label: "Conta Corrente" },
  { value: "poupanca", label: "Conta Poupança" },
  { value: "pagamento", label: "Conta Pagamento" },
];

const pixKeyTypes = [
  { value: "cpf_cnpj", label: "CPF/CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Chave Aleatória" },
];

interface SellerFormDadosCadastraisProps {
  formData: Partial<Seller>;
  setFormData: (data: Partial<Seller>) => void;
  isEditing: boolean;
}

export function SellerFormDadosCadastrais({
  formData,
  setFormData,
  isEditing,
}: SellerFormDadosCadastraisProps) {
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [mockBanks, setMockBanks] = useState<any[]>([]);

  // Carregar bancos
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const data = await api.get('bancos');
        setMockBanks(data || []);
      } catch (error) {
        console.error('[SELLER-FORM] Erro ao carregar bancos:', error);
        setMockBanks([]);
      }
    };
    fetchBanks();
  }, []);

  // Buscar CEP
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

      setFormData({
        ...formData,
        endereco: {
          ...formData.endereco!,
          logradouro: data.logradouro || "",
          bairro: data.bairro || "",
          uf: data.uf || "",
          municipio: data.localidade || "",
        },
      });

      toast.success("Endereço encontrado!");
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoadingCEP(false);
    }
  };

  // Buscar CNPJ
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

      setFormData({
        ...formData,
        razaoSocial: data.razao_social || "",
        nomeFantasia: data.estabelecimento?.nome_fantasia || "",
        endereco: {
          ...formData.endereco,
          cep: data.estabelecimento?.cep?.replace(/\D/g, "") || "",
          logradouro: data.estabelecimento?.logradouro || "",
          numero: data.estabelecimento?.numero || "",
          complemento: data.estabelecimento?.complemento || "",
          bairro: data.estabelecimento?.bairro || "",
          uf: data.estabelecimento?.estado?.sigla || "",
          municipio: data.estabelecimento?.cidade?.nome || "",
          enderecoEntregaDiferente: false,
        },
      });

      toast.success("Dados do CNPJ carregados!");
    } catch (error) {
      toast.error("Erro ao buscar CNPJ");
    } finally {
      setLoadingCNPJ(false);
    }
  };

  // Adicionar contato adicional
  const handleAddContact = () => {
    const newContact: AdditionalContact = {
      id: Date.now().toString(),
      nome: "",
      email: "",
      telefoneCelular: "",
      telefoneFixo: "",
      ramal: "",
      observacoes: "",
    };
    setFormData({
      ...formData,
      contatosAdicionais: [...(formData.contatosAdicionais || []), newContact],
    });
  };

  // Remover contato adicional
  const handleRemoveContact = (id: string) => {
    setFormData({
      ...formData,
      contatosAdicionais: (formData.contatosAdicionais || []).filter((c) => c.id !== id),
    });
  };

  // Atualizar contato adicional
  const handleUpdateContact = (id: string, field: keyof AdditionalContact, value: string) => {
    setFormData({
      ...formData,
      contatosAdicionais: (formData.contatosAdicionais || []).map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    });
  };

  return (
    <div className="space-y-4">
      {/* Seção Identificação */}
      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
          <CardDescription>Dados básicos do vendedor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="nome">
                Nome Completo <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="nome"
                  value={formData.nome || ""}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Digite o nome completo"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">
                CPF <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cpf"
                value={formData.cpf || ""}
                onChange={(e) => setFormData({ ...formData, cpf: applyCPFMask(e.target.value) })}
                disabled={!isEditing}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                E-mail <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="telefone"
                  value={formData.telefone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: applyPhoneMask(e.target.value) })
                  }
                  disabled={!isEditing}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataAdmissao">Data de Admissão</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="dataAdmissao"
                  type="date"
                  value={formData.dataAdmissao || ""}
                  onChange={(e) => setFormData({ ...formData, dataAdmissao: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || "ativo"}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="excluido">Excluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Acesso ao Sistema */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="acessoSistema"
                checked={formData.acessoSistema || false}
                onCheckedChange={(checked) => {
                  const acessoSistema = checked === true;
                  setFormData({
                    ...formData,
                    acessoSistema,
                    emailAcesso: acessoSistema ? (formData.emailAcesso || formData.email || '') : '',
                  });
                }}
                disabled={!isEditing}
              />
              <Label
                htmlFor="acessoSistema"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Acesso ao Sistema
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Marque esta opção para criar um usuário e permitir que o vendedor acesse o sistema
            </p>

            {formData.acessoSistema && (
              <div className="space-y-2 animate-in fade-in-50">
                <Label htmlFor="emailAcesso">
                  E-mail de Acesso ao Sistema <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="emailAcesso"
                    type="email"
                    value={formData.emailAcesso || ""}
                    onChange={(e) => setFormData({ ...formData, emailAcesso: e.target.value })}
                    disabled={!isEditing}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Este e-mail será usado para login no sistema. Uma senha temporária será gerada automaticamente.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seção Contatos Adicionais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contatos Adicionais</CardTitle>
              <CardDescription>Outros contatos do vendedor</CardDescription>
            </div>
            {isEditing && (
              <Button onClick={handleAddContact} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Contato
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(formData.contatosAdicionais || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum contato adicional cadastrado
            </p>
          ) : (
            <div className="space-y-4">
              {(formData.contatosAdicionais || []).map((contato) => (
                <Card key={contato.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Contato</Label>
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveContact(contato.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input
                            value={contato.nome}
                            onChange={(e) => handleUpdateContact(contato.id, "nome", e.target.value)}
                            disabled={!isEditing}
                            placeholder="Nome da pessoa"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>E-mail</Label>
                          <Input
                            type="email"
                            value={contato.email}
                            onChange={(e) => handleUpdateContact(contato.id, "email", e.target.value)}
                            disabled={!isEditing}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Telefone Celular</Label>
                          <Input
                            value={contato.telefoneCelular}
                            onChange={(e) =>
                              handleUpdateContact(
                                contato.id,
                                "telefoneCelular",
                                applyPhoneMask(e.target.value)
                              )
                            }
                            disabled={!isEditing}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Telefone Fixo</Label>
                          <Input
                            value={contato.telefoneFixo}
                            onChange={(e) =>
                              handleUpdateContact(
                                contato.id,
                                "telefoneFixo",
                                applyPhoneMask(e.target.value)
                              )
                            }
                            disabled={!isEditing}
                            placeholder="(00) 0000-0000"
                            maxLength={14}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ramal</Label>
                          <Input
                            value={contato.ramal}
                            onChange={(e) =>
                              handleUpdateContact(
                                contato.id,
                                "ramal",
                                e.target.value.replace(/\D/g, "")
                              )
                            }
                            disabled={!isEditing}
                            placeholder="0000"
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Observações</Label>
                          <Textarea
                            value={contato.observacoes}
                            onChange={(e) =>
                              handleUpdateContact(contato.id, "observacoes", e.target.value)
                            }
                            disabled={!isEditing}
                            placeholder="Informações adicionais sobre este contato"
                            rows={2}
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

      {/* Seção Dados PJ */}
      <Card>
        <CardHeader>
          <CardTitle>Dados PJ</CardTitle>
          <CardDescription>Informações da pessoa jurídica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <div className="flex gap-2">
                <Input
                  id="cnpj"
                  value={formData.cnpj || ""}
                  onChange={(e) => {
                    const maskedValue = applyCNPJMask(e.target.value);
                    setFormData({ ...formData, cnpj: maskedValue });
                  }}
                  disabled={!isEditing}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                {isEditing && (
                  <Button
                    onClick={handleBuscarCNPJ}
                    disabled={loadingCNPJ}
                    size="icon"
                    variant="outline"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
              <Input
                id="inscricaoEstadual"
                value={formData.inscricaoEstadual || ""}
                onChange={(e) =>
                  setFormData({ ...formData, inscricaoEstadual: e.target.value.replace(/\D/g, "") })
                }
                disabled={!isEditing}
                placeholder="Somente números"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="razaoSocial">Razão Social</Label>
              <Input
                id="razaoSocial"
                value={formData.razaoSocial || ""}
                onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                disabled={!isEditing}
                placeholder="Razão social da empresa"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
              <Input
                id="nomeFantasia"
                value={formData.nomeFantasia || ""}
                onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                disabled={!isEditing}
                placeholder="Nome fantasia da empresa"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção Dados Bancários */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Bancários</CardTitle>
          <CardDescription>Informações para pagamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="banco">Banco</Label>
              <Combobox
                options={mockBanks.map((b) => ({ value: b.codigo, label: b.nomeCompleto }))}
                value={formData.dadosBancarios?.banco || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    dadosBancarios: { ...formData.dadosBancarios!, banco: value },
                  })
                }
                placeholder="Selecione o banco"
                searchPlaceholder="Buscar banco..."
                emptyText="Nenhum banco encontrado"
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agencia">Agência</Label>
              <Input
                id="agencia"
                value={formData.dadosBancarios?.agencia || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dadosBancarios: {
                      ...formData.dadosBancarios!,
                      agencia: e.target.value.replace(/\D/g, ""),
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="0000"
              />
              <p className="text-xs text-muted-foreground">Preencha agência e dígito separadamente</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="digitoAgencia">Dígito da Agência</Label>
              <Input
                id="digitoAgencia"
                value={formData.dadosBancarios?.digitoAgencia || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dadosBancarios: {
                      ...formData.dadosBancarios!,
                      digitoAgencia: e.target.value.replace(/\D/g, ""),
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="0"
                maxLength={1}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="tipoConta">Tipo de Conta</Label>
              <Combobox
                options={accountTypes.map((t) => ({ value: t.value, label: t.label }))}
                value={formData.dadosBancarios?.tipoConta || ""}
                onValueChange={(value: AccountType) =>
                  setFormData({
                    ...formData,
                    dadosBancarios: { ...formData.dadosBancarios!, tipoConta: value },
                  })
                }
                placeholder="Selecione o tipo de conta"
                searchPlaceholder="Buscar tipo..."
                emptyText="Nenhum tipo encontrado"
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroConta">Número da Conta</Label>
              <Input
                id="numeroConta"
                value={formData.dadosBancarios?.numeroConta || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dadosBancarios: {
                      ...formData.dadosBancarios!,
                      numeroConta: e.target.value.replace(/\D/g, ""),
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="00000000"
              />
              <p className="text-xs text-muted-foreground">Preencha conta e dígito separadamente</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="digitoConta">Dígito da Conta</Label>
              <Input
                id="digitoConta"
                value={formData.dadosBancarios?.digitoConta || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dadosBancarios: {
                      ...formData.dadosBancarios!,
                      digitoConta: e.target.value.replace(/\D/g, ""),
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="0"
                maxLength={2}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="nomeTitular">Nome do Titular</Label>
              <Input
                id="nomeTitular"
                value={formData.dadosBancarios?.nomeTitular || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dadosBancarios: { ...formData.dadosBancarios!, nomeTitular: e.target.value },
                  })
                }
                disabled={!isEditing}
                placeholder="Nome completo do titular"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="cpfCnpjTitular">CPF ou CNPJ do Titular</Label>
              <Input
                id="cpfCnpjTitular"
                value={formData.dadosBancarios?.cpfCnpjTitular || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dadosBancarios: {
                      ...formData.dadosBancarios!,
                      cpfCnpjTitular: applyCPFCNPJMask(e.target.value),
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoChavePix">Tipo de Chave Pix</Label>
              <Select
                value={formData.dadosBancarios?.tipoChavePix || ""}
                onValueChange={(value: PixKeyType) =>
                  setFormData({
                    ...formData,
                    dadosBancarios: { ...formData.dadosBancarios!, tipoChavePix: value },
                  })
                }
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
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

            <div className="space-y-2">
              <Label htmlFor="chavePix">Chave Pix</Label>
              <Input
                id="chavePix"
                value={formData.dadosBancarios?.chavePix || ""}
                onChange={(e) => {
                  let value = e.target.value;
                  const tipoChave = formData.dadosBancarios?.tipoChavePix;

                  // Aplicar máscara conforme o tipo
                  if (tipoChave === "cpf_cnpj") {
                    value = applyCPFCNPJMask(value);
                  } else if (tipoChave === "telefone") {
                    value = applyPhoneMask(value);
                  }

                  setFormData({
                    ...formData,
                    dadosBancarios: { ...formData.dadosBancarios!, chavePix: value },
                  });
                }}
                disabled={!isEditing}
                placeholder={
                  formData.dadosBancarios?.tipoChavePix === "cpf_cnpj"
                    ? "000.000.000-00"
                    : formData.dadosBancarios?.tipoChavePix === "email"
                    ? "email@exemplo.com"
                    : formData.dadosBancarios?.tipoChavePix === "telefone"
                    ? "(00) 00000-0000"
                    : "Chave aleatória"
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção Endereço */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
          <CardDescription>Localização do vendedor</CardDescription>
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
                    setFormData({
                      ...formData,
                      endereco: {
                        ...formData.endereco!,
                        cep: applyCEPMask(e.target.value),
                      },
                    })
                  }
                  disabled={!isEditing}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {isEditing && (
                  <Button
                    onClick={handleBuscarCEP}
                    disabled={loadingCEP}
                    size="icon"
                    variant="outline"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="logradouro">Logradouro</Label>
              <Input
                id="logradouro"
                value={formData.endereco?.logradouro || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    endereco: { ...formData.endereco!, logradouro: e.target.value },
                  })
                }
                disabled={!isEditing}
                placeholder="Rua, avenida, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={formData.endereco?.numero || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    endereco: { ...formData.endereco!, numero: e.target.value },
                  })
                }
                disabled={!isEditing}
                placeholder="Nº"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={formData.endereco?.complemento || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    endereco: { ...formData.endereco!, complemento: e.target.value },
                  })
                }
                disabled={!isEditing}
                placeholder="Apto, sala, etc."
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.endereco?.bairro || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    endereco: { ...formData.endereco!, bairro: e.target.value },
                  })
                }
                disabled={!isEditing}
                placeholder="Bairro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Combobox
                options={ufs.map((uf) => ({ value: uf, label: uf }))}
                value={formData.endereco?.uf || ""}
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    endereco: { ...formData.endereco!, uf: value, municipio: "" },
                  });
                }}
                placeholder="Selecione a UF"
                searchPlaceholder="Buscar UF..."
                emptyText="UF não encontrada"
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="municipio">Município</Label>
              <Combobox
                options={
                  formData.endereco?.uf
                    ? municipiosPorUF[formData.endereco.uf]?.map((m) => ({ value: m, label: m })) || []
                    : []
                }
                value={formData.endereco?.municipio || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    endereco: { ...formData.endereco!, municipio: value },
                  })
                }
                placeholder="Selecione o município"
                searchPlaceholder="Buscar município..."
                emptyText="Município não encontrado"
                disabled={!isEditing || !formData.endereco?.uf}
              />
            </div>

            <div className="col-span-2 flex items-center space-x-2">
              <Checkbox
                id="enderecoEntregaDiferente"
                checked={formData.endereco?.enderecoEntregaDiferente || false}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    endereco: {
                      ...formData.endereco!,
                      enderecoEntregaDiferente: checked as boolean,
                    },
                  })
                }
                disabled={!isEditing}
              />
              <Label
                htmlFor="enderecoEntregaDiferente"
                className="text-sm font-normal cursor-pointer"
              >
                Endereço de Entrega
              </Label>
              <span className="text-xs text-muted-foreground">
                (Marque quando o endereço de entrega for diferente do endereço principal)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção Observações Internas */}
      <Card>
        <CardHeader>
          <CardTitle>Observações Internas</CardTitle>
          <CardDescription>Anotações privadas sobre o vendedor</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.observacoesInternas || ""}
            onChange={(e) => setFormData({ ...formData, observacoesInternas: e.target.value })}
            disabled={!isEditing}
            placeholder="Digite observações internas que não serão compartilhadas com o vendedor..."
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            ℹ️ Estas informações são privadas e visíveis apenas para usuários backoffice
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
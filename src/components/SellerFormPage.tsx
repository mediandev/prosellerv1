import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner@2.0.3";
import { ArrowLeft, Save } from "lucide-react";
import { Seller } from "../types/seller";
import { SellerFormDadosCadastrais } from "./SellerFormDadosCadastrais";
import { SellerFormPerformance } from "./SellerFormPerformance";
import { SellerFormComissoes } from "./SellerFormComissoes";
import { SellerFormUsuario } from "./SellerFormUsuario";
import { SellerFormIntegracoes } from "./SellerFormIntegracoes";
import { SellerFormHistoricoVendas } from "./SellerFormHistoricoVendas";

interface SellerFormPageProps {
  vendedorId?: string;
  vendedor?: Seller;
  onBack: () => void;
  onSave?: (vendedor: Partial<Seller>) => void;
  mode?: "view" | "edit" | "create";
}

export function SellerFormPage({
  vendedorId,
  vendedor,
  onBack,
  onSave,
  mode = "view",
}: SellerFormPageProps) {
  const [isEditing, setIsEditing] = useState(mode === "create" || mode === "edit");
  const [formData, setFormData] = useState<Partial<Seller>>(
    vendedor || {
      nome: "",
      iniciais: "",
      cpf: "",
      email: "",
      telefone: "",
      dataAdmissao: new Date().toISOString().split("T")[0],
      status: "ativo",
      acessoSistema: false,
      emailAcesso: "",
      contatosAdicionais: [],
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      inscricaoEstadual: "",
      dadosBancarios: {
        banco: "",
        agencia: "",
        digitoAgencia: "",
        tipoConta: "corrente",
        numeroConta: "",
        digitoConta: "",
        nomeTitular: "",
        cpfCnpjTitular: "",
        tipoChavePix: "cpf_cnpj",
        chavePix: "",
      },
      endereco: {
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        uf: "",
        municipio: "",
        enderecoEntregaDiferente: false,
      },
      observacoesInternas: "",
      metasAnuais: [],
      comissoes: {
        regraAplicavel: "lista_preco",
      },
      usuario: {
        usuarioCriado: false,
        email: "",
        conviteEnviado: false,
        senhaDefinida: false,
        requisitosSeguranca: true,
        permissoes: {
          dashboard: { visualizar: true, criar: false, editar: false, excluir: false },
          vendas: { visualizar: true, criar: true, editar: true, excluir: false },
          pipeline: { visualizar: true, criar: true, editar: true, excluir: false },
          clientes: { visualizar: true, criar: true, editar: true, excluir: false },
          metas: { visualizar: true, criar: false, editar: false, excluir: false },
          comissoes: { visualizar: true, criar: false, editar: false, excluir: false },
          produtos: { visualizar: true, criar: false, editar: false, excluir: false },
          relatorios: { visualizar: true, criar: false, editar: false, excluir: false },
          equipe: { visualizar: false, criar: false, editar: false, excluir: false },
          configuracoes: { visualizar: false, criar: false, editar: false, excluir: false },
        },
      },
      integracoes: [],
    }
  );

  const handleSave = () => {
    if (!formData.nome || !formData.cpf || !formData.email) {
      toast.error("Preencha os campos obrigatórios (Nome, CPF e E-mail)");
      return;
    }

    if (formData.acessoSistema && !formData.emailAcesso) {
      toast.error("Preencha o e-mail de acesso ao sistema");
      return;
    }

    if (onSave) {
      onSave(formData);
    }

    toast.success(
      mode === "create" ? "Vendedor cadastrado com sucesso!" : "Dados atualizados com sucesso!"
    );
    setIsEditing(false);
  };

  const generateInitials = (nome: string) => {
    const parts = nome.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return nome.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    if (formData.nome) {
      setFormData((prev) => ({
        ...prev,
        iniciais: generateInitials(formData.nome),
      }));
    }
  }, [formData.nome]);

  // Sincronizar e-mail do usuário
  useEffect(() => {
    if (formData.email && formData.usuario) {
      setFormData((prev) => ({
        ...prev,
        usuario: {
          ...prev.usuario!,
          email: formData.email,
        },
      }));
    }
  }, [formData.email]);

  const statusConfig = {
    ativo: { label: "Ativo", variant: "default" as const },
    inativo: { label: "Inativo", variant: "secondary" as const },
    excluido: { label: "Excluído", variant: "outline" as const },
  };

  const tabCount = mode === "create" ? 1 : 6;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">
                {formData.iniciais || "??"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl">
                {mode === "create" ? "Novo Vendedor" : formData.nome || "Vendedor"}
              </h1>
              {mode !== "create" && formData.email && (
                <p className="text-muted-foreground">{formData.email}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode !== "create" && formData.status && (
            <Badge variant={statusConfig[formData.status].variant}>
              {statusConfig[formData.status].label}
            </Badge>
          )}
          {mode !== "create" && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>Editar</Button>
          )}
          {isEditing && (
            <>
              <Button
                variant="outline"
                onClick={mode === "create" ? onBack : () => setIsEditing(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full h-auto">
            <TabsTrigger value="dados" className="whitespace-nowrap">Dados Cadastrais</TabsTrigger>
            {mode !== "create" && (
              <>
                <TabsTrigger value="performance" className="whitespace-nowrap">Performance</TabsTrigger>
                <TabsTrigger value="comissoes" className="whitespace-nowrap">Comissões</TabsTrigger>
                <TabsTrigger value="usuario" className="whitespace-nowrap">Usuário</TabsTrigger>
                <TabsTrigger value="integracoes" className="whitespace-nowrap">Integrações</TabsTrigger>
                <TabsTrigger value="historico" className="whitespace-nowrap">Histórico de Vendas</TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* Aba Dados Cadastrais */}
        <TabsContent value="dados" className="space-y-4">
          <SellerFormDadosCadastrais
            formData={formData}
            setFormData={setFormData}
            isEditing={isEditing}
          />
        </TabsContent>

        {/* Aba Performance */}
        {mode !== "create" && (
          <TabsContent value="performance" className="space-y-4">
            <SellerFormPerformance
              formData={formData}
              setFormData={setFormData}
              isEditing={isEditing}
              vendedor={vendedor}
            />
          </TabsContent>
        )}

        {/* Aba Comissões */}
        {mode !== "create" && (
          <TabsContent value="comissoes" className="space-y-4">
            <SellerFormComissoes
              formData={formData}
              setFormData={setFormData}
              isEditing={isEditing}
            />
          </TabsContent>
        )}

        {/* Aba Usuário */}
        {mode !== "create" && (
          <TabsContent value="usuario" className="space-y-4">
            <SellerFormUsuario
              formData={formData}
              setFormData={setFormData}
              isEditing={isEditing}
            />
          </TabsContent>
        )}

        {/* Aba Integrações */}
        {mode !== "create" && (
          <TabsContent value="integracoes" className="space-y-4">
            <SellerFormIntegracoes
              formData={formData}
              setFormData={setFormData}
              isEditing={isEditing}
            />
          </TabsContent>
        )}

        {/* Aba Histórico de Vendas */}
        {mode !== "create" && (
          <TabsContent value="historico" className="space-y-4">
            <SellerFormHistoricoVendas vendedor={vendedor} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
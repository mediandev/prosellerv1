import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { toast } from "sonner@2.0.3";
import { Mail, Key, Shield, Eye, EyeOff, Send, Check, X } from "lucide-react";
import { Seller, UserPermissions } from "../types/seller";

interface SellerFormUsuarioProps {
  formData: Partial<Seller>;
  setFormData: (data: Partial<Seller>) => void;
  isEditing: boolean;
}

type ModuleName = keyof UserPermissions;
type PermissionType = "visualizar" | "criar" | "editar" | "excluir";

const modules: Array<{ key: ModuleName; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "vendas", label: "Vendas" },
  { key: "pipeline", label: "Pipeline" },
  { key: "clientes", label: "Clientes" },
  { key: "metas", label: "Metas" },
  { key: "comissoes", label: "Comissões" },
  { key: "produtos", label: "Produtos" },
  { key: "relatorios", label: "Relatórios" },
  { key: "equipe", label: "Equipe" },
  { key: "configuracoes", label: "Configurações" },
];

const permissionTypes: Array<{ key: PermissionType; label: string }> = [
  { key: "visualizar", label: "Visualizar" },
  { key: "criar", label: "Criar" },
  { key: "editar", label: "Editar" },
  { key: "excluir", label: "Excluir" },
];

export function SellerFormUsuario({
  formData,
  setFormData,
  isEditing,
}: SellerFormUsuarioProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [senhaManual, setSenhaManual] = useState("");

  const usuarioCriado = formData.usuario?.usuarioCriado || false;
  const conviteEnviado = formData.usuario?.conviteEnviado || false;
  const senhaDefinida = formData.usuario?.senhaDefinida || false;
  const requisitosSeguranca = formData.usuario?.requisitosSeguranca ?? true;

  // Enviar convite por e-mail
  const handleEnviarConvite = () => {
    if (!formData.email) {
      toast.error("É necessário cadastrar um e-mail primeiro");
      return;
    }

    // Simular envio de convite
    setFormData({
      ...formData,
      usuario: {
        ...formData.usuario!,
        usuarioCriado: true,
        conviteEnviado: true,
        dataConvite: new Date().toISOString(),
      },
    });

    toast.success("Convite enviado com sucesso!");
  };

  // Definir senha manualmente
  const handleDefinirSenha = () => {
    if (!senhaManual || senhaManual.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (requisitosSeguranca && senhaManual.length < 8) {
      toast.error("Com requisitos de segurança, a senha deve ter no mínimo 8 caracteres");
      return;
    }

    setFormData({
      ...formData,
      usuario: {
        ...formData.usuario!,
        usuarioCriado: true,
        senhaDefinida: true,
      },
    });

    setSenhaManual("");
    toast.success("Senha definida com sucesso!");
  };

  // Atualizar permissão de um módulo
  const handleUpdatePermission = (module: ModuleName, permission: PermissionType, value: boolean) => {
    const currentPermissions = formData.usuario?.permissoes || getDefaultPermissions();

    setFormData({
      ...formData,
      usuario: {
        ...formData.usuario!,
        permissoes: {
          ...currentPermissions,
          [module]: {
            ...currentPermissions[module],
            [permission]: value,
          },
        },
      },
    });
  };

  // Permissões padrão
  const getDefaultPermissions = (): UserPermissions => {
    const defaultPerms: UserPermissions = {} as UserPermissions;
    modules.forEach((module) => {
      defaultPerms[module.key] = {
        visualizar: true,
        criar: false,
        editar: false,
        excluir: false,
      };
    });
    return defaultPerms;
  };

  const permissoes = formData.usuario?.permissoes || getDefaultPermissions();

  return (
    <div className="space-y-4">
      {/* Status do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Usuário</CardTitle>
          <CardDescription>Informações sobre a conta de acesso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Usuário Criado</p>
              <p className="text-sm text-muted-foreground">
                {usuarioCriado ? "Usuário ativo no sistema" : "Usuário ainda não foi criado"}
              </p>
            </div>
            {usuarioCriado ? (
              <Badge variant="default">
                <Check className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            ) : (
              <Badge variant="secondary">
                <X className="h-3 w-3 mr-1" />
                Inativo
              </Badge>
            )}
          </div>

          {usuarioCriado && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">E-mail de Acesso</p>
                  <p className="text-sm text-muted-foreground">{formData.email}</p>
                </div>
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Criação de Usuário */}
      {!usuarioCriado && (
        <Card>
          <CardHeader>
            <CardTitle>Criar Usuário</CardTitle>
            <CardDescription>Configure o acesso ao sistema para o vendedor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Opção 1: Enviar convite */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h4 className="font-medium">Opção 1: Enviar Convite por E-mail</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                O vendedor receberá um e-mail com um link para criar sua própria senha
              </p>
              <Button onClick={handleEnviarConvite} disabled={!isEditing || !formData.email}>
                <Send className="h-4 w-4 mr-2" />
                Enviar Convite
              </Button>
            </div>

            <Separator />

            {/* Opção 2: Definir senha manualmente */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <h4 className="font-medium">Opção 2: Definir Senha Manualmente</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Defina uma senha temporária que o vendedor poderá alterar posteriormente
              </p>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha Temporária</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="senha"
                      type={showPassword ? "text" : "password"}
                      value={senhaManual}
                      onChange={(e) => setSenhaManual(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Digite a senha"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button onClick={handleDefinirSenha} disabled={!isEditing || !senhaManual}>
                    Definir
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requisitos de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle>Requisitos de Segurança</CardTitle>
          <CardDescription>Configure as políticas de senha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <Label htmlFor="requisitosSeguranca">Impor Requisitos de Segurança</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Exigir senhas fortes (mínimo 8 caracteres, letras e números)
              </p>
            </div>
            <Switch
              id="requisitosSeguranca"
              checked={requisitosSeguranca}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  usuario: {
                    ...formData.usuario!,
                    requisitosSeguranca: checked,
                  },
                })
              }
              disabled={!isEditing}
            />
          </div>

          {requisitosSeguranca && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Requisitos ativos:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Mínimo de 8 caracteres</li>
                <li>✓ Pelo menos uma letra maiúscula</li>
                <li>✓ Pelo menos uma letra minúscula</li>
                <li>✓ Pelo menos um número</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissões */}
      <Card>
        <CardHeader>
          <CardTitle>Permissões de Acesso</CardTitle>
          <CardDescription>
            Configure quais módulos e ações o vendedor pode acessar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-5 gap-4 pb-2 border-b font-medium text-sm">
              <div>Módulo</div>
              {permissionTypes.map((perm) => (
                <div key={perm.key} className="text-center">
                  {perm.label}
                </div>
              ))}
            </div>

            {/* Linhas de permissões */}
            {modules.map((module) => (
              <div key={module.key} className="grid grid-cols-5 gap-4 items-center">
                <div className="font-medium text-sm">{module.label}</div>
                {permissionTypes.map((perm) => (
                  <div key={perm.key} className="flex justify-center">
                    <Switch
                      checked={permissoes[module.key][perm.key]}
                      onCheckedChange={(checked) =>
                        handleUpdatePermission(module.key, perm.key, checked)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> É recomendado conceder apenas as permissões necessárias
              para cada vendedor. Comece com permissões básicas de visualização e adicione outras
              conforme necessário.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

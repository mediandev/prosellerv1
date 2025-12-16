import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { User, Mail, Key, Shield, Calendar, CheckCircle2, Eye, EyeOff, Building2, CreditCard } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner@2.0.3";
import { format } from "date-fns@4.1.0";
import { ptBR } from "date-fns@4.1.0/locale";
import { PERMISSOES_DISPONIVEIS } from "../types/user";
import { mockSellers } from "../data/mockSellers";
import { mockBanks, accountTypes, pixKeyTypes } from "../data/mockBanks";

interface UserProfilePageProps {
  onVoltar?: () => void;
}

export function UserProfilePage({ onVoltar }: UserProfilePageProps) {
  const { usuario } = useAuth();
  
  // Estado para edição de informações pessoais
  const [nome, setNome] = useState(usuario?.nome || "");
  const [email, setEmail] = useState(usuario?.email || "");
  const [editandoInfo, setEditandoInfo] = useState(false);
  
  // Estado para alteração de senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  
  if (!usuario) {
    return null;
  }
  
  const handleSalvarInformacoes = () => {
    if (!nome.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }
    
    if (!email.trim()) {
      toast.error("O email é obrigatório");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Email inválido");
      return;
    }
    
    // Aqui você implementaria a lógica de atualização no backend
    // Por enquanto, apenas mostramos um toast de sucesso
    toast.success("Informações atualizadas com sucesso!");
    setEditandoInfo(false);
  };
  
  const handleAlterarSenha = () => {
    if (!senhaAtual.trim()) {
      toast.error("A senha atual é obrigatória");
      return;
    }
    
    if (!novaSenha.trim()) {
      toast.error("A nova senha é obrigatória");
      return;
    }
    
    if (novaSenha.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }
    
    // Aqui você implementaria a lógica de alteração de senha no backend
    // Por enquanto, apenas mostramos um toast de sucesso
    toast.success("Senha alterada com sucesso!");
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarSenha("");
  };
  
  const handleCancelarEdicao = () => {
    setNome(usuario.nome);
    setEmail(usuario.email);
    setEditandoInfo(false);
  };
  
  // Agrupar permissões por categoria
  const permissoesPorCategoria = usuario.permissoes.reduce((acc, permId) => {
    const permissao = PERMISSOES_DISPONIVEIS.find((p) => p.id === permId);
    if (permissao) {
      if (!acc[permissao.categoria]) {
        acc[permissao.categoria] = [];
      }
      acc[permissao.categoria].push(permissao);
    }
    return acc;
  }, {} as Record<string, typeof PERMISSOES_DISPONIVEIS>);
  
  const categoriasMap: Record<string, string> = {
    clientes: "Clientes",
    vendas: "Vendas",
    relatorios: "Relatórios",
    configuracoes: "Configurações",
    usuarios: "Usuários",
    financeiro: "Financeiro"
  };
  
  // Buscar dados do vendedor se o usuário for vendedor
  const vendedorData = useMemo(() => {
    if (usuario.tipo === 'vendedor') {
      const vendedor = mockSellers.find((v) => v.email === usuario.email);
      return vendedor;
    }
    return undefined;
  }, [usuario.tipo, usuario.email]);
  
  // Obter nome do banco
  const getNomeBanco = (codigoBanco: string) => {
    const banco = mockBanks.find((b) => b.codigo === codigoBanco);
    return banco ? banco.nomeCompleto : codigoBanco;
  };
  
  // Obter label do tipo de conta
  const getTipoConta = (tipo: string) => {
    const tipoConta = accountTypes.find((t) => t.value === tipo);
    return tipoConta ? tipoConta.label : tipo;
  };
  
  // Obter label do tipo de chave Pix
  const getTipoChavePix = (tipo: string) => {
    const tipoChave = pixKeyTypes.find((t) => t.value === tipo);
    return tipoChave ? tipoChave.label : tipo;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Meu Perfil</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie suas informações pessoais e preferências
          </p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Card de Informações Atuais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Perfil
            </CardTitle>
            <CardDescription>
              Suas informações pessoais e de conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-medium">
                  {usuario.nome
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-xl">{usuario.nome}</h3>
                <p className="text-muted-foreground">{usuario.email}</p>
                <div className="mt-2">
                  <Badge variant={usuario.tipo === 'backoffice' ? 'default' : 'secondary'}>
                    {usuario.tipo === 'backoffice' ? '🔓 Backoffice' : '👤 Vendedor'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Membro desde:</span>
                <span className="font-medium">
                  {format(new Date(usuario.dataCadastro), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              
              {usuario.ultimoAcesso && (
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Último acesso:</span>
                  <span className="font-medium">
                    {format(new Date(usuario.ultimoAcesso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card de Edição de Informações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Editar Informações
            </CardTitle>
            <CardDescription>
              Atualize seu nome e email de contato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={!editandoInfo}
                placeholder="Seu nome completo"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!editandoInfo}
                placeholder="seu@email.com"
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              {!editandoInfo ? (
                <Button onClick={() => setEditandoInfo(true)} className="w-full">
                  Editar Informações
                </Button>
              ) : (
                <>
                  <Button onClick={handleSalvarInformacoes} className="flex-1">
                    Salvar Alterações
                  </Button>
                  <Button onClick={handleCancelarEdicao} variant="outline" className="flex-1">
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card de Alteração de Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Mantenha sua conta segura com uma senha forte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senhaAtual">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="senhaAtual"
                  type={mostrarSenhaAtual ? "text" : "password"}
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Digite sua senha atual"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                >
                  {mostrarSenhaAtual ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="novaSenha"
                  type={mostrarNovaSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite a nova senha (mín. 6 caracteres)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                >
                  {mostrarNovaSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmarSenha"
                  type={mostrarConfirmarSenha ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Digite a nova senha novamente"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                >
                  {mostrarConfirmarSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button onClick={handleAlterarSenha} className="w-full">
              Alterar Senha
            </Button>
          </CardContent>
        </Card>

        {/* Card de Permissões */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissões
            </CardTitle>
            <CardDescription>
              Visualize suas permissões no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.keys(permissoesPorCategoria).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Você não possui permissões cadastradas.
                </p>
              ) : (
                Object.entries(permissoesPorCategoria).map(([categoria, permissoes]) => (
                  <div key={categoria}>
                    <h4 className="font-medium mb-2">{categoriasMap[categoria]}</h4>
                    <div className="flex flex-wrap gap-2">
                      {permissoes.map((permissao) => (
                        <Badge key={permissao.id} variant="outline" className="text-xs">
                          {permissao.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card de Conta Bancária - Apenas para Vendedores */}
        {usuario.tipo === 'vendedor' && vendedorData?.dadosBancarios && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Conta Bancária para Comissões
              </CardTitle>
              <CardDescription>
                Informações da conta onde você recebe suas comissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {/* Banco */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Banco</Label>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{getNomeBanco(vendedorData.dadosBancarios.banco)}</p>
                  </div>
                </div>

                {/* Tipo de Conta */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Tipo de Conta</Label>
                  <p className="font-medium">{getTipoConta(vendedorData.dadosBancarios.tipoConta)}</p>
                </div>

                {/* Agência */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Agência</Label>
                  <p className="font-medium">
                    {vendedorData.dadosBancarios.agencia}
                    {vendedorData.dadosBancarios.digitoAgencia && `-${vendedorData.dadosBancarios.digitoAgencia}`}
                  </p>
                </div>

                {/* Conta */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Conta</Label>
                  <p className="font-medium">
                    {vendedorData.dadosBancarios.numeroConta}
                    {vendedorData.dadosBancarios.digitoConta && `-${vendedorData.dadosBancarios.digitoConta}`}
                  </p>
                </div>

                {/* Titular */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Titular</Label>
                  <p className="font-medium">{vendedorData.dadosBancarios.nomeTitular}</p>
                </div>

                {/* CPF/CNPJ */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">CPF/CNPJ do Titular</Label>
                  <p className="font-medium">{vendedorData.dadosBancarios.cpfCnpjTitular}</p>
                </div>

                {/* Chave Pix */}
                {vendedorData.dadosBancarios.chavePix && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Tipo de Chave Pix</Label>
                      <p className="font-medium">{getTipoChavePix(vendedorData.dadosBancarios.tipoChavePix)}</p>
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                      <Label className="text-muted-foreground">Chave Pix</Label>
                      <p className="font-medium">{vendedorData.dadosBancarios.chavePix}</p>
                    </div>
                  </>
                )}
              </div>

              <Separator className="my-4" />

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Informação Importante</p>
                  <p>
                    Para alterar seus dados bancários, entre em contato com o backoffice ou seu gestor.
                    Essas informações são utilizadas para o pagamento de suas comissões.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

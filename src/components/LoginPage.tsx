import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { toast } from "sonner@2.0.3";
import { ProSellerLogo } from "./ProSellerLogo";

interface LoginPageProps {
  onForgotPassword: () => void;
}

export function LoginPage({ onForgotPassword }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpar erro anterior
    setErro(null);
    
    if (!email || !senha) {
      const mensagem = "Por favor, preencha todos os campos";
      setErro(mensagem);
      toast.error(mensagem);
      return;
    }

    setCarregando(true);

    try {
      const resultado = await login(email, senha);
      
      if (resultado.success) {
        toast.success("Login realizado com sucesso!");
        setErro(null);
      } else {
        const mensagemErro = resultado.error || "Email ou senha incorretos";
        setErro(mensagemErro);
        toast.error(mensagemErro);
      }
    } catch (error: any) {
      const mensagemErro = error?.message || "Erro ao fazer login. Tente novamente.";
      setErro(mensagemErro);
      toast.error(mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  const handleQuickLogin = async (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setSenha(userPassword);
    setErro(null);
    setCarregando(true);

    try {
      const resultado = await login(userEmail, userPassword);
      
      if (resultado.success) {
        toast.success("Login realizado com sucesso!");
        setErro(null);
      } else {
        const mensagemErro = resultado.error || "Email ou senha incorretos";
        setErro(mensagemErro);
        toast.error(mensagemErro);
      }
    } catch (error: any) {
      const mensagemErro = error?.message || "Erro ao fazer login. Tente novamente.";
      setErro(mensagemErro);
      toast.error(mensagemErro);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mt-4 mb-4">
            <ProSellerLogo size="lg" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao ProSeller</CardTitle>
          <CardDescription>
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Mensagem de erro */}
            {erro && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={carregando}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={carregando}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="link"
                className="px-0 text-sm"
                onClick={onForgotPassword}
              >
                Esqueceu sua senha?
              </Button>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={carregando}
            >
              {carregando ? "Entrando..." : "Entrar"}
            </Button>
            
            
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
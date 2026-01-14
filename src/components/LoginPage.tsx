import { useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
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
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !senha) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setCarregando(true);

    try {
      const sucesso = await login(email, senha);
      
      if (sucesso) {
        toast.success("Login realizado com sucesso!");
      } else {
        toast.error("Email ou senha incorretos");
      }
    } catch (error) {
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const handleQuickLogin = async (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setSenha(userPassword);
    setCarregando(true);

    try {
      const sucesso = await login(userEmail, userPassword);
      
      if (sucesso) {
        toast.success("Login realizado com sucesso!");
      } else {
        toast.error("Email ou senha incorretos");
      }
    } catch (error) {
      toast.error("Erro ao fazer login. Tente novamente.");
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
            
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Credenciais de teste (clique para entrar)
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("admin@empresa.com", "admin123")}
                  disabled={carregando}
                  className="w-full text-xs text-left px-2 py-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <strong className="text-primary hover:underline cursor-pointer">Admin:</strong>{" "}
                  <span className="text-muted-foreground">admin@empresa.com / admin123</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin("joao.silva@empresa.com", "joao123")}
                  disabled={carregando}
                  className="w-full text-xs text-left px-2 py-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <strong className="text-primary hover:underline cursor-pointer">Vendedor:</strong>{" "}
                  <span className="text-muted-foreground">joao.silva@empresa.com / joao123</span>
                </button>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
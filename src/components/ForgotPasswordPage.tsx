import { useState } from "react";
import { ArrowLeft, Mail, Send, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { toast } from "sonner@2.0.3";

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Por favor, informe seu email");
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Por favor, informe um email válido");
      return;
    }

    setCarregando(true);

    try {
      // Simulação de envio de email (em produção, fazer chamada real à API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setEmailEnviado(true);
      toast.success("Email de recuperação enviado com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar email. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const handleNovoEnvio = () => {
    setEmailEnviado(false);
    setEmail("");
  };

  if (emailEnviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Email Enviado!</CardTitle>
            <CardDescription>
              Verifique sua caixa de entrada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                Enviamos um email para <strong>{email}</strong> com instruções para redefinir sua senha.
              </p>
              <p className="text-sm text-muted-foreground">
                Se você não receber o email em alguns minutos, verifique sua pasta de spam.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              variant="outline"
              className="w-full" 
              onClick={handleNovoEnvio}
            >
              Enviar novamente
            </Button>
            <Button 
              variant="ghost"
              className="w-full" 
              onClick={onBackToLogin}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para o login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
          <CardDescription>
            Informe seu email para receber as instruções de recuperação
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

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Você receberá um email com um link para criar uma nova senha.
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={carregando}
            >
              {carregando ? (
                "Enviando..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Email de Recuperação
                </>
              )}
            </Button>
            
            <Button 
              type="button"
              variant="ghost"
              className="w-full" 
              onClick={onBackToLogin}
              disabled={carregando}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para o login
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

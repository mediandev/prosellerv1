import { useState } from "react";
import { Key, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { toast } from "sonner@2.0.3";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xxoiqfraeolsqsmsheue.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface SetPasswordPageProps {
  accessToken: string;
  refreshToken: string;
  onComplete: () => void;
}

export function SetPasswordPage({ accessToken, refreshToken, onComplete }: SetPasswordPageProps) {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!senha || senha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (senha !== confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    setCarregando(true);

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Estabelecer sessão com os tokens do convite
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error('[SET-PASSWORD] Session error:', sessionError);
        toast.error("Link de convite expirado ou inválido. Solicite um novo convite.");
        return;
      }

      // Atualizar a senha do usuário
      const { error: updateError } = await supabase.auth.updateUser({
        password: senha,
      });

      if (updateError) {
        console.error('[SET-PASSWORD] Update error:', updateError);
        toast.error(`Erro ao definir senha: ${updateError.message}`);
        return;
      }

      // Fazer signout para limpar a sessão temporária
      await supabase.auth.signOut();

      setSucesso(true);
      toast.success("Senha definida com sucesso!");
    } catch (error: any) {
      console.error('[SET-PASSWORD] Error:', error);
      toast.error("Erro ao definir senha. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Senha Definida!</CardTitle>
            <CardDescription>
              Sua senha foi criada com sucesso. Agora você pode acessar o sistema.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={onComplete}>
              Ir para o Login
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
            <Key className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Definir Senha</CardTitle>
          <CardDescription>
            Crie uma senha para acessar o ProSeller
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha">Nova Senha</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={carregando}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar-senha">Confirmar Senha</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmar-senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Repita a senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="pl-10"
                  disabled={carregando}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={carregando}
            >
              {carregando ? "Salvando..." : "Definir Senha"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

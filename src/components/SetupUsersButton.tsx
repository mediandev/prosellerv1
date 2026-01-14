import { useState } from 'react';
import { Button } from './ui/button';
import { api } from '../services/api';
import { toast } from 'sonner@2.0.3';
import { Loader2, UserPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const USUARIOS_SETUP = [
  {
    nome: 'Admin Backoffice',
    email: 'admin@empresa.com',
    senha: 'admin123',
    tipo: 'backoffice',
  },
  {
    nome: 'João Silva',
    email: 'joao.silva@empresa.com',
    senha: 'joao123',
    tipo: 'vendedor',
  },
  {
    nome: 'Maria Santos',
    email: 'maria.santos@empresa.com',
    senha: 'maria123',
    tipo: 'vendedor',
  },
];

export function SetupUsersButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const setupUsers = async () => {
    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const user of USUARIOS_SETUP) {
      try {
        await api.auth.signup(user.email, user.senha, user.nome, user.tipo);
        successCount++;
        console.log(`✓ Usuário criado: ${user.email}`);
      } catch (error: any) {
        console.error(`✗ Erro ao criar ${user.email}:`, error.message);
        errorCount++;
      }
    }

    setLoading(false);

    if (successCount > 0) {
      setSuccess(true);
      toast.success(`${successCount} usuário(s) criado(s) com sucesso!`);
    }

    if (errorCount > 0) {
      toast.info(`${errorCount} usuário(s) já existiam ou falharam`);
    }
  };

  if (success) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <UserPlus className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Usuários Criados!</AlertTitle>
        <AlertDescription className="text-green-700">
          Os usuários foram criados no Supabase. Você pode fazer login agora.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Modo Demo:</strong> Usando autenticação mock. Clique abaixo para criar usuários no Supabase.
        </AlertDescription>
      </Alert>
      <Button 
        onClick={setupUsers} 
        disabled={loading}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Criando usuários...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-2" />
            Criar Usuários no Supabase
          </>
        )}
      </Button>
      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Credenciais de login (modo demo):</p>
        <ul className="space-y-1">
          <li>• admin@empresa.com / admin123 (Backoffice)</li>
          <li>• joao.silva@empresa.com / joao123 (Vendedor)</li>
          <li>• maria.santos@empresa.com / maria123 (Vendedor)</li>
        </ul>
      </div>
    </div>
  );
}

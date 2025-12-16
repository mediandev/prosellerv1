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
    // Backend removido - usuários mock já estão disponíveis
    setLoading(true);
    
    // Simular delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setLoading(false);
    setSuccess(true);
    toast.success('Usuários mock já estão disponíveis para login!');
  };

  if (success) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <UserPlus className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Usuários Criados!</AlertTitle>
        <AlertDescription className="text-green-700">
          Sistema configurado. Você pode fazer login agora.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Modo Demo:</strong> Usando autenticação mock. Os usuários já estão disponíveis para login.
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
            Verificar Usuários Disponíveis
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

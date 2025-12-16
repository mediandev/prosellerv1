import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Usuario, TipoUsuario } from '../types/user';
import { api, getAuthToken } from '../services/api';

interface AuthContextType {
  usuario: Usuario | null;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => void;
  temPermissao: (permissao: string) => boolean;
  ehBackoffice: () => boolean;
  ehVendedor: () => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usuários mockados para demonstração
const USUARIOS_MOCK: (Usuario & { senha: string })[] = [
  {
    id: 'user-1',
    nome: 'Admin Backoffice',
    email: 'admin@empresa.com',
    senha: 'admin123',
    tipo: 'backoffice',
    ativo: true,
    permissoes: [
      'clientes.visualizar',
      'clientes.criar',
      'clientes.editar',
      'clientes.excluir',
      'clientes.todos',
      'clientes.aprovar',
      'vendas.visualizar',
      'vendas.criar',
      'vendas.editar',
      'vendas.excluir',
      'vendas.todas',
      'relatorios.visualizar',
      'relatorios.todos',
      'config.minhas_empresas',
      'config.geral',
      'usuarios.visualizar',
      'usuarios.criar',
      'usuarios.editar',
      'usuarios.excluir',
      'usuarios.permissoes',
      'contacorrente.visualizar',
      'contacorrente.criar',
      'contacorrente.editar',
      'contacorrente.excluir',
      'configuracoes.editar',
      'configuracoes.excluir',
    ],
    dataCadastro: '2025-01-01',
  },
  {
    id: 'user-2',
    nome: 'João Silva',
    email: 'joao.silva@empresa.com',
    senha: 'joao123',
    tipo: 'vendedor',
    ativo: true,
    permissoes: [
      'clientes.visualizar',
      'clientes.criar',
      'clientes.editar',
      'vendas.visualizar',
      'vendas.criar',
      'vendas.editar',
      'relatorios.visualizar',
      'contacorrente.visualizar',
      'contacorrente.criar',
    ],
    clientesAtribuidos: ['cliente-1', 'cliente-2', 'cliente-5'],
    dataCadastro: '2025-01-15',
  },
  {
    id: 'user-3',
    nome: 'Maria Santos',
    email: 'maria.santos@empresa.com',
    senha: 'maria123',
    tipo: 'vendedor',
    ativo: true,
    permissoes: [
      'clientes.visualizar',
      'clientes.criar',
      'clientes.editar',
      'vendas.visualizar',
      'vendas.criar',
      'vendas.editar',
      'relatorios.visualizar',
      'contacorrente.visualizar',
      'contacorrente.criar',
    ],
    clientesAtribuidos: ['cliente-3', 'cliente-4', 'cliente-6'],
    dataCadastro: '2025-01-20',
  },
  {
    id: 'user-4',
    nome: 'Carlos Oliveira',
    email: 'carlos.oliveira@empresa.com',
    senha: 'carlos123',
    tipo: 'vendedor',
    ativo: true,
    permissoes: [
      'clientes.visualizar',
      'clientes.criar',
      'clientes.editar',
      'vendas.visualizar',
      'vendas.criar',
      'vendas.editar',
      'relatorios.visualizar',
      'contacorrente.visualizar',
      'contacorrente.criar',
    ],
    clientesAtribuidos: ['cliente-7', 'cliente-8'],
    dataCadastro: '2025-01-25',
  },
  {
    id: 'user-5',
    nome: 'Ana Paula',
    email: 'ana.paula@empresa.com',
    senha: 'ana123',
    tipo: 'vendedor',
    ativo: true,
    permissoes: [
      'clientes.visualizar',
      'clientes.criar',
      'clientes.editar',
      'vendas.visualizar',
      'vendas.criar',
      'vendas.editar',
      'relatorios.visualizar',
      'contacorrente.visualizar',
      'contacorrente.criar',
    ],
    clientesAtribuidos: ['cliente-9', 'cliente-10'],
    dataCadastro: '2025-02-01',
  },
  {
    id: 'user-6',
    nome: 'Pedro Costa',
    email: 'pedro.costa@empresa.com',
    senha: 'pedro123',
    tipo: 'vendedor',
    ativo: true,
    permissoes: [
      'clientes.visualizar',
      'clientes.criar',
      'clientes.editar',
      'vendas.visualizar',
      'vendas.criar',
      'vendas.editar',
      'relatorios.visualizar',
      'contacorrente.visualizar',
      'contacorrente.criar',
    ],
    clientesAtribuidos: ['cliente-11', 'cliente-12'],
    dataCadastro: '2025-02-05',
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = getAuthToken();
      if (token) {
        // Check if it's a mock token
        if (token.startsWith('mock_token_')) {
          const userId = token.replace('mock_token_', '');
          const usuarioMock = USUARIOS_MOCK.find(u => u.id === userId);
          if (usuarioMock) {
            const { senha: _, ...usuarioSemSenha } = usuarioMock;
            setUsuario(usuarioSemSenha);
            setLoading(false);
            return;
          }
        }
        
        // Backend removido - apenas autenticação mock disponível
        // Não tentar restaurar sessão do backend
        api.auth.signout(); // Limpar qualquer token inválido
      }
      setLoading(false);
    };
    
    checkSession();
  }, []);

  const getDefaultPermissoes = (tipo: TipoUsuario): string[] => {
    if (tipo === 'backoffice') {
      return [
        'clientes.visualizar',
        'clientes.criar',
        'clientes.editar',
        'clientes.excluir',
        'clientes.todos',
        'clientes.aprovar',
        'vendas.visualizar',
        'vendas.criar',
        'vendas.editar',
        'vendas.excluir',
        'vendas.todas',
        'relatorios.visualizar',
        'relatorios.todos',
        'config.minhas_empresas',
        'config.geral',
        'usuarios.visualizar',
        'usuarios.criar',
        'usuarios.editar',
        'usuarios.excluir',
        'usuarios.permissoes',
        'contacorrente.visualizar',
        'contacorrente.criar',
        'contacorrente.editar',
        'contacorrente.excluir',
        'configuracoes.editar',
        'configuracoes.excluir',
      ];
    } else {
      return [
        'clientes.visualizar',
        'clientes.criar',
        'clientes.editar',
        'vendas.visualizar',
        'vendas.criar',
        'vendas.editar',
        'relatorios.visualizar',
        'contacorrente.visualizar',
        'contacorrente.criar',
      ];
    }
  };

  const login = async (email: string, senha: string): Promise<boolean> => {
    // Backend removido - apenas autenticação mock disponível
    console.log('ℹ Usando autenticação mock (backend removido)...');
    const usuarioMock = USUARIOS_MOCK.find(
      (u) => u.email === email && u.senha === senha
    );
    
    if (usuarioMock) {
      // Remove senha from the object before setting
      const { senha: _, ...usuarioSemSenha } = usuarioMock;
      setUsuario(usuarioSemSenha);
      // Store a mock token for session
      localStorage.setItem('auth_token', 'mock_token_' + usuarioMock.id);
      console.log('✓ Login via autenticação mock');
      return true;
    }
    
    console.error('✗ Credenciais inválidas');
    return false;
  };

  const logout = () => {
    api.auth.signout();
    setUsuario(null);
  };

  const temPermissao = (permissao: string): boolean => {
    if (!usuario) return false;
    return usuario.permissoes?.includes(permissao) || false;
  };

  const ehBackoffice = (): boolean => {
    return usuario?.tipo === 'backoffice';
  };

  const ehVendedor = (): boolean => {
    return usuario?.tipo === 'vendedor';
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        login,
        logout,
        temPermissao,
        ehBackoffice,
        ehVendedor,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
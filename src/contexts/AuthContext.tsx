import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Usuario, TipoUsuario } from '../types/user';
import { api, getAuthToken, setAuthToken, isTokenExpiringSoon, refreshAuthToken } from '../services/api';

interface AuthContextType {
  usuario: Usuario | null;
  login: (email: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  temPermissao: (permissao: string) => boolean;
  ehBackoffice: () => boolean;
  ehVendedor: () => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = getAuthToken();
      if (token) {
        // Tentar restaurar sessão via Supabase Auth
        try {
          const user = await api.auth.me();
          if (user) {
            const usuarioComPermissoes = {
              ...user,
              permissoes: user.permissoes || getDefaultPermissoes(user.tipo),
            };
            setUsuario(usuarioComPermissoes);
            console.log('[AuthContext] Sessão restaurada:', user.email);
          }
        } catch (error) {
          // Silently fail - it's normal to not have a session on first load
          console.log('[AuthContext] Nenhuma sessão ativa para restaurar');
          api.auth.signout(); // Limpar qualquer token inválido
        }
      }
      setLoading(false);
    };
    
    checkSession();
  }, []);

  // Verificar periodicamente se o token está próximo de expirar e fazer refresh automático
  useEffect(() => {
    if (!usuario) return; // Só verificar se há usuário logado
    
    // Verificar a cada 2 minutos
    const interval = setInterval(async () => {
      if (isTokenExpiringSoon()) {
        console.log('[AuthContext] Token próximo de expirar, fazendo refresh automático...');
        const refreshed = await refreshAuthToken();
        if (!refreshed) {
          console.warn('[AuthContext] Não foi possível renovar o token, fazendo logout...');
          logout();
        } else {
          console.log('[AuthContext] Token renovado com sucesso');
        }
      }
    }, 2 * 60 * 1000); // 2 minutos
    
    return () => clearInterval(interval);
  }, [usuario]);

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

  const login = async (email: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[AuthContext] Tentando login via Supabase:', { email });
      
      // Usar autenticação via Supabase Edge Functions
      const result = await api.auth.signin(email, senha);
      
      if (result && result.user) {
        // Verificar se usuário está ativo
        if (!result.user.ativo) {
          return {
            success: false,
            error: 'Usuário inativo. Entre em contato com o administrador.',
          };
        }

        // Garantir que tem permissões
        const usuarioComPermissoes = {
          ...result.user,
          permissoes: result.user.permissoes || getDefaultPermissoes(result.user.tipo),
        };
        
        console.log('[AuthContext] ✓ Login realizado com sucesso!', {
          id: usuarioComPermissoes.id,
          nome: usuarioComPermissoes.nome,
          tipo: usuarioComPermissoes.tipo,
        });
        
        // Atualizar estado do usuário
        setUsuario(usuarioComPermissoes);
        
        return { success: true };
      }
      
      return {
        success: false,
        error: 'Não foi possível obter dados do usuário. Tente novamente.',
      };
    } catch (error: any) {
      console.error('[AuthContext] ✗ Erro ao fazer login:', error);
      
      // Mapear erros comuns para mensagens amigáveis
      let errorMessage = 'Erro ao fazer login. Tente novamente.';
      
      if (error.message) {
        const msg = error.message.toLowerCase();
        
        if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('email ou senha')) {
          errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.';
        } else if (msg.includes('user not found') || msg.includes('usuário não encontrado')) {
          errorMessage = 'Usuário não encontrado. Verifique se o email está correto.';
        } else if (msg.includes('inactive') || msg.includes('inativo')) {
          errorMessage = 'Usuário inativo. Entre em contato com o administrador.';
        } else if (msg.includes('network') || msg.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (msg.includes('token') || msg.includes('unauthorized')) {
          errorMessage = 'Sessão expirada. Faça login novamente.';
        } else {
          // Usar mensagem do erro se for específica
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
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
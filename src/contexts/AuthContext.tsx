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

  const resolverPermissoesUsuario = (user: Usuario): string[] => {
    if (Array.isArray(user.permissoes) && user.permissoes.length > 0) {
      return user.permissoes;
    }
    return getDefaultPermissoes(user.tipo);
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = getAuthToken();
      if (token) {
        // Tentar restaurar sessÃ£o via Supabase Auth
        try {
          const user = await api.auth.me();
          if (user) {
            const usuarioComPermissoes = {
              ...user,
              permissoes: resolverPermissoesUsuario(user),
            };
            setUsuario(usuarioComPermissoes);
            console.log('[AuthContext] SessÃ£o restaurada:', user.email);
          }
        } catch (error) {
          // Silently fail - it's normal to not have a session on first load
          console.log('[AuthContext] Nenhuma sessÃ£o ativa para restaurar');
          api.auth.signout(); // Limpar qualquer token invÃ¡lido
        }
      }
      setLoading(false);
    };
    
    checkSession();
  }, []);

  // Verificar periodicamente se o token estÃ¡ prÃ³ximo de expirar e fazer refresh automÃ¡tico
  useEffect(() => {
    if (!usuario) return; // SÃ³ verificar se hÃ¡ usuÃ¡rio logado
    
    // Verificar a cada 2 minutos
    const interval = setInterval(async () => {
      if (isTokenExpiringSoon()) {
        console.log('[AuthContext] Token prÃ³ximo de expirar, fazendo refresh automÃ¡tico...');
        const refreshed = await refreshAuthToken();
        if (!refreshed) {
          console.warn('[AuthContext] NÃ£o foi possÃ­vel renovar o token, fazendo logout...');
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
        'produtos.visualizar',
        'produtos.criar',
        'produtos.editar',
        'produtos.excluir',
        'comissoes.visualizar',
        'comissoes.lancamentos.editar',
        'comissoes.lancamentos.excluir',
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
        'produtos.visualizar',
        'comissoes.visualizar',
        'relatorios.visualizar',
        'contacorrente.visualizar',
        'contacorrente.criar',
      ];
    }
  };

  const login = async (email: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[AuthContext] Tentando login via Supabase:', { email });
      
      // Usar autenticaÃ§Ã£o via Supabase Edge Functions
      const result = await api.auth.signin(email, senha);
      
      if (result && result.user) {
        // Verificar se usuÃ¡rio estÃ¡ ativo
        if (!result.user.ativo) {
          return {
            success: false,
            error: 'UsuÃ¡rio inativo. Entre em contato com o administrador.',
          };
        }

        // Garantir que tem permissÃµes
        const usuarioComPermissoes = {
          ...result.user,
          permissoes: resolverPermissoesUsuario(result.user as Usuario),
        };
        
        console.log('[AuthContext] âœ“ Login realizado com sucesso!', {
          id: usuarioComPermissoes.id,
          nome: usuarioComPermissoes.nome,
          tipo: usuarioComPermissoes.tipo,
        });
        
        // Atualizar estado do usuÃ¡rio
        setUsuario(usuarioComPermissoes);
        
        return { success: true };
      }
      
      return {
        success: false,
        error: 'NÃ£o foi possÃ­vel obter dados do usuÃ¡rio. Tente novamente.',
      };
    } catch (error: any) {
      console.error('[AuthContext] âœ— Erro ao fazer login:', error);
      
      // Mapear erros comuns para mensagens amigÃ¡veis
      let errorMessage = 'Erro ao fazer login. Tente novamente.';
      
      if (error.message) {
        const msg = error.message.toLowerCase();
        
        if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('email ou senha')) {
          errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.';
        } else if (msg.includes('user not found') || msg.includes('usuÃ¡rio nÃ£o encontrado')) {
          errorMessage = 'UsuÃ¡rio nÃ£o encontrado. Verifique se o email estÃ¡ correto.';
        } else if (msg.includes('inactive') || msg.includes('inativo')) {
          errorMessage = 'UsuÃ¡rio inativo. Entre em contato com o administrador.';
        } else if (msg.includes('network') || msg.includes('fetch')) {
          errorMessage = 'Erro de conexÃ£o. Verifique sua internet e tente novamente.';
        } else if (msg.includes('token') || msg.includes('unauthorized')) {
          errorMessage = 'SessÃ£o expirada. FaÃ§a login novamente.';
        } else {
          // Usar mensagem do erro se for especÃ­fica
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


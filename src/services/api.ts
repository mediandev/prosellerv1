// API Service - Integração com Supabase Edge Functions
// Sistema migrado para usar arquitetura em camadas (Edge Functions → RPC → Tabelas)

// Importar dados mock para fallback (serão removidos gradualmente)
import { clientes as mockClientes } from '../data/mockCustomers';
import { mockSellers } from '../data/mockSellers';
import { mockProdutos } from '../data/mockProdutos';
import { mockListasPreco } from '../data/mockListasPreco';
import { mockUsuarios } from '../data/mockUsers';
import { mockCompanies } from '../data/mockCompanies';
import { formasPagamentoMock } from '../data/mockFormasPagamento';
import { condicoesPagamentoMock } from '../data/mockCondicoesPagamento';
import { mockNaturezasOperacao } from '../data/mockNaturezasOperacao';
import { compromissosMock } from '../data/mockContaCorrente';
import { notificacoesMock } from '../data/mockNotificacoes';
import { carregarVendasDoLocalStorage, salvarVendasNoLocalStorage, vendasIniciais } from '../data/mockVendas';
import { mockComissoesVendas } from '../data/mockComissoes';
import type { TipoUsuario } from '../types/user';
import type { Seller } from '../types/seller';

// Configuração do Supabase
const SUPABASE_URL = 'https://xxoiqfraeolsqsmsheue.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4b2lxZnJhZW9sc3FzbXNoZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1ODQ5MDIsImV4cCI6MjA0MjE2MDkwMn0.m8A1mUf3GyAl_17FjltxkgBr-xRQYZw9YEDUVUBdttA';

// Helper para obter permissões padrão baseadas no tipo
function getDefaultPermissoes(tipo: TipoUsuario): string[] {
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
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

export const getAuthToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('auth_token');
  }
  return authToken;
};

// Helper para chamadas às Edge Functions
async function callEdgeFunction(
  functionName: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  path?: string,
  queryParams?: Record<string, any>
): Promise<any> {
  const token = getAuthToken();
  let url = `${SUPABASE_URL}/functions/v1/${functionName}${path ? `/${path}` : ''}`;
  
  // Adicionar query params se fornecidos
  if (queryParams && Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options: RequestInit = {
    method,
    headers,
  };
  
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Edge Functions retornam { success: true, data: {...} }
    if (data.success && data.data) {
      return data.data;
    }
    
    // Fallback para formato direto
    return data.data || data;
  } catch (error) {
    console.error(`[API] Error calling ${functionName}:`, error);
    throw error;
  }
}

// Helper para carregar dados do localStorage ou usar mock inicial
function getStoredData<T>(key: string, initialData: T[]): T[] {
  if (typeof window === 'undefined') return initialData;
  
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Converter strings de data de volta para Date se necessário
      return parsed.map((item: any) => {
        if (item.createdAt) item.createdAt = new Date(item.createdAt);
        if (item.updatedAt) item.updatedAt = new Date(item.updatedAt);
        if (item.dataCadastro) item.dataCadastro = new Date(item.dataCadastro).toISOString();
        if (item.dataPedido) item.dataPedido = new Date(item.dataPedido);
        return item;
      });
    }
  } catch (error) {
    console.error(`[API] Erro ao carregar ${key} do localStorage:`, error);
  }
  
  return initialData;
}

// Helper para salvar dados no localStorage
function saveStoredData<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`[API] Erro ao salvar ${key} no localStorage:`, error);
  }
}

// Helper: Converte usuário (tipo=vendedor) para formato Seller
function usuarioToSeller(user: any): Seller {
  const generateInitials = (nome: string): string => {
    const parts = nome.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return nome.substring(0, 2).toUpperCase();
  };

  return {
    id: user.user_id || user.id,
    nome: user.nome || '',
    iniciais: generateInitials(user.nome || ''),
    cpf: '', // Será preenchido quando houver dados_vendedor
    email: user.email || '',
    telefone: '',
    dataAdmissao: user.data_cadastro ? new Date(user.data_cadastro).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: user.ativo ? 'ativo' : 'inativo',
    acessoSistema: true,
    emailAcesso: user.email || '',
    usuarioId: user.user_id || user.id,
    contatosAdicionais: [],
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    inscricaoEstadual: '',
    dadosBancarios: {
      banco: '',
      agencia: '',
      digitoAgencia: '',
      tipoConta: 'corrente',
      numeroConta: '',
      digitoConta: '',
      nomeTitular: '',
      cpfCnpjTitular: '',
      tipoChavePix: 'cpf_cnpj',
      chavePix: '',
    },
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      uf: '',
      municipio: '',
      enderecoEntregaDiferente: false,
    },
    observacoesInternas: '',
    metasAnuais: [],
    comissoes: {
      regraAplicavel: 'lista_preco',
    },
    usuario: {
      usuarioCriado: true,
      email: user.email || '',
      conviteEnviado: false,
      senhaDefinida: true,
      requisitosSeguranca: true,
      permissoes: {
        dashboard: { visualizar: true, criar: false, editar: false, excluir: false },
        vendas: { visualizar: true, criar: true, editar: true, excluir: false },
        pipeline: { visualizar: true, criar: true, editar: true, excluir: false },
        clientes: { visualizar: true, criar: true, editar: true, excluir: false },
        metas: { visualizar: true, criar: false, editar: false, excluir: false },
        comissoes: { visualizar: true, criar: false, editar: false, excluir: false },
        produtos: { visualizar: true, criar: false, editar: false, excluir: false },
        relatorios: { visualizar: true, criar: false, editar: false, excluir: false },
        equipe: { visualizar: false, criar: false, editar: false, excluir: false },
        configuracoes: { visualizar: false, criar: false, editar: false, excluir: false },
      },
    },
    integracoes: [],
    vendas: {
      total: 0,
      mes: 0,
      qtdFechamentos: 0,
      ticketMedio: 0,
      positivacao: 0,
    },
    performance: {
      taxaConversao: 0,
      tempoMedioFechamento: 0,
      clientesAtivos: 0,
    },
    historico: [],
  };
}

// Mapeamento de entidades para dados mock
const entityMap: Record<string, { data: any[], storageKey: string }> = {
  'clientes': { data: mockClientes, storageKey: 'mockClientes' },
  'vendedores': { data: mockSellers, storageKey: 'mockVendedores' },
  'produtos': { data: mockProdutos, storageKey: 'mockProdutos' },
  'listas-preco': { data: mockListasPreco, storageKey: 'mockListasPreco' },
  'usuarios': { data: mockUsuarios, storageKey: 'mockUsuarios' },
  'empresas': { data: mockCompanies, storageKey: 'mockEmpresas' },
  'formas-pagamento': { data: formasPagamentoMock, storageKey: 'mockFormasPagamento' },
  'condicoes-pagamento': { data: condicoesPagamentoMock, storageKey: 'mockCondicoesPagamento' },
  'naturezas-operacao': { data: mockNaturezasOperacao, storageKey: 'mockNaturezasOperacao' },
  'conta-corrente': { data: compromissosMock, storageKey: 'mockContaCorrente' },
  'notificacoes': { data: notificacoesMock, storageKey: 'mockNotificacoes' },
  'vendas': { data: [], storageKey: 'mockVendas' }, // Vendas são carregadas de forma especial
  'comissoes': { data: mockComissoesVendas, storageKey: 'mockComissoes' },
};

// Generic API functions usando dados mock
export const api = {
  // Auth - Usa Supabase Edge Functions (v2)
  auth: {
    signup: async (email: string, password: string, nome: string, tipo: string) => {
      console.log('[API] Signup via Supabase Auth:', { email, nome, tipo });
      
      try {
        // 1. Criar usuário no Supabase Auth
        const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email,
            password,
            data: { nome, tipo },
          }),
        });
        
        const authData = await authResponse.json();
        
        if (!authResponse.ok) {
          throw new Error(authData.message || 'Erro ao criar usuário');
        }
        
        // 2. Criar registro na tabela user via Edge Function
        // IMPORTANTE: Passar o auth_user_id para garantir que user_id = auth.id
        const token = authData.access_token;
        setAuthToken(token);
        
        const userResponse = await callEdgeFunction('create-user-v2', 'POST', {
          email,
          nome,
          tipo,
          auth_user_id: authData.user?.id,  // Passar ID do Supabase Auth
        });
        
        // callEdgeFunction já retorna data.data
        const user = userResponse.user || userResponse;
        
        return {
          user: {
            id: user.user_id || user.id,
            email: user.email,
            nome: user.nome,
            tipo: user.tipo,
            ativo: user.ativo,
            dataCadastro: user.data_cadastro,
          },
          session: { access_token: token },
        };
      } catch (error: any) {
        console.error('[API] Signup error:', error);
        throw new Error(error.message || 'Erro ao criar usuário');
      }
    },
    
    signin: async (email: string, password: string) => {
      console.log('[API] Signin via Supabase Auth:', { email });
      
      try {
        // Autenticar via Supabase Auth
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error_description || data.error || 'Email ou senha inválidos');
        }
        
        const token = data.access_token;
        setAuthToken(token);
        
        // Buscar dados do usuário via Edge Function
        const userResponse = await callEdgeFunction('get-user-v2', 'GET', undefined, data.user.id);
        
        // callEdgeFunction já retorna data.data
        const user = userResponse.user || userResponse;
        
        return {
          user: {
            id: user.user_id || user.id,
            email: user.email,
            nome: user.nome,
            tipo: user.tipo,
            ativo: user.ativo,
            dataCadastro: user.data_cadastro,
            ultimoAcesso: user.ultimo_acesso,
          },
          session: { access_token: token },
        };
      } catch (error: any) {
        console.error('[API] Signin error:', error);
        throw new Error(error.message || 'Erro ao fazer login');
      }
    },
    
    me: async () => {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Não autenticado');
      }
      
      try {
        // Obter user_id do token via Supabase Auth
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
          },
        });
        
        const authUser = await response.json();
        
        if (!response.ok || !authUser.id) {
          throw new Error('Token inválido');
        }
        
        // Buscar dados completos via Edge Function
        const userResponse = await callEdgeFunction('get-user-v2', 'GET', undefined, authUser.id);
        
        // callEdgeFunction já retorna data.data
        const user = userResponse.user || userResponse;
        
        return {
          id: user.user_id || user.id,
          email: user.email,
          nome: user.nome,
          tipo: user.tipo,
          ativo: user.ativo,
          dataCadastro: user.data_cadastro,
          ultimoAcesso: user.ultimo_acesso,
        };
      } catch (error: any) {
        console.error('[API] Me error:', error);
        throw new Error(error.message || 'Erro ao buscar usuário');
      }
    },
    
    signout: () => {
      setAuthToken(null);
      // Opcional: chamar Supabase Auth signout
      fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      }).catch(console.error);
    },
  },

  // Usuários - Usa Supabase Edge Functions (v2)
  usuarios: {
    list: async (filters?: { tipo?: string; ativo?: boolean; search?: string; page?: number; limit?: number }) => {
      try {
        const params = new URLSearchParams();
        if (filters?.tipo) params.append('tipo', filters.tipo);
        if (filters?.ativo !== undefined) params.append('ativo', filters.ativo.toString());
        if (filters?.search) params.append('search', filters.search);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const url = `${SUPABASE_URL}/functions/v1/list-users-v2${params.toString() ? `?${params.toString()}` : ''}`;
        const token = getAuthToken();
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || data.message || 'Erro ao listar usuários');
        }

        // Edge Functions retornam { success: true, data: { users: [...], pagination: {...} } }
        const usersData = data.success ? data.data : data;
        
        // Transformar dados do formato Edge Function para formato esperado pelo frontend
        const users = (usersData?.users || []).map((u: any) => ({
          id: u.user_id,
          nome: u.nome,
          email: u.email,
          tipo: u.tipo,
          ativo: u.ativo,
          dataCadastro: u.data_cadastro,
          ultimoAcesso: u.ultimo_acesso,
          permissoes: getDefaultPermissoes(u.tipo), // Permissões baseadas no tipo
        }));

        return users;
      } catch (error: any) {
        console.error('[API] Erro ao listar usuários:', error);
        throw error;
      }
    },

    get: async (userId: string) => {
      try {
        const userResponse = await callEdgeFunction('get-user-v2', 'GET', undefined, userId);
        
        return {
          id: userResponse.user.user_id,
          nome: userResponse.user.nome,
          email: userResponse.user.email,
          tipo: userResponse.user.tipo,
          ativo: userResponse.user.ativo,
          dataCadastro: userResponse.user.data_cadastro,
          ultimoAcesso: userResponse.user.ultimo_acesso,
          permissoes: getDefaultPermissoes(userResponse.user.tipo),
        };
      } catch (error: any) {
        console.error('[API] Erro ao buscar usuário:', error);
        throw error;
      }
    },

    create: async (userData: { nome: string; email: string; tipo: 'backoffice' | 'vendedor'; senha?: string }) => {
      try {
        // Se senha fornecida, criar via signup (que cria no Auth e na tabela)
        if (userData.senha) {
          const result = await api.auth.signup(userData.email, userData.senha, userData.nome, userData.tipo);
          return result.user;
        } else {
          // Sem senha, criar apenas na tabela (requer backoffice)
          const userResponse = await callEdgeFunction('create-user-v2', 'POST', {
            email: userData.email,
            nome: userData.nome,
            tipo: userData.tipo,
          });
          
          return {
            id: userResponse.user.user_id,
            nome: userResponse.user.nome,
            email: userResponse.user.email,
            tipo: userResponse.user.tipo,
            ativo: userResponse.user.ativo,
            dataCadastro: userResponse.user.data_cadastro,
            permissoes: getDefaultPermissoes(userResponse.user.tipo),
          };
        }
      } catch (error: any) {
        console.error('[API] Erro ao criar usuário:', error);
        throw error;
      }
    },

    update: async (userId: string, userData: { nome?: string; email?: string; tipo?: 'backoffice' | 'vendedor'; ativo?: boolean }) => {
      try {
        const userResponse = await callEdgeFunction('update-user-v2', 'PUT', {
          nome: userData.nome,
          email: userData.email,
          tipo: userData.tipo,
          ativo: userData.ativo,
        }, userId);
        
        // callEdgeFunction já retorna data.data
        const user = userResponse.user || userResponse;
        
        return {
          id: user.user_id || user.id,
          nome: user.nome,
          email: user.email,
          tipo: user.tipo,
          ativo: user.ativo,
          dataCadastro: user.data_cadastro,
          ultimoAcesso: user.ultimo_acesso,
          permissoes: getDefaultPermissoes(user.tipo),
        };
      } catch (error: any) {
        console.error('[API] Erro ao atualizar usuário:', error);
        throw error;
      }
    },

    delete: async (userId: string) => {
      try {
        await callEdgeFunction('delete-user-v2', 'DELETE', undefined, userId);
        return true;
      } catch (error: any) {
        console.error('[API] Erro ao excluir usuário:', error);
        throw error;
      }
    },
  },
  
  // Generic CRUD operations
  get: async (entity: string, options?: { params?: Record<string, any> }) => {
    console.log(`[API] GET /${entity}`, options?.params);
    
    // Caso especial para vendedores - buscar usuários tipo vendedor
    if (entity === 'vendedores') {
      try {
        console.log('[API] Buscando vendedores via Edge Function list-users-v2...');
        const response = await callEdgeFunction('list-users-v2', 'GET', undefined, undefined, {
          tipo: 'vendedor',
          ativo: options?.params?.ativo !== undefined ? options.params.ativo : undefined,
        });
        
        const users = response.users || [];
        console.log(`[API] ${users.length} usuários vendedores encontrados`);
        
        // Converter usuários para formato Seller
        const sellers = users.map((user: any) => usuarioToSeller(user));
        
        // Aplicar filtros adicionais se fornecidos
        if (options?.params) {
          let filtered = [...sellers];
          const params = options.params;
          
          if (params.status) {
            filtered = filtered.filter(s => s.status === params.status);
          }
          
          if (params.id) {
            filtered = filtered.filter(s => s.id === params.id);
          }
          
          return filtered;
        }
        
        return sellers;
      } catch (error) {
        console.error('[API] Erro ao buscar vendedores, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
        return getStoredData(entityConfig.storageKey, entityConfig.data);
      }
    }
    
    // Caso especial para vendas
    if (entity === 'vendas') {
      const vendas = carregarVendasDoLocalStorage();
      
      // Aplicar filtros se fornecidos
      if (options?.params) {
        let filtered = [...vendas];
        
        if (options.params?.vendedorId) {
          filtered = filtered.filter(v => v.vendedorId === options.params?.vendedorId);
        }
        
        if (options.params?.clienteId) {
          filtered = filtered.filter(v => v.clienteId === options.params?.clienteId);
        }
        
        if (options.params?.dataInicio) {
          const dataInicio = new Date(options.params.dataInicio);
          filtered = filtered.filter(v => new Date(v.dataPedido) >= dataInicio);
        }
        
        if (options.params?.dataFim) {
          const dataFim = new Date(options.params.dataFim);
          filtered = filtered.filter(v => new Date(v.dataPedido) <= dataFim);
        }
        
        return filtered;
      }
      
      return vendas;
    }
    
    // Outras entidades
    const entityConfig = entityMap[entity];
    if (!entityConfig) {
      console.warn(`[API] Entidade não encontrada: ${entity}, retornando array vazio`);
      return [];
    }
    
    const data = getStoredData(entityConfig.storageKey, entityConfig.data);
    
    // Aplicar filtros básicos se fornecidos
    if (options?.params) {
      let filtered = [...data];
      const params = options.params;
      
      // Filtro por ID
      if (params.id) {
        filtered = filtered.filter(item => item.id === params.id);
      }
      
      // Filtro por status
      if (params.status) {
        filtered = filtered.filter(item => item.status === params.status);
      }
      
      // Filtro por ativo
      if (params.ativo !== undefined) {
        filtered = filtered.filter(item => item.ativo === params.ativo);
      }
      
      return filtered;
    }
    
    return data;
  },
  
  getById: async (entity: string, id: string) => {
    console.log(`[API] GET /${entity}/${id} (mockado)`);
    
    // Caso especial para vendas
    if (entity === 'vendas') {
      const vendas = carregarVendasDoLocalStorage();
      const venda = vendas.find(v => v.id === id);
      if (!venda) {
        throw new Error(`Venda ${id} não encontrada`);
      }
      return venda;
    }
    
    const entityConfig = entityMap[entity];
    if (!entityConfig) {
      throw new Error(`Entidade ${entity} não encontrada`);
    }
    
    const data = getStoredData(entityConfig.storageKey, entityConfig.data);
    const item = data.find((item: any) => item.id === id);
    
    if (!item) {
      throw new Error(`${entity} ${id} não encontrado`);
    }
    
    return item;
  },
  
  create: async (entity: string, data: any) => {
    console.log(`[API] POST /${entity}:`, data);
    
    // Caso especial para vendedores - criar usuário tipo vendedor
    if (entity === 'vendedores') {
      try {
        console.log('[API] Criando vendedor via Edge Function create-user-v2...');
        
        // Criar usuário com tipo vendedor
        const userData = {
          email: data.email || data.emailAcesso || '',
          nome: data.nome || '',
          tipo: 'vendedor' as const,
          user_login: data.email || data.emailAcesso || '',
        };
        
        const userResponse = await callEdgeFunction('create-user-v2', 'POST', userData);
        const createdUser = userResponse.user || userResponse;
        
        console.log('[API] Usuário vendedor criado:', createdUser.user_id);
        
        // Converter para formato Seller
        const seller = usuarioToSeller(createdUser);
        
        // Mesclar dados adicionais do Seller se fornecidos
        return {
          ...seller,
          ...data,
          id: createdUser.user_id,
          usuarioId: createdUser.user_id,
        };
      } catch (error) {
        console.error('[API] Erro ao criar vendedor:', error);
        throw error;
      }
    }
    
    // Caso especial para vendas
    if (entity === 'vendas') {
      const vendas = carregarVendasDoLocalStorage();
      const novaVenda = {
        ...data,
        id: data.id || `VD-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vendas.push(novaVenda);
      salvarVendasNoLocalStorage(vendas);
      return novaVenda;
    }
    
    const entityConfig = entityMap[entity];
    if (!entityConfig) {
      throw new Error(`Entidade ${entity} não encontrada`);
    }
    
    const storedData = getStoredData(entityConfig.storageKey, entityConfig.data);
    const novoItem = {
      ...data,
      id: data.id || `${entity}-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    storedData.push(novoItem);
    saveStoredData(entityConfig.storageKey, storedData);
    
    return novoItem;
  },
  
  update: async (entity: string, id: string, data: any) => {
    console.log(`[API] PUT /${entity}/${id}:`, data);
    
    // Caso especial para vendedores - atualizar usuário
    if (entity === 'vendedores') {
      try {
        console.log('[API] Atualizando vendedor via Edge Function update-user-v2...');
        
        // Preparar dados para atualização do usuário
        const userData: any = {};
        if (data.nome !== undefined) userData.nome = data.nome;
        if (data.email !== undefined || data.emailAcesso !== undefined) {
          userData.email = data.email || data.emailAcesso;
        }
        if (data.status !== undefined) {
          userData.ativo = data.status === 'ativo';
        }
        
        const userResponse = await callEdgeFunction('update-user-v2', 'PUT', userData, id);
        const updatedUser = userResponse.user || userResponse;
        
        console.log('[API] Usuário vendedor atualizado:', updatedUser.user_id);
        
        // Converter para formato Seller e mesclar dados adicionais
        const seller = usuarioToSeller(updatedUser);
        return {
          ...seller,
          ...data,
          id: updatedUser.user_id,
          usuarioId: updatedUser.user_id,
        };
      } catch (error) {
        console.error('[API] Erro ao atualizar vendedor:', error);
        throw error;
      }
    }
    
    // Caso especial para vendas
    if (entity === 'vendas') {
      const vendas = carregarVendasDoLocalStorage();
      const index = vendas.findIndex(v => v.id === id);
      if (index === -1) {
        throw new Error(`Venda ${id} não encontrada`);
      }
      vendas[index] = {
        ...vendas[index],
        ...data,
        id,
        updatedAt: new Date(),
      };
      salvarVendasNoLocalStorage(vendas);
      return vendas[index];
    }
    
    const entityConfig = entityMap[entity];
    if (!entityConfig) {
      throw new Error(`Entidade ${entity} não encontrada`);
    }
    
    const storedData = getStoredData(entityConfig.storageKey, entityConfig.data);
    const index = storedData.findIndex((item: any) => item.id === id);
    
    if (index === -1) {
      throw new Error(`${entity} ${id} não encontrado`);
    }
    
    storedData[index] = {
      ...storedData[index],
      ...data,
      id,
      updatedAt: new Date(),
    };
    
    saveStoredData(entityConfig.storageKey, storedData);
    
    return storedData[index];
  },
  
  delete: async (entity: string, id: string) => {
    console.log(`[API] DELETE /${entity}/${id} (mockado)`);
    
    // Caso especial para vendas
    if (entity === 'vendas') {
      const vendas = carregarVendasDoLocalStorage();
      const index = vendas.findIndex(v => v.id === id);
      if (index === -1) {
        throw new Error(`Venda ${id} não encontrada`);
      }
      vendas.splice(index, 1);
      salvarVendasNoLocalStorage(vendas);
      return { success: true };
    }
    
    const entityConfig = entityMap[entity];
    if (!entityConfig) {
      throw new Error(`Entidade ${entity} não encontrada`);
    }
    
    const storedData = getStoredData(entityConfig.storageKey, entityConfig.data);
    const index = storedData.findIndex((item: any) => item.id === id);
    
    if (index === -1) {
      throw new Error(`${entity} ${id} não encontrado`);
    }
    
    storedData.splice(index, 1);
    saveStoredData(entityConfig.storageKey, storedData);
    
    return { success: true };
  },
  
  // Generic POST for custom paths
  post: async (path: string, data: any = {}) => {
    console.log(`[API] POST /${path} (mockado):`, data);
    
    // Rotas customizadas
    if (path.includes('aprovar')) {
      const clienteId = path.split('/')[1];
      return api.clientes.aprovar(clienteId);
    }
    
    if (path.includes('rejeitar')) {
      const clienteId = path.split('/')[1];
      return api.clientes.rejeitar(clienteId, data.motivo || '');
    }
    
    // Default: criar na entidade base
    const entity = path.split('/')[0];
    return api.create(entity, data);
  },
  
  // Custom endpoints
  clientes: {
    getPendentes: async () => {
      const clientes = getStoredData('mockClientes', mockClientes);
      return clientes.filter((c: any) => c.statusAprovacao === 'pendente');
    },
    
    aprovar: async (id: string) => {
      const clientes = getStoredData('mockClientes', mockClientes);
      const index = clientes.findIndex((c: any) => c.id === id);
      if (index === -1) {
        throw new Error(`Cliente ${id} não encontrado`);
      }
      clientes[index] = {
        ...clientes[index],
        statusAprovacao: 'aprovado',
        dataAprovacao: new Date().toISOString().split('T')[0],
      };
      saveStoredData('mockClientes', clientes);
      return clientes[index];
    },
    
    rejeitar: async (id: string, motivo: string) => {
      const clientes = getStoredData('mockClientes', mockClientes);
      const index = clientes.findIndex((c: any) => c.id === id);
      if (index === -1) {
        throw new Error(`Cliente ${id} não encontrado`);
      }
      clientes[index] = {
        ...clientes[index],
        statusAprovacao: 'rejeitado',
        motivoRejeicao: motivo,
      };
      saveStoredData('mockClientes', clientes);
      return clientes[index];
    },
  },
  
  notificacoes: {
    marcarTodasLidas: async () => {
      const notificacoes = getStoredData('mockNotificacoes', notificacoesMock);
      notificacoes.forEach((n: any) => {
        n.lida = true;
      });
      saveStoredData('mockNotificacoes', notificacoes);
      return { success: true };
    },
  },
  
  // Metas endpoints
  metas: {
    buscarPorVendedor: async (vendedorId: string, ano: number, mes: number) => {
      // Buscar metas mockadas (se houver) ou retornar null
      const metasKey = `mockMetas_${vendedorId}_${ano}_${mes}`;
      const stored = localStorage.getItem(metasKey);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    },
    
    buscarTotal: async (ano: number, mes: number) => {
      // Calcular total de metas mockadas
      return {
        total: 0,
        vendedores: [],
      };
    },
    
    buscarTodas: async () => {
      // Buscar todas as metas do localStorage
      const metas: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('mockMetas_')) {
          metas.push(JSON.parse(localStorage.getItem(key) || '{}'));
        }
      }
      return metas;
    },
    
    salvar: async (data: any) => {
      const { vendedorId, ano, mes } = data;
      const metasKey = `mockMetas_${vendedorId}_${ano}_${mes}`;
      localStorage.setItem(metasKey, JSON.stringify(data));
      return data;
    },
    
    atualizar: async (vendedorId: string, ano: number, mes: number, data: any) => {
      const metasKey = `mockMetas_${vendedorId}_${ano}_${mes}`;
      localStorage.setItem(metasKey, JSON.stringify({ ...data, vendedorId, ano, mes }));
      return { ...data, vendedorId, ano, mes };
    },
    
    deletar: async (vendedorId: string, ano: number, mes: number) => {
      const metasKey = `mockMetas_${vendedorId}_${ano}_${mes}`;
      localStorage.removeItem(metasKey);
      return { success: true };
    },
    
    copiar: async (data: any) => {
      // Copiar metas de um período para outro
      const { origem, destino } = data;
      const origemKey = `mockMetas_${origem.vendedorId}_${origem.ano}_${origem.mes}`;
      const destinoKey = `mockMetas_${destino.vendedorId}_${destino.ano}_${destino.mes}`;
      
      const origemData = localStorage.getItem(origemKey);
      if (origemData) {
        const meta = JSON.parse(origemData);
        localStorage.setItem(destinoKey, JSON.stringify({
          ...meta,
          vendedorId: destino.vendedorId,
          ano: destino.ano,
          mes: destino.mes,
        }));
      }
      
      return { success: true };
    },
  },
  
  // Naturezas de operação
  naturezasOperacao: {
    list: async () => {
      return getStoredData('mockNaturezasOperacao', mockNaturezasOperacao);
    },
    
    create: async (data: any) => {
      const naturezas = getStoredData('mockNaturezasOperacao', mockNaturezasOperacao);
      const nova = {
        ...data,
        id: `natureza-${Date.now()}`,
      };
      naturezas.push(nova);
      saveStoredData('mockNaturezasOperacao', naturezas);
      return nova;
    },
    
    update: async (id: string, data: any) => {
      return api.update('naturezas-operacao', id, data);
    },
    
    delete: async (id: string) => {
      return api.delete('naturezas-operacao', id);
    },
  },
  
  // Sync vendedores with usuarios - busca usuários tipo vendedor
  syncVendedores: async () => {
    try {
      console.log('[API] syncVendedores: Buscando usuários tipo vendedor...');
      
      // Buscar todos os usuários tipo vendedor
      const response = await callEdgeFunction('list-users-v2', 'GET', undefined, undefined, {
        tipo: 'vendedor',
      });
      
      const users = response.users || [];
      console.log(`[API] ${users.length} usuários vendedores encontrados`);
      
      return {
        success: true,
        message: `${users.length} vendedor(es) sincronizado(s) com sucesso`,
        count: users.length,
      };
    } catch (error: any) {
      console.error('[API] Erro ao sincronizar vendedores:', error);
      throw new Error(error.message || 'Erro ao sincronizar vendedores');
    }
  },

  // ============================================
  // TINY ERP INTEGRATION (Desabilitado)
  // ============================================

  getERPConfig: async (empresaId: string) => {
    console.log('[API] getERPConfig (mockado):', empresaId);
    const empresas = getStoredData('mockEmpresas', mockCompanies);
    const empresa = empresas.find((e: any) => e.id === empresaId);
    return empresa?.integracoesERP?.[0] || null;
  },

  saveERPConfig: async (empresaId: string, config: any) => {
    console.log('[API] saveERPConfig (mockado):', { empresaId, config });
    const empresas = getStoredData('mockEmpresas', mockCompanies);
    const empresa = empresas.find((e: any) => e.id === empresaId);
    if (empresa) {
      if (!empresa.integracoesERP) empresa.integracoesERP = [];
      empresa.integracoesERP[0] = config;
      saveStoredData('mockEmpresas', empresas);
    }
    return { success: true };
  },

  debugListERPConfigs: async () => {
    return [];
  },

  debugCleanERPConfigs: async () => {
    return { success: true };
  },

  testTinyConnection: async (token: string) => {
    console.log('[API] testTinyConnection (mockado)');
    return { success: true, message: 'Conexão mockada - sempre retorna sucesso' };
  },

  tinyListarProdutos: async (empresaId: string) => {
    console.log('[API] tinyListarProdutos (mockado)');
    return { produtos: [] };
  },

  tinyObterProduto: async (empresaId: string, produtoId: string) => {
    console.log('[API] tinyObterProduto (mockado)');
    throw new Error('Funcionalidade Tiny ERP desabilitada - usando dados mock');
  },

  tinyListarClientes: async (empresaId: string) => {
    console.log('[API] tinyListarClientes (mockado)');
    return { clientes: [] };
  },

  tinycriarPedido: async (empresaId: string, pedidoXML: string, vendaId?: string) => {
    console.log('[API] tinycriarPedido (mockado)');
    return {
      pedido: {
        id: `tiny-${Date.now()}`,
        numero: `PED-${Date.now()}`,
      },
      status_processamento: '3',
    };
  },

  tinyObterPedido: async (empresaId: string, pedidoId: string) => {
    console.log('[API] tinyObterPedido (mockado)');
    throw new Error('Funcionalidade Tiny ERP desabilitada - usando dados mock');
  },

  tinyListarPedidos: async (empresaId: string, dataInicial?: string, dataFinal?: string) => {
    console.log('[API] tinyListarPedidos (mockado)');
    return { pedidos: [] };
  },

  tinyObterNotaFiscal: async (empresaId: string, notaFiscalId: string) => {
    console.log('[API] tinyObterNotaFiscal (mockado)');
    throw new Error('Funcionalidade Tiny ERP desabilitada - usando dados mock');
  },

  tinyCriarCliente: async (empresaId: string, clienteData: any) => {
    console.log('[API] tinyCriarCliente (mockado)');
    return {
      cliente: {
        id: `tiny-cliente-${Date.now()}`,
      },
      status_processamento: '3',
    };
  },

  tinyCriarProduto: async (empresaId: string, produtoData: any) => {
    console.log('[API] tinyCriarProduto (mockado)');
    return {
      produto: {
        id: `tiny-produto-${Date.now()}`,
      },
      status_processamento: '3',
    };
  },
  
  getCustom: async (endpoint: string) => {
    console.log('[API] getCustom (mockado):', endpoint);
    return [];
  },
  
  updateCustom: async (endpoint: string, data: any) => {
    console.log('[API] updateCustom (mockado):', endpoint);
    return { success: true };
  },
  
  postCustom: async (endpoint: string, data: any) => {
    console.log('[API] postCustom (mockado):', endpoint);
    return { success: true };
  },
  
  statusMix: {
    ativarPorPedido: async (clienteId: string, produtoIds: string[]) => {
      console.log('[API] statusMix.ativarPorPedido (mockado)');
      return { success: true };
    },
    
    verificarInativos: async () => {
      console.log('[API] statusMix.verificarInativos (mockado)');
      return { success: true };
    },
  },
  
  configStatusMix: {
    get: async () => {
      return {
        diasInatividade: 90,
        ativo: true,
      };
    },
    
    update: async (data: any) => {
      console.log('[API] configStatusMix.update (mockado):', data);
      return { success: true };
    },
  },

  tinyFixVendas: async (empresaId: string, vendaIds: string[]) => {
    console.log('[API] tinyFixVendas (mockado)');
    return { success: true };
  },
  
  corrigirVendedorOrfao: async (vendedorOrigemId: string, vendedorDestinoId: string) => {
    console.log('[API] corrigirVendedorOrfao (mockado)');
    return { success: true };
  },
};

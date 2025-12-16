// API removida - sistema agora funciona apenas com dados locais/mock
// Todas as funções foram desabilitadas pois não há mais backend Supabase

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
  
  // Se o token parecer inválido ou expirado, limpar
  if (authToken && authToken !== 'null' && authToken !== 'undefined') {
    // Verificar se é um token mock válido
    if (authToken.startsWith('mock_token_')) {
      return authToken;
    }
    
    // Verificar se é um JWT válido (tem 3 partes separadas por ponto)
    const parts = authToken.split('.');
    if (parts.length === 3) {
      try {
        // Decodificar o payload para verificar expiração
        const payload = JSON.parse(atob(parts[1]));
        const now = Math.floor(Date.now() / 1000);
        
        // Se expirou, limpar o token
        if (payload.exp && payload.exp < now) {
          console.log('[API] Token expirado, limpando...');
          authToken = null;
          localStorage.removeItem('auth_token');
          return null;
        }
      } catch (error) {
        console.log('[API] Token inválido, limpando...', error);
        authToken = null;
        localStorage.removeItem('auth_token');
        return null;
      }
    } else {
      // Token não é um JWT válido
      console.log('[API] Token mal formatado, limpando...');
      authToken = null;
      localStorage.removeItem('auth_token');
      return null;
    }
  }
  
  return authToken;
};

// Helper para retornar erro de backend não disponível
const backendNotAvailable = (operation: string) => {
  console.log(`[API] Backend não disponível para ${operation}`);
  throw new Error(`Backend não disponível. Operação: ${operation}`);
};

// Helper para retornar array vazio (para operações GET)
const returnEmpty = (entity: string) => {
  console.log(`[API] Backend não disponível para GET /${entity}, retornando array vazio`);
  return [];
};

// Generic API functions
export const api = {
  // Auth
  auth: {
    signup: async (email: string, password: string, nome: string, tipo: string) => {
      backendNotAvailable('signup');
    },
    
    signin: async (email: string, password: string) => {
      backendNotAvailable('signin');
    },
    
    me: async () => {
      backendNotAvailable('me');
    },
    
    signout: () => {
      setAuthToken(null);
    },
  },
  
  // Generic CRUD operations
  get: async (entity: string, options?: { params?: Record<string, any> }) => {
    return returnEmpty(entity);
  },
  
  getById: async (entity: string, id: string) => {
    backendNotAvailable(`getById ${entity}/${id}`);
  },
  
  create: async (entity: string, data: any) => {
    backendNotAvailable(`create ${entity}`);
  },
  
  update: async (entity: string, id: string, data: any) => {
    backendNotAvailable(`update ${entity}/${id}`);
  },
  
  delete: async (entity: string, id: string) => {
    backendNotAvailable(`delete ${entity}/${id}`);
  },
  
  // Custom endpoints
  clientes: {
    getPendentes: async () => returnEmpty('clientes/pendentes'),
    aprovar: async (id: string) => backendNotAvailable(`aprovar cliente ${id}`),
    rejeitar: async (id: string, motivo: string) => backendNotAvailable(`rejeitar cliente ${id}`),
  },
  
  notificacoes: {
    marcarTodasLidas: async () => backendNotAvailable('marcar notificações como lidas'),
  },
  
  // Metas endpoints
  metas: {
    buscarPorVendedor: async (vendedorId: string, ano: number, mes: number) => 
      backendNotAvailable(`buscar meta vendedor ${vendedorId}`),
    buscarTotal: async (ano: number, mes: number) => 
      backendNotAvailable(`buscar meta total ${ano}/${mes}`),
    buscarTodas: async () => returnEmpty('metas'),
    salvar: async (data: any) => backendNotAvailable('salvar meta'),
    atualizar: async (vendedorId: string, ano: number, mes: number, data: any) => 
      backendNotAvailable(`atualizar meta ${vendedorId}`),
    deletar: async (vendedorId: string, ano: number, mes: number) => 
      backendNotAvailable(`deletar meta ${vendedorId}`),
    copiar: async (data: any) => backendNotAvailable('copiar metas'),
  },
  
  // Naturezas de operação
  naturezasOperacao: {
    list: async () => returnEmpty('naturezas-operacao'),
    create: async (data: any) => backendNotAvailable('criar natureza'),
    update: async (id: string, data: any) => backendNotAvailable(`atualizar natureza ${id}`),
    delete: async (id: string) => backendNotAvailable(`deletar natureza ${id}`),
  },
  
  // Sync vendedores
  syncVendedores: async () => backendNotAvailable('sync vendedores'),

  // ============================================
  // TINY ERP INTEGRATION
  // ============================================

  getERPConfig: async (empresaId: string) => backendNotAvailable(`getERPConfig ${empresaId}`),
  saveERPConfig: async (empresaId: string, config: any) => 
    backendNotAvailable(`saveERPConfig ${empresaId}`),
  debugListERPConfigs: async () => backendNotAvailable('debugListERPConfigs'),
  debugCleanERPConfigs: async () => backendNotAvailable('debugCleanERPConfigs'),
  testTinyConnection: async (token: string) => backendNotAvailable('testTinyConnection'),
  tinyListarProdutos: async (empresaId: string) => backendNotAvailable(`tinyListarProdutos ${empresaId}`),
  tinyObterProduto: async (empresaId: string, produtoId: string) => 
    backendNotAvailable(`tinyObterProduto ${empresaId}/${produtoId}`),
  tinyListarClientes: async (empresaId: string) => backendNotAvailable(`tinyListarClientes ${empresaId}`),
  tinycriarPedido: async (empresaId: string, pedidoXML: string, vendaId?: string) => 
    backendNotAvailable(`tinycriarPedido ${empresaId}`),
  tinyObterPedido: async (empresaId: string, pedidoId: string) => 
    backendNotAvailable(`tinyObterPedido ${empresaId}/${pedidoId}`),
  tinyListarPedidos: async (empresaId: string, dataInicial?: string, dataFinal?: string) => 
    backendNotAvailable(`tinyListarPedidos ${empresaId}`),
  tinyCriarCliente: async (empresaId: string, clienteData: any) => 
    backendNotAvailable(`tinyCriarCliente ${empresaId}`),
  tinyCriarProduto: async (empresaId: string, produtoData: any) => 
    backendNotAvailable(`tinyCriarProduto ${empresaId}`),
  tinyFixVendas: async (empresaId: string, vendaIds: string[]) => 
    backendNotAvailable(`tinyFixVendas ${empresaId}`),
  
  // Status Mix methods
  getCustom: async (endpoint: string) => backendNotAvailable(`getCustom ${endpoint}`),
  updateCustom: async (endpoint: string, data: any) => backendNotAvailable(`updateCustom ${endpoint}`),
  postCustom: async (endpoint: string, data: any) => backendNotAvailable(`postCustom ${endpoint}`),
  
  statusMix: {
    ativarPorPedido: async (clienteId: string, produtoIds: string[]) => 
      backendNotAvailable('statusMix ativarPorPedido'),
    verificarInativos: async () => backendNotAvailable('statusMix verificarInativos'),
  },
  
  configStatusMix: {
    get: async () => backendNotAvailable('configStatusMix get'),
    update: async (data: any) => backendNotAvailable('configStatusMix update'),
  },
};

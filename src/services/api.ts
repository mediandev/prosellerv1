// API Mock - Sistema funciona apenas com dados locais/mock
// Todas as operações usam dados mockados armazenados no localStorage

// Importar todos os dados mock
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
  // Auth - Usa dados mock de usuários
  auth: {
    signup: async (email: string, password: string, nome: string, tipo: string) => {
      console.log('[API] Signup mockado:', { email, nome, tipo });
      
      // Verificar se email já existe
      const usuarios = getStoredData('mockUsuarios', mockUsuarios);
      if (usuarios.some(u => u.email === email)) {
        throw new Error('Email já cadastrado');
      }
      
      // Criar novo usuário
      const novoUsuario = {
        id: `user-${Date.now()}`,
        nome,
        email,
        tipo: tipo as 'backoffice' | 'vendedor',
        permissoes: tipo === 'backoffice' 
          ? mockUsuarios[0].permissoes 
          : mockUsuarios[1].permissoes,
        ativo: true,
        dataCadastro: new Date().toISOString(),
      };
      
      usuarios.push(novoUsuario);
      saveStoredData('mockUsuarios', usuarios);
      
      // Criar token mock
      const token = `mock-token-${Date.now()}`;
      setAuthToken(token);
      
      return {
        user: novoUsuario,
        session: { access_token: token }
      };
    },
    
    signin: async (email: string, password: string) => {
      console.log('[API] Signin mockado:', { email });
      
      // Buscar usuário nos dados mock
      const usuarios = getStoredData('mockUsuarios', mockUsuarios);
      const usuario = usuarios.find(u => u.email === email);
      
      if (!usuario) {
        throw new Error('Email ou senha inválidos');
      }
      
      if (!usuario.ativo) {
        throw new Error('Usuário inativo');
      }
      
      // Nota: A senha não é armazenada nos dados mock de usuários
      // A validação de senha é feita no AuthContext com USUARIOS_MOCK
      // Se chegou aqui, o usuário existe, então aceitar o login
      // (a validação de senha já foi feita no AuthContext)
      
      // Criar token mock
      const token = `mock-token-${usuario.id}-${Date.now()}`;
      setAuthToken(token);
      
      // Atualizar último acesso
      usuario.ultimoAcesso = new Date().toISOString();
      saveStoredData('mockUsuarios', usuarios);
      
      return {
        user: usuario,
        session: { access_token: token }
      };
    },
    
    me: async () => {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Não autenticado');
      }
      
      // Buscar usuário atual (simplificado - em produção viria do token)
      const usuarios = getStoredData('mockUsuarios', mockUsuarios);
      return usuarios[0] || usuarios[1]; // Retorna primeiro usuário disponível
    },
    
    signout: () => {
      setAuthToken(null);
    },
  },
  
  // Generic CRUD operations
  get: async (entity: string, options?: { params?: Record<string, any> }) => {
    console.log(`[API] GET /${entity} (mockado)`, options?.params);
    
    // Caso especial para vendas
    if (entity === 'vendas') {
      const vendas = carregarVendasDoLocalStorage();
      
      // Aplicar filtros se fornecidos
      if (options?.params) {
        let filtered = [...vendas];
        
        if (options.params.vendedorId) {
          filtered = filtered.filter(v => v.vendedorId === options.params.vendedorId);
        }
        
        if (options.params.clienteId) {
          filtered = filtered.filter(v => v.clienteId === options.params.clienteId);
        }
        
        if (options.params.dataInicio) {
          const dataInicio = new Date(options.params.dataInicio);
          filtered = filtered.filter(v => new Date(v.dataPedido) >= dataInicio);
        }
        
        if (options.params.dataFim) {
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
      
      // Filtro por ID
      if (options.params.id) {
        filtered = filtered.filter(item => item.id === options.params.id);
      }
      
      // Filtro por status
      if (options.params.status) {
        filtered = filtered.filter(item => item.status === options.params.status);
      }
      
      // Filtro por ativo
      if (options.params.ativo !== undefined) {
        filtered = filtered.filter(item => item.ativo === options.params.ativo);
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
    console.log(`[API] POST /${entity} (mockado):`, data);
    
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
    console.log(`[API] PUT /${entity}/${id} (mockado):`, data);
    
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
  
  // Sync vendedores with usuarios (mockado)
  syncVendedores: async () => {
    console.log('[API] syncVendedores (mockado)');
    return { success: true, message: 'Sincronização mockada concluída' };
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

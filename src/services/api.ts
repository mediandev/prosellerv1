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
// Usa variáveis de ambiente com fallback para valores padrão
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xxoiqfraeolsqsmsheue.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4b2lxZnJhZW9sc3FzbXNoZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1ODQ5MDIsImV4cCI6MjA0MjE2MDkwMn0.m8A1mUf3GyAl_17FjltxkgBr-xRQYZw9YEDUVUBdttA';

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
let refreshToken: string | null = null;
let tokenExpiryTime: number | null = null;

export const setAuthToken = (token: string | null, refresh?: string | null, expiresIn?: number) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
    // Calcular tempo de expiração (geralmente 1 hora = 3600 segundos)
    if (expiresIn) {
      tokenExpiryTime = Date.now() + (expiresIn * 1000);
      localStorage.setItem('auth_token_expiry', tokenExpiryTime.toString());
    }
  } else {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token_expiry');
    tokenExpiryTime = null;
  }
  
  if (refresh) {
    refreshToken = refresh;
    localStorage.setItem('refresh_token', refresh);
  } else if (!token) {
    localStorage.removeItem('refresh_token');
    refreshToken = null;
  }
};

export const getAuthToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('auth_token');
  }
  if (!refreshToken) {
    refreshToken = localStorage.getItem('refresh_token');
  }
  if (!tokenExpiryTime) {
    const expiry = localStorage.getItem('auth_token_expiry');
    tokenExpiryTime = expiry ? parseInt(expiry, 10) : null;
  }
  return authToken;
};

export const getRefreshToken = () => {
  if (!refreshToken) {
    refreshToken = localStorage.getItem('refresh_token');
  }
  return refreshToken;
};

// Verificar se o token está próximo de expirar (menos de 5 minutos)
export const isTokenExpiringSoon = (): boolean => {
  if (!tokenExpiryTime) {
    const expiry = localStorage.getItem('auth_token_expiry');
    if (!expiry) return true; // Se não tem expiração, considerar como expirado
    tokenExpiryTime = parseInt(expiry, 10);
  }
  
  const now = Date.now();
  const timeUntilExpiry = tokenExpiryTime - now;
  const fiveMinutes = 5 * 60 * 1000; // 5 minutos em milissegundos
  
  return timeUntilExpiry < fiveMinutes;
};

// Função para fazer refresh do token
export const refreshAuthToken = async (): Promise<boolean> => {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    console.log('[AUTH] Nenhum refresh token disponível');
    return false;
  }
  
  try {
    console.log('[AUTH] Fazendo refresh do token...');
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        refresh_token: currentRefreshToken,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[AUTH] Erro ao fazer refresh:', data);
      // Se o refresh token também expirou, limpar tudo
      setAuthToken(null);
      return false;
    }
    
    // Atualizar tokens
    setAuthToken(data.access_token, data.refresh_token, data.expires_in);
    console.log('[AUTH] Token renovado com sucesso');
    return true;
  } catch (error) {
    console.error('[AUTH] Erro ao fazer refresh do token:', error);
    setAuthToken(null);
    return false;
  }
};

// Helper para chamadas às Edge Functions com retry automático em caso de token expirado
async function callEdgeFunction(
  functionName: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  path?: string,
  queryParams?: Record<string, any>,
  retryOn401: boolean = true
): Promise<any> {
  // Verificar se o token está próximo de expirar e fazer refresh preventivo
  if (isTokenExpiringSoon()) {
    console.log('[API] Token próximo de expirar, fazendo refresh preventivo...');
    await refreshAuthToken();
  }
  
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
  
  const makeRequest = async (): Promise<any> => {
    const currentToken = getAuthToken();
    const currentHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    };
    
    if (currentToken) {
      currentHeaders['Authorization'] = `Bearer ${currentToken}`;
    }
    
    const options: RequestInit = {
      method,
      headers: currentHeaders,
    };
    
    if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    // Se receber 401 e tiver retry habilitado, tentar refresh
    if (response.status === 401 && retryOn401) {
      console.log('[API] Token expirado (401), tentando refresh...');
      const refreshed = await refreshAuthToken();
      
      if (refreshed) {
        // Tentar novamente com o novo token
        const newToken = getAuthToken();
        if (newToken) {
          currentHeaders['Authorization'] = `Bearer ${newToken}`;
          const retryOptions: RequestInit = {
            method,
            headers: currentHeaders,
          };
          
          if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
            retryOptions.body = JSON.stringify(body);
          }
          
          const retryResponse = await fetch(url, retryOptions);
          const retryData = await retryResponse.json();
          
          if (!retryResponse.ok) {
            throw new Error(retryData.error || retryData.message || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          // Edge Functions retornam { success: true, data: {...} }
          if (retryData.success && retryData.data) {
            return retryData.data;
          }
          
          return retryData.data || retryData;
        }
      }
      
      // Se não conseguiu fazer refresh, retornar erro 401
      throw new Error(data.error || data.message || 'Token expirado. Faça login novamente.');
    }
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Edge Functions retornam { success: true, data: {...} }
    if (data.success && data.data) {
      return data.data;
    }
    
    // Fallback para formato direto
    return data.data || data;
  };
  
  try {
    return await makeRequest();
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

// Helper: normaliza resposta da API de lista de preço para formato ListaPreco do frontend
function mapListaPrecoFromApi(item: any): any {
  if (!item) return item;
  // Aceitar vários nomes que a edge function pode retornar para a lista de produtos
  const produtosRaw =
    item.produtos ??
    item.produtos_preco ??
    item.produto_precos ??
    item.itens ??
    item.items ??
    item.product_prices ??
    [];
  const produtosNorm = Array.isArray(produtosRaw)
    ? produtosRaw.map((p: any) => ({
        produtoId: String(
          p.produtoId ?? p.produto_id ?? p.productId ?? p.product_id ?? p.id ?? ''
        ),
        preco: Number(
          p.preco ?? p.valor ?? p.price ?? p.preco_unitario ?? p.valor_unitario ?? 0
        ),
      }))
    : [];
  const faixas = item.faixasDesconto ?? item.faixas_desconto ?? [];
  const totalProdutos = item.totalProdutos ?? item.total_produtos ?? produtosNorm.length;
  const totalFaixas = item.totalFaixas ?? item.total_faixas ?? (Array.isArray(faixas) ? faixas.length : 0);

  return {
    id: String(item.id ?? ''),
    nome: item.nome ?? '',
    produtos: produtosNorm,
    tipoComissao: (item.tipoComissao ?? item.tipo_comissao ?? 'fixa') as 'fixa' | 'conforme_desconto',
    percentualFixo: item.percentualFixo ?? item.percentual_fixo,
    faixasDesconto: faixas,
    totalProdutos: typeof totalProdutos === 'number' ? totalProdutos : produtosNorm.length,
    totalFaixas: typeof totalFaixas === 'number' ? totalFaixas : (Array.isArray(faixas) ? faixas.length : 0),
    ativo: item.ativo !== false,
    createdAt: item.createdAt ? new Date(item.createdAt) : (item.created_at ? new Date(item.created_at) : new Date()),
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : (item.updated_at ? new Date(item.updated_at) : new Date()),
  };
}

// Helper: normaliza resposta da API de cliente para formato Cliente do frontend
function mapClienteFromApi(item: any): any {
  if (!item) return item;
  const statusAprovacao = item.statusAprovacao ?? item.status_aprovacao ?? 'pendente';
  let situacao = item.situacao ?? 'Análise';
  if (statusAprovacao === 'aprovado') situacao = 'Ativo';
  else if (statusAprovacao === 'rejeitado') situacao = 'Reprovado';
  else if (statusAprovacao === 'pendente') situacao = 'Análise';
  
  // Mapear condições_cliente (array de objetos) para condicoesPagamentoAssociadas (array de IDs)
  let condicoesPagamentoAssociadas: string[] = [];
  if (Array.isArray(item.condicoesPagamentoAssociadas)) {
    condicoesPagamentoAssociadas = item.condicoesPagamentoAssociadas;
  } else if (Array.isArray(item.condicoesCliente)) {
    // Extrair IDs das condições de pagamento do cliente
    condicoesPagamentoAssociadas = item.condicoesCliente
      .map((c: any) => String(c.id_condicao ?? c.condicao_id ?? c.id ?? c))
      .filter((id: string) => id && id !== 'undefined');
  } else if (Array.isArray(item.condicoes_cliente)) {
    condicoesPagamentoAssociadas = item.condicoes_cliente
      .map((c: any) => String(c.id_condicao ?? c.condicao_id ?? c.id ?? c))
      .filter((id: string) => id && id !== 'undefined');
  }
  
  return {
    id: String(item.id ?? item.cliente_id ?? ''),
    codigo: item.codigo ?? '',
    tipoPessoa: item.tipoPessoa ?? (item.cpfCnpj?.length === 11 || item.cpf_cnpj?.length === 11 ? 'Pessoa Física' : 'Pessoa Jurídica'),
    cpfCnpj: item.cpfCnpj ?? item.cpf_cnpj ?? '',
    razaoSocial: item.razaoSocial ?? item.nome ?? '',
    nomeFantasia: item.nomeFantasia ?? item.nome_fantasia ?? '',
    inscricaoEstadual: item.inscricaoEstadual ?? item.inscricao_estadual ?? '',
    situacao,
    segmentoMercado: item.segmentoMercado ?? item.segmento_mercado ?? item.tipo_segmento ?? item.segmento_nome ?? '',
    segmentoId: item.segmentoId ?? item.segmento_id != null ? String(item.segmentoId ?? item.segmento_id) : undefined,
    grupoRede: item.grupoRede ?? item.grupo_id ?? item.grupo_rede_nome ?? item.grupo_rede ?? '',
    grupoId: item.grupoId ?? item.grupo_id ?? item.grupoRede ?? undefined,
    cep: item.cep ?? item.endereco?.cep ?? '',
    logradouro: item.logradouro ?? item.endereco?.logradouro ?? '',
    numero: item.numero ?? item.endereco?.numero ?? '',
    complemento: item.complemento ?? item.endereco?.complemento ?? '',
    bairro: item.bairro ?? item.endereco?.bairro ?? '',
    uf: item.uf ?? item.endereco?.uf ?? '',
    municipio: item.municipio ?? item.endereco?.municipio ?? item.endereco?.cidade ?? '',
    enderecoEntregaDiferente: item.enderecoEntregaDiferente ?? false,
    observacoesInternas: item.observacoesInternas ?? item.observacao_interna ?? '',
    site: item.site ?? item.contato?.site ?? item.contato?.website ?? '',
    emailPrincipal: item.emailPrincipal ?? item.contato?.emailPrincipal ?? item.contato?.email ?? '',
    emailNFe: item.emailNFe ?? item.contato?.emailNFe ?? item.contato?.email_nf ?? '',
    telefoneFixoPrincipal: item.telefoneFixoPrincipal ?? item.contato?.telefoneFixoPrincipal ?? item.contato?.telefone ?? '',
    telefoneCelularPrincipal: item.telefoneCelularPrincipal ?? item.contato?.telefoneCelularPrincipal ?? item.contato?.telefone_adicional ?? '',
    pessoasContato: item.pessoasContato ?? [],
    dadosBancarios: item.dadosBancarios ?? [],
    empresaFaturamento: item.empresaFaturamento ?? '',
    vendedorAtribuido: item.vendedorAtribuido ?? (item.vendedoresAtribuidos?.[0] ? { id: item.vendedoresAtribuidos[0].id, nome: item.vendedoresAtribuidos[0].nome ?? '', email: item.vendedoresAtribuidos[0].email ?? '' } : undefined),
    vendedoresAtribuidos: item.vendedoresAtribuidos ?? [],
    listaPrecos: item.listaPrecos ?? '',
    descontoPadrao: Number(item.descontoPadrao ?? item.desconto ?? 0),
    descontoFinanceiro: Number(item.descontoFinanceiro ?? item.desconto_financeiro ?? 0),
    condicoesPagamentoAssociadas,
    // Incluir dados completos de condições_cliente e conta_corrente_cliente se disponíveis
    condicoesCliente: item.condicoesCliente ?? item.condicoes_cliente ?? [],
    contaCorrenteCliente: item.contaCorrenteCliente ?? item.conta_corrente_cliente ?? [],
    pedidoMinimo: Number(item.pedidoMinimo ?? item.pedido_minimo ?? 0),
    statusAprovacao,
    motivoRejeicao: item.motivoRejeicao ?? item.motivo_rejeicao ?? '',
    aprovadoPor: item.aprovadoPor ?? item.aprovado_por ?? '',
    dataAprovacao: item.dataAprovacao ?? item.data_aprovacao ?? '',
    createdAt: item.createdAt ? new Date(item.createdAt) : (item.created_at ? new Date(item.created_at) : new Date()),
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : (item.updated_at ? new Date(item.updated_at) : new Date()),
  };
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
        const refresh = authData.refresh_token;
        const expiresIn = authData.expires_in || 3600; // Default 1 hora se não fornecido
        setAuthToken(token, refresh, expiresIn);
        
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
        
        // Armazenar access_token, refresh_token e expires_in
        const token = data.access_token;
        const refresh = data.refresh_token;
        const expiresIn = data.expires_in || 3600; // Default 1 hora se não fornecido
        setAuthToken(token, refresh, expiresIn);
        
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
        // Se um ID específico foi fornecido, buscar dados completos do vendedor
        if (options?.params?.id) {
          console.log('[API] Buscando vendedor completo via Edge Function get-vendedor-completo-v2...', options.params.id);
          const response = await callEdgeFunction('get-vendedor-completo-v2', 'GET', undefined, options.params.id);
          
          console.log('[API] Dados completos do vendedor recebidos:', response);
          
          // Mapear dados da resposta para formato Seller
          const dadosVendedor = response.dados_vendedor || {};
          const seller: Seller = {
            id: response.user_id,
            nome: response.nome || '',
            iniciais: dadosVendedor.iniciais || (response.nome ? (() => {
              const parts = response.nome.trim().split(" ");
              if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
              }
              return response.nome.substring(0, 2).toUpperCase();
            })() : ''),
            cpf: dadosVendedor.cpf || '',
            email: response.email || '',
            telefone: dadosVendedor.telefone || '',
            dataAdmissao: dadosVendedor.data_admissao ? new Date(dadosVendedor.data_admissao).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            status: (dadosVendedor.status as 'ativo' | 'inativo' | 'excluido') || 'ativo',
            acessoSistema: !!response.user_id,
            emailAcesso: response.email || '',
            usuarioId: response.user_id,
            contatosAdicionais: Array.isArray(dadosVendedor.contatos_adicionais) ? dadosVendedor.contatos_adicionais : [],
            cnpj: dadosVendedor.cnpj || '',
            razaoSocial: dadosVendedor.razao_social || '',
            nomeFantasia: dadosVendedor.nome_fantasia || '',
            inscricaoEstadual: dadosVendedor.inscricao_estadual || '',
            dadosBancarios: dadosVendedor.dados_bancarios && typeof dadosVendedor.dados_bancarios === 'object' 
              ? dadosVendedor.dados_bancarios 
              : {
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
              cep: dadosVendedor.cep || '',
              logradouro: dadosVendedor.logradouro || '',
              numero: dadosVendedor.numero || '',
              complemento: dadosVendedor.complemento || '',
              bairro: dadosVendedor.bairro || '',
              uf: dadosVendedor.estado || '',
              municipio: dadosVendedor.cidade || '',
              enderecoEntregaDiferente: false,
            },
            observacoesInternas: dadosVendedor.observacoes_internas || '',
            metasAnuais: [],
            comissoes: {
              regraAplicavel: dadosVendedor.aliquotafixa ? 'aliquota_fixa' : 'lista_preco',
              aliquotaFixa: dadosVendedor.aliquotafixa ? parseFloat(dadosVendedor.aliquotafixa) : undefined,
            },
            usuario: {
              usuarioCriado: !!response.user_id,
              email: response.email || '',
              conviteEnviado: false,
              senhaDefinida: !response.first_login,
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
          
          return [seller];
        }
        
        // Buscar lista de vendedores
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
    
    // Caso especial para formas de pagamento - usar edge function com action
    if (entity === 'formas-pagamento') {
      try {
        console.log('[API] Buscando formas de pagamento via Edge Function formas-pagamento-v2...');
        const response = await callEdgeFunction('formas-pagamento-v2', 'GET', undefined, undefined, { action: 'list' });
        
        // A resposta vem no formato { success: true, data: { formas: [...], total: ... } }
        const formas = response.formas || response.data?.formas || [];
        
        console.log(`[API] ${formas.length} formas de pagamento encontradas`);
        
        return formas;
      } catch (error) {
        console.error('[API] Erro ao buscar formas de pagamento, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
        return getStoredData(entityConfig.storageKey, entityConfig.data);
      }
    }
    
    // Caso especial para condições de pagamento - usar edge function com action
    if (entity === 'condicoes-pagamento') {
      try {
        console.log('[API] Buscando condições de pagamento via Edge Function condicoes-pagamento-v2...');
        const response = await callEdgeFunction('condicoes-pagamento-v2', 'GET', undefined, undefined, { action: 'list' });
        
        // A resposta vem no formato { success: true, data: { condicoes: [...], total: ... } }
        const condicoes = response.condicoes || response.data?.condicoes || [];
        
        console.log(`[API] ${condicoes.length} condições de pagamento encontradas`);
        
        // Mapear para o formato esperado pelo frontend
        return condicoes.map((cond: any) => ({
          id: cond.id,
          nome: cond.nome || '',
          formaPagamento: cond.formaPagamento || '',
          formaPagamentoId: cond.formaPagamentoId,
          meioPagamento: cond.meioPagamento || '',
          meioPagamentoId: cond.meioPagamentoId,
          prazoPagamento: cond.prazo?.toString() || '0',
          prazo: cond.prazo || 0,
          parcelas: cond.parcelas || 1,
          descontoExtra: cond.desconto || 0,
          valorPedidoMinimo: cond.valorMinimo || 0,
          valorMinimo: cond.valorMinimo || 0,
          ativo: true, // Por padrão, todas as condições retornadas estão ativas
          parcelamento: cond.parcelamento || false,
          condicaoCredito: cond.condicaoCredito || false,
          intervaloParcela: cond.intervaloParcela || [],
        }));
      } catch (error) {
        console.error('[API] Erro ao buscar condições de pagamento, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
        return getStoredData(entityConfig.storageKey, entityConfig.data);
      }
    }
    
    // Caso especial para segmentos-cliente - usar edge function
    if (entity === 'segmentos-cliente') {
      try {
        console.log('[API] Listando segmentos via Edge Function segmento-cliente-v2...');
        const response = await callEdgeFunction('segmento-cliente-v2', 'GET', undefined, undefined, {
          search: options?.params?.search,
          apenas_ativos: options?.params?.apenasAtivos ? 'true' : undefined,
          page: options?.params?.page?.toString(),
          limit: options?.params?.limit?.toString(),
        });
        
        // callEdgeFunction já retorna data.data (o objeto com segmentos e pagination)
        // A resposta vem no formato { segmentos: [...], pagination: {...} }
        console.log('[API] Resposta bruta da Edge Function:', response);
        
        // Verificar se response é um array diretamente ou se tem a propriedade segmentos
        const segmentos = Array.isArray(response) 
          ? response 
          : (response?.segmentos || response?.data?.segmentos || []);
        
        console.log(`[API] ${segmentos.length} segmentos encontrados`);
        console.log('[API] Primeiro segmento:', segmentos[0]);
        
        return segmentos;
      } catch (error) {
        console.error('[API] Erro ao listar segmentos, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
        if (entityConfig) {
          return getStoredData(entityConfig.storageKey, entityConfig.data);
        }
        return [];
      }
    }

    // Caso especial para clientes - usar edge function clientes-v2
    if (entity === 'clientes') {
      try {
        console.log('[API] Listando clientes via Edge Function clientes-v2...');
        const response = await callEdgeFunction('clientes-v2', 'GET', undefined, undefined, {
          page: options?.params?.page?.toString(),
          limit: options?.params?.limit?.toString(),
          search: options?.params?.search,
          status_aprovacao: options?.params?.status_aprovacao,
          vendedor: options?.params?.vendedor,
        });
        const raw = response?.clientes ?? (Array.isArray(response) ? response : []);
        const listas = (Array.isArray(raw) ? raw : []).map((item: any) => mapClienteFromApi(item));
        const pagination = response?.pagination ?? null;
        console.log(`[API] ${listas.length} clientes encontrados`, pagination ? `(página ${pagination.page}/${pagination.total_pages})` : '');
        // Se foi pedido com paginação, retornar objeto com clientes e pagination
        if (options?.params?.page != null || options?.params?.limit != null) {
          return {
            clientes: listas,
            pagination: pagination ?? { page: 1, limit: listas.length, total: listas.length, total_pages: 1 },
          };
        }
        return listas;
      } catch (error) {
        console.error('[API] Erro ao listar clientes:', error);
        const entityConfig = entityMap[entity];
        if (entityConfig) {
          return getStoredData(entityConfig.storageKey, entityConfig.data);
        }
        return [];
      }
    }
    
    // Caso especial para produtos - usar edge function com action
    if (entity === 'produtos') {
      try {
        console.log('[API] Listando produtos via Edge Function produtos-v2...');
        const response = await callEdgeFunction('produtos-v2', 'GET', undefined, undefined, { action: 'list' });
        
        // callEdgeFunction já retorna data.data (o array), mas pode retornar o objeto completo em alguns casos
        // Verificar se response é um array diretamente ou se tem a propriedade data
        const produtos = Array.isArray(response) ? response : (response?.data || []);
        
        console.log(`[API] ${produtos.length} produtos encontrados`);
        
        return produtos;
      } catch (error) {
        console.error('[API] Erro ao listar produtos, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
        return getStoredData(entityConfig.storageKey, entityConfig.data);
      }
    }
    
    // Caso especial para marcas - usar edge function
    if (entity === 'marcas') {
      try {
        console.log('[API] Listando marcas via Edge Function marcas-v2...');
        const response = await callEdgeFunction('marcas-v2', 'GET');
        
        // A resposta vem no formato { success: true, data: [...] }
        const marcas = Array.isArray(response) ? response : [];
        
        console.log(`[API] ${marcas.length} marcas encontradas`);
        
        return marcas;
      } catch (error) {
        console.error('[API] Erro ao listar marcas, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
        if (entityConfig) {
          return getStoredData(entityConfig.storageKey, entityConfig.data);
        }
        return [];
      }
    }
    
    // Caso especial para tipos de produto - usar edge function
    if (entity === 'tiposProduto') {
      try {
        console.log('[API] Listando tipos de produto via Edge Function tipos-produto-v2...');
        const response = await callEdgeFunction('tipos-produto-v2', 'GET');
        
        // A resposta vem no formato { success: true, data: [...] }
        const tipos = Array.isArray(response) ? response : [];
        
        console.log(`[API] ${tipos.length} tipos de produto encontrados`);
        
        return tipos;
      } catch (error) {
        console.error('[API] Erro ao listar tipos de produto, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
        if (entityConfig) {
          return getStoredData(entityConfig.storageKey, entityConfig.data);
        }
        return [];
      }
    }
    
    // Caso especial para unidades de medida - usar edge function
    if (entity === 'unidadesMedida') {
      try {
        console.log('[API] Listando unidades de medida via Edge Function unidades-medida-v2...');
        const response = await callEdgeFunction('unidades-medida-v2', 'GET');
        
        // A resposta vem no formato { success: true, data: [...] }
        const unidades = Array.isArray(response) ? response : [];
        
        console.log(`[API] ${unidades.length} unidades de medida encontradas`);
        
        return unidades;
      } catch (error) {
        console.error('[API] Erro ao listar unidades de medida, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
        if (entityConfig) {
          return getStoredData(entityConfig.storageKey, entityConfig.data);
        }
        return [];
      }
    }

    // Caso especial para ref-situacao - usar edge function
    if (entity === 'ref-situacao') {
      try {
        console.log('[API] Listando situações via Edge Function ref-situacao-v2...');
        const response = await callEdgeFunction('ref-situacao-v2', 'GET');
        
        if (Array.isArray(response)) {
          console.log(`[API] ${response.length} situações encontradas`);
          return response;
        } else if (response && typeof response === 'object' && 'data' in response) {
          console.log(`[API] ${response.data?.length || 0} situações encontradas`);
          return response.data || response;
        } else {
          console.warn('[API] Formato de resposta inesperado para ref-situacao:', response);
          return response;
        }
      } catch (error) {
        console.error('[API] Erro ao listar situações:', error);
        return [];
      }
    }
    
    // Caso especial para grupos/redes - usar edge function
    if (entity === 'grupos-redes') {
      try {
        console.log('[API] Listando grupos/redes via Edge Function grupos-redes-v2...', options?.params);
        
        // Preparar query params
        const queryParams: Record<string, any> = {};
        if (options?.params) {
          if (options.params.search) queryParams.search = options.params.search;
          if (options.params.page) queryParams.page = options.params.page;
          if (options.params.limit) queryParams.limit = options.params.limit;
          if (options.params.apenas_ativos !== undefined) queryParams.apenas_ativos = options.params.apenas_ativos;
        }
        
        const response = await callEdgeFunction('grupos-redes-v2', 'GET', undefined, undefined, queryParams);
        
        // A resposta pode vir como array direto ou objeto com paginação
        if (Array.isArray(response)) {
          console.log(`[API] ${response.length} grupos/redes encontrados`);
          return response;
        } else if (response && typeof response === 'object' && 'grupos' in response) {
          // Resposta com paginação do backend
          console.log(`[API] ${response.grupos?.length || 0} grupos/redes encontrados (total: ${response.total || 0})`);
          return response;
        } else {
          console.log('[API] Formato de resposta inesperado, retornando array vazio');
          return [];
        }
      } catch (error) {
        console.error('[API] Erro ao listar grupos/redes:', error);
        return [];
      }
    }
    
    // Caso especial para tipos de veículo - usar edge function
    if (entity === 'tipos-veiculo') {
      try {
        console.log('[API] Listando tipos de veículo via Edge Function tipos-veiculo-v2...');
        const response = await callEdgeFunction('tipos-veiculo-v2', 'GET');
        const tipos = Array.isArray(response) ? response : [];
        console.log(`[API] ${tipos.length} tipos de veículo encontrados`);
        return tipos;
      } catch (error) {
        console.error('[API] Erro ao listar tipos de veículo:', error);
        return [];
      }
    }

    // Caso especial para categorias de conta corrente - usar edge function
    if (entity === 'categorias-conta-corrente') {
      try {
        console.log('[API] Listando categorias de conta corrente via Edge Function categorias-conta-corrente-v2...');
        const response = await callEdgeFunction('categorias-conta-corrente-v2', 'GET');
        const categorias = Array.isArray(response) ? response : [];
        console.log(`[API] ${categorias.length} categorias de conta corrente encontradas`);
        return categorias;
      } catch (error) {
        console.error('[API] Erro ao listar categorias de conta corrente:', error);
        return [];
      }
    }

    // Caso especial para listas de preço - usar edge function listas-preco-v2
    if (entity === 'listas-preco') {
      try {
        console.log('[API] Listando listas de preço via Edge Function listas-preco-v2...');
        const response = await callEdgeFunction('listas-preco-v2', 'GET');
        const raw = Array.isArray(response) ? response : (response?.items ?? response?.data ?? []);
        const listas = (Array.isArray(raw) ? raw : []).map((item: any) => mapListaPrecoFromApi(item));
        console.log(`[API] ${listas.length} listas de preço encontradas`);
        return listas;
      } catch (error) {
        console.error('[API] Erro ao listar listas de preço, usando mock:', error);
        const entityConfig = entityMap[entity];
        if (entityConfig) {
          return getStoredData(entityConfig.storageKey, entityConfig.data);
        }
        return [];
      }
    }

    // Caso especial para empresas - usar edge function
    if (entity === 'empresas') {
      try {
        console.log('[API] Listando empresas via Edge Function empresas-v2...');
        const response = await callEdgeFunction('empresas-v2', 'GET');
        const empresas = Array.isArray(response) ? response : [];
        console.log(`[API] ${empresas.length} empresas encontradas`);
        return empresas;
      } catch (error) {
        console.error('[API] Erro ao listar empresas:', error);
        return [];
      }
    }
    
    // Caso especial para vendas - usar Edge Function pedido-venda-v2
    if (entity === 'vendas') {
      try {
        console.log('[API] Buscando vendas via Edge Function pedido-venda-v2...');
        const queryParams: Record<string, string> = {
          page: '1',
          limit: '1000', // Buscar todas (limite máximo)
        };
        
        if (options?.params) {
          if (options.params.search) {
            queryParams.search = String(options.params.search);
          }
          if (options.params.status) {
            queryParams.status = String(options.params.status);
          }
          if (options.params.vendedorId) {
            queryParams.vendedor = String(options.params.vendedorId);
          }
          if (options.params.clienteId) {
            queryParams.cliente = String(options.params.clienteId);
          }
          if (options.params.dataInicio) {
            const dataInicio = new Date(options.params.dataInicio);
            queryParams.dataInicio = dataInicio.toISOString().split('T')[0];
          }
          if (options.params.dataFim) {
            const dataFim = new Date(options.params.dataFim);
            queryParams.dataFim = dataFim.toISOString().split('T')[0];
          }
        }
        
        const response = await callEdgeFunction('pedido-venda-v2', 'GET', undefined, undefined, queryParams);
        
        // A resposta vem no formato { pedidos: [...], pagination: {...}, stats: {...} }
        const pedidos = response?.pedidos || [];
        
        // Mapear para formato Venda esperado pelo frontend
        return pedidos.map((p: any) => ({
          id: p.id,
          numero: p.numero,
          clienteId: p.clienteId,
          nomeCliente: p.nomeCliente,
          cnpjCliente: p.cnpjCliente,
          inscricaoEstadualCliente: p.inscricaoEstadualCliente,
          vendedorId: p.vendedorId,
          nomeVendedor: p.nomeVendedor,
          naturezaOperacaoId: p.naturezaOperacaoId,
          nomeNaturezaOperacao: p.nomeNaturezaOperacao,
          empresaFaturamentoId: p.empresaFaturamentoId,
          nomeEmpresaFaturamento: p.nomeEmpresaFaturamento,
          listaPrecoId: p.listaPrecoId,
          nomeListaPreco: p.nomeListaPreco,
          percentualDescontoPadrao: p.percentualDescontoPadrao,
          condicaoPagamentoId: p.condicaoPagamentoId,
          nomeCondicaoPagamento: p.nomeCondicaoPagamento,
          valorPedido: p.valorPedido,
          valorTotalProdutos: p.valorTotalProdutos,
          percentualDescontoExtra: p.percentualDescontoExtra,
          valorDescontoExtra: p.valorDescontoExtra,
          totalQuantidades: p.totalQuantidades,
          totalItens: p.totalItens,
          pesoBrutoTotal: p.pesoBrutoTotal,
          pesoLiquidoTotal: p.pesoLiquidoTotal,
          status: p.status,
          dataPedido: p.dataPedido ? new Date(p.dataPedido) : new Date(),
          ordemCompraCliente: p.ordemCompraCliente,
          observacoesInternas: p.observacoesInternas,
          observacoesNotaFiscal: p.observacoesNotaFiscal,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          createdBy: p.createdBy,
          itens: [], // Produtos serão carregados separadamente se necessário
          geraReceita: p.geraReceita,
        }));
      } catch (error) {
        console.error('[API] Erro ao buscar vendas, usando fallback:', error);
        // Fallback para localStorage em caso de erro
        const vendas = carregarVendasDoLocalStorage();
        return vendas;
      }
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
    
    // Caso especial para produtos - usar edge function com action
    if (entity === 'produtos') {
      try {
        console.log('[API] Buscando produto via Edge Function produtos-v2...');
        const response = await callEdgeFunction('produtos-v2', 'POST', {
          action: 'get',
          id,
        });
        
        // A resposta vem no formato { success: true, data: {...} }
        return response.data || response;
      } catch (error) {
        console.error('[API] Erro ao buscar produto, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
        const data = getStoredData(entityConfig.storageKey, entityConfig.data);
        const item = data.find((item: any) => item.id === id);
        if (!item) {
          throw new Error(`Produto ${id} não encontrado`);
        }
        return item;
      }
    }
    
    // Caso especial para empresas - usar edge function
    if (entity === 'empresas') {
      try {
        console.log('[API] Buscando empresa via Edge Function empresas-v2...');
        const response = await callEdgeFunction('empresas-v2', 'GET', undefined, id);
        return response?.data ?? response;
      } catch (error) {
        console.error('[API] Erro ao buscar empresa:', error);
        throw error;
      }
    }

    // Caso especial para clientes - usar edge function clientes-v2
    if (entity === 'clientes') {
      try {
        console.log('[API] Buscando cliente via Edge Function clientes-v2...');
        const response = await callEdgeFunction('clientes-v2', 'GET', undefined, id);
        return mapClienteFromApi(response?.data ?? response);
      } catch (error) {
        console.error('[API] Erro ao buscar cliente:', error);
        throw error;
      }
    }

    // Caso especial para listas de preço - usar edge function listas-preco-v2
    if (entity === 'listas-preco') {
      try {
        console.log('[API] Buscando lista de preço via Edge Function listas-preco-v2...');
        const response = await callEdgeFunction('listas-preco-v2', 'GET', undefined, id);
        return mapListaPrecoFromApi(response?.data ?? response);
      } catch (error) {
        console.error('[API] Erro ao buscar lista de preço:', error);
        throw error;
      }
    }
    
    // Caso especial para vendas - usar Edge Function pedido-venda-v2
    if (entity === 'vendas') {
      try {
        console.log('[API] Buscando venda por ID via Edge Function pedido-venda-v2...');
        const response = await callEdgeFunction('pedido-venda-v2', 'GET', undefined, id);
        
        // A resposta vem no formato { pedido: {...}, produtos: [...] }
        const pedidoData = response?.pedido || response;
        const produtos = response?.produtos || [];
        
        if (!pedidoData) {
          throw new Error(`Venda ${id} não encontrada`);
        }
        
        // Mapear para formato Venda esperado pelo frontend
        return {
          id: pedidoData.id,
          numero: pedidoData.numero,
          clienteId: pedidoData.clienteId,
          nomeCliente: pedidoData.nomeCliente,
          cnpjCliente: pedidoData.cnpjCliente,
          inscricaoEstadualCliente: pedidoData.inscricaoEstadualCliente,
          vendedorId: pedidoData.vendedorId,
          nomeVendedor: pedidoData.nomeVendedor,
          naturezaOperacaoId: pedidoData.naturezaOperacaoId,
          nomeNaturezaOperacao: pedidoData.nomeNaturezaOperacao,
          empresaFaturamentoId: pedidoData.empresaFaturamentoId,
          nomeEmpresaFaturamento: pedidoData.nomeEmpresaFaturamento,
          listaPrecoId: pedidoData.listaPrecoId,
          nomeListaPreco: pedidoData.nomeListaPreco,
          percentualDescontoPadrao: pedidoData.percentualDescontoPadrao,
          condicaoPagamentoId: pedidoData.condicaoPagamentoId,
          nomeCondicaoPagamento: pedidoData.nomeCondicaoPagamento,
          valorPedido: pedidoData.valorPedido,
          valorTotalProdutos: pedidoData.valorTotalProdutos,
          percentualDescontoExtra: pedidoData.percentualDescontoExtra,
          valorDescontoExtra: pedidoData.valorDescontoExtra,
          totalQuantidades: pedidoData.totalQuantidades,
          totalItens: pedidoData.totalItens,
          pesoBrutoTotal: pedidoData.pesoBrutoTotal,
          pesoLiquidoTotal: pedidoData.pesoLiquidoTotal,
          status: pedidoData.status,
          dataPedido: pedidoData.dataPedido ? new Date(pedidoData.dataPedido) : new Date(),
          ordemCompraCliente: pedidoData.ordemCompraCliente,
          observacoesInternas: pedidoData.observacoesInternas,
          observacoesNotaFiscal: pedidoData.observacoesNotaFiscal,
          createdAt: pedidoData.createdAt ? new Date(pedidoData.createdAt) : new Date(),
          updatedAt: pedidoData.updatedAt ? new Date(pedidoData.updatedAt) : new Date(),
          createdBy: pedidoData.createdBy,
          itens: produtos.map((p: any) => ({
            id: p.id,
            numero: p.numero,
            produtoId: p.produtoId,
            descricaoProduto: p.descricaoProduto,
            codigoSku: p.codigoSku,
            codigoEan: p.codigoEan,
            valorTabela: p.valorTabela,
            percentualDesconto: p.percentualDesconto,
            valorUnitario: p.valorUnitario,
            quantidade: p.quantidade,
            subtotal: p.subtotal,
            pesoBruto: p.pesoBruto,
            pesoLiquido: p.pesoLiquido,
            unidade: p.unidade,
          })),
        };
      } catch (error) {
        console.error('[API] Erro ao buscar venda, usando fallback:', error);
        // Fallback para localStorage em caso de erro
        const vendas = carregarVendasDoLocalStorage();
        const venda = vendas.find(v => v.id === id);
        if (!venda) {
          throw new Error(`Venda ${id} não encontrada`);
        }
        return venda;
      }
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
    
    // Caso especial para condições de pagamento - usar edge function com action
    if (entity === 'condicoes-pagamento') {
      try {
        console.log('[API] Criando condição de pagamento via Edge Function condicoes-pagamento-v2...');
        const response = await callEdgeFunction('condicoes-pagamento-v2', 'POST', {
          action: 'create',
          ...data,
        });
        
        // A resposta vem no formato { success: true, data: { condicao: {...} } }
        const condicao = response.condicao || response.data?.condicao || response;
        
        // Mapear para o formato esperado pelo frontend
        return {
          id: condicao.id,
          nome: condicao.nome || '',
          formaPagamento: condicao.formaPagamento || '',
          formaPagamentoId: condicao.formaPagamentoId,
          meioPagamento: condicao.meioPagamento || '',
          meioPagamentoId: condicao.meioPagamentoId,
          prazoPagamento: condicao.prazo?.toString() || '0',
          prazo: condicao.prazo || 0,
          parcelas: condicao.parcelas || 1,
          descontoExtra: condicao.desconto || 0,
          valorPedidoMinimo: condicao.valorMinimo || 0,
          valorMinimo: condicao.valorMinimo || 0,
          ativo: true,
          parcelamento: condicao.parcelamento || false,
          condicaoCredito: condicao.condicaoCredito || false,
          intervaloParcela: condicao.intervaloParcela || [],
        };
      } catch (error) {
        console.error('[API] Erro ao criar condição de pagamento:', error);
        throw error;
      }
    }
    
    // Caso especial para segmentos-cliente - usar edge function
    if (entity === 'segmentos-cliente') {
      try {
        console.log('[API] Criando segmento via Edge Function segmento-cliente-v2...');
        const response = await callEdgeFunction('segmento-cliente-v2', 'POST', {
          action: 'create',
          nome: data.nome,
          descricao: data.descricao,
        });
        
        // A resposta vem no formato { success: true, data: {...} }
        return response.data || response;
      } catch (error) {
        console.error('[API] Erro ao criar segmento, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
        if (entityConfig) {
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
        }
        throw error;
      }
    }

    // Caso especial para clientes - usar edge function clientes-v2
    if (entity === 'clientes') {
      try {
        console.log('[API] Criando cliente via Edge Function clientes-v2...');
        const response = await callEdgeFunction('clientes-v2', 'POST', data);
        return mapClienteFromApi(response?.data ?? response);
      } catch (error) {
        console.error('[API] Erro ao criar cliente:', error);
        throw error;
      }
    }
    
    // Caso especial para produtos - usar edge function com action
    if (entity === 'produtos') {
      try {
        console.log('[API] Criando produto via Edge Function produtos-v2...');
        const response = await callEdgeFunction('produtos-v2', 'POST', {
          action: 'create',
          ...data,
        });
        
        // A resposta vem no formato { success: true, data: {...} }
        return response.data || response;
      } catch (error) {
        console.error('[API] Erro ao criar produto, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
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
      }
    }
    
    // Caso especial para listas de preço - usar edge function listas-preco-v2
    if (entity === 'listas-preco') {
      try {
        console.log('[API] Criando lista de preço via Edge Function listas-preco-v2...');
        const payload = {
          nome: data.nome,
          produtos: data.produtos ?? [],
          tipoComissao: data.tipoComissao ?? 'fixa',
          percentualFixo: data.percentualFixo,
          faixasDesconto: data.faixasDesconto ?? [],
          ativo: data.ativo !== false,
        };
        const response = await callEdgeFunction('listas-preco-v2', 'POST', payload);
        return mapListaPrecoFromApi(response?.data ?? response);
      } catch (error) {
        console.error('[API] Erro ao criar lista de preço, usando mock:', error);
        const entityConfig = entityMap['listas-preco'];
        if (entityConfig) {
          const storedData = getStoredData(entityConfig.storageKey, entityConfig.data);
          const novoItem = {
            ...data,
            id: data.id || `listas-preco-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          storedData.push(novoItem);
          saveStoredData(entityConfig.storageKey, storedData);
          return novoItem;
        }
        throw error;
      }
    }

    // Caso especial para marcas - usar edge function
    if (entity === 'marcas') {
      try {
        console.log('[API] Criando marca via Edge Function marcas-v2...');
        const response = await callEdgeFunction('marcas-v2', 'POST', {
          nome: data.nome,
          ativo: data.ativo !== undefined ? data.ativo : true,
        });
        
        // A resposta vem no formato { success: true, data: {...} }
        return response;
      } catch (error) {
        console.error('[API] Erro ao criar marca:', error);
        throw error;
      }
    }
    
    // Caso especial para tipos de produto - usar edge function
    if (entity === 'tiposProduto') {
      try {
        console.log('[API] Criando tipo de produto via Edge Function tipos-produto-v2...');
        const response = await callEdgeFunction('tipos-produto-v2', 'POST', {
          nome: data.nome,
          descricao: data.descricao,
          ativo: data.ativo !== undefined ? data.ativo : true,
        });
        
        // A resposta vem no formato { success: true, data: {...} }
        return response;
      } catch (error) {
        console.error('[API] Erro ao criar tipo de produto:', error);
        throw error;
      }
    }
    
    // Caso especial para unidades de medida - usar edge function
    if (entity === 'unidadesMedida') {
      try {
        console.log('[API] Criando unidade de medida via Edge Function unidades-medida-v2...');
        const response = await callEdgeFunction('unidades-medida-v2', 'POST', {
          sigla: data.sigla,
          descricao: data.descricao,
          ativo: data.ativo !== undefined ? data.ativo : true,
        });
        
        // A resposta vem no formato { success: true, data: {...} }
        return response;
      } catch (error) {
        console.error('[API] Erro ao criar unidade de medida:', error);
        throw error;
      }
    }
    
    // Caso especial para grupos/redes - usar edge function
    if (entity === 'grupos-redes') {
      try {
        console.log('[API] Criando grupo/rede via Edge Function grupos-redes-v2...');
        const response = await callEdgeFunction('grupos-redes-v2', 'POST', {
          nome: data.nome,
          descricao: data.descricao,
        });
        return response;
      } catch (error) {
        console.error('[API] Erro ao criar grupo/rede:', error);
        throw error;
      }
    }
    
    // Caso especial para tipos de veículo - usar edge function
    if (entity === 'tipos-veiculo') {
      try {
        console.log('[API] Criando tipo de veículo via Edge Function tipos-veiculo-v2...');
        const response = await callEdgeFunction('tipos-veiculo-v2', 'POST', {
          nome: data.nome,
          descricao: data.descricao,
        });
        return response;
      } catch (error) {
        console.error('[API] Erro ao criar tipo de veículo:', error);
        throw error;
      }
    }

    // Caso especial para categorias de conta corrente - usar edge function
    if (entity === 'categorias-conta-corrente') {
      try {
        console.log('[API] Criando categoria de conta corrente via Edge Function categorias-conta-corrente-v2...');
        const response = await callEdgeFunction('categorias-conta-corrente-v2', 'POST', {
          nome: data.nome,
          descricao: data.descricao,
          cor: data.cor,
        });
        return response;
      } catch (error) {
        console.error('[API] Erro ao criar categoria de conta corrente:', error);
        throw error;
      }
    }

    // Caso especial para empresas - usar edge function
    if (entity === 'empresas') {
      try {
        console.log('[API] Criando empresa via Edge Function empresas-v2...');
        const response = await callEdgeFunction('empresas-v2', 'POST', {
          cnpj: data.cnpj,
          razaoSocial: data.razaoSocial,
          nomeFantasia: data.nomeFantasia,
          inscricaoEstadual: data.inscricaoEstadual,
          endereco: data.endereco,
          contasBancarias: data.contasBancarias,
          integracoesERP: data.integracoesERP,
        });
        return response;
      } catch (error) {
        console.error('[API] Erro ao criar empresa:', error);
        throw error;
      }
    }
    
    // Caso especial para formas de pagamento - usar edge function com action
    if (entity === 'formas-pagamento') {
      try {
        console.log('[API] Criando forma de pagamento via Edge Function formas-pagamento-v2...');
        const response = await callEdgeFunction('formas-pagamento-v2', 'POST', {
          action: 'create',
          ...data,
        });
        
        // A resposta vem no formato { success: true, data: { forma: {...} } }
        return response.forma || response.data?.forma || response;
      } catch (error) {
        console.error('[API] Erro ao criar forma de pagamento, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
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
      }
    }
    
    // Caso especial para vendedores - criar usuário tipo vendedor e dados_vendedor
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
        
        // Se há dados adicionais do vendedor, atualizar dados_vendedor
        const hasVendedorData = data.iniciais !== undefined || data.cpf !== undefined || data.telefone !== undefined ||
          data.dataAdmissao !== undefined || data.status !== undefined || data.cnpj !== undefined ||
          data.razaoSocial !== undefined || data.nomeFantasia !== undefined || data.inscricaoEstadual !== undefined ||
          data.endereco !== undefined || data.observacoesInternas !== undefined || data.dadosBancarios !== undefined ||
          data.contatosAdicionais !== undefined;
        
        if (hasVendedorData) {
          console.log('[API] Criando registro em dados_vendedor...');
          
          // Preparar dados para dados_vendedor
          const dadosVendedorData: any = {
            nome: data.nome || createdUser.nome,
            email: data.email || createdUser.email,
          };
          
          if (data.iniciais !== undefined) dadosVendedorData.iniciais = data.iniciais;
          if (data.cpf !== undefined) dadosVendedorData.cpf = data.cpf;
          if (data.telefone !== undefined) dadosVendedorData.telefone = data.telefone;
          if (data.dataAdmissao !== undefined) dadosVendedorData.dataAdmissao = data.dataAdmissao;
          if (data.status !== undefined) dadosVendedorData.status = data.status;
          if (data.cnpj !== undefined) dadosVendedorData.cnpj = data.cnpj;
          if (data.razaoSocial !== undefined) dadosVendedorData.razaoSocial = data.razaoSocial;
          if (data.nomeFantasia !== undefined) dadosVendedorData.nomeFantasia = data.nomeFantasia;
          if (data.inscricaoEstadual !== undefined) dadosVendedorData.inscricaoEstadual = data.inscricaoEstadual;
          if (data.endereco !== undefined) dadosVendedorData.endereco = data.endereco;
          if (data.observacoesInternas !== undefined) dadosVendedorData.observacoesInternas = data.observacoesInternas;
          if (data.dadosBancarios !== undefined) dadosVendedorData.dadosBancarios = data.dadosBancarios;
          if (data.contatosAdicionais !== undefined) dadosVendedorData.contatosAdicionais = data.contatosAdicionais;
          
          // Atualizar dados_vendedor usando update-user-v2 (que também atualiza dados_vendedor)
          try {
            await callEdgeFunction('update-user-v2', 'PUT', dadosVendedorData, createdUser.user_id);
            console.log('[API] Registro dados_vendedor criado/atualizado');
          } catch (dadosVendedorError) {
            console.warn('[API] Aviso: Erro ao criar dados_vendedor, mas usuário foi criado:', dadosVendedorError);
            // Não falhar completamente, apenas logar o aviso
          }
        }
        
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
      try {
        console.log('[API] Criando venda via Edge Function pedido-venda-v2...');
        const response = await callEdgeFunction('pedido-venda-v2', 'POST', data);
        
        // A resposta vem no formato { pedido: {...}, produtos: [...] }
        const pedidoData = response?.pedido || response;
        const produtos = response?.produtos || [];
        
        // Mapear para formato Venda esperado pelo frontend
        return {
          id: pedidoData.id,
          numero: pedidoData.numero,
          clienteId: pedidoData.clienteId,
          nomeCliente: pedidoData.nomeCliente,
          cnpjCliente: pedidoData.cnpjCliente,
          inscricaoEstadualCliente: pedidoData.inscricaoEstadualCliente,
          vendedorId: pedidoData.vendedorId,
          nomeVendedor: pedidoData.nomeVendedor,
          naturezaOperacaoId: pedidoData.naturezaOperacaoId,
          nomeNaturezaOperacao: pedidoData.nomeNaturezaOperacao,
          empresaFaturamentoId: pedidoData.empresaFaturamentoId,
          nomeEmpresaFaturamento: pedidoData.nomeEmpresaFaturamento,
          listaPrecoId: pedidoData.listaPrecoId,
          nomeListaPreco: pedidoData.nomeListaPreco,
          percentualDescontoPadrao: pedidoData.percentualDescontoPadrao,
          condicaoPagamentoId: pedidoData.condicaoPagamentoId,
          nomeCondicaoPagamento: pedidoData.nomeCondicaoPagamento,
          valorPedido: pedidoData.valorPedido,
          valorTotalProdutos: pedidoData.valorTotalProdutos,
          percentualDescontoExtra: pedidoData.percentualDescontoExtra,
          valorDescontoExtra: pedidoData.valorDescontoExtra,
          totalQuantidades: pedidoData.totalQuantidades,
          totalItens: pedidoData.totalItens,
          pesoBrutoTotal: pedidoData.pesoBrutoTotal,
          pesoLiquidoTotal: pedidoData.pesoLiquidoTotal,
          status: pedidoData.status,
          dataPedido: pedidoData.dataPedido ? new Date(pedidoData.dataPedido) : new Date(),
          ordemCompraCliente: pedidoData.ordemCompraCliente,
          observacoesInternas: pedidoData.observacoesInternas,
          observacoesNotaFiscal: pedidoData.observacoesNotaFiscal,
          createdAt: pedidoData.createdAt ? new Date(pedidoData.createdAt) : new Date(),
          updatedAt: pedidoData.updatedAt ? new Date(pedidoData.updatedAt) : new Date(),
          createdBy: pedidoData.createdBy,
          itens: produtos.map((p: any) => ({
            id: p.id,
            numero: p.numero,
            produtoId: p.produtoId,
            descricaoProduto: p.descricaoProduto,
            codigoSku: p.codigoSku,
            codigoEan: p.codigoEan,
            valorTabela: p.valorTabela,
            percentualDesconto: p.percentualDesconto,
            valorUnitario: p.valorUnitario,
            quantidade: p.quantidade,
            subtotal: p.subtotal,
            pesoBruto: p.pesoBruto,
            pesoLiquido: p.pesoLiquido,
            unidade: p.unidade,
          })),
        };
      } catch (error) {
        console.error('[API] Erro ao criar venda, usando fallback:', error);
        // Fallback para localStorage em caso de erro
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
    
    // Caso especial para produtos - usar edge function com action
    if (entity === 'produtos') {
      try {
        console.log('[API] Atualizando produto via Edge Function produtos-v2...');
        const response = await callEdgeFunction('produtos-v2', 'PUT', {
          action: 'update',
          id,
          ...data,
        });
        
        // A resposta vem no formato { success: true, data: {...} }
        return response.data || response;
      } catch (error) {
        console.error('[API] Erro ao atualizar produto, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
        const storedData = getStoredData(entityConfig.storageKey, entityConfig.data);
        const index = storedData.findIndex((item: any) => item.id === id);
        if (index === -1) {
          throw new Error(`Produto ${id} não encontrado`);
        }
        storedData[index] = {
          ...storedData[index],
          ...data,
          id,
          updatedAt: new Date(),
        };
        saveStoredData(entityConfig.storageKey, storedData);
        return storedData[index];
      }
    }
    
    // Caso especial para formas de pagamento - usar edge function com action
    if (entity === 'formas-pagamento') {
      try {
        console.log('[API] Atualizando forma de pagamento via Edge Function formas-pagamento-v2...');
        const response = await callEdgeFunction('formas-pagamento-v2', 'PUT', {
          action: 'update',
          id,
          ...data,
        });
        
        // A resposta vem no formato { success: true, data: { forma: {...} } }
        return response.forma || response.data?.forma || response;
      } catch (error) {
        console.error('[API] Erro ao atualizar forma de pagamento, usando mock:', error);
        // Fallback para mock em caso de erro
        const entityConfig = entityMap[entity];
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
      }
    }
    
    // Caso especial para marcas - usar edge function
    if (entity === 'marcas') {
      try {
        console.log('[API] Atualizando marca via Edge Function marcas-v2...');
        const response = await callEdgeFunction('marcas-v2', 'PUT', {
          nome: data.nome,
          ativo: data.ativo !== undefined ? data.ativo : true,
        }, id);
        
        // A resposta vem no formato { success: true, data: {...} }
        return response;
      } catch (error) {
        console.error('[API] Erro ao atualizar marca:', error);
        throw error;
      }
    }

    // Caso especial para clientes - usar edge function clientes-v2
    if (entity === 'clientes') {
      try {
        console.log('[API] Atualizando cliente via Edge Function clientes-v2...');
        const response = await callEdgeFunction('clientes-v2', 'PUT', data, id);
        return mapClienteFromApi(response?.data ?? response);
      } catch (error) {
        console.error('[API] Erro ao atualizar cliente:', error);
        throw error;
      }
    }
    
    // Caso especial para tipos de produto - usar edge function
    if (entity === 'tiposProduto') {
      try {
        console.log('[API] Atualizando tipo de produto via Edge Function tipos-produto-v2...');
        const response = await callEdgeFunction('tipos-produto-v2', 'PUT', {
          nome: data.nome,
          descricao: data.descricao,
          ativo: data.ativo !== undefined ? data.ativo : true,
        }, id);
        
        // A resposta vem no formato { success: true, data: {...} }
        return response;
      } catch (error) {
        console.error('[API] Erro ao atualizar tipo de produto:', error);
        throw error;
      }
    }
    
    // Caso especial para listas de preço - usar edge function listas-preco-v2
    if (entity === 'listas-preco') {
      try {
        console.log('[API] Atualizando lista de preço via Edge Function listas-preco-v2...');
        const payload = {
          nome: data.nome,
          produtos: data.produtos ?? [],
          tipoComissao: data.tipoComissao ?? 'fixa',
          percentualFixo: data.percentualFixo,
          faixasDesconto: data.faixasDesconto ?? [],
          ativo: data.ativo !== false,
        };
        const response = await callEdgeFunction('listas-preco-v2', 'PUT', payload, id);
        return mapListaPrecoFromApi(response?.data ?? response);
      } catch (error) {
        console.error('[API] Erro ao atualizar lista de preço:', error);
        throw error;
      }
    }

    // Caso especial para unidades de medida - usar edge function
    if (entity === 'unidadesMedida') {
      try {
        console.log('[API] Atualizando unidade de medida via Edge Function unidades-medida-v2...');
        const response = await callEdgeFunction('unidades-medida-v2', 'PUT', {
          sigla: data.sigla,
          descricao: data.descricao,
          ativo: data.ativo !== undefined ? data.ativo : true,
        }, id);
        
        // A resposta vem no formato { success: true, data: {...} }
        return response;
      } catch (error) {
        console.error('[API] Erro ao atualizar unidade de medida:', error);
        throw error;
      }
    }
    
    // Caso especial para grupos/redes - usar edge function
    if (entity === 'grupos-redes') {
      try {
        console.log('[API] Atualizando grupo/rede via Edge Function grupos-redes-v2...');
        const response = await callEdgeFunction('grupos-redes-v2', 'PUT', {
          nome: data.nome,
          descricao: data.descricao,
        }, id);
        return response;
      } catch (error) {
        console.error('[API] Erro ao atualizar grupo/rede:', error);
        throw error;
      }
    }
    
    // Caso especial para tipos de veículo - usar edge function
    if (entity === 'tipos-veiculo') {
      try {
        console.log('[API] Atualizando tipo de veículo via Edge Function tipos-veiculo-v2...');
        const response = await callEdgeFunction('tipos-veiculo-v2', 'PUT', {
          nome: data.nome,
          descricao: data.descricao,
        }, id);
        return response;
      } catch (error) {
        console.error('[API] Erro ao atualizar tipo de veículo:', error);
        throw error;
      }
    }

    // Caso especial para categorias de conta corrente - usar edge function
    if (entity === 'categorias-conta-corrente') {
      try {
        console.log('[API] Atualizando categoria de conta corrente via Edge Function categorias-conta-corrente-v2...');
        const response = await callEdgeFunction('categorias-conta-corrente-v2', 'PUT', {
          nome: data.nome,
          descricao: data.descricao,
          cor: data.cor,
          ativo: data.ativo,
        }, id);
        return response;
      } catch (error) {
        console.error('[API] Erro ao atualizar categoria de conta corrente:', error);
        throw error;
      }
    }

    // Caso especial para empresas - usar edge function
    if (entity === 'empresas') {
      try {
        console.log('[API] Atualizando empresa via Edge Function empresas-v2...');
        const response = await callEdgeFunction('empresas-v2', 'PUT', {
          cnpj: data.cnpj,
          razaoSocial: data.razaoSocial,
          nomeFantasia: data.nomeFantasia,
          inscricaoEstadual: data.inscricaoEstadual,
          endereco: data.endereco,
          contasBancarias: data.contasBancarias,
          integracoesERP: data.integracoesERP,
          ativo: data.ativo,
        }, id);
        return response;
      } catch (error) {
        console.error('[API] Erro ao atualizar empresa:', error);
        throw error;
      }
    }
    
    // Caso especial para vendedores - atualizar usuário e dados_vendedor
    if (entity === 'vendedores') {
      try {
        console.log('[API] Atualizando vendedor via Edge Function update-user-v2...');
        
        // Preparar dados completos para atualização
        const userData: any = {};
        
        // Campos da tabela user
        if (data.nome !== undefined) userData.nome = data.nome;
        if (data.email !== undefined || data.emailAcesso !== undefined) {
          userData.email = data.email || data.emailAcesso;
        }
        if (data.status !== undefined) {
          userData.ativo = data.status === 'ativo';
        }
        if (data.tipo !== undefined) userData.tipo = data.tipo;
        
        // Campos da tabela dados_vendedor
        if (data.iniciais !== undefined) userData.iniciais = data.iniciais;
        if (data.cpf !== undefined) userData.cpf = data.cpf;
        if (data.telefone !== undefined) userData.telefone = data.telefone;
        if (data.dataAdmissao !== undefined) userData.dataAdmissao = data.dataAdmissao;
        if (data.status !== undefined) userData.status = data.status;
        if (data.cnpj !== undefined) userData.cnpj = data.cnpj;
        if (data.razaoSocial !== undefined) userData.razaoSocial = data.razaoSocial;
        if (data.nomeFantasia !== undefined) userData.nomeFantasia = data.nomeFantasia;
        if (data.inscricaoEstadual !== undefined) userData.inscricaoEstadual = data.inscricaoEstadual;
        if (data.endereco !== undefined) userData.endereco = data.endereco;
        if (data.observacoesInternas !== undefined) userData.observacoesInternas = data.observacoesInternas;
        if (data.dadosBancarios !== undefined) userData.dadosBancarios = data.dadosBancarios;
        if (data.contatosAdicionais !== undefined) userData.contatosAdicionais = data.contatosAdicionais;
        
        console.log('[API] Dados completos para atualização:', {
          userFields: Object.keys(userData).filter(k => ['nome', 'email', 'tipo', 'ativo'].includes(k)),
          vendedorFields: Object.keys(userData).filter(k => !['nome', 'email', 'tipo', 'ativo'].includes(k))
        });
        
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
      try {
        console.log('[API] Atualizando venda via Edge Function pedido-venda-v2...');
        const response = await callEdgeFunction('pedido-venda-v2', 'PUT', data, id);
        
        // A resposta vem no formato { pedido: {...}, produtos: [...] }
        const pedidoData = response?.pedido || response;
        const produtos = response?.produtos || [];
        
        // Mapear para formato Venda esperado pelo frontend
        return {
          id: pedidoData.id,
          numero: pedidoData.numero,
          clienteId: pedidoData.clienteId,
          nomeCliente: pedidoData.nomeCliente,
          cnpjCliente: pedidoData.cnpjCliente,
          inscricaoEstadualCliente: pedidoData.inscricaoEstadualCliente,
          vendedorId: pedidoData.vendedorId,
          nomeVendedor: pedidoData.nomeVendedor,
          naturezaOperacaoId: pedidoData.naturezaOperacaoId,
          nomeNaturezaOperacao: pedidoData.nomeNaturezaOperacao,
          empresaFaturamentoId: pedidoData.empresaFaturamentoId,
          nomeEmpresaFaturamento: pedidoData.nomeEmpresaFaturamento,
          listaPrecoId: pedidoData.listaPrecoId,
          nomeListaPreco: pedidoData.nomeListaPreco,
          percentualDescontoPadrao: pedidoData.percentualDescontoPadrao,
          condicaoPagamentoId: pedidoData.condicaoPagamentoId,
          nomeCondicaoPagamento: pedidoData.nomeCondicaoPagamento,
          valorPedido: pedidoData.valorPedido,
          valorTotalProdutos: pedidoData.valorTotalProdutos,
          percentualDescontoExtra: pedidoData.percentualDescontoExtra,
          valorDescontoExtra: pedidoData.valorDescontoExtra,
          totalQuantidades: pedidoData.totalQuantidades,
          totalItens: pedidoData.totalItens,
          pesoBrutoTotal: pedidoData.pesoBrutoTotal,
          pesoLiquidoTotal: pedidoData.pesoLiquidoTotal,
          status: pedidoData.status,
          dataPedido: pedidoData.dataPedido ? new Date(pedidoData.dataPedido) : new Date(),
          ordemCompraCliente: pedidoData.ordemCompraCliente,
          observacoesInternas: pedidoData.observacoesInternas,
          observacoesNotaFiscal: pedidoData.observacoesNotaFiscal,
          createdAt: pedidoData.createdAt ? new Date(pedidoData.createdAt) : new Date(),
          updatedAt: pedidoData.updatedAt ? new Date(pedidoData.updatedAt) : new Date(),
          createdBy: pedidoData.createdBy,
          itens: produtos.map((p: any) => ({
            id: p.id,
            numero: p.numero,
            produtoId: p.produtoId,
            descricaoProduto: p.descricaoProduto,
            codigoSku: p.codigoSku,
            codigoEan: p.codigoEan,
            valorTabela: p.valorTabela,
            percentualDesconto: p.percentualDesconto,
            valorUnitario: p.valorUnitario,
            quantidade: p.quantidade,
            subtotal: p.subtotal,
            pesoBruto: p.pesoBruto,
            pesoLiquido: p.pesoLiquido,
            unidade: p.unidade,
          })),
        };
      } catch (error) {
        console.error('[API] Erro ao atualizar venda, usando fallback:', error);
        // Fallback para localStorage em caso de erro
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
  
  delete: async (entityOrPath: string, id?: string, body?: any) => {
    // Se id não foi fornecido, assumir que entityOrPath é um path completo (ex: "formas-pagamento/123")
    let entity: string
    let entityId: string
    
    if (id === undefined) {
      const parts = entityOrPath.split('/')
      entity = parts[0]
      entityId = parts[1] || ''
    } else {
      entity = entityOrPath
      entityId = id
    }
    
    console.log(`[API] DELETE /${entity}/${entityId}`);
    
    if (!entityId) {
      throw new Error('ID é obrigatório para exclusão')
    }
    
    // Caso especial para condições de pagamento - usar edge function com action
    if (entity === 'condicoes-pagamento') {
      try {
        console.log('[API] Excluindo condição de pagamento via Edge Function condicoes-pagamento-v2...');
        await callEdgeFunction('condicoes-pagamento-v2', 'DELETE', {
          action: 'delete',
          id: entityId,
          ...body,
        });
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir condição de pagamento:', error);
        throw error;
      }
    }
    
    // Caso especial para produtos - usar edge function com action
    if (entity === 'produtos') {
      try {
        console.log('[API] Excluindo produto via Edge Function produtos-v2...');
        await callEdgeFunction('produtos-v2', 'DELETE', {
          action: 'delete',
          id: entityId,
        });
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir produto:', error);
        throw error;
      }
    }
    
    // Caso especial para segmentos-cliente - usar edge function
    if (entity === 'segmentos-cliente') {
      try {
        console.log('[API] Excluindo segmento via Edge Function segmento-cliente-v2...');
        await callEdgeFunction('segmento-cliente-v2', 'DELETE', undefined, entityId);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir segmento:', error);
        throw error;
      }
    }
    
    // Caso especial para formas de pagamento - usar edge function com action
    if (entity === 'formas-pagamento') {
      try {
        console.log('[API] Excluindo forma de pagamento via Edge Function formas-pagamento-v2...');
        await callEdgeFunction('formas-pagamento-v2', 'DELETE', {
          action: 'delete',
          id: entityId,
        });
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir forma de pagamento:', error);
        throw error;
      }
    }
    
    // Caso especial para marcas - usar edge function
    if (entity === 'marcas') {
      try {
        console.log('[API] Excluindo marca via Edge Function marcas-v2...');
        await callEdgeFunction('marcas-v2', 'DELETE', undefined, entityId);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir marca:', error);
        throw error;
      }
    }

    // Caso especial para listas de preço - usar edge function listas-preco-v2
    if (entity === 'listas-preco') {
      try {
        console.log('[API] Excluindo lista de preço via Edge Function listas-preco-v2...');
        await callEdgeFunction('listas-preco-v2', 'DELETE', undefined, entityId);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir lista de preço:', error);
        throw error;
      }
    }

    // Caso especial para clientes - usar edge function clientes-v2
    if (entity === 'clientes') {
      try {
        console.log('[API] Excluindo cliente via Edge Function clientes-v2...');
        await callEdgeFunction('clientes-v2', 'DELETE', undefined, entityId);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir cliente:', error);
        throw error;
      }
    }
    
    // Caso especial para tipos de produto - usar edge function
    if (entity === 'tiposProduto') {
      try {
        console.log('[API] Excluindo tipo de produto via Edge Function tipos-produto-v2...');
        await callEdgeFunction('tipos-produto-v2', 'DELETE', undefined, entityId);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir tipo de produto:', error);
        throw error;
      }
    }
    
    // Caso especial para unidades de medida - usar edge function
    if (entity === 'unidadesMedida') {
      try {
        console.log('[API] Excluindo unidade de medida via Edge Function unidades-medida-v2...');
        await callEdgeFunction('unidades-medida-v2', 'DELETE', undefined, entityId);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir unidade de medida:', error);
        throw error;
      }
    }
    
    // Caso especial para grupos/redes - usar edge function
    if (entity === 'grupos-redes') {
      try {
        console.log('[API] Excluindo grupo/rede via Edge Function grupos-redes-v2...');
        await callEdgeFunction('grupos-redes-v2', 'DELETE', undefined, entityId);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir grupo/rede:', error);
        throw error;
      }
    }
    
    // Caso especial para tipos de veículo - usar edge function
    if (entity === 'tipos-veiculo') {
      try {
        console.log('[API] Excluindo tipo de veículo via Edge Function tipos-veiculo-v2...');
        await callEdgeFunction('tipos-veiculo-v2', 'DELETE', undefined, entityId);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir tipo de veículo:', error);
        throw error;
      }
    }

    // Caso especial para categorias de conta corrente - usar edge function
    if (entity === 'categorias-conta-corrente') {
      try {
        console.log('[API] Excluindo categoria de conta corrente via Edge Function categorias-conta-corrente-v2...');
        await callEdgeFunction('categorias-conta-corrente-v2', 'DELETE', undefined, entityId);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir categoria de conta corrente:', error);
        throw error;
      }
    }

    // Caso especial para empresas - usar edge function
    if (entity === 'empresas') {
      try {
        console.log('[API] Excluindo empresa via Edge Function empresas-v2...');
        await callEdgeFunction('empresas-v2', 'DELETE', undefined, entityId);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir empresa:', error);
        throw error;
      }
    }
    
    // Caso especial para vendas
    if (entity === 'vendas') {
      try {
        console.log('[API] Excluindo venda via Edge Function pedido-venda-v2...');
        await callEdgeFunction('pedido-venda-v2', 'DELETE', undefined, entityId);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir venda, usando fallback:', error);
        // Fallback para localStorage em caso de erro
        const vendas = carregarVendasDoLocalStorage();
        const index = vendas.findIndex(v => v.id === entityId);
        if (index === -1) {
          throw new Error(`Venda ${entityId} não encontrada`);
        }
        vendas.splice(index, 1);
        salvarVendasNoLocalStorage(vendas);
        return { success: true };
      }
    }
    
    const entityConfig = entityMap[entity];
    if (!entityConfig) {
      throw new Error(`Entidade ${entity} não encontrada`);
    }
    
    const storedData = getStoredData(entityConfig.storageKey, entityConfig.data);
    const index = storedData.findIndex((item: any) => item.id === entityId);
    
    if (index === -1) {
      throw new Error(`${entity} ${entityId} não encontrado`);
    }
    
    storedData.splice(index, 1);
    saveStoredData(entityConfig.storageKey, storedData);
    
    return { success: true };
  },
  
  // Generic POST for custom paths
  post: async (path: string, data: any = {}) => {
    console.log(`[API] POST /${path}:`, data);
    
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
  
  // Generic PUT for custom paths
  put: async (path: string, data: any = {}) => {
    console.log(`[API] PUT /${path}:`, data);
    
    // Extrair entidade e ID do path (formato: "entidade/id")
    const parts = path.split('/');
    const entity = parts[0];
    const id = parts[1];
    
    if (!id) {
      throw new Error('ID é obrigatório para atualização');
    }
    
    return api.update(entity, id, data);
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
  
  // Metas endpoints - Usa Edge Function metas-vendedor-v2
  metas: {
    buscarPorVendedor: async (vendedorId: string, ano: number, mes: number) => {
      try {
        console.log('[API] Buscando meta por vendedor via Edge Function metas-vendedor-v2...');
        const response = await callEdgeFunction('metas-vendedor-v2', 'GET', undefined, undefined, {
          vendedor_id: vendedorId,
          ano: ano.toString(),
          mes: mes.toString(),
        });
        
        // A resposta vem no formato { metas: [...], pagination: {...} }
        const metas = response?.metas || [];
        const meta = metas.find((m: any) => 
          m.vendedorId === vendedorId && m.ano === ano && m.mes === mes
        );
        
        return meta || null;
      } catch (error) {
        console.error('[API] Erro ao buscar meta por vendedor:', error);
        return null;
      }
    },
    
    buscarTotal: async (ano: number, mes: number) => {
      try {
        console.log('[API] Buscando total de metas via Edge Function metas-vendedor-v2/total...');
        const response = await callEdgeFunction('metas-vendedor-v2', 'GET', undefined, 'total', {
          ano: ano.toString(),
          mes: mes.toString(),
        });
        
        // callEdgeFunction já extrai o data, então response já é { total: 0, ano: 2026, mes: 2 }
        let total = 0;
        if (typeof response === 'number') {
          total = response;
        } else if (response && typeof response === 'object') {
          if ('total' in response) {
            total = typeof (response as any).total === 'number' ? (response as any).total : parseFloat(String((response as any).total || '0'));
          } else if ('data' in response && typeof (response as any).data === 'object') {
            const data = (response as any).data;
            total = typeof data?.total === 'number' ? data.total : parseFloat(String(data?.total || '0'));
          }
        }
        
        return {
          total,
          ano: (response as any)?.ano || ano,
          mes: (response as any)?.mes || mes,
        };
      } catch (error) {
        console.error('[API] Erro ao buscar total de metas:', error);
        return {
          total: 0,
          ano,
          mes,
        };
      }
    },
    
    buscarTodas: async (ano?: number, mes?: number) => {
      try {
        console.log('[API] Buscando todas as metas via Edge Function metas-vendedor-v2...', { ano, mes });
        const queryParams: Record<string, string> = {
          page: '1',
          limit: '1000', // Buscar todas (limite máximo)
        };
        
        if (ano !== undefined) {
          queryParams.ano = ano.toString();
        }
        if (mes !== undefined) {
          queryParams.mes = mes.toString();
        }
        
        const response = await callEdgeFunction('metas-vendedor-v2', 'GET', undefined, undefined, queryParams);
        
        console.log('[API] Resposta bruta do callEdgeFunction:', response);
        console.log('[API] Tipo da resposta:', typeof response);
        console.log('[API] É array?', Array.isArray(response));
        console.log('[API] Chaves do objeto (se for objeto):', response && typeof response === 'object' ? Object.keys(response) : 'N/A');
        
        // callEdgeFunction já extrai o data, então response já é { metas: [...], pagination: {...} }
        // ou pode ser diretamente o array se a Edge Function retornar de forma diferente
        let metas: any[] = [];
        
        if (Array.isArray(response)) {
          // Se já é um array, usar diretamente
          metas = response;
          console.log('[API] Resposta já é um array, usando diretamente');
        } else if (response && typeof response === 'object') {
          // Verificar se tem a propriedade 'metas'
          if ('metas' in response) {
            const metasValue = (response as any).metas;
            console.log('[API] Propriedade metas encontrada:', { tipo: typeof metasValue, éArray: Array.isArray(metasValue), length: Array.isArray(metasValue) ? metasValue.length : 'N/A' });
            if (Array.isArray(metasValue)) {
              metas = metasValue;
            } else {
              console.warn('[API] Propriedade metas não é um array:', metasValue);
            }
          } 
          // Fallback: verificar se tem 'data' (caso callEdgeFunction não tenha extraído)
          else if ('data' in response) {
            const data = (response as any).data;
            console.log('[API] Propriedade data encontrada:', { tipo: typeof data, éArray: Array.isArray(data) });
            if (Array.isArray(data)) {
              metas = data;
            } else if (data && typeof data === 'object' && 'metas' in data) {
              const dataMetas = data.metas;
              if (Array.isArray(dataMetas)) {
                metas = dataMetas;
              }
            }
          }
          // Se response é um objeto mas não tem 'metas', pode ser que seja o array diretamente
          // ou pode ser que seja um objeto vazio
          else {
            console.warn('[API] Resposta não contém propriedade metas ou data:', response);
            console.warn('[API] Chaves disponíveis:', Object.keys(response));
          }
        } else {
          console.warn('[API] Resposta não é array nem objeto:', response);
        }
        
        console.log(`[API] ${metas.length} metas extraídas da resposta`);
        if (metas.length > 0) {
          console.log('[API] Primeira meta:', metas[0]);
        }
        return metas;
      } catch (error) {
        console.error('[API] Erro ao buscar todas as metas:', error);
        return [];
      }
    },
    
    salvar: async (data: any) => {
      try {
        console.log('[API] Salvando meta via Edge Function metas-vendedor-v2...');
        const response = await callEdgeFunction('metas-vendedor-v2', 'POST', {
          vendedorId: data.vendedorId,
          ano: data.ano,
          mes: data.mes,
          metaMensal: data.metaMensal,
          metaPercentualCrescimento: data.metaPercentualCrescimento,
          periodoReferencia: data.periodoReferencia,
        });
        
        // A resposta já vem no formato esperado pelo frontend
        return response;
      } catch (error: any) {
        console.error('[API] Erro ao salvar meta:', error);
        throw error;
      }
    },
    
    atualizar: async (vendedorId: string, ano: number, mes: number, data: any) => {
      try {
        console.log('[API] Atualizando meta via Edge Function metas-vendedor-v2...');
        
        // Primeiro buscar a meta para obter o ID
        const todasMetas = await callEdgeFunction('metas-vendedor-v2', 'GET', undefined, undefined, {
          vendedor_id: vendedorId,
          ano: ano.toString(),
          mes: mes.toString(),
        });
        
        const metaExistente = todasMetas?.metas?.find((m: any) => 
          m.vendedorId === vendedorId && m.ano === ano && m.mes === mes
        );
        
        if (!metaExistente || !metaExistente.id) {
          throw new Error('Meta não encontrada para atualização');
        }
        
        const response = await callEdgeFunction('metas-vendedor-v2', 'PUT', {
          vendedorId: data.vendedorId || vendedorId,
          ano: data.ano !== undefined ? data.ano : ano,
          mes: data.mes !== undefined ? data.mes : mes,
          metaMensal: data.metaMensal,
          metaPercentualCrescimento: data.metaPercentualCrescimento,
          periodoReferencia: data.periodoReferencia,
        }, metaExistente.id);
        
        return response;
      } catch (error: any) {
        console.error('[API] Erro ao atualizar meta:', error);
        throw error;
      }
    },
    
    deletar: async (vendedorId: string, ano: number, mes: number) => {
      try {
        console.log('[API] Deletando meta via Edge Function metas-vendedor-v2...');
        
        // Primeiro buscar a meta para obter o ID
        const todasMetas = await callEdgeFunction('metas-vendedor-v2', 'GET', undefined, undefined, {
          vendedor_id: vendedorId,
          ano: ano.toString(),
          mes: mes.toString(),
        });
        
        const metaExistente = todasMetas?.metas?.find((m: any) => 
          m.vendedorId === vendedorId && m.ano === ano && m.mes === mes
        );
        
        if (!metaExistente || !metaExistente.id) {
          throw new Error('Meta não encontrada para exclusão');
        }
        
        await callEdgeFunction('metas-vendedor-v2', 'DELETE', undefined, metaExistente.id);
        
        return { success: true };
      } catch (error: any) {
        console.error('[API] Erro ao deletar meta:', error);
        throw error;
      }
    },
    
    copiar: async (data: any) => {
      try {
        console.log('[API] Copiando metas via Edge Function metas-vendedor-v2/copiar...');
        
        // O frontend envia: { deAno, deMes, paraAno, paraMes }
        // Usar path 'copiar' e body com os parâmetros
        const response = await callEdgeFunction('metas-vendedor-v2', 'POST', {
          deAno: data.deAno || data.de_ano,
          deMes: data.deMes || data.de_mes,
          paraAno: data.paraAno || data.para_ano,
          paraMes: data.paraMes || data.para_mes,
        }, 'copiar');
        
        // A resposta vem no formato { success: true, copiedCount: 0, message: "..." }
        return {
          success: response?.success || true,
          copiedCount: response?.copiedCount || response?.data?.copiedCount || 0,
        };
      } catch (error: any) {
        console.error('[API] Erro ao copiar metas:', error);
        throw error;
      }
    },
  },
  
  // Vendas/Pedidos - Usa Edge Function pedido-venda-v2
  vendas: {
    list: async (filters?: { 
      search?: string
      status?: string
      vendedor?: string
      cliente?: string
      dataInicio?: string
      dataFim?: string
      page?: number
      limit?: number 
    }) => {
      try {
        console.log('[API] Listando vendas via Edge Function pedido-venda-v2...');
        const queryParams: Record<string, string> = {
          page: (filters?.page || 1).toString(),
          limit: (filters?.limit || 100).toString(),
        };
        
        if (filters?.search) queryParams.search = filters.search;
        if (filters?.status) queryParams.status = filters.status;
        if (filters?.vendedor) queryParams.vendedor = filters.vendedor;
        if (filters?.cliente) queryParams.cliente = filters.cliente;
        if (filters?.dataInicio) queryParams.dataInicio = filters.dataInicio;
        if (filters?.dataFim) queryParams.dataFim = filters.dataFim;
        
        const response = await callEdgeFunction('pedido-venda-v2', 'GET', undefined, undefined, queryParams);
        
        console.log('[API] Resposta completa do callEdgeFunction:', response);
        console.log('[API] Tipo da resposta:', typeof response);
        console.log('[API] response.pedidos:', response?.pedidos);
        console.log('[API] response.pagination:', response?.pagination);
        console.log('[API] response.stats:', response?.stats);
        
        // A resposta vem no formato { pedidos: [...], pagination: {...}, stats: {...} }
        const pedidos = response?.pedidos || [];
        const pagination = response?.pagination || {};
        const stats = response?.stats || {};
        
        console.log('[API] Pedidos extraídos:', pedidos.length);
        console.log('[API] Primeiro pedido:', pedidos[0]);
        
        // Mapear pedidos para formato Venda esperado pelo frontend
        const vendas = pedidos.map((p: any) => ({
          id: p.id,
          numero: p.numero,
          clienteId: p.clienteId,
          nomeCliente: p.nomeCliente,
          cnpjCliente: p.cnpjCliente,
          inscricaoEstadualCliente: p.inscricaoEstadualCliente,
          clienteCodigo: p.clienteCodigo,
          clienteRazaoSocial: p.nomeCliente,
          clienteNomeFantasia: p.clienteNomeFantasia,
          clienteGrupoRede: p.clienteGrupoRede,
          vendedorId: p.vendedorId,
          nomeVendedor: p.nomeVendedor,
          naturezaOperacaoId: p.naturezaOperacaoId,
          nomeNaturezaOperacao: p.nomeNaturezaOperacao,
          empresaFaturamentoId: p.empresaFaturamentoId,
          nomeEmpresaFaturamento: p.nomeEmpresaFaturamento,
          listaPrecoId: p.listaPrecoId,
          nomeListaPreco: p.nomeListaPreco,
          percentualDescontoPadrao: p.percentualDescontoPadrao,
          condicaoPagamentoId: p.condicaoPagamentoId,
          nomeCondicaoPagamento: p.nomeCondicaoPagamento,
          valorPedido: p.valorPedido,
          valorTotalProdutos: p.valorTotalProdutos,
          percentualDescontoExtra: p.percentualDescontoExtra,
          valorDescontoExtra: p.valorDescontoExtra,
          totalQuantidades: p.totalQuantidades,
          totalItens: p.totalItens,
          pesoBrutoTotal: p.pesoBrutoTotal,
          pesoLiquidoTotal: p.pesoLiquidoTotal,
          status: p.status,
          dataPedido: p.dataPedido ? new Date(p.dataPedido) : new Date(),
          ordemCompraCliente: p.ordemCompraCliente,
          observacoesInternas: p.observacoesInternas,
          observacoesNotaFiscal: p.observacoesNotaFiscal,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          createdBy: p.createdBy,
          itens: [], // Produtos serão carregados separadamente se necessário
          geraReceita: p.geraReceita,
        }));
        
        return {
          vendas,
          pagination,
          stats,
        };
      } catch (error) {
        console.error('[API] Erro ao listar vendas, usando fallback:', error);
        // Fallback para localStorage em caso de erro
        const vendas = carregarVendasDoLocalStorage();
        return {
          vendas,
          pagination: { page: 1, limit: 100, total: vendas.length, total_pages: 1 },
          stats: {
            total: 0,
            totalVendas: 0,
            concluidas: 0,
            totalConcluidas: 0,
            emAndamento: 0,
            totalEmAndamento: 0,
            ticketMedio: 0,
            outrosPedidosTotal: 0,
            outrosPedidosConcluidos: 0,
            outrosPedidosEmAndamento: 0,
          },
        };
      }
    },
    
    get: async (id: string) => {
      try {
        console.log('[API] Buscando venda por ID via Edge Function pedido-venda-v2...');
        const response = await callEdgeFunction('pedido-venda-v2', 'GET', undefined, id);
        
        // A resposta vem no formato { pedido: {...}, produtos: [...] }
        const pedidoData = response?.pedido || response;
        const produtos = response?.produtos || [];
        
        if (!pedidoData) {
          throw new Error(`Venda ${id} não encontrada`);
        }
        
        // Mapear para formato Venda esperado pelo frontend
        return {
          id: pedidoData.id,
          numero: pedidoData.numero,
          clienteId: pedidoData.clienteId,
          nomeCliente: pedidoData.nomeCliente,
          cnpjCliente: pedidoData.cnpjCliente,
          inscricaoEstadualCliente: pedidoData.inscricaoEstadualCliente,
          vendedorId: pedidoData.vendedorId,
          nomeVendedor: pedidoData.nomeVendedor,
          naturezaOperacaoId: pedidoData.naturezaOperacaoId,
          nomeNaturezaOperacao: pedidoData.nomeNaturezaOperacao,
          empresaFaturamentoId: pedidoData.empresaFaturamentoId,
          nomeEmpresaFaturamento: pedidoData.nomeEmpresaFaturamento,
          listaPrecoId: pedidoData.listaPrecoId,
          nomeListaPreco: pedidoData.nomeListaPreco,
          percentualDescontoPadrao: pedidoData.percentualDescontoPadrao,
          condicaoPagamentoId: pedidoData.condicaoPagamentoId,
          nomeCondicaoPagamento: pedidoData.nomeCondicaoPagamento,
          valorPedido: pedidoData.valorPedido,
          valorTotalProdutos: pedidoData.valorTotalProdutos,
          percentualDescontoExtra: pedidoData.percentualDescontoExtra,
          valorDescontoExtra: pedidoData.valorDescontoExtra,
          totalQuantidades: pedidoData.totalQuantidades,
          totalItens: pedidoData.totalItens,
          pesoBrutoTotal: pedidoData.pesoBrutoTotal,
          pesoLiquidoTotal: pedidoData.pesoLiquidoTotal,
          status: pedidoData.status,
          dataPedido: pedidoData.dataPedido ? new Date(pedidoData.dataPedido) : new Date(),
          ordemCompraCliente: pedidoData.ordemCompraCliente,
          observacoesInternas: pedidoData.observacoesInternas,
          observacoesNotaFiscal: pedidoData.observacoesNotaFiscal,
          createdAt: pedidoData.createdAt ? new Date(pedidoData.createdAt) : new Date(),
          updatedAt: pedidoData.updatedAt ? new Date(pedidoData.updatedAt) : new Date(),
          createdBy: pedidoData.createdBy,
          itens: produtos.map((p: any) => ({
            id: p.id,
            numero: p.numero,
            produtoId: p.produtoId,
            descricaoProduto: p.descricaoProduto,
            codigoSku: p.codigoSku,
            codigoEan: p.codigoEan,
            valorTabela: p.valorTabela,
            percentualDesconto: p.percentualDesconto,
            valorUnitario: p.valorUnitario,
            quantidade: p.quantidade,
            subtotal: p.subtotal,
            pesoBruto: p.pesoBruto,
            pesoLiquido: p.pesoLiquido,
            unidade: p.unidade,
          })),
        };
      } catch (error) {
        console.error('[API] Erro ao buscar venda:', error);
        throw error;
      }
    },
    
    create: async (data: any) => {
      try {
        console.log('[API] Criando venda via Edge Function pedido-venda-v2...');
        const response = await callEdgeFunction('pedido-venda-v2', 'POST', data);
        
        // A resposta vem no formato { pedido: {...}, produtos: [...] }
        const pedidoData = response?.pedido || response;
        const produtos = response?.produtos || [];
        
        // Mapear para formato Venda esperado pelo frontend
        return {
          id: pedidoData.id,
          numero: pedidoData.numero,
          clienteId: pedidoData.clienteId,
          nomeCliente: pedidoData.nomeCliente,
          cnpjCliente: pedidoData.cnpjCliente,
          inscricaoEstadualCliente: pedidoData.inscricaoEstadualCliente,
          vendedorId: pedidoData.vendedorId,
          nomeVendedor: pedidoData.nomeVendedor,
          naturezaOperacaoId: pedidoData.naturezaOperacaoId,
          nomeNaturezaOperacao: pedidoData.nomeNaturezaOperacao,
          empresaFaturamentoId: pedidoData.empresaFaturamentoId,
          nomeEmpresaFaturamento: pedidoData.nomeEmpresaFaturamento,
          listaPrecoId: pedidoData.listaPrecoId,
          nomeListaPreco: pedidoData.nomeListaPreco,
          percentualDescontoPadrao: pedidoData.percentualDescontoPadrao,
          condicaoPagamentoId: pedidoData.condicaoPagamentoId,
          nomeCondicaoPagamento: pedidoData.nomeCondicaoPagamento,
          valorPedido: pedidoData.valorPedido,
          valorTotalProdutos: pedidoData.valorTotalProdutos,
          percentualDescontoExtra: pedidoData.percentualDescontoExtra,
          valorDescontoExtra: pedidoData.valorDescontoExtra,
          totalQuantidades: pedidoData.totalQuantidades,
          totalItens: pedidoData.totalItens,
          pesoBrutoTotal: pedidoData.pesoBrutoTotal,
          pesoLiquidoTotal: pedidoData.pesoLiquidoTotal,
          status: pedidoData.status,
          dataPedido: pedidoData.dataPedido ? new Date(pedidoData.dataPedido) : new Date(),
          ordemCompraCliente: pedidoData.ordemCompraCliente,
          observacoesInternas: pedidoData.observacoesInternas,
          observacoesNotaFiscal: pedidoData.observacoesNotaFiscal,
          createdAt: pedidoData.createdAt ? new Date(pedidoData.createdAt) : new Date(),
          updatedAt: pedidoData.updatedAt ? new Date(pedidoData.updatedAt) : new Date(),
          createdBy: pedidoData.createdBy,
          itens: produtos.map((p: any) => ({
            id: p.id,
            numero: p.numero,
            produtoId: p.produtoId,
            descricaoProduto: p.descricaoProduto,
            codigoSku: p.codigoSku,
            codigoEan: p.codigoEan,
            valorTabela: p.valorTabela,
            percentualDesconto: p.percentualDesconto,
            valorUnitario: p.valorUnitario,
            quantidade: p.quantidade,
            subtotal: p.subtotal,
            pesoBruto: p.pesoBruto,
            pesoLiquido: p.pesoLiquido,
            unidade: p.unidade,
          })),
        };
      } catch (error) {
        console.error('[API] Erro ao criar venda:', error);
        throw error;
      }
    },
    
    update: async (id: string, data: any) => {
      try {
        console.log('[API] Atualizando venda via Edge Function pedido-venda-v2...');
        const response = await callEdgeFunction('pedido-venda-v2', 'PUT', data, id);
        
        // A resposta vem no formato { pedido: {...}, produtos: [...] }
        const pedidoData = response?.pedido || response;
        const produtos = response?.produtos || [];
        
        // Mapear para formato Venda esperado pelo frontend
        return {
          id: pedidoData.id,
          numero: pedidoData.numero,
          clienteId: pedidoData.clienteId,
          nomeCliente: pedidoData.nomeCliente,
          cnpjCliente: pedidoData.cnpjCliente,
          inscricaoEstadualCliente: pedidoData.inscricaoEstadualCliente,
          vendedorId: pedidoData.vendedorId,
          nomeVendedor: pedidoData.nomeVendedor,
          naturezaOperacaoId: pedidoData.naturezaOperacaoId,
          nomeNaturezaOperacao: pedidoData.nomeNaturezaOperacao,
          empresaFaturamentoId: pedidoData.empresaFaturamentoId,
          nomeEmpresaFaturamento: pedidoData.nomeEmpresaFaturamento,
          listaPrecoId: pedidoData.listaPrecoId,
          nomeListaPreco: pedidoData.nomeListaPreco,
          percentualDescontoPadrao: pedidoData.percentualDescontoPadrao,
          condicaoPagamentoId: pedidoData.condicaoPagamentoId,
          nomeCondicaoPagamento: pedidoData.nomeCondicaoPagamento,
          valorPedido: pedidoData.valorPedido,
          valorTotalProdutos: pedidoData.valorTotalProdutos,
          percentualDescontoExtra: pedidoData.percentualDescontoExtra,
          valorDescontoExtra: pedidoData.valorDescontoExtra,
          totalQuantidades: pedidoData.totalQuantidades,
          totalItens: pedidoData.totalItens,
          pesoBrutoTotal: pedidoData.pesoBrutoTotal,
          pesoLiquidoTotal: pedidoData.pesoLiquidoTotal,
          status: pedidoData.status,
          dataPedido: pedidoData.dataPedido ? new Date(pedidoData.dataPedido) : new Date(),
          ordemCompraCliente: pedidoData.ordemCompraCliente,
          observacoesInternas: pedidoData.observacoesInternas,
          observacoesNotaFiscal: pedidoData.observacoesNotaFiscal,
          createdAt: pedidoData.createdAt ? new Date(pedidoData.createdAt) : new Date(),
          updatedAt: pedidoData.updatedAt ? new Date(pedidoData.updatedAt) : new Date(),
          createdBy: pedidoData.createdBy,
          itens: produtos.map((p: any) => ({
            id: p.id,
            numero: p.numero,
            produtoId: p.produtoId,
            descricaoProduto: p.descricaoProduto,
            codigoSku: p.codigoSku,
            codigoEan: p.codigoEan,
            valorTabela: p.valorTabela,
            percentualDesconto: p.percentualDesconto,
            valorUnitario: p.valorUnitario,
            quantidade: p.quantidade,
            subtotal: p.subtotal,
            pesoBruto: p.pesoBruto,
            pesoLiquido: p.pesoLiquido,
            unidade: p.unidade,
          })),
        };
      } catch (error) {
        console.error('[API] Erro ao atualizar venda:', error);
        throw error;
      }
    },
    
    delete: async (id: string) => {
      try {
        console.log('[API] Excluindo venda via Edge Function pedido-venda-v2...');
        await callEdgeFunction('pedido-venda-v2', 'DELETE', undefined, id);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir venda:', error);
        throw error;
      }
    },
  },
  
  // Naturezas de operação - Usa Edge Function natureza-operacao-v2
  naturezasOperacao: {
    list: async (filters?: { search?: string; apenasAtivas?: boolean; page?: number; limit?: number }) => {
      try {
        console.log('[API] Listando naturezas via Edge Function natureza-operacao-v2...');
        const params = new URLSearchParams();
        if (filters?.search) params.append('search', filters.search);
        if (filters?.apenasAtivas) params.append('apenas_ativas', 'true');
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const response = await callEdgeFunction('natureza-operacao-v2', 'GET', undefined, undefined, {
          search: filters?.search,
          apenas_ativas: filters?.apenasAtivas ? 'true' : undefined,
          page: filters?.page?.toString(),
          limit: filters?.limit?.toString(),
        });
        
        // A resposta vem no formato { success: true, data: { naturezas: [...], pagination: {...} } }
        const naturezasData = response.data || response;
        const naturezas = naturezasData.naturezas || naturezasData || [];
        
        console.log(`[API] ${naturezas.length} naturezas encontradas`);
        
        return naturezas;
      } catch (error) {
        console.error('[API] Erro ao listar naturezas, usando mock:', error);
        // Fallback para mock em caso de erro
        return getStoredData('mockNaturezasOperacao', mockNaturezasOperacao);
      }
    },
    
    create: async (data: any) => {
      try {
        console.log('[API] Criando natureza via Edge Function natureza-operacao-v2...');
        const response = await callEdgeFunction('natureza-operacao-v2', 'POST', {
          action: 'create',
          nome: data.nome,
          codigo: data.codigo,
          descricao: data.descricao,
          geraComissao: data.geraComissao,
          geraReceita: data.geraReceita,
          tiny_id: data.tiny_id,
        });
        
        // A resposta vem no formato { success: true, data: {...} }
        return response.data || response;
      } catch (error) {
        console.error('[API] Erro ao criar natureza, usando mock:', error);
        // Fallback para mock em caso de erro
        const naturezas = getStoredData('mockNaturezasOperacao', mockNaturezasOperacao);
        const nova = {
          ...data,
          id: `natureza-${Date.now()}`,
        };
        naturezas.push(nova);
        saveStoredData('mockNaturezasOperacao', naturezas);
        return nova;
      }
    },
    
    update: async (id: string, data: any) => {
      try {
        console.log('[API] Atualizando natureza via Edge Function natureza-operacao-v2...');
        const response = await callEdgeFunction('natureza-operacao-v2', 'PUT', {
          nome: data.nome,
          codigo: data.codigo,
          descricao: data.descricao,
          geraComissao: data.geraComissao,
          geraReceita: data.geraReceita,
          ativo: data.ativo,
          tiny_id: data.tiny_id,
        }, id);
        
        // A resposta vem no formato { success: true, data: {...} }
        return response.data || response;
      } catch (error) {
        console.error('[API] Erro ao atualizar natureza, usando mock:', error);
        // Fallback para mock em caso de erro
        return api.update('naturezas-operacao', id, data);
      }
    },
    
    delete: async (id: string) => {
      try {
        console.log('[API] Excluindo natureza via Edge Function natureza-operacao-v2...');
        await callEdgeFunction('natureza-operacao-v2', 'DELETE', undefined, id);
        return { success: true };
      } catch (error) {
        console.error('[API] Erro ao excluir natureza:', error);
        throw error;
      }
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

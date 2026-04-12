// Serviços de integração com APIs externas

import { toast } from 'sonner@2.0.3';

// ==================== TINY ERP (Olist Tiny) ====================

export interface TinyERPConfig {
  token: string;
  format: 'json' | 'xml';
}

export interface TinyProduct {
  id: string;
  codigo: string;
  nome: string;
  preco: number;
  unidade: string;
  estoque?: number;
}

export interface TinyCustomer {
  id: string;
  codigo: string;
  nome: string;
  tipo_pessoa: 'F' | 'J';
  cpf_cnpj: string;
  endereco: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
  fone?: string;
  email?: string;
}

export interface TinyOrder {
  numero: string;
  data_pedido: string;
  cliente: TinyCustomer;
  itens: Array<{
    codigo: string;
    descricao: string;
    quantidade: number;
    valor_unitario: number;
  }>;
  valor_total: number;
}

/**
 * API do Tiny ERP
 * Documentação: https://tiny.com.br/api-docs
 */
export class TinyERPService {
  private config: TinyERPConfig;
  private baseUrl = 'https://api.tiny.com.br/api2';

  constructor(config: TinyERPConfig) {
    this.config = config;
  }

  private async request(endpoint: string, params: Record<string, any> = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('token', this.config.token);
    url.searchParams.append('formato', this.config.format);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    try {
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.retorno.status_processamento === '3') {
        throw new Error(data.retorno.erros[0].erro);
      }
      
      return data.retorno;
    } catch (error) {
      console.error('Erro na API Tiny:', error);
      throw error;
    }
  }

  // Buscar produtos
  async listarProdutos(): Promise<TinyProduct[]> {
    try {
      const response = await this.request('/produtos.pesquisa.php');
      return response.produtos || [];
    } catch (error) {
      toast.error('Erro ao buscar produtos do Tiny ERP');
      return [];
    }
  }

  // Buscar produto por código
  async obterProduto(id: string): Promise<TinyProduct | null> {
    try {
      const response = await this.request('/produto.obter.php', { id });
      return response.produto || null;
    } catch (error) {
      toast.error('Erro ao buscar produto do Tiny ERP');
      return null;
    }
  }

  // Criar/Atualizar cliente
  async sincronizarCliente(clienteData: any): Promise<boolean> {
    try {
      const xmlData = this.buildClienteXML(clienteData);
      await this.request('/cliente.incluir.php', { cliente: xmlData });
      toast.success('Cliente sincronizado com Tiny ERP');
      return true;
    } catch (error) {
      toast.error('Erro ao sincronizar cliente com Tiny ERP');
      return false;
    }
  }

  // Criar pedido
  async criarPedido(pedidoData: any): Promise<string | null> {
    try {
      const xmlData = this.buildPedidoXML(pedidoData);
      const response = await this.request('/pedido.incluir.php', { pedido: xmlData });
      toast.success('Pedido criado no Tiny ERP');
      return response.registro.id;
    } catch (error) {
      toast.error('Erro ao criar pedido no Tiny ERP');
      return null;
    }
  }

  // Listar pedidos
  async listarPedidos(dataInicio?: string, dataFim?: string): Promise<TinyOrder[]> {
    try {
      const params: any = {};
      if (dataInicio) params.dataInicio = dataInicio;
      if (dataFim) params.dataFim = dataFim;
      
      const response = await this.request('/pedidos.pesquisa.php', params);
      return response.pedidos || [];
    } catch (error) {
      toast.error('Erro ao buscar pedidos do Tiny ERP');
      return [];
    }
  }

  private buildClienteXML(data: any): string {
    // Simplificado - em produção, usar biblioteca XML
    return `<?xml version="1.0" encoding="UTF-8"?>
      <cliente>
        <nome>${data.razaoSocial}</nome>
        <tipo_pessoa>${data.tipoPessoa === 'Pessoa Física' ? 'F' : 'J'}</tipo_pessoa>
        <cpf_cnpj>${data.cpfCnpj.replace(/\D/g, '')}</cpf_cnpj>
        <endereco>${data.logradouro}</endereco>
        <numero>${data.numero}</numero>
        <bairro>${data.bairro}</bairro>
        <cep>${data.cep.replace(/\D/g, '')}</cep>
        <cidade>${data.municipio}</cidade>
        <uf>${data.uf}</uf>
        ${data.emailPrincipal ? `<email>${data.emailPrincipal}</email>` : ''}
        ${data.telefoneCelularPrincipal ? `<fone>${data.telefoneCelularPrincipal}</fone>` : ''}
      </cliente>`;
  }

  private buildPedidoXML(data: any): string {
    // Simplificado - em produção, usar biblioteca XML
    return `<?xml version="1.0" encoding="UTF-8"?>
      <pedido>
        <data_pedido>${data.data}</data_pedido>
        <cliente>
          <codigo>${data.clienteId}</codigo>
        </cliente>
        <itens>
          ${data.itens.map((item: any) => `
            <item>
              <codigo>${item.codigo}</codigo>
              <quantidade>${item.quantidade}</quantidade>
              <valor_unitario>${item.valorUnitario}</valor_unitario>
            </item>
          `).join('')}
        </itens>
      </pedido>`;
  }
}

// ==================== RECEITA FEDERAL (CNPJ) ====================

export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone?: string;
  email?: string;
  atividade_principal: string;
  data_abertura: string;
  capital_social: number;
}

/**
 * Consulta completa: CNPJ + Inscrição Estadual
 * Primeiro busca dados do CNPJ, depois automaticamente busca a IE
 */
export interface ConsultaCNPJCompleta {
  cnpj: CNPJData;
  sintegra?: SintegraData;
}

export async function consultarCNPJCompleto(cnpj: string): Promise<ConsultaCNPJCompleta | null> {
  // Primeiro, consultar CNPJ
  const dadosCNPJ = await consultarCNPJ(cnpj);
  
  if (!dadosCNPJ) {
    return null;
  }

  const resultado: ConsultaCNPJCompleta = {
    cnpj: dadosCNPJ,
  };

  // Se obteve a UF, tentar buscar Inscrição Estadual
  if (dadosCNPJ.uf) {
    console.log(`UF obtida (${dadosCNPJ.uf}), buscando Inscrição Estadual...`);
    
    try {
      const dadosSintegra = await consultarSintegra(cnpj, dadosCNPJ.uf);
      
      if (dadosSintegra) {
        resultado.sintegra = dadosSintegra;
      }
    } catch (error) {
      console.error('Erro ao buscar Inscrição Estadual:', error);
      // Não falha a consulta toda se o SINTEGRA falhar
    }
  } else {
    console.log('UF não disponível, pulando consulta de Inscrição Estadual');
  }

  return resultado;
}

/**
 * Consulta CNPJ via API pública com fallback entre múltiplas APIs
 * 
 * APIs utilizadas (em ordem de tentativa):
 * 1. BrasilAPI (gratuita, sem rate limit)
 * 2. ReceitaWS (gratuita, com rate limit)
 * 3. CNPJ.WS (gratuita, com rate limit)
 */
export async function consultarCNPJ(cnpj: string): Promise<CNPJData | null> {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  if (cnpjLimpo.length !== 14) {
    toast.error('CNPJ inválido');
    return null;
  }

  // Validação básica de CNPJ
  if (!validarCNPJ(cnpjLimpo)) {
    toast.error('CNPJ inválido (dígitos verificadores incorretos)');
    return null;
  }

  toast.info('Consultando dados do CNPJ...');

  // Tentar BrasilAPI primeiro (mais confiável)
  try {
    const result = await consultarCNPJBrasilAPI(cnpjLimpo);
    if (result) {
      toast.success('Dados do CNPJ obtidos com sucesso!');
      return result;
    }
  } catch (error) {
    console.log('BrasilAPI falhou, tentando ReceitaWS...');
  }

  // Fallback para ReceitaWS
  try {
    const result = await consultarCNPJReceitaWS(cnpjLimpo);
    if (result) {
      toast.success('Dados do CNPJ obtidos com sucesso!');
      return result;
    }
  } catch (error) {
    console.log('ReceitaWS falhou, tentando CNPJ.WS...');
  }

  // Fallback para CNPJ.WS
  try {
    const result = await consultarCNPJCNPJWS(cnpjLimpo);
    if (result) {
      toast.success('Dados do CNPJ obtidos com sucesso!');
      return result;
    }
  } catch (error) {
    console.log('CNPJ.WS falhou');
  }

  // Se todas falharam
  toast.error('Não foi possível consultar o CNPJ. Verifique se o número está correto ou tente novamente mais tarde.');
  return null;
}

/**
 * Validar CNPJ com dígitos verificadores
 * IMPORTANTE: CNPJs válidos como "00.000.000/0001-91" (Banco do Brasil) não são dígitos repetidos
 */
function validarCNPJ(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  // Removido: validação de dígitos repetidos que rejeitava CNPJs válidos

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

/**
 * Consulta via BrasilAPI (https://brasilapi.com.br/)
 */
async function consultarCNPJBrasilAPI(cnpj: string): Promise<CNPJData | null> {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Erro na consulta BrasilAPI');
    }

    const data = await response.json();

    console.log('BrasilAPI Response:', data);

    // BrasilAPI retorna estrutura completa
    const municipio = data.municipio || 
                     data.nome_cidade || 
                     (data.estabelecimento?.cidade ? 
                       (typeof data.estabelecimento.cidade === 'string' ? 
                         data.estabelecimento.cidade : 
                         data.estabelecimento.cidade.nome) : 
                       '');

    const uf = data.uf || 
              data.estado || 
              (data.estabelecimento?.estado ? 
                (typeof data.estabelecimento.estado === 'string' ? 
                  data.estabelecimento.estado : 
                  data.estabelecimento.estado.sigla) : 
                '');

    console.log('BrasilAPI - Município extraído:', municipio);
    console.log('BrasilAPI - UF extraído:', uf);

    return {
      cnpj: data.cnpj,
      razao_social: data.razao_social || data.nome_empresarial || '',
      nome_fantasia: data.nome_fantasia || data.estabelecimento?.nome_fantasia || '',
      situacao: data.descricao_situacao_cadastral || data.situacao_cadastral || 'ATIVA',
      logradouro: data.logradouro || (data.estabelecimento?.tipo_logradouro ? 
                    data.estabelecimento.tipo_logradouro + ' ' + data.estabelecimento.logradouro : 
                    data.estabelecimento?.logradouro || ''),
      numero: data.numero || data.estabelecimento?.numero || '',
      complemento: data.complemento || data.estabelecimento?.complemento || '',
      bairro: data.bairro || data.estabelecimento?.bairro || '',
      municipio: municipio,
      uf: uf,
      cep: data.cep || data.estabelecimento?.cep || '',
      telefone: data.ddd_telefone_1 || '',
      email: data.email || '',
      atividade_principal: data.cnae_fiscal_descricao || data.atividade_principal?.descricao || '',
      data_abertura: data.data_inicio_atividade || data.data_abertura || '',
      capital_social: parseFloat(data.capital_social || '0'),
    };
  } catch (error) {
    console.error('Erro BrasilAPI:', error);
    throw error;
  }
}

/**
 * Consulta via ReceitaWS (https://receitaws.com.br/)
 */
async function consultarCNPJReceitaWS(cnpj: string): Promise<CNPJData | null> {
  try {
    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Erro na consulta ReceitaWS');
    }

    const data = await response.json();

    if (data.status === 'ERROR') {
      throw new Error(data.message || 'CNPJ não encontrado');
    }

    console.log('ReceitaWS Response:', data);
    console.log('ReceitaWS - Município extraído:', data.municipio);
    console.log('ReceitaWS - UF extraído:', data.uf);

    return {
      cnpj: data.cnpj,
      razao_social: data.nome || '',
      nome_fantasia: data.fantasia || '',
      situacao: data.situacao || 'ATIVA',
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      municipio: data.municipio || '',
      uf: data.uf || '',
      cep: data.cep || '',
      telefone: data.telefone || '',
      email: data.email || '',
      atividade_principal: data.atividade_principal?.[0]?.text || '',
      data_abertura: data.abertura || '',
      capital_social: parseFloat(data.capital_social || '0'),
    };
  } catch (error) {
    // Não logar erro CORS - é esperado que esta API pode ter problemas no navegador
    throw error;
  }
}

/**
 * Consulta via CNPJ.WS (https://cnpj.ws/)
 */
async function consultarCNPJCNPJWS(cnpj: string): Promise<CNPJData | null> {
  try {
    const response = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Erro na consulta CNPJ.WS');
    }

    const data = await response.json();

    console.log('CNPJ.WS Response:', data);

    // CNPJ.WS retorna dados no objeto 'estabelecimento'
    const est = data.estabelecimento || {};
    
    const municipio = est.cidade?.nome || 
                     est.municipio?.nome || 
                     est.cidade || 
                     '';
    
    const uf = est.estado?.sigla || 
              est.uf || 
              '';
    
    const logradouro = est.tipo_logradouro && est.logradouro ? 
                      `${est.tipo_logradouro} ${est.logradouro}` : 
                      est.logradouro || '';

    console.log('CNPJ.WS - Município extraído:', municipio);
    console.log('CNPJ.WS - UF extraído:', uf);

    return {
      cnpj: est.cnpj || cnpj,
      razao_social: data.razao_social || '',
      nome_fantasia: est.nome_fantasia || '',
      situacao: est.situacao_cadastral || 'ATIVA',
      logradouro: logradouro,
      numero: est.numero || '',
      complemento: est.complemento || '',
      bairro: est.bairro || '',
      municipio: municipio,
      uf: uf,
      cep: est.cep || '',
      telefone: est.ddd1 && est.telefone1 
        ? `(${est.ddd1}) ${est.telefone1}` 
        : '',
      email: est.email || '',
      atividade_principal: est.atividade_principal?.descricao || '',
      data_abertura: est.data_inicio_atividade || '',
      capital_social: parseFloat(data.capital_social || '0'),
    };
  } catch (error) {
    console.error('Erro CNPJ.WS:', error);
    throw error;
  }
}

// ==================== VIACEP (já implementado, mantendo aqui para organização) ====================

export interface ViaCEPData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  erro?: boolean;
}

export async function consultarCEP(cep: string): Promise<ViaCEPData | null> {
  const cepLimpo = cep.replace(/\D/g, '');
  
  if (cepLimpo.length !== 8) {
    toast.error('CEP inválido');
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();

    if (data.erro) {
      toast.error('CEP não encontrado');
      return null;
    }

    toast.success('Endereço encontrado!');
    return data;
  } catch (error) {
    console.error('Erro ao consultar CEP:', error);
    toast.error('Erro ao buscar CEP. Tente novamente.');
    return null;
  }
}

// ==================== SINTEGRA (Inscrição Estadual) ====================

export interface SintegraData {
  ie: string;
  cnpj: string;
  razao_social: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  situacao: string;
}

/**
 * Consulta SINTEGRA por CNPJ e UF
 * Tenta múltiplas APIs com fallback automático
 * 
 * Nota: SINTEGRA não possui API pública unificada. Cada estado tem seu próprio sistema.
 * Usamos APIs agregadoras que consultam múltiplos estados.
 */
export async function consultarSintegra(
  cnpj: string,
  uf: string
): Promise<SintegraData | null> {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  if (cnpjLimpo.length !== 14) {
    console.error('CNPJ inválido para consulta SINTEGRA');
    return null;
  }

  if (!uf || uf.length !== 2) {
    console.error('UF inválida para consulta SINTEGRA');
    return null;
  }

  console.log(`Consultando Inscrição Estadual no SINTEGRA (${uf})...`);

  // Tentar ReceitaWS primeiro (também retorna IE quando disponível)
  // NOTA: Esta API pode ter problemas com CORS, então falhas são silenciadas
  try {
    const result = await consultarSintegraReceitaWS(cnpjLimpo);
    if (result?.ie) {
      console.log('✅ Inscrição Estadual encontrada via ReceitaWS');
      toast.success('Inscrição Estadual encontrada!');
      return result;
    }
  } catch (error) {
    // Silenciar - continuará com outras APIs
  }

  // Tentar BrasilAPI (também pode ter IE em alguns casos)
  try {
    const result = await consultarSintegraBrasilAPI(cnpjLimpo, uf);
    if (result?.ie) {
      console.log('✅ Inscrição Estadual encontrada via BrasilAPI');
      toast.success('Inscrição Estadual encontrada!');
      return result;
    }
  } catch (error) {
    console.log('BrasilAPI não retornou IE, tentando outras fontes...');
  }

  // Tentar API específica do estado
  try {
    const result = await consultarSintegraEstado(cnpjLimpo, uf);
    if (result?.ie) {
      console.log('✅ Inscrição Estadual encontrada via API do estado');
      toast.success('Inscrição Estadual encontrada!');
      return result;
    }
  } catch (error) {
    console.log('API do estado não retornou IE');
  }

  // Se todas falharam
  console.log('⚠️ Não foi possível obter Inscrição Estadual automaticamente');
  toast.info('Inscrição Estadual não encontrada automaticamente. Preencha manualmente se necessário.');
  return null;
}

/**
 * Consulta IE via ReceitaWS (alguns CNPJs incluem IE)
 * NOTA: Esta API pode ter problemas com CORS, por isso usamos apenas como tentativa opcional
 */
async function consultarSintegraReceitaWS(cnpj: string): Promise<SintegraData | null> {
  try {
    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status === 'ERROR' || !data.inscricao_estadual) {
      return null;
    }

    // Alguns CNPJs têm IE na resposta
    if (data.inscricao_estadual && data.inscricao_estadual !== 'ISENTO') {
      return {
        ie: data.inscricao_estadual,
        cnpj: data.cnpj,
        razao_social: data.nome || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        municipio: data.municipio || '',
        uf: data.uf || '',
        cep: data.cep || '',
        situacao: data.situacao || 'ATIVA',
      };
    }

    return null;
  } catch (error) {
    // Silenciar erro CORS - é esperado que esta API pode não funcionar no navegador
    // A consulta continuará com as outras APIs disponíveis
    return null;
  }
}

/**
 * Consulta IE via BrasilAPI
 */
async function consultarSintegraBrasilAPI(cnpj: string, uf: string): Promise<SintegraData | null> {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Erro na consulta BrasilAPI');
    }

    const data = await response.json();

    // BrasilAPI pode ter inscricao_estadual no objeto
    const ie = data.inscricoes_estaduais?.[0]?.inscricao_estadual || 
               data.inscricao_estadual ||
               null;

    if (ie && ie !== 'ISENTO') {
      return {
        ie: ie,
        cnpj: data.cnpj,
        razao_social: data.razao_social || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        municipio: data.municipio || '',
        uf: data.uf || uf,
        cep: data.cep || '',
        situacao: data.descricao_situacao_cadastral || 'ATIVA',
      };
    }

    return null;
  } catch (error) {
    console.error('Erro ao consultar IE via BrasilAPI:', error);
    return null;
  }
}

/**
 * Consulta IE usando APIs específicas de cada estado
 * Implementação para estados principais (SP, RJ, MG, etc)
 */
async function consultarSintegraEstado(cnpj: string, uf: string): Promise<SintegraData | null> {
  console.log(`Tentando API específica do estado: ${uf}`);

  // Mapeamento de APIs por estado (as que existem publicamente)
  const apisEstado: Record<string, () => Promise<SintegraData | null>> = {
    'SP': () => consultarSintegraSP(cnpj),
    'RJ': () => consultarSintegraRJ(cnpj),
    // Outros estados seriam adicionados aqui
  };

  const consultaEstado = apisEstado[uf];
  
  if (consultaEstado) {
    try {
      return await consultaEstado();
    } catch (error) {
      console.error(`Erro ao consultar SINTEGRA ${uf}:`, error);
      return null;
    }
  }

  // Se não há API específica para o estado, retornar null
  return null;
}

/**
 * Consulta SINTEGRA SP
 * Nota: API real da SEFAZ-SP não é pública. 
 * Esta é uma estrutura preparada para quando houver integração.
 */
async function consultarSintegraSP(cnpj: string): Promise<SintegraData | null> {
  // Em produção, você integraria com:
  // - Serviços pagos de consulta
  // - API da SEFAZ-SP (se tiver credenciais)
  // - Scraping autorizado
  
  console.log('API SINTEGRA SP não disponível publicamente');
  return null;
}

/**
 * Consulta SINTEGRA RJ
 * Nota: API real da SEFAZ-RJ não é pública.
 */
async function consultarSintegraRJ(cnpj: string): Promise<SintegraData | null> {
  console.log('API SINTEGRA RJ não disponível publicamente');
  return null;
}

/**
 * Consulta SINTEGRA via serviço agregador (opção paga)
 * Exemplo de como integrar com serviços pagos
 */
async function consultarSintegraAPI(cnpj: string, uf: string, apiKey: string): Promise<SintegraData | null> {
  try {
    // Exemplo com API fictícia - substitua pela API real que você contratar
    const response = await fetch(`https://api.consultasintegra.com.br/v1/${uf}/${cnpj}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Erro na consulta SINTEGRA API');
    }

    const data = await response.json();

    return {
      ie: data.inscricao_estadual,
      cnpj: data.cnpj,
      razao_social: data.razao_social,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento || '',
      bairro: data.bairro,
      municipio: data.municipio,
      uf: data.uf,
      cep: data.cep,
      situacao: data.situacao,
    };
  } catch (error) {
    console.error('Erro ao consultar SINTEGRA via API paga:', error);
    return null;
  }
}

// ==================== CONFIGURAÇÃO DE ERPs ====================

export type ERPType = 'tiny' | 'totvs' | 'sap' | 'omie' | 'bling';

export interface ERPConfig {
  tipo: ERPType;
  ativo: boolean;
  credenciais: {
    token?: string;
    apiKey?: string;
    appKey?: string;
    username?: string;
    password?: string;
    url?: string;
  };
}

export function criarClienteERP(tipo: ERPType, config: ERPConfig['credenciais']) {
  switch (tipo) {
    case 'tiny':
      return new TinyERPService({
        token: config.token || '',
        format: 'json',
      });
    // Adicionar outros ERPs conforme necessário
    default:
      throw new Error(`ERP ${tipo} não suportado`);
  }
}

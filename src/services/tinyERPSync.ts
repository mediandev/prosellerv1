// Serviço de sincronização automática de status com Tiny ERP
// 🔄 VERSION: 2025-12-24_03:00 - FIX CRÍTICO: Forçar salvamento dados NFe SEMPRE
// ✅ VERSÃO 3.0.0 - Salvamento FORÇADO de notaFiscalId, notaFiscalNumero, notaFiscalChave
console.log('🚀 tinyERPSync.ts v3.0.0 CARREGADO - Salvamento NFe FORÇADO');
import { toast } from 'sonner@2.0.3';
import { Venda, StatusVenda, TinyERPStatus, MAPEAMENTO_STATUS_TINY } from '../types/venda';
import { api } from './api';

// Cache de produtos para matching
let produtosCache: any[] = [];
let produtosCacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export interface TinyPedidoStatus {
  id: string;
  numero: string;
  situacao: TinyERPStatus;
  codigo_rastreamento?: string;
  url_rastreamento?: string;
  data_faturamento?: string;
  nota_fiscal?: {
    numero: string;
    chave_acesso: string;
    url_danfe: string;
  };
  transportadora?: {
    nome: string;
    cnpj: string;
  };
}

export interface HistoricoSincronizacao {
  id: string;
  vendaId: string;
  dataHora: Date;
  statusAnterior: StatusVenda;
  statusNovo: StatusVenda;
  erpStatusAnterior?: TinyERPStatus;
  erpStatusNovo?: TinyERPStatus;
  sucesso: boolean;
  mensagem: string;
  detalhes?: any;
}

export interface ConfiguracaoSincronizacao {
  habilitado: boolean;
  intervaloMinutos: number; // Intervalo de polling
  sincronizarAutomaticamente: boolean; // Se deve atualizar status automaticamente
  notificarAlteracoes: boolean; // Se deve notificar usuários sobre alterações
  webhookUrl?: string; // URL para receber webhooks do Tiny (mais eficiente que polling)
  sincronizarDadosAdicionais: boolean; // Sincronizar NF, rastreio, etc
}

// Configuração por empresa
export interface ConfiguracaoSincronizacaoEmpresa extends ConfiguracaoSincronizacao {
  empresaId: string;
  empresaNome: string;
  apiToken: string;
}

/**
 * Carrega produtos do cache ou da API
 */
async function carregarProdutos(): Promise<any[]> {
  const agora = Date.now();
  
  // Verificar se o cache ainda é válido
  if (produtosCache.length > 0 && (agora - produtosCacheTimestamp) < CACHE_DURATION) {
    console.log('[PRODUTO-MATCH] Usando cache de produtos:', produtosCache.length);
    return produtosCache;
  }
  
  try {
    console.log('[PRODUTO-MATCH] Carregando produtos da API...');
    const produtos = await api.get('produtos');
    produtosCache = Array.isArray(produtos) ? produtos : [];
    produtosCacheTimestamp = agora;
    console.log('[PRODUTO-MATCH] Produtos carregados:', produtosCache.length);
    return produtosCache;
  } catch (error) {
    console.error('[PRODUTO-MATCH] Erro ao carregar produtos:', error);
    return produtosCache; // Retornar cache antigo se houver erro
  }
}

/**
 * Faz matching de um item da NF com produtos cadastrados
 * Tenta em ordem: produtoId -> EAN -> SKU
 */
async function matchProduto(itemNF: any): Promise<{ produtoId?: string; codigoSku: string; codigoEan?: string }> {
  const produtos = await carregarProdutos();
  
  // Normalizar dados do item da NF
  const skuNF = itemNF.codigo || itemNF.item?.codigo || '';
  const eanNF = itemNF.gtin || itemNF.item?.gtin || '';
  
  console.log('[PRODUTO-MATCH] Tentando match para:', { skuNF, eanNF });
  
  // 1. Tentar por EAN primeiro (mais confiável)
  if (eanNF) {
    const produtoPorEan = produtos.find(p => 
      p.codigoEan && p.codigoEan.trim() === eanNF.trim()
    );
    
    if (produtoPorEan) {
      console.log('[PRODUTO-MATCH] ✅ Match por EAN:', {
        produtoId: produtoPorEan.id,
        sku: produtoPorEan.codigoSku,
        ean: produtoPorEan.codigoEan
      });
      return {
        produtoId: produtoPorEan.id,
        codigoSku: produtoPorEan.codigoSku,
        codigoEan: produtoPorEan.codigoEan
      };
    }
  }
  
  // 2. Tentar por SKU
  if (skuNF) {
    const produtoPorSku = produtos.find(p => 
      p.codigoSku && p.codigoSku.trim() === skuNF.trim()
    );
    
    if (produtoPorSku) {
      console.log('[PRODUTO-MATCH] ✅ Match por SKU:', {
        produtoId: produtoPorSku.id,
        sku: produtoPorSku.codigoSku,
        ean: produtoPorSku.codigoEan
      });
      return {
        produtoId: produtoPorSku.id,
        codigoSku: produtoPorSku.codigoSku,
        codigoEan: produtoPorSku.codigoEan
      };
    }
  }
  
  // 3. Não encontrou - retornar apenas os dados da NF
  console.log('[PRODUTO-MATCH] ⚠️ Produto não encontrado no cadastro:', { skuNF, eanNF });
  return {
    codigoSku: skuNF,
    codigoEan: eanNF || undefined
  };
}

class TinyERPSyncService {
  // Configuração global (padrão)
  private config: ConfiguracaoSincronizacao = {
    habilitado: true,
    intervaloMinutos: 1440, // 24 horas (polling leve de backup)
    sincronizarAutomaticamente: true,
    notificarAlteracoes: true,
    sincronizarDadosAdicionais: true,
  };

  // Configurações específicas por empresa
  private configsPorEmpresa: Map<string, ConfiguracaoSincronizacaoEmpresa> = new Map();

  private intervaloSync: NodeJS.Timeout | null = null;
  private historicoSincronizacao: HistoricoSincronizacao[] = [];

  /**
   * Configurar sincronização global (padrão para todas as empresas)
   */
  configurar(config: Partial<ConfiguracaoSincronizacao>) {
    this.config = { ...this.config, ...config };
    
    // Reiniciar polling se necessário
    if (this.config.habilitado && this.config.sincronizarAutomaticamente) {
      this.iniciarPolling();
    } else {
      this.pararPolling();
    }
  }

  /**
   * Configurar sincronização para uma empresa específica
   */
  configurarEmpresa(empresaId: string, empresaNome: string, config: Partial<ConfiguracaoSincronizacao> & { apiToken: string }) {
    const configEmpresa: ConfiguracaoSincronizacaoEmpresa = {
      empresaId,
      empresaNome,
      apiToken: config.apiToken,
      habilitado: config.habilitado ?? true,
      intervaloMinutos: config.intervaloMinutos ?? 1440, // 24 horas por padrão
      sincronizarAutomaticamente: config.sincronizarAutomaticamente ?? true,
      notificarAlteracoes: config.notificarAlteracoes ?? true,
      sincronizarDadosAdicionais: config.sincronizarDadosAdicionais ?? true,
      webhookUrl: config.webhookUrl,
    };

    this.configsPorEmpresa.set(empresaId, configEmpresa);

    // Reiniciar polling se necessário
    if (configEmpresa.habilitado && configEmpresa.sincronizarAutomaticamente) {
      this.iniciarPolling();
    }

    console.log(`Configuração de sincronização atualizada para empresa ${empresaNome}`);
  }

  /**
   * Obter configuração global
   */
  obterConfiguracao(): ConfiguracaoSincronizacao {
    return { ...this.config };
  }

  /**
   * Obter configuração de uma empresa específica
   */
  obterConfiguracaoEmpresa(empresaId: string): ConfiguracaoSincronizacaoEmpresa | null {
    return this.configsPorEmpresa.get(empresaId) || null;
  }

  /**
   * Obter todas as configurações de empresas
   */
  obterTodasConfiguracoesEmpresas(): ConfiguracaoSincronizacaoEmpresa[] {
    return Array.from(this.configsPorEmpresa.values());
  }

  /**
   * Remover configuração de uma empresa
   */
  removerConfiguracaoEmpresa(empresaId: string) {
    this.configsPorEmpresa.delete(empresaId);
  }

  /**
   * Iniciar polling automático
   */
  iniciarPolling() {
    this.pararPolling();
    
    if (!this.config.habilitado || !this.config.sincronizarAutomaticamente) {
      return;
    }

    console.log(`Iniciando sincronização automática a cada ${this.config.intervaloMinutos} minutos`);
    
    this.intervaloSync = setInterval(() => {
      this.sincronizarTodasVendas();
    }, this.config.intervaloMinutos * 60 * 1000);
  }

  /**
   * Parar polling
   */
  pararPolling() {
    if (this.intervaloSync) {
      clearInterval(this.intervaloSync);
      this.intervaloSync = null;
      console.log('Sincronização automática parada');
    }
  }

  /**
   * Sincronizar todas as vendas ativas (não canceladas nem em rascunho)
   */
  async sincronizarTodasVendas(vendas?: Venda[]): Promise<void> {
    if (!this.config.habilitado) {
      console.log('Sincronização desabilitada');
      return;
    }

    console.log('Iniciando sincronização de vendas...');

    // Contar pedidos mockados (IDs de teste)
    const pedidosMockados = (vendas || []).filter(
      v => v.integracaoERP?.erpPedidoId?.startsWith('tiny-mock-')
    ).length;
    
    if (pedidosMockados > 0) {
      console.log(`ℹ️ ${pedidosMockados} pedido(s) com IDs mockados serão ignorados (não foram enviados ao ERP real)`);
    }

    // Filtrar vendas que devem ser sincronizadas
    const vendasParaSincronizar = (vendas || []).filter(
      v => v.integracaoERP?.sincronizacaoAutomatica && 
           v.integracaoERP?.erpPedidoId &&
           !v.integracaoERP?.erpPedidoId.startsWith('tiny-mock-') && // Ignorar IDs mockados
           v.status !== 'Rascunho' &&
           v.status !== 'Cancelado'
    );

    console.log(`${vendasParaSincronizar.length} vendas para sincronizar`);

    let sucesso = 0;
    let erros = 0;
    let naoEncontrados = 0;
    let rateLimitAtingido = false;

    for (const venda of vendasParaSincronizar) {
      try {
        const resultado = await this.sincronizarVenda(venda);
        if (resultado === null) {
          naoEncontrados++;
          console.log(`⚠️ Pedido ${venda.numero} não encontrado no ERP`);
        } else {
          sucesso++;
          console.log(`✅ Pedido ${venda.numero} sincronizado`);
        }
        
        // Delay de 500ms entre requisições para respeitar rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        // Verificar se é erro de rate limit (código 6)
        if (error?.details?.codigo_erro === 6 || error?.codigo_erro === 6 || 
            error?.message?.includes('API Bloqueada') || error?.message?.includes('Excedido o número de acessos')) {
          console.error('🚫 Rate limit da API Tiny ERP atingido!');
          console.error('⏸️ Parando sincronização para evitar bloqueio prolongado.');
          rateLimitAtingido = true;
          break; // Parar a sincronização
        }
        
        erros++;
        console.error(`❌ Erro ao sincronizar venda ${venda.numero}:`, error);
      }
    }

    if (rateLimitAtingido) {
      console.log(`⏸️ Sincronização interrompida por rate limit: ${sucesso} sucesso, ${naoEncontrados} não encontrados antes da pausa`);
      throw new Error('Rate limit da API Tiny ERP atingido. Aguarde alguns minutos antes de sincronizar novamente.');
    }

    console.log(`✅ Sincronização concluída: ${sucesso} sucesso, ${naoEncontrados} não encontrados, ${erros} erros`);
  }

  /**
   * Sincronizar uma venda específica
   */
  async sincronizarVenda(venda: Venda, empresaId?: string): Promise<Venda | null> {
    if (!venda.integracaoERP?.erpPedidoId) {
      console.log('Venda sem ID do ERP, pulando sincronização');
      return null;
    }

    // Ignorar IDs mockados (pedidos de teste que nunca foram enviados ao ERP)
    if (venda.integracaoERP.erpPedidoId.startsWith('tiny-mock-')) {
      console.log(`⚠️ Pedido ${venda.numero} possui ID mockado (${venda.integracaoERP.erpPedidoId}), pulando sincronização`);
      return null;
    }

    // Obter configuração da empresa (se fornecida) ou usar global
    const configEmpresa = empresaId ? this.configsPorEmpresa.get(empresaId) : null;
    const config = configEmpresa || this.config;

    if (!config.habilitado) {
      console.log('Sincronização desabilitada para esta empresa');
      return null;
    }

    try {
      console.log(`🔄 Sincronizando venda ${venda.numero} (ERP ID: ${venda.integracaoERP.erpPedidoId})`);
      console.log('📊 Dados da venda:', {
        id: venda.id,
        numero: venda.numero,
        status: venda.status,
        integracaoERP: {
          erpPedidoId: venda.integracaoERP.erpPedidoId,
          erpNumero: venda.integracaoERP.erpNumero,
          erpStatus: venda.integracaoERP.erpStatus,
          dataEnvio: venda.integracaoERP.dataEnvio,
          sincronizacaoAutomatica: venda.integracaoERP.sincronizacaoAutomatica
        }
      });

      // Consultar status no Tiny ERP
      const statusERP = await this.consultarStatusTiny(
        venda.integracaoERP.erpPedidoId,
        configEmpresa?.apiToken,
        empresaId || venda.empresaFaturamentoId
      );

      if (!statusERP) {
        console.warn(`⚠️ Pedido ${venda.numero} não encontrado no ERP. Pulando sincronização.`);
        return null; // Retorna null sem jogar erro
      }

      // Verificar se houve mudança de status
      const statusAnterior = venda.status;
      const statusErpAnterior = venda.integracaoERP.erpStatus;
      
      // Log para debug - mostrar qual pedido está sendo sincronizado
      console.log(`[Tiny Sync] 🔍 Sincronizando pedido:`, {
        vendaId: venda.id,
        numero: venda.numero,
        erpNumero: statusERP.numero,
        erpOC: statusERP.numero_ordem_compra,
        cliente: venda.cliente?.nome || venda.clienteId
      });
      
      // Log para debug
      console.log('[Tiny Sync] Mapeando status:', {
        situacaoRecebida: statusERP.situacao,
        mapeamentoDisponivel: Object.keys(MAPEAMENTO_STATUS_TINY),
        statusMapeado: MAPEAMENTO_STATUS_TINY[statusERP.situacao]
      });
      
      const statusNovo = MAPEAMENTO_STATUS_TINY[statusERP.situacao];
      
      if (!statusNovo) {
        console.error('[Tiny Sync] ❌ Status do ERP não encontrado no mapeamento!', {
          statusERP: statusERP.situacao,
          mapeamentoDisponivel: MAPEAMENTO_STATUS_TINY
        });
        throw new Error(`Status "${statusERP.situacao}" não encontrado no mapeamento`);
      }

      let vendaAtualizada = { ...venda };

      // Log para debug da comparação
      console.log('[Tiny Sync] Comparando status:', {
        statusErpAnterior,
        statusErpNovo: statusERP.situacao,
        statusAnterior,
        statusNovo,
        vaiFazerUpdate: statusErpAnterior !== statusERP.situacao || statusAnterior !== statusNovo
      });

      // Atualizar status se houver mudança
      if (statusErpAnterior !== statusERP.situacao || statusAnterior !== statusNovo) {
        console.log('[Tiny Sync] 🔄 Atualizando status da venda...');
        vendaAtualizada.status = statusNovo;
        vendaAtualizada.integracaoERP = {
          ...venda.integracaoERP,
          erpStatus: statusERP.situacao,
          dataSincronizacao: new Date(),
          tentativasSincronizacao: (venda.integracaoERP.tentativasSincronizacao || 0) + 1,
          erroSincronizacao: undefined,
        };

        // Atualizar dados adicionais se configurado
        if (config.sincronizarDadosAdicionais) {
          vendaAtualizada.integracaoERP = {
            ...vendaAtualizada.integracaoERP,
            erpNumero: statusERP.numero,
            codigoRastreio: statusERP.codigo_rastreamento,
            transportadoraNome: statusERP.transportadora?.nome,
          };

          // Dados de faturamento
          if (statusERP.nota_fiscal) {
            vendaAtualizada.integracaoERP = {
              ...vendaAtualizada.integracaoERP,
              notaFiscalId: statusERP.nota_fiscal.id,
              notaFiscalNumero: statusERP.nota_fiscal.numero,
              notaFiscalChave: statusERP.nota_fiscal.chave_acesso,
              notaFiscalUrl: statusERP.nota_fiscal.url_danfe,
              dataFaturamento: statusERP.data_faturamento ? new Date(statusERP.data_faturamento) : undefined,
            };
          }
        }

        // 🆕 BUSCAR DADOS DE FATURAMENTO SE O PEDIDO FOI FATURADO
        // Mesma lógica do webhook para garantir consistência
        // O Tiny pode retornar em 2 formatos: statusERP.nota_fiscal.id OU statusERP.id_nota_fiscal
        const notaFiscalIdDisponivel = statusERP.nota_fiscal?.id || statusERP.id_nota_fiscal;
        
        console.log('[Tiny Sync] 🔍 Verificando se precisa buscar nota fiscal:', {
          temNotaFiscalId: !!notaFiscalIdDisponivel,
          notaFiscalId: notaFiscalIdDisponivel,
          nota_fiscal_id: statusERP.nota_fiscal?.id,
          id_nota_fiscal: statusERP.id_nota_fiscal,
          statusNovo,
          deveProcessar: notaFiscalIdDisponivel && (
            statusNovo === 'Aprovado' ||
            statusNovo === 'Faturado' ||
            statusNovo === 'Pronto para envio' ||
            statusNovo === 'Enviado' ||
            statusNovo === 'Entregue' ||
            statusNovo === 'Não Entregue'
          )
        });
        
        if (notaFiscalIdDisponivel && (
          statusNovo === 'Aprovado' ||
          statusNovo === 'Faturado' ||
          statusNovo === 'Pronto para envio' ||
          statusNovo === 'Enviado' ||
          statusNovo === 'Entregue' ||
          statusNovo === 'Não Entregue'
        )) {
          console.log('[Tiny Sync] 📄 Pedido faturado detectado, buscando dados completos da nota fiscal...');
          
          try {
            const { api } = await import('../services/api');
            const notaFiscalId = notaFiscalIdDisponivel;
            
            console.log('[Tiny Sync] 🔍 Buscando nota fiscal ID:', notaFiscalId);
            const nfData = await api.tinyObterNotaFiscal(empresaId || venda.empresaFaturamentoId, notaFiscalId);
            
            console.log('[Tiny Sync] 📦 Response da API:', {
              status: nfData?.status,
              status_processamento: nfData?.status_processamento,
              temNotaFiscal: !!nfData?.nota_fiscal
            });
            
            if (nfData?.status === 'OK' && nfData?.nota_fiscal) {
              const nf = nfData.nota_fiscal;
              console.log('[Tiny Sync] ✅ Nota fiscal obtida com sucesso!');
              
              // Extrair valor total faturado
              const valorFaturado = parseFloat(nf.valor_nota || nf.total_nota || '0');
              const valorDesconto = parseFloat(nf.desconto || '0');
              
              console.log('[Tiny Sync] 💰 Valor faturado:', valorFaturado);
              console.log('[Tiny Sync] 💸 Desconto aplicado:', valorDesconto);
              
              // Extrair itens faturados com matching de produtos
              let itensFaturados = [];
              if (nf.itens && Array.isArray(nf.itens)) {
                // Processar cada item com matching
                itensFaturados = await Promise.all(
                  nf.itens.map(async (item: any, index: number) => {
                    const match = await matchProduto(item);
                    
                    return {
                      id: `faturado-${Date.now()}-${index}`,
                      numero: index + 1,
                      produtoId: match.produtoId,
                      descricaoProduto: item.item?.descricao || '',
                      codigoSku: match.codigoSku,
                      codigoEan: match.codigoEan,
                      quantidade: parseFloat(item.item?.quantidade || '0'),
                      valorUnitario: parseFloat(item.item?.valor_unitario || '0'),
                      subtotal: parseFloat(item.item?.valor || '0'),
                      unidade: item.item?.unidade || 'UN',
                      cfop: item.item?.cfop || '',
                      ncm: item.item?.ncm || '',
                    };
                  })
                );
                console.log('[Tiny Sync] 📦 Itens faturados processados:', itensFaturados.length);
                console.log('[Tiny Sync] 🔍 Matching results:', 
                  itensFaturados.map(i => ({ 
                    sku: i.codigoSku, 
                    produtoId: i.produtoId ? '✅' : '❌' 
                  }))
                );
              }
              
              // Adicionar dados de faturamento na venda atualizada
              vendaAtualizada.valorFaturado = valorFaturado;
              vendaAtualizada.valorDescontoFaturado = valorDesconto;
              vendaAtualizada.dataFaturamento = nf.data_emissao || statusERP.data_faturamento || new Date().toISOString();
              
              // 🆕 ADICIONAR DADOS DA NOTA FISCAL dentro de integracaoERP (necessário para exibir seção "Dados NFe Vinculada")
              if (!vendaAtualizada.integracaoERP) {
                vendaAtualizada.integracaoERP = {};
              }
              vendaAtualizada.integracaoERP.notaFiscalId = notaFiscalId;
              vendaAtualizada.integracaoERP.notaFiscalNumero = nf.numero || null;
              vendaAtualizada.integracaoERP.notaFiscalChave = nf.chave_acesso || null;
              vendaAtualizada.integracaoERP.notaFiscalSerie = nf.serie || null;
              
              if (itensFaturados.length > 0) {
                vendaAtualizada.itensFaturados = itensFaturados;
              }
              
              console.log('[Tiny Sync] ✅ Dados de faturamento extraídos e salvos na venda:', {
                vendaId: venda.id,
                vendaNumero: venda.numero,
                valorFaturado: vendaAtualizada.valorFaturado,
                valorDescontoFaturado: vendaAtualizada.valorDescontoFaturado,
                notaFiscalId: vendaAtualizada.integracaoERP?.notaFiscalId,
                notaFiscalNumero: vendaAtualizada.integracaoERP?.notaFiscalNumero,
                notaFiscalChave: vendaAtualizada.integracaoERP?.notaFiscalChave,
                temItensFaturados: !!vendaAtualizada.itensFaturados
              });
            } else {
              console.warn('[Tiny Sync] ⚠️ Não foi possível obter dados da nota fiscal (mudança de status):', {
                status: nfData?.status,
                status_processamento: nfData?.status_processamento,
                temNotaFiscal: !!nfData?.nota_fiscal,
                erros: nfData?.erros,
                avisos: nfData?.avisos
              });
            }
          } catch (nfError) {
            console.error('[Tiny Sync] ❌ Erro ao buscar nota fiscal:', nfError);
            // Continuar mesmo com erro - não bloquear a atualização do status
          }
        }

        // Registrar no histórico
        this.registrarHistorico({
          id: `hist-${Date.now()}`,
          vendaId: venda.id,
          dataHora: new Date(),
          statusAnterior,
          statusNovo,
          erpStatusAnterior: statusErpAnterior,
          erpStatusNovo: statusERP.situacao,
          sucesso: true,
          mensagem: `Status atualizado de "${statusAnterior}" para "${statusNovo}"`,
          detalhes: statusERP,
        });

        // Notificar se configurado
        if (config.notificarAlteracoes) {
          this.notificarAlteracao(vendaAtualizada, statusAnterior, statusNovo);
        }

        console.log(`✅ Venda ${venda.numero} sincronizada: ${statusAnterior} → ${statusNovo}`);
      } else {
        // Mesmo sem mudança de status, atualizar data de sincronização
        vendaAtualizada.integracaoERP = {
          ...venda.integracaoERP,
          dataSincronizacao: new Date(),
          tentativasSincronizacao: (venda.integracaoERP.tentativasSincronizacao || 0) + 1,
        };
        
        console.log(`ℹ️ Venda ${venda.numero} já está atualizada`);
        
        // 🆕🆕🆕 FORÇAR BUSCA DE DADOS DA NFE SEMPRE QUE HOUVER ID (SEM CONDIÇÕES!)
        // Buscar ID da nota fiscal (prioridade: id_nota_fiscal direto, depois nota_fiscal.id)
        const notaFiscalIdRecuperacao = statusERP.id_nota_fiscal || statusERP.nota_fiscal?.id;
        
        console.log('[Tiny Sync] 🚨 FORÇANDO busca de dados da NFe:', {
          temNotaFiscalId: !!notaFiscalIdRecuperacao,
          notaFiscalId: notaFiscalIdRecuperacao,
          vendaAtualJaTem: !!venda.notaFiscalId,
          statusNovo
        });
        
        if (notaFiscalIdRecuperacao) {
          console.log('[Tiny Sync] 📄 FORÇANDO busca da nota fiscal:', notaFiscalIdRecuperacao);
          
          try {
            const { api } = await import('../services/api');
            const notaFiscalId = notaFiscalIdRecuperacao;
            
            console.log('[Tiny Sync] 🔍 Buscando nota fiscal ID (recuperação):', notaFiscalId);
            const nfData = await api.tinyObterNotaFiscal(empresaId || venda.empresaFaturamentoId, notaFiscalId);
            
            console.log('[Tiny Sync] 🔴🔴🔴 RESPOSTA RAW COMPLETA da API:', nfData);
            console.log('[Tiny Sync] 🔴 nfData type:', typeof nfData);
            console.log('[Tiny Sync] 🔴 nfData keys:', nfData ? Object.keys(nfData) : 'null');
            console.log('[Tiny Sync] 🔴 nfData.status:', nfData?.status);
            console.log('[Tiny Sync] 🔴 nfData.nota_fiscal:', nfData?.nota_fiscal);
            
            console.log('[Tiny Sync] 📦 Response da API (recuperação):', {
              status: nfData?.status,
              status_processamento: nfData?.status_processamento,
              temNotaFiscal: !!nfData?.nota_fiscal,
              erros: nfData?.erros,
              responseCompleto: JSON.stringify(nfData, null, 2)
            });
            
            if (nfData?.status === 'OK' && nfData?.nota_fiscal) {
              const nf = nfData.nota_fiscal;
              console.log('[Tiny Sync] ✅ Nota fiscal obtida com sucesso!');
              
              // Extrair valor total faturado
              const valorFaturado = parseFloat(nf.valor_nota || nf.total_nota || '0');
              const valorDesconto = parseFloat(nf.desconto || '0');
              
              console.log('[Tiny Sync] 💰 Valor faturado:', valorFaturado);
              console.log('[Tiny Sync] 💸 Desconto aplicado:', valorDesconto);
              
              // Extrair itens faturados com matching de produtos
              let itensFaturados = [];
              if (nf.itens && Array.isArray(nf.itens)) {
                // Processar cada item com matching
                itensFaturados = await Promise.all(
                  nf.itens.map(async (item: any, index: number) => {
                    const match = await matchProduto(item);
                    
                    return {
                      id: `faturado-${Date.now()}-${index}`,
                      numero: index + 1,
                      produtoId: match.produtoId,
                      descricaoProduto: item.item?.descricao || '',
                      codigoSku: match.codigoSku,
                      codigoEan: match.codigoEan,
                      quantidade: parseFloat(item.item?.quantidade || '0'),
                      valorUnitario: parseFloat(item.item?.valor_unitario || '0'),
                      subtotal: parseFloat(item.item?.valor || '0'),
                      unidade: item.item?.unidade || 'UN',
                      cfop: item.item?.cfop || '',
                      ncm: item.item?.ncm || '',
                    };
                  })
                );
                console.log('[Tiny Sync] 📦 Itens faturados processados:', itensFaturados.length);
                console.log('[Tiny Sync] 🔍 Matching results:', 
                  itensFaturados.map(i => ({ 
                    sku: i.codigoSku, 
                    produtoId: i.produtoId ? '✅' : '❌' 
                  }))
                );
              }
              
              // Adicionar dados de faturamento na venda atualizada
              vendaAtualizada.valorFaturado = valorFaturado;
              vendaAtualizada.valorDescontoFaturado = valorDesconto;
              vendaAtualizada.dataFaturamento = nf.data_emissao || statusERP.data_faturamento || new Date().toISOString();
              
              // 🆕 ADICIONAR DADOS DA NOTA FISCAL dentro de integracaoERP (necessário para exibir seção "Dados NFe Vinculada")
              if (!vendaAtualizada.integracaoERP) {
                vendaAtualizada.integracaoERP = {};
              }
              vendaAtualizada.integracaoERP.notaFiscalId = notaFiscalId;
              vendaAtualizada.integracaoERP.notaFiscalNumero = nf.numero || null;
              vendaAtualizada.integracaoERP.notaFiscalChave = nf.chave_acesso || null;
              vendaAtualizada.integracaoERP.notaFiscalSerie = nf.serie || null;
              
              if (itensFaturados.length > 0) {
                vendaAtualizada.itensFaturados = itensFaturados;
              }
              
              console.log('[Tiny Sync] ✅ Dados de faturamento extraídos e salvos na venda (recuperação):', {
                vendaId: venda.id,
                vendaNumero: venda.numero,
                valorFaturado: vendaAtualizada.valorFaturado,
                valorDescontoFaturado: vendaAtualizada.valorDescontoFaturado,
                notaFiscalId: vendaAtualizada.integracaoERP?.notaFiscalId,
                notaFiscalNumero: vendaAtualizada.integracaoERP?.notaFiscalNumero,
                notaFiscalChave: vendaAtualizada.integracaoERP?.notaFiscalChave,
                temItensFaturados: !!vendaAtualizada.itensFaturados
              });
            } else {
              console.warn('[Tiny Sync] ⚠️ Não foi possível obter dados da nota fiscal (recuperação)');
              console.warn('[Tiny Sync] 🔴 Status:', nfData?.status);
              console.warn('[Tiny Sync] 🔴 Status Processamento:', nfData?.status_processamento);
              console.warn('[Tiny Sync] 🔴 Tem Nota Fiscal?:', !!nfData?.nota_fiscal);
              console.warn('[Tiny Sync] 🔴 Erros:', nfData?.erros);
              console.warn('[Tiny Sync] 🔴 Avisos:', nfData?.avisos);
              console.warn('[Tiny Sync] 🔴 nfData completo:', nfData);
            }
          } catch (nfError) {
            console.error('[Tiny Sync] ❌ Erro ao buscar nota fiscal:', nfError);
            // Continuar mesmo com erro
          }
        }
      }

      return vendaAtualizada;

    } catch (error) {
      console.error(`Erro ao sincronizar venda ${venda.numero}:`, error);

      // Registrar erro no histórico
      this.registrarHistorico({
        id: `hist-${Date.now()}`,
        vendaId: venda.id,
        dataHora: new Date(),
        statusAnterior: venda.status,
        statusNovo: venda.status,
        sucesso: false,
        mensagem: `Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        detalhes: error,
      });

      // Atualizar contador de tentativas e erro
      const vendaComErro = {
        ...venda,
        integracaoERP: {
          ...venda.integracaoERP!,
          tentativasSincronizacao: (venda.integracaoERP?.tentativasSincronizacao || 0) + 1,
          erroSincronizacao: error instanceof Error ? error.message : 'Erro desconhecido',
          dataSincronizacao: new Date(),
        },
      };

      return vendaComErro;
    }
  }

  /**
   * Consultar status de um pedido no Tiny ERP
   */
  private async consultarStatusTiny(erpPedidoId: string, apiToken?: string, empresaId?: string): Promise<TinyPedidoStatus | null> {
    const modoAtual = localStorage.getItem('tinyERPMode') || 'MOCK';
    
    // Se está em modo MOCK, usar simulação
    if (modoAtual === 'MOCK') {
      return this.consultarStatusTinyMock(erpPedidoId);
    }
    
    // Modo REAL: usar backend
    try {
      // Tentar usar empresaId passado como parâmetro, senão usar localStorage como fallback
      const empresaIdFinal = empresaId || localStorage.getItem('empresaSelecionada');
      if (!empresaIdFinal) {
        console.error('[Tiny Sync] Nenhuma empresa fornecida para consultar status');
        return null;
      }

      console.log('[Tiny Sync] Consultando pedido no Tiny ERP:', {
        erpPedidoId,
        empresaId: empresaIdFinal
      });

      const { api } = await import('../services/api');
      const data = await api.tinyObterPedido(empresaIdFinal, erpPedidoId);
      
      console.log('[Tiny Sync] Resposta do Tiny ERP:', data);
      
      if (!data || !data.pedido) {
        console.error('[Tiny Sync] Pedido não encontrado ou resposta inválida:', data);
        return null;
      }
      
      const pedido = data.pedido;
      
      // Normalizar o status do Tiny ERP (converter para minúsculas e substituir espaços por underscore)
      const situacaoNormalizada = pedido.situacao
        .toLowerCase()
        .replace(/ /g, '_') as TinyERPStatus;
      
      console.log('[Tiny Sync] Status original do Tiny:', pedido.situacao);
      console.log('[Tiny Sync] Status normalizado:', situacaoNormalizada);
      
      return {
        id: pedido.id,
        numero: pedido.numero,
        situacao: situacaoNormalizada,
        codigo_rastreamento: pedido.codigo_rastreamento,
        url_rastreamento: pedido.url_rastreamento,
        data_faturamento: pedido.data_faturamento,
        nota_fiscal: pedido.nota_fiscal,
        id_nota_fiscal: pedido.id_nota_fiscal,
        transportadora: pedido.transportadora
      };
    } catch (error: any) {
      // Verificar se é erro 32 (Pedido não localizado)
      if (error?.details?.codigo_erro === '32' || error?.codigo_erro === '32') {
        console.warn('[Tiny Sync] ⚠️ Pedido não encontrado no Tiny ERP (erro 32):', {
          erpPedidoId,
          empresaId
        });
        return null; // Retorna null sem jogar erro
      }
      
      console.error('[Tiny Sync] Erro ao consultar status no ERP:', error);
      return null;
    }
  }

  /**
   * Consultar status - Modo MOCK (simulação)
   */
  private async consultarStatusTinyMock(erpPedidoId: string): Promise<TinyPedidoStatus | null> {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simular diferentes status baseado no ID
    const statusSimulados: TinyERPStatus[] = ['aprovado', 'faturado', 'enviado', 'preparando_envio'];
    const statusAleatorio = statusSimulados[Math.floor(Math.random() * statusSimulados.length)];

    const mockResponse: TinyPedidoStatus = {
      id: erpPedidoId,
      numero: `TINY-${erpPedidoId.substring(0, 8)}`,
      situacao: statusAleatorio,
      codigo_rastreamento: statusAleatorio === 'enviado' ? 'BR123456789BR' : undefined,
      data_faturamento: statusAleatorio === 'faturado' || statusAleatorio === 'enviado' ? new Date().toISOString() : undefined,
      nota_fiscal: statusAleatorio === 'faturado' || statusAleatorio === 'enviado' ? {
        numero: `${Math.floor(Math.random() * 999999)}`,
        chave_acesso: '35' + Date.now().toString().substring(0, 42),
        url_danfe: 'https://exemplo.com/danfe.pdf',
      } : undefined,
      transportadora: statusAleatorio === 'enviado' ? {
        nome: 'Transportadora Exemplo',
        cnpj: '00.000.000/0001-00',
      } : undefined,
    };

    return mockResponse;
  }

  /**
   * Registrar no histórico de sincronizações
   */
  private registrarHistorico(historico: HistoricoSincronizacao) {
    this.historicoSincronizacao.unshift(historico);
    
    // Manter apenas últimos 1000 registros
    if (this.historicoSincronizacao.length > 1000) {
      this.historicoSincronizacao = this.historicoSincronizacao.slice(0, 1000);
    }
  }

  /**
   * Obter histórico de sincronizações
   */
  obterHistorico(vendaId?: string, limite: number = 50): HistoricoSincronizacao[] {
    let historico = this.historicoSincronizacao;
    
    if (vendaId) {
      historico = historico.filter(h => h.vendaId === vendaId);
    }
    
    return historico.slice(0, limite);
  }

  /**
   * Limpar histórico
   */
  limparHistorico() {
    this.historicoSincronizacao = [];
  }

  /**
   * Notificar sobre alteração de status
   */
  private notificarAlteracao(venda: Venda, statusAnterior: StatusVenda, statusNovo: StatusVenda) {
    // Definir tipo de notificação baseado no status
    const notificacoesPorStatus: Record<StatusVenda, { tipo: 'success' | 'info' | 'warning'; icone: string }> = {
      'Rascunho': { tipo: 'info', icone: '📝' },
      'Em Análise': { tipo: 'info', icone: '🔍' },
      'Em aberto': { tipo: 'info', icone: '🕒' },
      'Aprovado': { tipo: 'success', icone: '✅' },
      'Preparando envio': { tipo: 'info', icone: '📦' },
      'Faturado': { tipo: 'success', icone: '🧾' },
      'Pronto para envio': { tipo: 'info', icone: '🚚' },
      'Enviado': { tipo: 'success', icone: '🚚' },
      'Entregue': { tipo: 'success', icone: '📬' },
      'Não Entregue': { tipo: 'warning', icone: '⚠️' },
      'Cancelado': { tipo: 'warning', icone: '❌' },
    };

    const config = notificacoesPorStatus[statusNovo] || { tipo: 'info' as const, icone: 'ℹ️' };

    const mensagem = `${config.icone} Pedido ${venda.numero}: ${statusAnterior} → ${statusNovo}`;
    
    switch (config.tipo) {
      case 'success':
        toast.success(mensagem);
        break;
      case 'warning':
        toast.warning(mensagem);
        break;
      default:
        toast.info(mensagem);
    }
  }

  /**
   * Processar webhook do Tiny ERP
   * Quando configurado, o Tiny pode enviar notificações de mudança de status
   */
  async processarWebhook(payload: any): Promise<void> {
    try {
      console.log('Processando webhook do Tiny ERP:', payload);

      // Extrair informações do webhook
      const { pedido_id, situacao, numero_pedido } = payload;

      if (!pedido_id || !situacao) {
        throw new Error('Webhook inválido: faltam dados essenciais');
      }

      // Aqui você buscaria a venda correspondente no banco de dados
      // const venda = await buscarVendaPorERPId(pedido_id);
      
      console.log(`Webhook recebido para pedido ${numero_pedido}: status ${situacao}`);
      
      // Notificar sobre recebimento de webhook
      toast.info(`📨 Atualização recebida do ERP para pedido ${numero_pedido}`);

    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      throw error;
    }
  }

  /**
   * Sincronizar manualmente uma venda
   */
  async sincronizarManual(venda: Venda): Promise<Venda | null> {
    toast.info(`Sincronizando pedido ${venda.numero}...`);
    
    const vendaAtualizada = await this.sincronizarVenda(venda);
    
    if (vendaAtualizada) {
      toast.success(`Pedido ${venda.numero} sincronizado com sucesso!`);
    } else {
      toast.error(`Erro ao sincronizar pedido ${venda.numero}`);
    }
    
    return vendaAtualizada;
  }

  /**
   * Enviar venda para o Tiny ERP
   * 
   * IMPORTANTE: A API do Tiny ERP não permite chamadas diretas do navegador (CORS).
   * Em produção, você deve:
   * 1. Criar um endpoint backend (ex: POST /api/tiny/pedidos)
   * 2. O backend faz a chamada para a API do Tiny
   * 3. O frontend chama seu backend
   * 
   * Para desenvolvimento, usamos modo MOCK que simula o comportamento.
   */
  async enviarVendaParaTiny(venda: Venda, tinyToken: string): Promise<string | null> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 [tinyERPSync v2024-01-20_19:30] INICIANDO ENVIO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Venda:', venda.numero, '| empresaFaturamentoId:', venda.empresaFaturamentoId);
    
    // ✅ PROTEÇÃO: NÃO enviar pedidos com status "Rascunho"
    if (venda.status === 'Rascunho') {
      console.error('🚫 BLOQUEIO: Tentativa de enviar pedido com status "Rascunho" ao Tiny ERP');
      console.error('🚫 Venda:', venda.numero, '| Status:', venda.status);
      throw new Error('Pedidos com status "Rascunho" não podem ser enviados ao ERP');
    }
    
    // Detectar se estamos em ambiente que suporta chamadas à API
    const usarModoMock = this.deveUsarModoMock();
    console.log('🚀 Modo detectado:', usarModoMock ? 'MOCK' : 'REAL');
    
    if (usarModoMock) {
      console.log('🎭 Usando modo MOCK');
      return this.enviarVendaParaTinyMock(venda, tinyToken);
    } else {
      console.log('📤 Usando modo REAL');
      return this.enviarVendaParaTinyReal(venda, tinyToken);
    }
  }

  /**
   * Detectar se deve usar modo MOCK
   */
  private deveUsarModoMock(): boolean {
    // Verificar localStorage primeiro, depois window, depois padrão
    const modoLocalStorage = localStorage.getItem('tinyERPMode');
    const modoWindow = (window as any).__TINY_API_MODE__;
    let modoFinal = modoLocalStorage || modoWindow || 'MOCK';
    
    // Garantir sincronização
    if (modoFinal !== modoWindow) {
      (window as any).__TINY_API_MODE__ = modoFinal;
    }
    
    return modoFinal === 'MOCK';
  }

  /**
   * Enviar venda para o Tiny ERP - MODO MOCK (Simulação)
   */
  private async enviarVendaParaTinyMock(venda: Venda, tinyToken: string): Promise<string | null> {
    try {
      console.log('🎭 MODO SIMULAÇÃO - Enviando pedido para Tiny ERP (MOCK)');
      console.log('📦 Venda:', venda);
      
      toast.info(`Enviando pedido ${venda.numero} para o Tiny ERP... (SIMULAÇÃO)`);

      // 1. Construir XML do pedido (para validar e mostrar)
      const pedidoXML = this.construirPedidoXML(venda);
      
      console.log('📄 XML que seria enviado:', pedidoXML);
      console.log('🔑 Token:', tinyToken.substring(0, 10) + '...');
      console.log('🌐 URL (não chamada):', 'https://api.tiny.com.br/api2/pedido.incluir.php');

      // 2. Simular delay de rede (500ms a 1.5s)
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      // 3. Simular resposta do Tiny (95% sucesso, 5% erro)
      const simularErro = Math.random() < 0.05;
      
      if (simularErro) {
        // Simular erro ocasional
        const erros = [
          'Cliente não encontrado no sistema Tiny ERP',
          'Produto não cadastrado (SKU não existe)',
          'Token de acesso inválido',
          'Erro de validação: CNPJ inválido'
        ];
        const erroAleatorio = erros[Math.floor(Math.random() * erros.length)];
        
        console.error('❌ Erro simulado:', erroAleatorio);
        toast.error(`[SIMULAÇÃO] Erro do Tiny ERP: ${erroAleatorio}`);
        throw new Error(erroAleatorio);
      }

      // 4. Simular ID retornado pelo Tiny
      const erpPedidoId = `tiny-mock-${Date.now()}`;
      const erpNumero = `TINY-MOCK-${venda.numero.replace('PV-', '')}`;
      
      console.log('✅ [SIMULAÇÃO] Pedido "enviado" com sucesso!');
      console.log('   ID Tiny (mock):', erpPedidoId);
      console.log('   Número Tiny (mock):', erpNumero);
      console.log('');
      console.log('⚠️  ATENÇÃO: Este pedido NÃO foi enviado para o Tiny ERP real!');
      console.log('   Para enviar de verdade, você precisa:');
      console.log('   1. Criar um backend/API intermediário');
      console.log('   2. O backend faz a chamada para o Tiny (sem CORS)');
      console.log('   3. Configurar: window.__TINY_API_MODE__ = "REAL"');
      console.log('');
      
      toast.success(`[SIMULAÇÃO] Pedido registrado no sistema local! (ID: ${erpPedidoId})`, {
        duration: 5000,
      });

      return erpPedidoId;

    } catch (error) {
      console.error('❌ Erro na simulação:', error);
      
      if (error instanceof Error) {
        toast.error(`[SIMULAÇÃO] Erro: ${error.message}`);
      } else {
        toast.error('[SIMULAÇÃO] Erro desconhecido');
      }
      
      throw error;
    }
  }

  /**
   * Enviar venda para o Tiny ERP - MODO REAL (requer backend)
   */
  private async enviarVendaParaTinyReal(venda: Venda, tinyToken: string): Promise<string | null> {
    console.log('');
    console.log('🚨 ═════════════════════════════════════════════════');
    console.log('🚨 DEBUG EXTREMO - INÍCIO DA FUNÇÃO');
    console.log('🚨 ═════════════════════════════════════════════════');
    console.log('🚨 Função enviarVendaParaTinyReal INICIADA');
    console.log('🚨 Timestamp:', new Date().toISOString());
    console.log('🚨 venda.numero:', venda.numero);
    console.log('🚨 venda.empresaFaturamentoId:', venda.empresaFaturamentoId);
    console.log('🚨 tinyToken (primeiros 10 chars):', tinyToken?.substring(0, 10));
    console.log('🚨 ═════════════════════════════════════════════════');
    console.log('');
    
    try {
      console.log('📤 MODO REAL - Enviando pedido para Tiny ERP via backend');
      console.log('📦 Venda completa:', JSON.stringify(venda, null, 2));
      console.log('📦 empresaFaturamentoId:', venda.empresaFaturamentoId);
      console.log('📦 Todas as propriedades da venda:', Object.keys(venda));
      
      toast.info(`Enviando pedido ${venda.numero} para o Tiny ERP...`);

      // Obter empresa da venda (empresaFaturamentoId)
      const empresaId = venda.empresaFaturamentoId;
      console.log('🔍 Verificando empresaId:', empresaId, '| Tipo:', typeof empresaId);
      
      if (!empresaId) {
        console.error('❌ ERRO: empresaFaturamentoId não encontrado na venda!');
        console.error('❌ Venda completa:', venda);
        const erro = new Error('[tinyERPSync.enviarVendaParaTinyReal] Venda sem empresa de faturamento associada. Certifique-se de selecionar uma Empresa de Faturamento no formulário de pedido.');
        console.error('❌ Lançando erro:', erro.message);
        throw erro;
      }
      
      console.log('✅ Empresa de faturamento encontrada:', empresaId);

      // IMPORTAR API SERVICE NO INÍCIO (antes de qualquer uso)
      console.log('');
      console.log('🔧 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔧 CHECKPOINT 1: IMPORTANDO API');
      console.log('🔧 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔧 empresaId:', empresaId);
      console.log('🔧 venda.clienteId:', venda.clienteId);
      console.log('🔧 venda.nomeCliente:', venda.nomeCliente);
      console.log('🔧 venda.cnpjCliente:', venda.cnpjCliente);
      console.log('🔧 venda.itens.length:', venda.itens.length);
      console.log('');
      
      const { api } = await import('../services/api');
      
      console.log('🔧 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔧 CHECKPOINT 2: API IMPORTADA COM SUCESSO');
      console.log('🔧 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔧 api.tinyCriarCliente existe?', typeof api.tinyCriarCliente);
      console.log('🔧 api.tinyCriarProduto existe?', typeof api.tinyCriarProduto);
      console.log('🔧 api.tinycriarPedido existe?', typeof api.tinycriarPedido);
      console.log('🔧 api.getCliente existe?', typeof api.getCliente);
      console.log('');

      // 1. Validações pré-envio
      console.log('🔍 Validando dados antes de construir XML...');
      
      // Validar que todos os itens têm unidade
      const itensSeUnidade = venda.itens.filter(item => {
        const unidade = item.unidade || (item as any).unidade;
        return !unidade || unidade.trim() === '';
      });
      
      if (itensSeUnidade.length > 0) {
        console.warn('⚠️ Itens sem unidade detectados:', itensSeUnidade.map(i => i.codigoSku));
        console.warn('⚠️ Será usado fallback "UN" para estes itens');
      }
      
      // 2. Construir XML do pedido
      let pedidoXML: string;
      try {
        // Buscar dados completos do cliente do sistema
        console.log('👤 Buscando dados completos do cliente:', venda.clienteId);
        let clienteCompleto = null;
        
        try {
          clienteCompleto = await api.getById('clientes', venda.clienteId);
          console.log('👤 Cliente completo encontrado:', clienteCompleto);
        } catch (errorBusca) {
          console.warn('⚠️ Não foi possível buscar dados completos do cliente:', errorBusca);
          console.warn('⚠️ Continuando com dados básicos da venda');
        }
        
        pedidoXML = this.construirPedidoXML(venda, clienteCompleto);
      } catch (xmlError) {
        console.error('❌ Erro ao construir XML:', xmlError);
        if (xmlError instanceof Error) {
          toast.error(`Erro ao preparar pedido: ${xmlError.message}`);
        }
        throw xmlError;
      }
      
      console.log('📄 XML gerado:', pedidoXML.substring(0, 300) + '...');
      console.log('📄 XML completo (length):', pedidoXML.length);

      // 3. Tentar criar cliente automaticamente no Tiny ERP
      console.log('');
      console.log('🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🤖 INICIANDO CADASTRO AUTOMÁTICO NO TINY ERP');
      console.log('🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 Verificando se o cliente precisa ser criado no Tiny ERP...');
      
      let clienteCadastrado = false;
      
      try {
        // Buscar dados completos do cliente do sistema
        console.log('👤 Buscando dados completos do cliente:', venda.clienteId);
        let clienteCompleto = null;
        
        try {
          clienteCompleto = await api.getById('clientes', venda.clienteId);
          console.log('👤 Cliente completo encontrado:', clienteCompleto);
        } catch (errorBusca) {
          console.warn('⚠️ Não foi possível buscar dados completos do cliente:', errorBusca);
          console.warn('⚠️ Continuando com dados básicos da venda');
        }
        
        // Usar o código do cliente sem duplicar o prefixo
        let codigoCliente = venda.clienteId || `cliente-${venda.cnpjCliente.replace(/\D/g, '')}`;
        
        // Remover prefixo duplicado se existir
        if (codigoCliente.startsWith('cliente-cliente-')) {
          codigoCliente = codigoCliente.replace('cliente-cliente-', 'cliente-');
          console.log('⚠️ Prefixo duplicado detectado e corrigido:', codigoCliente);
        }
        
        // Montar dados do cliente com informações completas de endereço
        const clienteData = {
          codigo: codigoCliente,
          nome: clienteCompleto?.razaoSocial || venda.nomeCliente,
          cpfCnpj: venda.cnpjCliente,
          ie: clienteCompleto?.inscricaoEstadual || venda.inscricaoEstadualCliente || '',
          // Endereço completo
          endereco: clienteCompleto?.logradouro || '',
          numero: clienteCompleto?.numero || '',
          complemento: clienteCompleto?.complemento || '',
          bairro: clienteCompleto?.bairro || '',
          cep: clienteCompleto?.cep || '',
          cidade: clienteCompleto?.municipio || '',
          uf: clienteCompleto?.uf || '',
          // Contato
          fone: clienteCompleto?.telefonePrincipal || '',
          email: clienteCompleto?.emailPrincipal || '',
        };
        
        console.log('👤 Tentando criar cliente no Tiny ERP:', clienteData);
        const resultadoCliente = await api.tinyCriarCliente(empresaId, clienteData);
        console.log('✅ Cliente criado/atualizado no Tiny ERP:', resultadoCliente);
        
        clienteCadastrado = true;
        toast.success('✅ Cliente cadastrado no Tiny ERP!', { duration: 2000 });
      } catch (errorCliente) {
        // Se o cliente já existe, ignorar o erro
        const msgErro = errorCliente instanceof Error ? errorCliente.message : String(errorCliente);
        
        console.log('⚠️ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️ ERRO AO CADASTRAR CLIENTE - ANÁLISE DETALHADA');
        console.log('⚠️ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️ Tipo do erro:', typeof errorCliente);
        console.log('⚠️ É uma instância de Error?', errorCliente instanceof Error);
        console.log('⚠️ Erro completo:', errorCliente);
        console.log('⚠️ Mensagem extraída:', msgErro);
        console.log('⚠️ Erro em JSON:', JSON.stringify(errorCliente, null, 2));
        console.log('⚠️ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (msgErro.includes('já cadastrado') || msgErro.includes('duplicado') || msgErro.includes('já existe')) {
          console.log('ℹ️ Cliente já existe no Tiny ERP');
          clienteCadastrado = true;
        } else if (msgErro.includes('HTTP Error: 404') || msgErro.includes('File not found')) {
          console.error('❌ Erro na API do Tiny ERP - URL inválida ou m��todo incorreto');
          console.error('❌ Contate o suporte técnico');
          throw new Error('Erro crítico na API do Tiny ERP. Contate o suporte.');
        } else {
          console.error('❌ FALHA CRÍTICA ao cadastrar cliente:', msgErro);
          console.error('❌ O pedido NÃO será enviado até que o cliente seja cadastrado!');
          console.error('❌ BLOQUEANDO ENVIO DO PEDIDO');
          
          toast.error(
            `❌ Falha ao cadastrar cliente automaticamente!\n\n` +
            `🔧 CADASTRE MANUALMENTE:\n` +
            `1. Acesse https://tiny.com.br/\n` +
            `2. Cadastros → Clientes → Novo\n` +
            `3. CNPJ: ${venda.cnpjCliente}\n` +
            `4. Nome: ${venda.nomeCliente}\n` +
            `5. Salve e tente novamente\n\n` +
            `Erro: ${msgErro}`,
            { duration: 15000 }
          );
          
          throw new Error(`Cliente não cadastrado no Tiny ERP: ${msgErro}`);
        }
      }

      // Aguardar 3 segundos para o Tiny ERP processar o cliente antes de enviar pedido
      console.log('⏳ Aguardando 3 segundos para o Tiny ERP processar o cadastro...');
      toast.info('⏳ Aguardando processamento do Tiny ERP...', { duration: 3000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 4. Tentar criar produtos automaticamente no Tiny ERP
      console.log('📦 Verificando se os produtos precisam ser criados no Tiny ERP...');
      
      const produtosFalhados: string[] = [];
      
      for (const item of venda.itens) {
        try {
          const produtoData = {
            codigo: item.codigoSku,
            nome: item.descricaoProduto,
            unidade: item.unidade || 'UN',
            preco: item.valorUnitario.toFixed(2),
          };
          
          console.log('📦 Tentando criar produto no Tiny ERP:', produtoData);
          const resultadoProduto = await api.tinyCriarProduto(empresaId, produtoData);
          console.log('✅ Produto criado/atualizado no Tiny ERP:', resultadoProduto);
          
          // Aguardar 300ms entre cada produto
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (errorProduto) {
          // Se o produto já existe, ignorar o erro
          const msgErro = errorProduto instanceof Error ? errorProduto.message : String(errorProduto);
          
          if (msgErro.includes('já cadastrado') || msgErro.includes('duplicado') || msgErro.includes('já existe')) {
            console.log(`ℹ️ Produto ${item.codigoSku} já existe no Tiny ERP`);
          } else if (msgErro.includes('HTTP Error: 404') || msgErro.includes('File not found')) {
            console.error(`❌ Erro na API do Tiny ERP ao criar produto ${item.codigoSku} - URL inválida ou método incorreto`);
            console.error('❌ Contate o suporte técnico');
            produtosFalhados.push(`${item.codigoSku}: Erro na API`);
          } else {
            console.error(`❌ FALHA ao cadastrar produto ${item.codigoSku}:`, msgErro);
            produtosFalhados.push(`${item.codigoSku}: ${msgErro}`);
          }
        }
      }
      
      // Se houve falhas no cadastro de produtos, avisar e bloquear
      if (produtosFalhados.length > 0) {
        console.error('❌ PRODUTOS NÃO CADASTRADOS:', produtosFalhados);
        console.error('❌ O pedido NÃO será enviado até que todos os produtos sejam cadastrados!');
        
        toast.error(
          `❌ Falha ao cadastrar ${produtosFalhados.length} produto(s)!\n\n` +
          `🔧 CADASTRE MANUALMENTE:\n` +
          `1. Acesse https://tiny.com.br/\n` +
          `2. Cadastros → Produtos → Novo\n` +
          `3. Cadastre: ${produtosFalhados.map(p => p.split(':')[0]).join(', ')}\n` +
          `4. Salve e tente novamente\n\n` +
          `📚 Guia: /GUIA_RAPIDO_CADASTRO_TINY.md`,
          { duration: 15000 }
        );
        
        throw new Error(`${produtosFalhados.length} produto(s) não cadastrado(s): ${produtosFalhados.join('; ')}`);
      }

      // 5. Aguardar 3 segundos para o Tiny ERP processar todos os produtos antes de enviar pedido
      console.log('⏳ Aguardando 3 segundos para o Tiny ERP processar os produtos...');
      toast.info('⏳ Produtos cadastrados! Aguardando processamento...', { duration: 3000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 6. Enviar via backend
      console.log('');
      console.log('🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🤖 CADASTRO AUTOMÁTICO CONCLUÍDO');
      console.log('🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📤 RESUMO DO PEDIDO QUE SERÁ ENVIADO AO TINY ERP');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔑 EmpresaId:', empresaId);
      console.log('👤 Cliente:', venda.nomeCliente);
      console.log('📋 CPF/CNPJ:', venda.cnpjCliente);
      console.log('📦 Itens:', venda.itens.length);
      console.log('💰 Valor Total:', venda.valorPedido.toFixed(2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🌐 Enviando pedido para backend Supabase...');
      console.log('🌐 Parâmetros da chamada:', {
        empresaId,
        pedidoXMLLength: pedidoXML.length,
        pedidoXMLPreview: pedidoXML.substring(0, 200)
      });
      
      if (!empresaId) {
        throw new Error('[CRÍTICO] empresaId está vazio no momento da chamada da API!');
      }
      
      const data = await api.tinycriarPedido(empresaId, pedidoXML, venda.id);
      
      console.log('📥 Response data:', data);
      console.log('📥 Response keys:', Object.keys(data));

      // 7. Verificar se houve erro primeiro
      // A resposta de sucesso agora vem como { success: true, data: { ... } }
      if (data.error || data.erros || !data.success) {
        const errorMsg = data.error || (data.erros && data.erros[0]?.erro) || 'Erro desconhecido do Tiny ERP';
        console.error('❌ Tiny ERP retornou erro:', {
          error: data.error,
          erros: data.erros,
          codigo_erro: data.codigo_erro,
          status_processamento: data.status_processamento
        });
        
        // ⚠️ TRATAMENTO ESPECIAL: Erro de duplicidade
        // Se o pedido já foi cadastrado anteriormente, considerar sucesso
        if (errorMsg.includes('duplicidade') || errorMsg.includes('já cadastrado')) {
          console.warn('⚠️ Pedido já existe no Tiny ERP - considerando como sucesso');
          console.warn('⚠️ Mensagem:', errorMsg);
          
          toast.warning(
            `⚠️ Pedido já cadastrado no Tiny ERP!\n\n` +
            `Este pedido já foi enviado anteriormente.\n` +
            `Verifique no painel do Tiny ERP.`,
            { duration: 5000 }
          );
          
          // Retornar um ID genérico - o pedido já existe no Tiny
          return `duplicate-${venda.id || Date.now()}`;
        }
        
        // Detectar erro de validação do Tiny ERP
        if (errorMsg.includes('JSON mal formado') || errorMsg.includes('JSON inválido') || 
            errorMsg.includes('Erro na validação') || errorMsg.includes('não encontrado')) {
          console.error('');
          console.error('🚨 ERRO DE VALIDAÇÃO DO TINY ERP');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━���━');
          console.error('⚠️  IMPORTANTE: A mensagem "JSON mal formado" do Tiny ERP é enganadora!');
          console.error('    Ela geralmente significa que algum dado não está cadastrado ou é inválido.');
          console.error('');
          console.error('📋 DADOS DO PEDIDO:');
          console.error('   Cliente:', venda.nomeCliente);
          console.error('   CPF/CNPJ:', venda.cnpjCliente);
          console.error('   Itens:', venda.itens.length);
          console.error('   Valor:', venda.valorPedido);
          console.error('');
          console.error('🔍 CAUSAS MAIS COMUNS (verifique nesta ordem):');
          console.error('');
          console.error('   1️⃣  CLIENTE NÃO CADASTRADO NO TINY ERP');
          console.error('      → Acesse o Tiny ERP e cadastre o cliente com este CPF/CNPJ:');
          console.error('      → ' + venda.cnpjCliente);
          console.error('      → Nome: ' + venda.nomeCliente);
          console.error('');
          console.error('   2️⃣  PRODUTO(S) NÃO CADASTRADO(S) NO TINY ERP');
          console.error('      → Verifique se TODOS os produtos abaixo existem no Tiny ERP:');
          venda.itens.forEach((item, idx) => {
            console.error(`      → Item ${idx + 1}: SKU "${item.codigoSku}" - ${item.descricaoProduto}`);
          });
          console.error('');
          console.error('   3️⃣  CPF/CNPJ COM FORMATO INVÁLIDO');
          console.error('      → CPF/CNPJ enviado:', venda.cnpjCliente.replace(/\\D/g, ''));
          console.error('      → Tipo detectado:', venda.cnpjCliente.replace(/\\D/g, '').length === 14 ? 'Pessoa Jurídica (CNPJ)' : 'Pessoa Física (CPF)');
          console.error('');
          console.error('   4️⃣  NATUREZA DE OPERAÇÃO NÃO CONFIGURADA');
          console.error('      → Natureza enviada:', venda.nomeNaturezaOperacao || 'Venda');
          console.error('      → Verifique se esta natureza existe no Tiny ERP');
          console.error('');
          console.error('💡 SOLUÇÃO PASSO A PASSO:');
          console.error('   ✓ 1. Acesse https://tiny.com.br/ e faça login');
          console.error('   ✓ 2. Cadastre o cliente (se não existir)');
          console.error('   ✓ 3. Cadastre os produtos (se não existirem)');
          console.error('   ✓ 4. Tente enviar o pedido novamente');
          console.error('');
          console.error('📄 XML COMPLETO (para análise técnica):');
          console.error(pedidoXML);
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('');
          console.error(' DOCUMENTAÇÃO COMPLETA: /SOLUCAO_ERRO_JSON_MAL_FORMADO.md');
          console.error('📚 GUIA RÁPIDO (5 MIN): /GUIA_RAPIDO_CADASTRO_TINY.md');
          console.error('');
          
          // Toast mais acionável com instruções claras
          toast.error(
            `⚠️ Cliente ou produto NÃO cadastrado no Tiny ERP!\n\n` +
            `✅ SOLUÇÃO (5 min):\n` +
            `1. Acesse https://tiny.com.br/\n` +
            `2. Cadastros → Clientes → Novo\n` +
            `3. Cadastre: ${venda.nomeCliente}\n` +
            `4. CNPJ: ${venda.cnpjCliente}\n` +
            `5. Cadastros → Produtos → Novo\n` +
            `6. Cadastre SKU: ${venda.itens.map(i => i.codigoSku).join(', ')}\n\n` +
            `📚 Guia: /GUIA_RAPIDO_CADASTRO_TINY.md`,
            { duration: 25000 }
          );
        }
        
        throw new Error(errorMsg);
      }

      // 8. Verificar se há registros de sucesso
      // A resposta de sucesso agora vem como { success: true, data: { registros: [...] } }
      const responseData = data.success ? data.data : data;
      const registros = responseData.registros || [];
      
      console.log('📥 Registros encontrados:', registros.length);
      console.log('📥 Primeiro registro:', registros[0]);
      
      if (!registros || registros.length === 0) {
        console.error('❌ Resposta sem registros:', data);
        throw new Error('Resposta inválida do Tiny ERP - sem registros de sucesso');
      }

      // 9. Extrair ID do pedido
      const erpPedidoId = registros[0].registro.id;
      const erpNumero = registros[0].registro.numero_pedido || erpPedidoId;
      
      console.log(`✅ Pedido enviado com sucesso!`);
      console.log(`   ID Tiny: ${erpPedidoId}`);
      console.log(`   Número Tiny: ${erpNumero}`);
      
      toast.success(`Pedido enviado para o Tiny ERP com sucesso! (ID: ${erpPedidoId})`);

      return erpPedidoId;

    } catch (error) {
      console.error('❌ Erro ao enviar venda para Tiny:', error);
      
      // Detectar erro de CPF/CNPJ inválido (vindo do backend ou frontend)
      // Apenas erros críticos de formato, não de padrões específicos
      if (error instanceof Error && (
        error.message.includes('deve ter 11 ou 14 dígitos')
      )) {
        const tipoDoc = error.message.includes('CNPJ') ? 'CNPJ' : 'CPF';
        console.error(`❌ ${tipoDoc} inválido para o cliente "${venda.nomeCliente}". Edite o cadastro em Cadastros → Clientes.`);
        
        toast.error(
          `${tipoDoc} inválido para o cliente "${venda.nomeCliente}". Corrija o cadastro em Cadastros → Clientes.`,
          { duration: 8000 }
        );
        
        throw error;
      }
      
      // Detectar erro de configuração do Tiny ERP
      if (error instanceof Error && error.message.includes('Tiny ERP not configured')) {
        console.error('');
        console.error('🚨 TINY ERP NÃO CONFIGURADO!');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('A empresa selecionada não possui configuração do Tiny ERP.');
        console.error('');
        console.error('💡 SOLUÇÃO:');
        console.error('   1. Vá em Cadastros → Empresas');
        console.error('   2. Edite a empresa "' + venda.nomeEmpresaFaturamento + '"');
        console.error('   3. Configure o Token do Tiny ERP na aba "Integrações ERP"');
        console.error('   4. Salve as alterações');
        console.error('   5. Tente enviar o pedido novamente');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('');
        
        toast.error(`Tiny ERP não configurado para "${venda.nomeEmpresaFaturamento}". Configure o Token em Cadastros → Empresas.`, {
          duration: 8000,
        });
        
        throw error;
      }
      
      // Detectar erro de CORS
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('');
        console.error('🚨 ERRO DE CORS DETECTADO!');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('A API do Tiny ERP bloqueia chamadas diretas do navegador.');
        console.error('');
        console.error('💡 SOLUÇÃO IMEDIATA:');
        console.error('   1. Clique no indicador "Tiny ERP: REAL" (canto inferior direito)');
        console.error('   2. Selecione "Ativar Modo SIMULAÇÃO"');
        console.error('   3. Tente criar o pedido novamente');
        console.error('');
        console.error('🔧 SOLUÇÃO PARA PRODUÇÃO:');
        console.error('   Configure um backend/proxy seguindo a documentação');
        console.error('   Arquivo: /SOLUCAO_CORS_TINY_ERP.md');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('');
        
        toast.error('Modo REAL requer backend! Clique no indicador "Tiny ERP: REAL" (canto inferior direito) e alterne para modo SIMULAÇÃO.', {
          duration: 10000,
        });
        
        // 🚨 IMPORTANTE: Re-throw do erro original para que erpAutoSendService possa detectar
        throw error;
      }
      
      if (error instanceof Error) {
        toast.error(`Erro ao enviar pedido: ${error.message}`);
      } else {
        toast.error('Erro desconhecido ao enviar pedido para o Tiny ERP');
      }
      
      throw error;
    }
  }

  /**
   * Construir XML do pedido para o Tiny ERP
   */
  private construirPedidoXML(venda: Venda, clienteCompleto?: any): string {
    // ⚠️⚠️⚠️ LOG DE VERSÃO - SE VOCÊ NÃO VER ISTO, FAÇA HARD REFRESH! ⚠️⚠️⚠️
    console.log('');
    console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
    console.log('🔥 VERSÃO XML v3.0 - COM CAMPO <numero> ATIVO! 🔥');
    console.log('🔥 Se o XML não tiver <numero>, faça HARD REFRESH! 🔥');
    console.log('🔥 Windows/Linux: Ctrl+Shift+R | Mac: Cmd+Shift+R 🔥');
    console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
    console.log('');
    
    // Formatar data para DD/MM/YYYY
    const dataFormatada = new Date(venda.dataPedido).toLocaleDateString('pt-BR');
    
    // Validar campos obrigatórios
    if (!venda.nomeCliente || venda.nomeCliente.trim() === '') {
      throw new Error('Nome do cliente é obrigatório');
    }
    
    if (!venda.cnpjCliente || venda.cnpjCliente.trim() === '') {
      throw new Error('CPF/CNPJ do cliente é obrigatório');
    }
    
    if (!venda.itens || venda.itens.length === 0) {
      throw new Error('O pedido deve ter pelo menos 1 item');
    }
    
    // Construir XML dos itens
    const itensXML = venda.itens.map((item, index) => {
      // Garantir que unidade tenha valor padrão (obrigatório pela API do Tiny)
      const unidade = item.unidade || (item as any).unidade || 'UN';
      
      // Validar campos obrigatórios do item
      if (!item.codigoSku || item.codigoSku.trim() === '') {
        throw new Error(`Item ${index + 1}: Código SKU é obrigatório`);
      }
      
      if (!item.descricaoProduto || item.descricaoProduto.trim() === '') {
        throw new Error(`Item ${index + 1}: Descrição do produto é obrigatória`);
      }
      
      if (!item.quantidade || item.quantidade <= 0) {
        throw new Error(`Item ${index + 1}: Quantidade deve ser maior que zero`);
      }
      
      if (!item.valorUnitario || item.valorUnitario <= 0) {
        throw new Error(`Item ${index + 1}: Valor unitário deve ser maior que zero`);
      }
      
      return `
    <item>
      <codigo>${this.escaparXML(item.codigoSku)}</codigo>
      <descricao>${this.escaparXML(item.descricaoProduto)}</descricao>
      <unidade>${this.escaparXML(unidade)}</unidade>
      <quantidade>${item.quantidade}</quantidade>
      <valor_unitario>${item.valorUnitario.toFixed(2)}</valor_unitario>
    </item>`;
    }).join('');

    // Observações (incluir OC se configurado)
    const obs = venda.observacoesNotaFiscal || '';
    const obsInternas = venda.observacoesInternas || '';
    
    // Número da OC do cliente (se houver)
    const numeroOC = venda.ordemCompraCliente || '';
    
    // Determinar tipo de pessoa (J=Jurídica, F=Física) baseado no tamanho do CPF/CNPJ
    const cpfCnpjLimpo = venda.cnpjCliente.replace(/\D/g, '');
    const tipoPessoa = cpfCnpjLimpo.length === 14 ? 'J' : 'F';
    
    console.log('🏗️ [construirPedidoXML v2.0.0] CPF/CNPJ limpo:', cpfCnpjLimpo);
    console.log('🏗️ [construirPedidoXML v2.0.0] Tamanho:', cpfCnpjLimpo.length, '| Tipo pessoa:', tipoPessoa);
    
    // Validar CPF/CNPJ - APENAS validar tamanho (11 ou 14 dígitos)
    if (cpfCnpjLimpo.length !== 11 && cpfCnpjLimpo.length !== 14) {
      throw new Error(`CPF/CNPJ inválido: "${venda.cnpjCliente}" (deve ter 11 ou 14 dígitos)`);
    }
    
    console.log('✅ [construirPedidoXML v2.0.0] Validação de tamanho OK!');
    console.log('✅ [construirPedidoXML v2.0.0] CNPJs com zeros iniciais são VÁLIDOS (ex: Banco do Brasil)');
    console.log('✅ [construirPedidoXML v2.0.0] Validação de dígitos verificadores será feita pela API do Tiny ERP');
    
    // Código do cliente: Usar um identificador único
    // IMPORTANTE: O Tiny ERP usa este código para identificar o cliente
    // Se clienteId já tem o prefixo, não duplicar
    let codigoCliente = venda.clienteId || `cliente-${cpfCnpjLimpo}`;
    
    // Remover prefixo duplicado se existir
    if (codigoCliente.startsWith('cliente-cliente-')) {
      codigoCliente = codigoCliente.replace('cliente-cliente-', 'cliente-');
      console.log('⚠️ Prefixo duplicado detectado e corrigido:', codigoCliente);
    }

    // Log para debug
    console.log('🔑 Código do cliente usado no XML:', codigoCliente);
    console.log('🔑 venda.clienteId original:', venda.clienteId);
    console.log('🔑 CPF/CNPJ limpo:', cpfCnpjLimpo);
    
    // Gerar número único para o pedido (prevenir duplicidade)
    // SEMPRE adicionar timestamp único para prevenir duplicidade
    const baseNumero = venda.numero || venda.id || 'PV';
    const timestampUnico = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    const numeroPedidoUnico = `${baseNumero}-${timestampUnico}-${randomSuffix}`;
    
    console.log('🔢 Número do pedido ÚNICO gerado:', numeroPedidoUnico);
    console.log('🔢 Base:', baseNumero, '| Timestamp:', timestampUnico, '| Random:', randomSuffix);
    
    // Log dados do cliente completo (se disponível)
    if (clienteCompleto) {
      console.log('📍 Dados de endereço do cliente:', {
        logradouro: clienteCompleto.logradouro,
        numero: clienteCompleto.numero,
        bairro: clienteCompleto.bairro,
        cep: clienteCompleto.cep,
        cidade: clienteCompleto.municipio,
        uf: clienteCompleto.uf,
        enderecoEntregaDiferente: clienteCompleto.enderecoEntregaDiferente,
        enderecoEntrega: clienteCompleto.enderecoEntrega
      });
    }
    
    // Construir XML completo
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<pedido>
  <numero>${this.escaparXML(numeroPedidoUnico)}</numero>
  <data_pedido>${dataFormatada}</data_pedido>
  <cliente>
    <codigo>${this.escaparXML(codigoCliente)}</codigo>
    <nome>${this.escaparXML(venda.nomeCliente)}</nome>
    <tipo_pessoa>${tipoPessoa}</tipo_pessoa>
    <cpf_cnpj>${cpfCnpjLimpo}</cpf_cnpj>${venda.inscricaoEstadualCliente ? `
    <ie>${this.escaparXML(venda.inscricaoEstadualCliente)}</ie>` : ''}${clienteCompleto?.logradouro ? `
    <endereco>${this.escaparXML(clienteCompleto.logradouro)}</endereco>` : ''}${clienteCompleto?.numero ? `
    <numero>${this.escaparXML(clienteCompleto.numero)}</numero>` : ''}${clienteCompleto?.complemento ? `
    <complemento>${this.escaparXML(clienteCompleto.complemento)}</complemento>` : ''}${clienteCompleto?.bairro ? `
    <bairro>${this.escaparXML(clienteCompleto.bairro)}</bairro>` : ''}${clienteCompleto?.cep ? `
    <cep>${this.escaparXML(clienteCompleto.cep.replace(/\D/g, ''))}</cep>` : ''}${clienteCompleto?.municipio ? `
    <cidade>${this.escaparXML(clienteCompleto.municipio)}</cidade>` : ''}${clienteCompleto?.uf ? `
    <uf>${this.escaparXML(clienteCompleto.uf)}</uf>` : ''}
  </cliente>${clienteCompleto?.enderecoEntregaDiferente && clienteCompleto?.enderecoEntrega ? `
  <endereco_entrega>
    <tipo_pessoa>${tipoPessoa}</tipo_pessoa>
    <cnpj>${cpfCnpjLimpo}</cnpj>
    <endereco>${this.escaparXML(clienteCompleto.enderecoEntrega.logradouro)}</endereco>
    <numero>${this.escaparXML(clienteCompleto.enderecoEntrega.numero)}</numero>${clienteCompleto.enderecoEntrega.complemento ? `
    <complemento>${this.escaparXML(clienteCompleto.enderecoEntrega.complemento)}</complemento>` : ''}
    <bairro>${this.escaparXML(clienteCompleto.enderecoEntrega.bairro)}</bairro>
    <cep>${this.escaparXML(clienteCompleto.enderecoEntrega.cep.replace(/\D/g, ''))}</cep>
    <cidade>${this.escaparXML(clienteCompleto.enderecoEntrega.municipio)}</cidade>
    <uf>${this.escaparXML(clienteCompleto.enderecoEntrega.uf)}</uf>
  </endereco_entrega>` : ''}
  <itens>${itensXML}
  </itens>${venda.valorDescontoExtra && venda.valorDescontoExtra > 0 ? `
  <valor_desconto>${venda.valorDescontoExtra.toFixed(2)}</valor_desconto>` : ''}
  <parcelas>
    <parcela>
      <dias>0</dias>
      <valor>${venda.valorPedido.toFixed(2)}</valor>
    </parcela>
  </parcelas>${numeroOC ? `
  <numero_ordem_compra>${this.escaparXML(numeroOC)}</numero_ordem_compra>` : ''}${venda.nomeNaturezaOperacao ? `
  <natureza_operacao>${this.escaparXML(venda.nomeNaturezaOperacao)}</natureza_operacao>` : ''}${obs ? `
  <obs>${this.escaparXML(obs)}</obs>` : ''}${obsInternas ? `
  <obs_internas>${this.escaparXML(obsInternas)}</obs_internas>` : ''}
</pedido>`;

    // Log do XML gerado para debug
    console.log('[TINY XML] XML completo gerado:', xml);
    console.log('[TINY XML] Validações:', {
      codigoCliente: codigoCliente,
      cliente: venda.nomeCliente,
      cpfCnpj: cpfCnpjLimpo,
      tipoPessoa: tipoPessoa === 'J' ? 'Pessoa Jurídica (CNPJ)' : 'Pessoa Física (CPF)',
      totalItens: venda.itens.length,
      valorPedido: venda.valorPedido,
      valorDescontoExtra: venda.valorDescontoExtra, // LOG DO DESCONTO
      percentualDescontoExtra: venda.percentualDescontoExtra, // LOG DO PERCENTUAL
      dataFormatada: dataFormatada,
      naturezaOperacao: venda.nomeNaturezaOperacao || 'Venda',
      temOrdemCompra: !!numeroOC,
      temObservacoes: !!obs
    });

    return xml;
  }

  /**
   * Escapar caracteres especiais para XML
   */
  private escaparXML(texto: string): string {
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Obter estatísticas de sincronização
   */
  obterEstatisticas() {
    const total = this.historicoSincronizacao.length;
    const sucessos = this.historicoSincronizacao.filter(h => h.sucesso).length;
    const erros = total - sucessos;
    const taxaSucesso = total > 0 ? (sucessos / total) * 100 : 0;

    return {
      total,
      sucessos,
      erros,
      taxaSucesso: taxaSucesso.toFixed(2),
      ultimaSincronizacao: this.historicoSincronizacao[0]?.dataHora,
    };
  }

  /**
   * Sincronizar manualmente uma venda pelo ID
   * Útil para botão de sincronização manual na UI
   */
  async sincronizarVendaManual(venda: Venda, onUpdate?: (vendaAtualizada: Venda) => void): Promise<boolean> {
    try {
      const vendaAtualizada = await this.sincronizarVenda(venda, venda.empresaFaturamentoId);
      
      if (vendaAtualizada && onUpdate) {
        onUpdate(vendaAtualizada);
      }
      
      return vendaAtualizada !== null;
    } catch (error) {
      console.error('Erro na sincronização manual:', error);
      return false;
    }
  }
}

// Singleton - v2.0.0 (2025-11-30) - Validação CNPJ corrigida
export const tinyERPSyncService = new TinyERPSyncService();

// Verificação de versão para debug
console.log('✅ tinyERPSync.ts v2.0.0 carregado - Validação de CNPJ com zeros corrigida');
console.log('✅ CNPJs válidos como "00.000.000/0001-91" (Banco do Brasil) agora são aceitos');

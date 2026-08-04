// Serviço para gerenciar envio automático de pedidos ao ERP
import { Company } from '../types/company';
import { Venda } from '../types/venda';
import { tinyERPSyncService } from './tinyERPSync';
import { api } from './api';
import { toast } from 'sonner';

export interface ConfiguracaoEnvioAutomatico {
  habilitado: boolean;
  tentativasMaximas: number;
  intervaloRetentativa: number;
}

class ERPAutoSendService {
  /**
   * Obter configuração de envio automático de uma empresa
   */
  obterConfiguracao(empresa: Company, erpTipo: string = 'tiny'): ConfiguracaoEnvioAutomatico | null {
    console.log(`🔎 Buscando configuração ERP para empresa "${empresa.razaoSocial}":`, {
      erpTipo,
      integracoesERP: empresa.integracoesERP,
      totalIntegracoes: empresa.integracoesERP?.length || 0
    });
    
    // Verificação defensiva: empresa pode não ter integracoesERP definido
    if (!empresa.integracoesERP || !Array.isArray(empresa.integracoesERP)) {
      console.log(`⚠️ Empresa não possui integrações ERP configuradas`);
      return null;
    }
    
    const erpConfig = empresa.integracoesERP.find(
      erp => erp.erpNome.toLowerCase().includes(erpTipo)
    );

    console.log(`🔧 Configuração ERP encontrada:`, {
      encontrada: !!erpConfig,
      ativo: erpConfig?.ativo,
      envioAutomatico: erpConfig?.envioAutomatico,
      erpConfig
    });

    if (!erpConfig || !erpConfig.ativo) {
      console.log(`⚠️ ERP não configurado ou inativo para esta empresa`);
      return null;
    }

    const config = erpConfig.envioAutomatico || {
      habilitado: false,
      tentativasMaximas: 3,
      intervaloRetentativa: 5,
    };
    
    console.log(`⚙️ Configuração final de envio automático:`, config);
    
    return config;
  }

  /**
   * Verificar se uma empresa tem envio automático habilitado
   */
  estaHabilitado(empresa: Company, erpTipo: string = 'tiny'): boolean {
    const config = this.obterConfiguracao(empresa, erpTipo);
    const habilitado = config?.habilitado ?? false;
    
    console.log(`🔍 Verificando envio automático para empresa "${empresa.razaoSocial}":`, {
      erpTipo,
      configEncontrada: !!config,
      habilitado,
      config
    });
    
    return habilitado;
  }

  /**
   * Obter token de API da empresa para o ERP
   */
  obterTokenAPI(empresa: Company, erpTipo: string = 'tiny'): string | null {
    // Verificação defensiva: empresa pode não ter integracoesERP definido
    if (!empresa.integracoesERP || !Array.isArray(empresa.integracoesERP)) {
      return null;
    }
    
    const erpConfig = empresa.integracoesERP.find(
      erp => erp.erpNome.toLowerCase().includes(erpTipo) && erp.ativo
    );

    return erpConfig?.apiToken || null;
  }

  /**
   * Enviar venda ao ERP com retry automático
   */
  async enviarVendaComRetry(
    venda: Venda,
    empresa: Company,
    erpTipo: string = 'tiny'
  ): Promise<{ sucesso: boolean; erpPedidoId?: string; erro?: string }> {
    // ✅ PROTEÇÃO: NÃO enviar pedidos com status "Rascunho"
    if (venda.status === 'Rascunho') {
      console.log('🚫 BLOQUEIO: Pedidos com status "Rascunho" não são enviados ao ERP');
      return {
        sucesso: false,
        erro: 'Pedidos com status "Rascunho" não podem ser enviados ao ERP',
      };
    }

    // Verificar modo da API
    let modoAPI = localStorage.getItem('tinyERPMode') || (window as any).__TINY_API_MODE__ || 'MOCK';
    
    console.log('🔧 Modo API:', modoAPI, '| ERP:', erpTipo);
    
    const config = this.obterConfiguracao(empresa, erpTipo);
    const token = this.obterTokenAPI(empresa, erpTipo);

    if (!config || !config.habilitado) {
      return {
        sucesso: false,
        erro: 'Envio automático não está habilitado para esta empresa',
      };
    }

    if (!token) {
      return {
        sucesso: false,
        erro: 'Token de API não configurado para esta empresa',
      };
    }

    // Flag para controle de cancelamento
    let cancelarRetries = false;
    
    // Tentar enviar com retry
    for (let tentativa = 1; tentativa <= config.tentativasMaximas; tentativa++) {
      // Verificar se foi cancelado
      if (cancelarRetries) {
        console.log(`⏭️ Tentativa ${tentativa} pulada (retries cancelados por erro de CORS)`);
        break;
      }
      
      try {
        console.log(`Tentativa ${tentativa}/${config.tentativasMaximas} de enviar pedido ${venda.numero} ao ERP`);

        const erpPedidoId = await tinyERPSyncService.enviarVendaParaTiny(venda, token);

        if (erpPedidoId) {
          console.log(`✅ Pedido ${venda.numero} enviado com sucesso ao ERP. ID: ${erpPedidoId}`);
          return {
            sucesso: true,
            erpPedidoId,
          };
        }

        throw new Error('ERP não retornou ID do pedido');
      } catch (error) {
        // 🔍 DEBUG DETALHADO DO ERRO
        console.group('🔍 ANÁLISE DETALHADA DO ERRO');
        console.log('Erro capturado:', error);
        console.log('Tipo do erro:', typeof error);
        console.log('Constructor name:', error?.constructor?.name);
        console.log('É Error?', error instanceof Error);
        console.log('É TypeError?', error instanceof TypeError);
        console.log('Mensagem:', error instanceof Error ? error.message : 'N/A');
        console.log('Stack:', error instanceof Error ? error.stack : 'N/A');
        console.groupEnd();
        
        const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`❌ Tentativa ${tentativa} falhou:`, mensagemErro);

        // 🚨 IMPORTANTE: Se for erro de CORS (Failed to fetch), NÃO tentar retry
        // "Failed to fetch" sempre indica CORS quando fazendo requisição cross-origin
        const isCorsError = error instanceof TypeError && error.message === 'Failed to fetch';
        
        console.log('🎯 Resultado da detecção CORS:', {
          errorType: error?.constructor?.name,
          errorMessage: mensagemErro,
          isCorsError,
          modoAPI,
          acao: isCorsError ? '🛑 CANCELAR RETRIES' : '🔄 Continuar tentando'
        });
        
        if (isCorsError) {
          console.error('');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('🚨 ERRO DE CORS DETECTADO - Cancelando todos os retries');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('');
          console.error('💡 SOLUÇÃO: Alterne para modo MOCK ou configure um backend');
          console.error('   1. Clique no indicador "Tiny ERP: REAL" no canto inferior direito');
          console.error('   2. Selecione "Ativar Modo SIMULAÇÃO"');
          console.error('   3. Ou configure um backend conforme documentação');
          console.error('');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🛑 RETORNANDO COM ERRO DE CORS - Não haverá mais tentativas');
          
          // Marcar flag para cancelar retries
          cancelarRetries = true;
          
          // Retornar imediatamente
          return {
            sucesso: false,
            erro: 'Erro de CORS: A API do Tiny ERP não permite chamadas diretas do navegador. Use modo MOCK ou configure um backend.',
          };
        }

        // Se não é a última tentativa, aguardar antes de retentar
        if (tentativa < config.tentativasMaximas) {
          const tempoEspera = config.intervaloRetentativa * 60 * 1000; // Converter minutos para ms
          console.log(`Aguardando ${config.intervaloRetentativa} minuto(s) antes de retentar...`);
          await new Promise(resolve => setTimeout(resolve, tempoEspera));
        } else {
          // Última tentativa falhou
          return {
            sucesso: false,
            erro: mensagemErro,
          };
        }
      }
    }

    return {
      sucesso: false,
      erro: 'Todas as tentativas de envio falharam',
    };
  }

  /**
   * Enviar venda ao ERP (sem retry, para uso manual)
   */
  async enviarVenda(
    venda: Venda,
    empresa: Company,
    erpTipo: string = 'tiny'
  ): Promise<{ sucesso: boolean; erpPedidoId?: string; erro?: string }> {
    // ✅ PROTEÇÃO: NÃO enviar pedidos com status "Rascunho"
    if (venda.status === 'Rascunho') {
      console.log('🚫 BLOQUEIO: Pedidos com status "Rascunho" não são enviados ao ERP');
      return {
        sucesso: false,
        erro: 'Pedidos com status "Rascunho" não podem ser enviados ao ERP',
      };
    }

    const token = this.obterTokenAPI(empresa, erpTipo);

    if (!token) {
      return {
        sucesso: false,
        erro: 'Token de API não configurado para esta empresa',
      };
    }

    try {
      const erpPedidoId = await tinyERPSyncService.enviarVendaParaTiny(venda, token);

      if (erpPedidoId) {
        return {
          sucesso: true,
          erpPedidoId,
        };
      }

      throw new Error('ERP não retornou ID do pedido');
    } catch (error) {
      const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        sucesso: false,
        erro: mensagemErro,
      };
    }
  }

  /**
   * Verificar se um pedido pode ser editado
   * Pedidos já enviados ao ERP não podem ser editados
   */
  podeEditar(venda: Venda): boolean {
    return !venda.integracaoERP?.erpPedidoId;
  }

  /**
   * Obter mensagem de bloqueio de edição
   */
  obterMensagemBloqueio(venda: Venda): string {
    if (!venda.integracaoERP?.erpPedidoId) {
      return '';
    }

    return `Este pedido já foi enviado ao ERP (ID: ${venda.integracaoERP.erpPedidoId}) e não pode mais ser editado.`;
  }

  /**
   * Analisar venda no Tiny ERP - buscar pedido e nota fiscal
   */
  async analisarVenda(
    venda: Venda,
    empresa: Company,
    erpTipo: string = 'tiny'
  ): Promise<{ sucesso: boolean; pedido?: any; notaFiscal?: any; itensFaturados?: any[]; diagnostico?: any; erro?: string }> {
    const token = this.obterTokenAPI(empresa, erpTipo);

    if (!token) {
      return {
        sucesso: false,
        erro: 'Token de API não configurado para esta empresa',
      };
    }

    if (!venda.integracaoERP?.erpPedidoId) {
      return {
        sucesso: false,
        erro: 'Venda não possui ID de pedido no ERP',
      };
    }

    try {
      console.log('[ANÁLISE TINY] Buscando pedido:', venda.integracaoERP.erpPedidoId);
      
      // Buscar pedido no Tiny usando API
      const pedidoData = await api.tinyObterPedido(
        venda.empresaFaturamentoId!,
        venda.integracaoERP.erpPedidoId
      );
      
      console.log('[ANÁLISE TINY] Pedido obtido:', pedidoData);

      const pedido = pedidoData.pedido || pedidoData.pedidos?.[0];
      
      if (!pedido) {
        return {
          sucesso: false,
          erro: 'Pedido não encontrado na resposta do Tiny ERP',
        };
      }

      // Buscar ID da nota fiscal de múltiplas formas
      const notaFiscalId = 
        pedido.id_nota_fiscal || 
        pedido.nota_fiscal?.id || 
        pedido.notaFiscal?.id ||
        pedido.nota?.id;

      console.log('[ANÁLISE TINY] ID Nota Fiscal encontrado:', notaFiscalId);
      console.log('[ANÁLISE TINY] Estrutura do pedido:', {
        id_nota_fiscal: pedido.id_nota_fiscal,
        nota_fiscal: pedido.nota_fiscal,
        notaFiscal: pedido.notaFiscal,
        nota: pedido.nota,
        situacao: pedido.situacao,
        itens: pedido.itens?.length || 0
      });

      let notaFiscal = null;
      let itensFaturados = [];
      const diagnostico: any = {
        pedidoEncontrado: true,
        notaFiscalId: notaFiscalId || 'Não encontrado',
        notaFiscalIdValido: !!(notaFiscalId && notaFiscalId !== '0' && notaFiscalId !== 0),
        situacaoPedido: pedido.situacao,
        itensPedido: pedido.itens?.length || 0,
      };

      // Se tem ID de nota fiscal válido, tentar buscar
      if (notaFiscalId && notaFiscalId !== '0' && notaFiscalId !== 0) {
        try {
          console.log('[ANÁLISE TINY] Buscando nota fiscal:', notaFiscalId);
          const notaFiscalData = await api.tinyObterNotaFiscal(
            venda.empresaFaturamentoId!,
            notaFiscalId
          );
          
          console.log('[ANÁLISE TINY] Nota fiscal obtida:', notaFiscalData);
          
          notaFiscal = notaFiscalData.nota_fiscal;
          
          if (notaFiscal?.itens) {
            itensFaturados = notaFiscal.itens;
            diagnostico.notaFiscalEncontrada = true;
            diagnostico.itensNotaFiscal = notaFiscal.itens.length;
          } else {
            diagnostico.notaFiscalEncontrada = false;
            diagnostico.motivoNF = 'Nota fiscal sem itens';
          }
        } catch (nfError: any) {
          diagnostico.notaFiscalEncontrada = false;
          diagnostico.erroNotaFiscal = nfError.message;
          console.warn('[ANÁLISE TINY] Erro ao buscar nota fiscal:', nfError);
        }
      } else {
        diagnostico.notaFiscalEncontrada = false;
        diagnostico.motivoNF = notaFiscalId === '0' || notaFiscalId === 0 
          ? 'Nota fiscal ainda não foi emitida (ID = 0)' 
          : 'ID de nota fiscal não encontrado no pedido';
      }

      // Se não conseguiu pegar itens da NF, usar itens do pedido
      if (itensFaturados.length === 0 && pedido.itens?.length > 0) {
        itensFaturados = pedido.itens;
        diagnostico.fonteDados = 'itens do pedido (fallback)';
      } else if (itensFaturados.length > 0) {
        diagnostico.fonteDados = 'itens da nota fiscal';
      }

      return {
        sucesso: true,
        pedido,
        notaFiscal,
        itensFaturados,
        diagnostico,
      };
    } catch (error) {
      const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[ANÁLISE TINY] Erro:', error);
      return {
        sucesso: false,
        erro: mensagemErro,
      };
    }
  }
}

// Singleton
export const erpAutoSendService = new ERPAutoSendService();
/**
 * Status Mix - Indica se um produto faz parte do mix do cliente
 */

export type StatusMixTipo = 'ativo' | 'inativo';

export interface StatusMix {
  id: string;
  clienteId: string;
  produtoId: string;
  status: StatusMixTipo;
  ativadoManualmente: boolean; // Se foi ativado manualmente pelo usuário
  codigoSkuCliente?: string; // Código SKU interno do cliente para este produto
  dataUltimoPedido?: string; // Data do último pedido contendo este produto
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface ConfiguracaoStatusMix {
  id: string;
  desativarAutomaticamente: boolean; // Se deve desativar automaticamente
  diasSemPedido: number; // Quantidade de dias sem pedido para desativar
  dataAtualizacao: string;
}

// Dados padrão de configuração
export const configuracaoPadraoStatusMix: ConfiguracaoStatusMix = {
  id: 'config-status-mix',
  desativarAutomaticamente: false,
  diasSemPedido: 90, // 90 dias por padrão
  dataAtualizacao: new Date().toISOString(),
};
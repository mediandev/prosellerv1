// Tipos para o sistema de vendas/pedidos

export type StatusVenda = 'Rascunho' | 'Em Análise' | 'Aprovado' | 'Faturado' | 'Concluído' | 'Cancelado' | 'Em Separação' | 'Enviado';

export type TinyERPStatus = 'aberto' | 'aprovado' | 'preparando_envio' | 'faturado' | 'pronto_envio' | 'enviado' | 'entregue' | 'cancelado' | 'nao_aprovado';

// Mapeamento de status do Tiny ERP para status internos
export const MAPEAMENTO_STATUS_TINY: Record<TinyERPStatus, StatusVenda> = {
  'aberto': 'Em Análise',
  'aprovado': 'Aprovado',
  'preparando_envio': 'Aprovado', // Preparando Envio = Aprovado (Em Andamento na UI)
  'faturado': 'Concluído', // Faturado no Tiny = Concluído no sistema
  'pronto_envio': 'Em Separação',
  'enviado': 'Enviado',
  'entregue': 'Enviado',
  'cancelado': 'Cancelado',
  'nao_aprovado': 'Cancelado',
};

// Dados de integração com o ERP
export interface IntegracaoERPVenda {
  erpPedidoId?: string; // ID do pedido no ERP
  erpNumero?: string; // Número do pedido no ERP
  erpStatus?: TinyERPStatus; // Status atual no ERP
  dataSincronizacao?: Date; // Última sincronização
  sincronizacaoAutomatica: boolean; // Se deve sincronizar automaticamente
  tentativasSincronizacao: number; // Contador de tentativas
  erroSincronizacao?: string; // Último erro de sincronização
  notaFiscalNumero?: string; // Número da nota fiscal (quando faturado)
  notaFiscalChave?: string; // Chave de acesso da NF-e
  notaFiscalUrl?: string; // URL para download da NF-e
  dataFaturamento?: Date; // Data do faturamento no ERP
  codigoRastreio?: string; // Código de rastreio quando enviado
  transportadoraNome?: string; // Nome da transportadora
}

export interface ItemVenda {
  id: string;
  numero: number; // Posição na lista
  produtoId: string;
  descricaoProduto: string;
  codigoSku: string;
  codigoEan?: string;
  valorTabela: number; // Valor na lista de preços
  percentualDesconto: number; // Desconto padrão do cliente
  valorUnitario: number; // Valor com desconto aplicado
  quantidade: number;
  subtotal: number; // valorUnitario * quantidade
  pesoBruto: number; // Peso bruto unitário
  pesoLiquido: number; // Peso líquido unitário
  unidade: string;
}

export interface Venda {
  id: string;
  numero: string; // Número do pedido
  
  // Informações do Cliente
  clienteId: string;
  nomeCliente: string;
  cnpjCliente: string;
  inscricaoEstadualCliente: string;
  
  // Informações Comerciais
  listaPrecoId: string;
  nomeListaPreco: string;
  percentualDescontoPadrao: number;
  vendedorId: string;
  nomeVendedor: string;
  
  // Configurações da Venda
  naturezaOperacaoId: string;
  nomeNaturezaOperacao: string;
  empresaFaturamentoId: string;
  nomeEmpresaFaturamento: string;
  
  // Itens
  itens: ItemVenda[];
  
  // Totais
  totalQuantidades: number; // Soma das quantidades
  totalItens: number; // Quantidade de SKUs únicos
  pesoBrutoTotal: number; // Em kg
  pesoLiquidoTotal: number; // Em kg
  valorTotalProdutos: number;
  percentualDescontoExtra: number;
  valorDescontoExtra: number;
  valorPedido: number; // Valor final
  
  // Detalhes
  dataPedido: Date;
  ordemCompraCliente?: string; // O.C. Cliente
  condicaoPagamentoId: string;
  nomeCondicaoPagamento: string;
  
  // Observações
  observacoesNotaFiscal: string; // Pré-visualização (não editável)
  observacoesInternas?: string;
  
  // Controle
  status: StatusVenda;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // ID do usuário que criou
  
  // Integração com ERP
  integracaoERP?: IntegracaoERPVenda;
}
// Tipos para Formas de Pagamento

export interface FormaPagamento {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  usarEmContaCorrente: boolean; // Usar na conta corrente (investimentos/ressarcimentos)
  usarEmCondicoesPagamento: boolean; // Usar em condições de pagamento comercial
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface NovaFormaPagamento {
  nome: string;
  descricao: string;
  usarEmContaCorrente: boolean;
  usarEmCondicoesPagamento: boolean;
}

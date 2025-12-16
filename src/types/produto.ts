export interface Marca {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TipoProduto {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnidadeMedida {
  id: string;
  sigla: string;
  descricao: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SituacaoProduto = 'Ativo' | 'Inativo' | 'Excluído';

export interface Produto {
  id: string;
  foto?: string;
  descricao: string; // Nome do produto
  codigoSku: string;
  codigoEan?: string; // EAN-13
  marcaId: string;
  nomeMarca: string;
  tipoProdutoId: string;
  nomeTipoProduto: string;
  ncm?: string;
  cest?: string;
  unidadeId: string;
  siglaUnidade: string;
  pesoLiquido: number; // em kg
  pesoBruto: number; // em kg
  situacao: SituacaoProduto;
  ativo: boolean; // Mantido para compatibilidade, mas situacao é o campo principal
  disponivel: boolean; // Disponível para venda (vendedores só veem produtos disponíveis)
  createdAt: Date;
  updatedAt: Date;
}

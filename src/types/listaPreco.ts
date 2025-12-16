export interface ProdutoPreco {
  produtoId: string;
  preco: number;
}

export interface FaixaDesconto {
  id: string;
  descontoMin: number; // em percentual (0 a 100)
  descontoMax: number | null; // em percentual (0 a 100), null = sem limite superior
  percentualComissao: number; // em percentual (0 a 100)
}

export type TipoComissao = 'fixa' | 'conforme_desconto';

export interface ListaPreco {
  id: string;
  nome: string;
  produtos: ProdutoPreco[];
  tipoComissao: TipoComissao;
  percentualFixo?: number; // usado quando tipoComissao = 'fixa'
  faixasDesconto?: FaixaDesconto[]; // usado quando tipoComissao = 'conforme_desconto'
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

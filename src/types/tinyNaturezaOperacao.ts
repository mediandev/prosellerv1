export interface TinyEmpresaNaturezaOperacao {
  id: string;
  empresaId: string;
  naturezaOperacaoId: string;
  naturezaOperacaoNome: string;
  tinyValor: string;
  tinyValorSimples: string | null;
  ativo: boolean;
}

export interface TinyEmpresaNaturezaOperacaoUpsertInput {
  empresaId: string;
  naturezaOperacaoId: string;
  tinyValor: string;
  tinyValorSimples?: string | null;
  ativo?: boolean;
}

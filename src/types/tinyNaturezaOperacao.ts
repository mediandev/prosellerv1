export interface TinyEmpresaNaturezaOperacao {
  id: string;
  empresaId: string;
  naturezaOperacaoId: string;
  naturezaOperacaoNome: string;
  tinyValor: string;
  ativo: boolean;
}

export interface TinyEmpresaNaturezaOperacaoUpsertInput {
  empresaId: string;
  naturezaOperacaoId: string;
  tinyValor: string;
  ativo?: boolean;
}

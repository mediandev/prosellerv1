// Tipos para histórico de alterações

export type TipoAlteracao = 
  | 'criacao'
  | 'edicao'
  | 'exclusao'
  | 'sincronizacao_erp'
  | 'importacao'
  | 'mudanca_status'
  | 'adicao_vendedor'
  | 'remocao_vendedor'
  | 'edicao_contato'
  | 'edicao_condicao_comercial';

export interface CampoAlterado {
  campo: string;
  valorAnterior: any;
  valorNovo: any;
  label: string; // Nome amigável do campo
}

export interface HistoricoAlteracao {
  id: string;
  entidadeTipo: 'cliente' | 'venda' | 'produto' | 'usuario';
  entidadeId: string;
  tipo: TipoAlteracao;
  descricao: string;
  camposAlterados?: CampoAlterado[];
  usuarioId: string;
  usuarioNome: string;
  dataHora: string;
  metadados?: {
    ip?: string;
    userAgent?: string;
    localizacao?: string;
    observacoes?: string;
  };
}

export interface FiltrosHistorico {
  entidadeId?: string;
  usuarioId?: string;
  tipo?: TipoAlteracao;
  dataInicio?: string;
  dataFim?: string;
}

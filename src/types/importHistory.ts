export type TipoImportacao = 'vendas' | 'clientes' | 'produtos' | 'vendedores';

export interface ImportHistoryError {
  row: number;
  message: string;
}

export interface ImportHistory {
  id: string;
  tipo: TipoImportacao;
  dataImportacao: Date;
  usuarioId: string;
  usuarioNome: string;
  nomeArquivo: string;
  totalLinhas: number;
  sucessos: number;
  erros: number;
  detalhesErros?: ImportHistoryError[];
  status: 'sucesso' | 'sucesso_parcial' | 'erro';
  canUndo?: boolean;
}


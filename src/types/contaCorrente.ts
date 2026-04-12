// Tipos para o sistema de conta corrente e investimentos

export type TipoCompromisso = 'Investimento' | 'Ressarcimento';
export type StatusCompromisso = 'Pendente' | 'Pago Parcialmente' | 'Pago Integralmente' | 'Cancelado';

export interface CategoriaContaCorrente {
  id: string;
  nome: string;
  descricao?: string;
  cor?: string; // cor em hexadecimal para identificação visual
  ativo: boolean;
  dataCriacao: string;
  criadoPor: string;
  dataAtualizacao?: string;
  atualizadoPor?: string;
}

export interface TipoArquivo {
  id: string;
  nome: string;
  descricao?: string;
}

export interface ArquivoAnexo {
  id: string;
  nomeArquivo: string;
  tamanho: number; // em bytes
  tipoArquivoId: string;
  tipoArquivoNome: string;
  url: string;
  dataUpload: string;
  uploadedBy: string;
}

export interface Compromisso {
  id: string;
  clienteId: string;
  clienteNome: string;
  data: string; // ISO date string
  valor: number;
  titulo: string;
  descricao: string;
  tipoCompromisso: TipoCompromisso;
  categoriaId?: string;
  categoriaNome?: string;
  arquivos: ArquivoAnexo[];
  status: StatusCompromisso;
  valorPago: number;
  valorPendente: number;
  dataCriacao: string;
  criadoPor: string;
  dataAtualizacao: string;
  atualizadoPor: string;
}

export interface Pagamento {
  id: string;
  compromissoId: string;
  compromissoTitulo: string;
  dataPagamento: string; // ISO date string
  valor: number;
  formaPagamento: string; // Nome da forma de pagamento (vem das configurações)
  categoriaId?: string;
  categoriaNome?: string;
  comprovanteAnexo?: ArquivoAnexo;
  observacoes?: string;
  dataCriacao: string;
  criadoPor: string;
}

export interface ResumoContaCorrente {
  totalInvestimentos: number;
  totalRessarcimentos: number;
  totalPago: number;
  totalPendente: number;
  quantidadeCompromissos: number;
  quantidadePagamentos: number;
}

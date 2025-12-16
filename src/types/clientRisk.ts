// Tipos para análise de clientes em risco

export interface InactiveClient {
  id: string;
  codigo: string;
  nome: string;
  vendedor: string;
  vendedorId: string;
  dataUltimaCompra: string | null;
  diasSemComprar: number;
  valorUltimaCompra: number;
  ltvTotal: number;
  status: string;
  segmento: string;
  categoria: 'nunca_comprou' | 'inativo';
  cidade: string;
  estado: string;
  telefone?: string;
  email?: string;
}

export interface SalesReduction {
  id: string;
  codigo: string;
  nome: string;
  vendedor: string;
  vendedorId: string;
  valorPeriodoAnterior: number;
  valorPeriodoAtual: number;
  reducaoValor: number;
  reducaoPercentual: number;
  qtdVendasAnterior: number;
  qtdVendasAtual: number;
  severidade: 'normal' | 'atencao' | 'alerta' | 'critico';
  segmento: string;
  cidade: string;
  estado: string;
  telefone?: string;
  email?: string;
}

export interface PromisingClient {
  id: string;
  codigo: string;
  nome: string;
  vendedor: string;
  vendedorId: string;
  valorPeriodoAnterior: number;
  valorPeriodoAtual: number;
  aumentoValor: number;
  aumentoPercentual: number;
  qtdVendasAnterior: number;
  qtdVendasAtual: number;
  segmento: string;
  cidade: string;
  estado: string;
  telefone?: string;
  email?: string;
}

export interface ClientRiskMetrics {
  totalClientesEmRisco: number;
  percentualFaturamentoEmRisco: number;
  clientesNuncaCompraram: number;
  clientesInativos: number;
  taxaRecuperacao: number;
  valorTotalEmRisco: number;
  clientesComReducao: number;
  reducaoMediaPercentual: number;
}

export interface ClientRiskFilters {
  diasInatividade: number;
  periodoAtual: {
    inicio: Date;
    fim: Date;
  };
  periodoAnterior: {
    inicio: Date;
    fim: Date;
  };
  percentualMinimoReducao: number;
  vendedores: string[];
  segmentos: string[];
  estados: string[];
  valorMinimo: number;
}

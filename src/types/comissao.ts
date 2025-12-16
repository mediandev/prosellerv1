export type StatusComissao = "calculada" | "paga" | "cancelada";
export type StatusPeriodo = "aberto" | "fechado" | "pago";
export type TipoLancamentoManual = "credito" | "debito";

// Comissão individual de uma venda
export interface ComissaoVenda {
  id: string;
  vendaId: string;
  vendedorId: string; // Facilita queries
  periodo: string; // "2025-10" - NOVO: Referência ao período
  
  // Dados da venda
  ocCliente: string; // Ordem de Compra do Cliente
  clienteId: string;
  clienteNome: string; // Desnormalizado para histórico
  dataVenda: string;
  valorTotalVenda: number;
  percentualComissao: number;
  valorComissao: number;
  
  // Dados para auditoria da regra aplicada
  regraAplicada: "aliquota_fixa_vendedor" | "lista_preco_fixa" | "lista_preco_faixas";
  listaPrecoId?: string;
  listaPrecoNome?: string;
  descontoAplicado?: number; // percentual
  faixaDescontoId?: string;
  observacoes?: string;
  
  // Auditoria de criação e edição
  criadoEm: string;
  editadoPor?: string;
  editadoEm?: string;
}

// Lançamento manual no período
export interface LancamentoManual {
  id: string;
  vendedorId: string; // NOVO: Facilita queries
  periodo: string; // "2025-10" - NOVO: Referência ao período (editável)
  
  // Dados do lançamento
  data: string;
  tipo: TipoLancamentoManual;
  valor: number;
  descricao: string;
  
  // Auditoria de criação e edição
  criadoPor: string;
  criadoEm: string;
  editadoPor?: string;
  editadoEm?: string;
}

// Pagamento realizado
export interface PagamentoPeriodo {
  id: string;
  vendedorId: string; // NOVO: Facilita queries
  periodo: string; // "2025-10" - NOVO: Referência ao período (editável)
  
  // Dados do pagamento
  data: string;
  valor: number;
  formaPagamento: string;
  comprovante?: string;
  observacoes?: string;
  
  // Auditoria de criação e edição
  realizadoPor: string;
  realizadoEm: string;
  editadoPor?: string;
  editadoEm?: string;
}

// Relatório de comissões de um período (OTIMIZADO)
export interface RelatorioPeriodoComissoes {
  id: string;
  vendedorId: string;
  periodo: string; // formato: "2025-10" (ano-mes) ou "2025" (ano)
  tipoPeriodo: "mensal" | "anual";
  status: StatusPeriodo;
  
  // Datas de controle
  dataGeracao: string;
  dataFechamento?: string;
  dataPagamento?: string;
  
  // NOVO: Saldo anterior transportado
  saldoAnterior: number; // Saldo devedor do período anterior
  
  // Totalizadores (armazenados para performance)
  // Valores calculados mas persistidos para evitar recálculo constante
  valorLiquido: number; // totalComissoes + totalCreditos - totalDebitos + saldoAnterior
  totalPago: number;
  saldoDevedor: number; // valorLiquido - totalPago
  
  // Observações gerais
  observacoes?: string;
  
  // REMOVIDO (calcular em tempo real via relacionamentos):
  // - vendedorNome (buscar de vendedores)
  // - vendas[] (buscar via periodo)
  // - totalVendas (SUM via periodo)
  // - quantidadeVendas (COUNT via periodo)
  // - totalComissoes (SUM via periodo)
  // - lancamentosCredito[] (buscar via periodo)
  // - lancamentosDebito[] (buscar via periodo)
  // - totalCreditos (SUM via periodo)
  // - totalDebitos (SUM via periodo)
  // - pagamentos[] (buscar via periodo)
}

// Interface para visualização completa do relatório (calculado em tempo real)
export interface RelatorioComissoesCompleto {
  // Dados do relatório
  relatorio: RelatorioPeriodoComissoes;
  
  // Dados do vendedor (JOIN)
  vendedorNome: string;
  vendedorEmail: string;
  vendedorIniciais: string;
  
  // Lançamentos do período (filtrados por periodo)
  vendas: ComissaoVenda[];
  lancamentosCredito: LancamentoManual[];
  lancamentosDebito: LancamentoManual[];
  pagamentos: PagamentoPeriodo[];
  
  // Totalizadores calculados
  totalVendas: number; // SUM(vendas.valorTotalVenda)
  quantidadeVendas: number; // COUNT(vendas)
  totalComissoes: number; // SUM(vendas.valorComissao)
  totalCreditos: number; // SUM(lancamentosCredito.valor)
  totalDebitos: number; // SUM(lancamentosDebito.valor)
}

// Resumo consolidado de um vendedor (para dashboard)
export interface ResumoComissoesVendedor {
  vendedorId: string;
  vendedorNome: string;
  vendedorIniciais: string;
  
  // Totais geral
  totalComissoesAcumulado: number;
  totalPagoAcumulado: number;
  saldoDevedorTotal: number;
  
  // Período atual
  periodoAtual: RelatorioComissoesCompleto | null;
  
  // Estatísticas
  quantidadePeriodos: number;
  mediaComissoesPeriodo: number;
  maiorComissaoPeriodo: number;
  menorComissaoPeriodo: number;
}

// Filtros para listagem
export interface FiltrosRelatorioComissoes {
  vendedorId?: string;
  periodo?: string;
  tipoPeriodo?: "mensal" | "anual";
  status?: StatusPeriodo;
  dataInicio?: string;
  dataFim?: string;
}

// Tipos para edição de lançamentos
export interface EditarComissaoVendaInput {
  periodo?: string; // Permite transferir entre períodos
  observacoes?: string;
  editadoPor: string;
}

export interface EditarLancamentoManualInput {
  periodo?: string; // Permite transferir entre períodos
  data?: string;
  valor?: number;
  descricao?: string;
  editadoPor: string;
}

export interface EditarPagamentoPeriodoInput {
  periodo?: string; // Permite transferir entre períodos
  data?: string;
  valor?: number;
  formaPagamento?: string;
  comprovante?: string;
  observacoes?: string;
  editadoPor: string;
}

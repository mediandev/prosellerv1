import { 
  RelatorioPeriodoComissoes, 
  ComissaoVenda, 
  LancamentoManual, 
  PagamentoPeriodo 
} from "../types/comissao";

// ========================================
// COMISSÕES DE VENDAS
// ========================================

// Vendas de comissão do período Outubro/2025 - Carlos Silva
const vendasOutubroJoao: ComissaoVenda[] = [
  {
    id: "CV-001",
    vendaId: "VD-2025-001",
    vendedorId: "v1",
    periodo: "2025-10",
    ocCliente: "OC-2025-001",
    clienteId: "CLI-001",
    clienteNome: "Empresa ABC Ltda",
    dataVenda: "2025-10-05",
    valorTotalVenda: 12500.00,
    percentualComissao: 8.0,
    valorComissao: 1000.00,
    regraAplicada: "aliquota_fixa_vendedor",
    observacoes: "Comissão calculada por alíquota fixa do vendedor",
    criadoEm: "2025-10-05T14:00:00Z"
  },
  {
    id: "CV-002",
    vendaId: "VD-2025-015",
    vendedorId: "v1",
    periodo: "2025-10",
    ocCliente: "OC-2025-015",
    clienteId: "CLI-008",
    clienteNome: "Distribuidora Norte S.A.",
    dataVenda: "2025-10-12",
    valorTotalVenda: 8750.00,
    percentualComissao: 8.0,
    valorComissao: 700.00,
    regraAplicada: "aliquota_fixa_vendedor",
    criadoEm: "2025-10-12T16:30:00Z"
  },
  {
    id: "CV-003",
    vendaId: "VD-2025-023",
    vendedorId: "v1",
    periodo: "2025-10",
    ocCliente: "OC-2025-023",
    clienteId: "CLI-012",
    clienteNome: "Comércio Sul Ltda",
    dataVenda: "2025-10-18",
    valorTotalVenda: 15200.00,
    percentualComissao: 8.0,
    valorComissao: 1216.00,
    regraAplicada: "aliquota_fixa_vendedor",
    criadoEm: "2025-10-18T11:15:00Z"
  },
  {
    id: "CV-004",
    vendaId: "VD-2025-031",
    vendedorId: "v1",
    periodo: "2025-10",
    ocCliente: "OC-2025-031",
    clienteId: "CLI-003",
    clienteNome: "Tech Solutions S.A.",
    dataVenda: "2025-10-25",
    valorTotalVenda: 9850.00,
    percentualComissao: 8.0,
    valorComissao: 788.00,
    regraAplicada: "aliquota_fixa_vendedor",
    criadoEm: "2025-10-25T09:45:00Z"
  }
];

// Vendas de comissão do período Outubro/2025 - Maria Santos
const vendasOutubroMaria: ComissaoVenda[] = [
  {
    id: "CV-005",
    vendaId: "VD-2025-002",
    vendedorId: "v2",
    periodo: "2025-10",
    ocCliente: "OC-2025-002",
    clienteId: "CLI-002",
    clienteNome: "Indústria XYZ",
    dataVenda: "2025-10-03",
    valorTotalVenda: 25800.00,
    percentualComissao: 10.0,
    valorComissao: 2580.00,
    regraAplicada: "lista_preco_faixas",
    listaPrecoId: "LP-001",
    listaPrecoNome: "Tabela Premium - Atacado",
    descontoAplicado: 2.5,
    faixaDescontoId: "FD-001",
    observacoes: "Desconto aplicado: 2.5% | Faixa: 0% a 5% → 10% comissão",
    criadoEm: "2025-10-03T10:20:00Z"
  },
  {
    id: "CV-006",
    vendaId: "VD-2025-008",
    vendedorId: "v2",
    periodo: "2025-10",
    ocCliente: "OC-2025-008",
    clienteId: "CLI-005",
    clienteNome: "Varejo Master",
    dataVenda: "2025-10-08",
    valorTotalVenda: 18400.00,
    percentualComissao: 7.0,
    valorComissao: 1288.00,
    regraAplicada: "lista_preco_faixas",
    listaPrecoId: "LP-001",
    listaPrecoNome: "Tabela Premium - Atacado",
    descontoAplicado: 7.0,
    faixaDescontoId: "FD-002",
    observacoes: "Desconto aplicado: 7% | Faixa: 5% a 10% → 7% comissão",
    criadoEm: "2025-10-08T15:10:00Z"
  },
  {
    id: "CV-007",
    vendaId: "VD-2025-019",
    vendedorId: "v2",
    periodo: "2025-10",
    ocCliente: "OC-2025-019",
    clienteId: "CLI-009",
    clienteNome: "Supermercado Estrela",
    dataVenda: "2025-10-15",
    valorTotalVenda: 31200.00,
    percentualComissao: 5.0,
    valorComissao: 1560.00,
    regraAplicada: "lista_preco_faixas",
    listaPrecoId: "LP-001",
    listaPrecoNome: "Tabela Premium - Atacado",
    descontoAplicado: 12.0,
    faixaDescontoId: "FD-003",
    observacoes: "Desconto aplicado: 12% | Faixa: 10% a 15% → 5% comissão",
    criadoEm: "2025-10-15T13:25:00Z"
  }
];

// Vendas de comissão do período Outubro/2025 - Carlos Oliveira
const vendasOutubroCarlos: ComissaoVenda[] = [
  {
    id: "CV-008",
    vendaId: "VD-2025-005",
    vendedorId: "v3",
    periodo: "2025-10",
    ocCliente: "OC-2025-005",
    clienteId: "CLI-004",
    clienteNome: "Atacado Regional",
    dataVenda: "2025-10-07",
    valorTotalVenda: 22100.00,
    percentualComissao: 6.5,
    valorComissao: 1436.50,
    regraAplicada: "lista_preco_fixa",
    listaPrecoId: "LP-002",
    listaPrecoNome: "Tabela Padrão - Varejo",
    observacoes: "Lista com comissão fixa de 6.5%",
    criadoEm: "2025-10-07T12:30:00Z"
  },
  {
    id: "CV-009",
    vendaId: "VD-2025-012",
    vendedorId: "v3",
    periodo: "2025-10",
    ocCliente: "OC-2025-012",
    clienteId: "CLI-007",
    clienteNome: "Farmácia Central",
    dataVenda: "2025-10-11",
    valorTotalVenda: 14300.00,
    percentualComissao: 6.5,
    valorComissao: 929.50,
    regraAplicada: "lista_preco_fixa",
    listaPrecoId: "LP-002",
    listaPrecoNome: "Tabela Padrão - Varejo",
    criadoEm: "2025-10-11T17:00:00Z"
  }
];

// Vendas de comissão do período Setembro/2025 - Carlos Silva (histórico)
const vendasSetembroJoao: ComissaoVenda[] = [
  {
    id: "CV-H001",
    vendaId: "VD-2025-H001",
    vendedorId: "v1",
    periodo: "2025-09",
    ocCliente: "OC-2025-H001",
    clienteId: "CLI-001",
    clienteNome: "Empresa ABC Ltda",
    dataVenda: "2025-09-10",
    valorTotalVenda: 18500.00,
    percentualComissao: 8.0,
    valorComissao: 1480.00,
    regraAplicada: "aliquota_fixa_vendedor",
    criadoEm: "2025-09-10T14:00:00Z"
  },
  {
    id: "CV-H002",
    vendaId: "VD-2025-H002",
    vendedorId: "v1",
    periodo: "2025-09",
    ocCliente: "OC-2025-H002",
    clienteId: "CLI-008",
    clienteNome: "Distribuidora Norte S.A.",
    dataVenda: "2025-09-20",
    valorTotalVenda: 22100.00,
    percentualComissao: 8.0,
    valorComissao: 1768.00,
    regraAplicada: "aliquota_fixa_vendedor",
    criadoEm: "2025-09-20T11:30:00Z"
  }
];

// ========================================
// LANÇAMENTOS MANUAIS
// ========================================

const lancamentosCreditoJoaoOutubro: LancamentoManual[] = [
  {
    id: "LC-001",
    vendedorId: "v1",
    periodo: "2025-10",
    data: "2025-10-20",
    tipo: "credito",
    valor: 500.00,
    descricao: "Bonificação por atingimento de meta trimestral",
    criadoPor: "Gestor Comercial",
    criadoEm: "2025-10-20T14:30:00Z"
  }
];

const lancamentosDebitoJoaoOutubro: LancamentoManual[] = [
  {
    id: "LD-001",
    vendedorId: "v1",
    periodo: "2025-10",
    data: "2025-10-15",
    tipo: "debito",
    valor: 200.00,
    descricao: "Desconto de vale transporte",
    criadoPor: "RH",
    criadoEm: "2025-10-15T09:00:00Z"
  }
];

const lancamentosDebitoCarlosOutubro: LancamentoManual[] = [
  {
    id: "LD-002",
    vendedorId: "v3",
    periodo: "2025-10",
    data: "2025-10-25",
    tipo: "debito",
    valor: 150.00,
    descricao: "Desconto de vale alimentação",
    criadoPor: "RH",
    criadoEm: "2025-10-25T10:00:00Z"
  }
];

// ========================================
// PAGAMENTOS
// ========================================

const pagamentosJoaoOutubro: PagamentoPeriodo[] = [
  {
    id: "PG-001",
    vendedorId: "v1",
    periodo: "2025-10",
    data: "2025-11-05",
    valor: 3500.00,
    formaPagamento: "Transferência Bancária",
    comprovante: "COMP-2025-11-001",
    observacoes: "Pagamento parcial referente Outubro/2025",
    realizadoPor: "Financeiro",
    realizadoEm: "2025-11-05T10:15:00Z"
  }
];

const pagamentosMariaOutubro: PagamentoPeriodo[] = [
  {
    id: "PG-002",
    vendedorId: "v2",
    periodo: "2025-10",
    data: "2025-11-05",
    valor: 5428.00,
    formaPagamento: "PIX",
    comprovante: "PIX-2025-11-002",
    realizadoPor: "Financeiro",
    realizadoEm: "2025-11-05T14:30:00Z"
  }
];

const pagamentosJoaoSetembro: PagamentoPeriodo[] = [
  {
    id: "PG-H001",
    vendedorId: "v1",
    periodo: "2025-09",
    data: "2025-10-05",
    valor: 3248.00,
    formaPagamento: "Transferência Bancária",
    realizadoPor: "Financeiro",
    realizadoEm: "2025-10-05T10:00:00Z"
  }
];

// ========================================
// RELATÓRIOS DE PERÍODOS (OTIMIZADO)
// ========================================

export const mockRelatoriosComissoes: RelatorioPeriodoComissoes[] = [
  // João Silva - Setembro/2025 (histórico - pago)
  {
    id: "REL-2025-09-001",
    vendedorId: "v1",
    periodo: "2025-09",
    tipoPeriodo: "mensal",
    status: "pago",
    dataGeracao: "2025-10-01T08:00:00Z",
    dataFechamento: "2025-10-01T08:00:00Z",
    dataPagamento: "2025-10-05T10:00:00Z",
    saldoAnterior: 0, // Primeiro período do ano
    valorLiquido: 3248.00, // 3248 (comissões) + 0 (saldo anterior)
    totalPago: 3248.00,
    saldoDevedor: 0
  },
  
  // João Silva - Outubro/2025 (fechado - com saldo transportado)
  {
    id: "REL-2025-10-001",
    vendedorId: "v1",
    periodo: "2025-10",
    tipoPeriodo: "mensal",
    status: "fechado",
    dataGeracao: "2025-11-01T08:00:00Z",
    dataFechamento: "2025-11-01T08:00:00Z",
    saldoAnterior: 0, // Setembro foi pago completamente
    valorLiquido: 4004.00, // 3704 (comissões) + 500 (créditos) - 200 (débitos) + 0 (saldo anterior)
    totalPago: 3500.00,
    saldoDevedor: 504.00, // Será transportado para novembro
    observacoes: "Vendedor atingiu 92% da meta mensal"
  },
  
  // Maria Santos - Outubro/2025 (pago - sem saldo anterior)
  {
    id: "REL-2025-10-002",
    vendedorId: "v2",
    periodo: "2025-10",
    tipoPeriodo: "mensal",
    status: "pago",
    dataGeracao: "2025-11-01T08:00:00Z",
    dataFechamento: "2025-11-01T08:00:00Z",
    dataPagamento: "2025-11-05T14:30:00Z",
    saldoAnterior: 0,
    valorLiquido: 5428.00, // 5428 (comissões) + 0 (saldo anterior)
    totalPago: 5428.00,
    saldoDevedor: 0,
    observacoes: "Vendedora superou a meta em 115%"
  },
  
  // Carlos Oliveira - Outubro/2025 (aberto)
  {
    id: "REL-2025-10-003",
    vendedorId: "v3",
    periodo: "2025-10",
    tipoPeriodo: "mensal",
    status: "aberto",
    dataGeracao: "2025-11-01T08:00:00Z",
    saldoAnterior: 0,
    valorLiquido: 2216.00, // 2366 (comissões) - 150 (débitos) + 0 (saldo anterior)
    totalPago: 0,
    saldoDevedor: 2216.00,
    observacoes: "Período ainda não pago - aguardando aprovação"
  }
];

// ========================================
// EXPORTAR TODOS OS LANÇAMENTOS
// ========================================

// Todas as comissões de vendas
export const mockComissoesVendas: ComissaoVenda[] = [
  ...vendasSetembroJoao,
  ...vendasOutubroJoao,
  ...vendasOutubroMaria,
  ...vendasOutubroCarlos
];

// Todos os lançamentos manuais
export const mockLancamentosManuais: LancamentoManual[] = [
  ...lancamentosCreditoJoaoOutubro,
  ...lancamentosDebitoJoaoOutubro,
  ...lancamentosDebitoCarlosOutubro
];

// Todos os pagamentos
export const mockPagamentos: PagamentoPeriodo[] = [
  ...pagamentosJoaoSetembro,
  ...pagamentosJoaoOutubro,
  ...pagamentosMariaOutubro
];

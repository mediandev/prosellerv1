import { Venda, ItemVenda } from '../types/venda';

// Função para carregar vendas do localStorage
function carregarVendasDoLocalStorage(): Venda[] {
  if (typeof window === 'undefined') return vendasIniciais;
  
  try {
    const vendasSalvas = localStorage.getItem('mockVendas');
    if (vendasSalvas) {
      const vendas = JSON.parse(vendasSalvas);
      // Converter strings de data de volta para objetos Date
      return vendas.map((v: any) => ({
        ...v,
        dataPedido: new Date(v.dataPedido),
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
        integracaoERP: v.integracaoERP ? {
          ...v.integracaoERP,
          dataSincronizacao: v.integracaoERP.dataSincronizacao ? new Date(v.integracaoERP.dataSincronizacao) : undefined,
          dataFaturamento: v.integracaoERP.dataFaturamento ? new Date(v.integracaoERP.dataFaturamento) : undefined,
        } : undefined,
      }));
    }
  } catch (error) {
    console.error('Erro ao carregar vendas do localStorage:', error);
  }
  
  return vendasIniciais;
}

// Função para salvar vendas no localStorage
export function salvarVendasNoLocalStorage(vendas: Venda[]) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('mockVendas', JSON.stringify(vendas));
    console.log('💾 Vendas salvas no localStorage:', vendas.length, 'vendas');
  } catch (error) {
    console.error('Erro ao salvar vendas no localStorage:', error);
  }
}

// Dados iniciais (padrão)
const vendasIniciais: Venda[] = [
  {
    id: 'VD-2025-001',
    numero: 'PV-2025-0001',
    
    // Cliente: Tech Solutions Ltda
    clienteId: 'cliente-1',
    nomeCliente: 'Tech Solutions Ltda',
    cnpjCliente: '12.345.678/0001-90',
    inscricaoEstadualCliente: '123.456.789.012',
    
    // Comercial
    listaPrecoId: 'lista-1',
    nomeListaPreco: 'Lista Padrão',
    percentualDescontoPadrao: 5,
    vendedorId: '1',
    nomeVendedor: 'João Silva',
    
    // Configurações
    naturezaOperacaoId: '1',
    nomeNaturezaOperacao: 'Venda',
    empresaFaturamentoId: 'emp1',
    nomeEmpresaFaturamento: 'Empresa Principal LTDA',
    
    // Itens
    itens: [
      {
        id: '1-1',
        numero: 1,
        produtoId: '1',
        descricaoProduto: 'Notebook Dell Inspiron 15',
        codigoSku: 'PROD001',
        codigoEan: '7891234567890',
        valorTabela: 3500.00,
        percentualDesconto: 5,
        valorUnitario: 3325.00,
        quantidade: 2,
        subtotal: 6650.00,
        pesoBruto: 2.5,
        pesoLiquido: 2.0,
        unidade: 'UN',
      },
      {
        id: '1-2',
        numero: 2,
        produtoId: '2',
        descricaoProduto: 'Mouse Logitech MX Master 3',
        codigoSku: 'PROD002',
        codigoEan: '7891234567891',
        valorTabela: 450.00,
        percentualDesconto: 5,
        valorUnitario: 427.50,
        quantidade: 5,
        subtotal: 2137.50,
        pesoBruto: 0.2,
        pesoLiquido: 0.14,
        unidade: 'UN',
      },
      {
        id: '1-3',
        numero: 3,
        produtoId: '3',
        descricaoProduto: 'Teclado Mecânico Keychron K2',
        codigoSku: 'PROD003',
        codigoEan: '7891234567892',
        valorTabela: 650.00,
        percentualDesconto: 5,
        valorUnitario: 617.50,
        quantidade: 5,
        subtotal: 3087.50,
        pesoBruto: 0.9,
        pesoLiquido: 0.75,
        unidade: 'UN',
      },
    ],
    
    // Totais
    totalQuantidades: 12,
    totalItens: 3,
    pesoBrutoTotal: 10.5,
    pesoLiquidoTotal: 8.45,
    valorTotalProdutos: 11875.00,
    percentualDescontoExtra: 2,
    valorDescontoExtra: 237.50,
    valorPedido: 11637.50,
    
    // Detalhes
    dataPedido: new Date('2025-10-15'),
    ordemCompraCliente: 'OC-2025-001',
    condicaoPagamentoId: 'cp-1',
    nomeCondicaoPagamento: 'À Vista - PIX com 5% desconto',
    
    // Observações
    observacoesNotaFiscal: 'Mercadoria sujeita ao regime de substituição tributária.\nMercadoria destinada à revenda.',
    observacoesInternas: 'Cliente solicitou desconto de 5%',
    
    // Controle
    status: 'Faturado',
    createdAt: new Date('2025-10-15T10:30:00'),
    updatedAt: new Date('2025-10-17T10:30:00'),
    createdBy: '1',
  },
  {
    id: 'VD-2025-002',
    numero: 'PV-2025-0002',
    
    // Cliente: Inovação Digital ME
    clienteId: 'cliente-2',
    nomeCliente: 'Inovação Digital ME',
    cnpjCliente: '98.765.432/0001-10',
    inscricaoEstadualCliente: '987.654.321.098',
    
    // Comercial
    listaPrecoId: 'lista-2',
    nomeListaPreco: 'Lista VIP',
    percentualDescontoPadrao: 10,
    vendedorId: '2',
    nomeVendedor: 'Maria Santos',
    
    // Configurações
    naturezaOperacaoId: '2',
    nomeNaturezaOperacao: 'Remessa para Demonstração',
    empresaFaturamentoId: 'emp1',
    nomeEmpresaFaturamento: 'Empresa Principal LTDA',
    
    // Itens
    itens: [
      {
        id: '2-1',
        numero: 1,
        produtoId: '4',
        descricaoProduto: 'Monitor LG UltraWide 29"',
        codigoSku: 'PROD004',
        codigoEan: '7891234567893',
        valorTabela: 1800.00,
        percentualDesconto: 10,
        valorUnitario: 1620.00,
        quantidade: 3,
        subtotal: 4860.00,
        pesoBruto: 6.5,
        pesoLiquido: 5.8,
        unidade: 'UN',
      },
      {
        id: '2-2',
        numero: 2,
        produtoId: '5',
        descricaoProduto: 'SSD Samsung 970 EVO Plus 1TB',
        codigoSku: 'PROD005',
        codigoEan: '7891234567894',
        valorTabela: 800.00,
        percentualDesconto: 10,
        valorUnitario: 720.00,
        quantidade: 2,
        subtotal: 1440.00,
        pesoBruto: 0.05,
        pesoLiquido: 0.008,
        unidade: 'UN',
      },
    ],
    
    // Totais
    totalQuantidades: 5,
    totalItens: 2,
    pesoBrutoTotal: 19.6,
    pesoLiquidoTotal: 17.416,
    valorTotalProdutos: 6300.00,
    percentualDescontoExtra: 0,
    valorDescontoExtra: 0,
    valorPedido: 6300.00,
    
    // Detalhes
    dataPedido: new Date('2025-10-14'),
    ordemCompraCliente: 'OC-ID-456',
    condicaoPagamentoId: 'cp-3',
    nomeCondicaoPagamento: '30 dias - Transferência',
    
    // Observações
    observacoesNotaFiscal: 'Natureza da operação: Remessa para Demonstração\nMercadoria sujeita ao regime de substituição tributária.',
    observacoesInternas: '',
    
    // Controle
    status: 'Faturado',
    createdAt: new Date('2025-10-14T14:20:00'),
    updatedAt: new Date('2025-10-16T14:20:00'),
    createdBy: '2',
  },
  {
    id: 'VD-2025-003',
    numero: 'PV-2025-0003',
    
    // Cliente: Tech Solutions Ltda
    clienteId: 'cliente-1',
    nomeCliente: 'Tech Solutions Ltda',
    cnpjCliente: '12.345.678/0001-90',
    inscricaoEstadualCliente: '123.456.789.012',
    
    // Comercial
    listaPrecoId: 'lista-1',
    nomeListaPreco: 'Lista Padrão',
    percentualDescontoPadrao: 5,
    vendedorId: '3',
    nomeVendedor: 'Carlos Oliveira',
    
    // Configurações
    naturezaOperacaoId: '1',
    nomeNaturezaOperacao: 'Venda',
    empresaFaturamentoId: 'emp1',
    nomeEmpresaFaturamento: 'Empresa Principal LTDA',
    
    // Itens
    itens: [
      {
        id: '3-1',
        numero: 1,
        produtoId: '9',
        descricaoProduto: 'Impressora HP LaserJet Pro',
        codigoSku: 'PROD009',
        codigoEan: '7891234567898',
        valorTabela: 2200.00,
        percentualDesconto: 5,
        valorUnitario: 2090.00,
        quantidade: 5,
        subtotal: 10450.00,
        pesoBruto: 8.5,
        pesoLiquido: 7.2,
        unidade: 'UN',
      },
    ],
    
    // Totais
    totalQuantidades: 5,
    totalItens: 1,
    pesoBrutoTotal: 42.5,
    pesoLiquidoTotal: 36.0,
    valorTotalProdutos: 10450.00,
    percentualDescontoExtra: 0,
    valorDescontoExtra: 0,
    valorPedido: 10450.00,
    
    // Detalhes
    dataPedido: new Date('2025-10-13'),
    ordemCompraCliente: 'OC-2025-789',
    condicaoPagamentoId: 'cp-4',
    nomeCondicaoPagamento: '2x (30/60 dias) - Cheque',
    
    // Observações
    observacoesNotaFiscal: 'Natureza da operação: Venda\nMercadoria sujeita ao regime de substituição tributária.\nO.C. Cliente: OC-2025-789',
    observacoesInternas: 'Aguardando aprovação do contrato',
    
    // Controle
    status: 'Em Análise',
    createdAt: new Date('2025-10-13T09:15:00'),
    updatedAt: new Date('2025-10-13T09:15:00'),
    createdBy: '3',
  },
  {
    id: 'VD-2025-004',
    numero: 'PV-2025-0004',
    
    // Cliente: Tech Solutions Ltda
    clienteId: 'cliente-1',
    nomeCliente: 'Tech Solutions Ltda',
    cnpjCliente: '12.345.678/0001-90',
    inscricaoEstadualCliente: '123.456.789.012',
    
    // Comercial
    listaPrecoId: 'lista-1',
    nomeListaPreco: 'Lista Padrão',
    percentualDescontoPadrao: 5,
    vendedorId: '1',
    nomeVendedor: 'João Silva',
    
    // Configurações
    naturezaOperacaoId: '1',
    nomeNaturezaOperacao: 'Venda',
    empresaFaturamentoId: 'emp1',
    nomeEmpresaFaturamento: 'Empresa Principal LTDA',
    
    // Itens
    itens: [
      {
        id: '4-1',
        numero: 1,
        produtoId: '1',
        descricaoProduto: 'Notebook Dell Inspiron 15',
        codigoSku: 'PROD001',
        codigoEan: '7891234567890',
        valorTabela: 3500.00,
        percentualDesconto: 5,
        valorUnitario: 3325.00,
        quantidade: 3,
        subtotal: 9975.00,
        pesoBruto: 2.5,
        pesoLiquido: 2.0,
        unidade: 'UN',
      },
    ],
    
    // Totais
    totalQuantidades: 3,
    totalItens: 1,
    pesoBrutoTotal: 7.5,
    pesoLiquidoTotal: 6.0,
    valorTotalProdutos: 9975.00,
    percentualDescontoExtra: 0,
    valorDescontoExtra: 0,
    valorPedido: 9975.00,
    
    // Detalhes
    dataPedido: new Date('2025-11-01'),
    ordemCompraCliente: 'OC-2025-010',
    condicaoPagamentoId: 'cp-1',
    nomeCondicaoPagamento: 'À Vista - PIX com 5% desconto',
    
    // Observações
    observacoesNotaFiscal: 'Venda de novembro',
    observacoesInternas: 'Pedido do início do mês',
    
    // Controle
    status: 'Em Análise',
    createdAt: new Date('2025-11-01T10:30:00'),
    updatedAt: new Date('2025-11-01T10:30:00'),
    createdBy: '1',
  },
  {
    id: 'VD-2025-005',
    numero: 'PV-2025-0005',
    
    // Cliente: Inovação Digital ME
    clienteId: 'cliente-2',
    nomeCliente: 'Inovação Digital ME',
    cnpjCliente: '98.765.432/0001-10',
    inscricaoEstadualCliente: '987.654.321.098',
    
    // Comercial
    listaPrecoId: 'lista-2',
    nomeListaPreco: 'Lista VIP',
    percentualDescontoPadrao: 10,
    vendedorId: '2',
    nomeVendedor: 'Maria Santos',
    
    // Configurações
    naturezaOperacaoId: '1',
    nomeNaturezaOperacao: 'Venda',
    empresaFaturamentoId: 'emp1',
    nomeEmpresaFaturamento: 'Empresa Principal LTDA',
    
    // Itens
    itens: [
      {
        id: '5-1',
        numero: 1,
        produtoId: '2',
        descricaoProduto: 'Mouse Logitech MX Master 3',
        codigoSku: 'PROD002',
        codigoEan: '7891234567891',
        valorTabela: 450.00,
        percentualDesconto: 10,
        valorUnitario: 405.00,
        quantidade: 10,
        subtotal: 4050.00,
        pesoBruto: 0.2,
        pesoLiquido: 0.14,
        unidade: 'UN',
      },
    ],
    
    // Totais
    totalQuantidades: 10,
    totalItens: 1,
    pesoBrutoTotal: 2.0,
    pesoLiquidoTotal: 1.4,
    valorTotalProdutos: 4050.00,
    percentualDescontoExtra: 0,
    valorDescontoExtra: 0,
    valorPedido: 4050.00,
    
    // Detalhes
    dataPedido: new Date('2025-11-02'),
    ordemCompraCliente: 'OC-2025-011',
    condicaoPagamentoId: 'cp-2',
    nomeCondicaoPagamento: '3x (30/60/90 dias) - Boleto',
    
    // Observações
    observacoesNotaFiscal: 'Pedido de novembro',
    observacoesInternas: 'Cliente regular',
    
    // Controle
    status: 'Faturado',
    createdAt: new Date('2025-11-02T08:15:00'),
    updatedAt: new Date('2025-11-02T14:30:00'),
    createdBy: '2',
  },
];

// Exportar array de vendas com dados do localStorage (se existirem)
export const mockVendas: Venda[] = carregarVendasDoLocalStorage();

// Nota: O salvamento no localStorage é feito manualmente após modificações
// chamando salvarVendasNoLocalStorage(mockVendas) nos pontos de modificação

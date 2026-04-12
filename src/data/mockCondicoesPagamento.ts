import { CondicaoPagamento } from '../types/condicaoPagamento';

// Condições de Pagamento pré-cadastradas
// Atenção: Os IDs de forma de pagamento referem-se aos IDs em mockFormasPagamento.ts
export const condicoesPagamentoMock: CondicaoPagamento[] = [
  {
    id: 'cp-1',
    nome: 'À Vista - PIX com 5% desconto',
    formaPagamentoId: '7', // PIX
    prazoPagamento: '0',
    descontoExtra: 5,
    valorPedidoMinimo: 0,
    ativo: true,
    dataCriacao: '2025-01-01T00:00:00',
    dataAtualizacao: '2025-01-01T00:00:00',
  },
  {
    id: 'cp-2',
    nome: 'À Vista - Dinheiro com 3% desconto',
    formaPagamentoId: '4', // Dinheiro
    prazoPagamento: '0',
    descontoExtra: 3,
    valorPedidoMinimo: 0,
    ativo: true,
    dataCriacao: '2025-01-01T00:00:00',
    dataAtualizacao: '2025-01-01T00:00:00',
  },
  {
    id: 'cp-3',
    nome: '30 dias - Transferência',
    formaPagamentoId: '3', // Transferência Bancária
    prazoPagamento: '30',
    descontoExtra: 0,
    valorPedidoMinimo: 500,
    ativo: true,
    dataCriacao: '2025-01-01T00:00:00',
    dataAtualizacao: '2025-01-01T00:00:00',
  },
  {
    id: 'cp-4',
    nome: '2x (30/60 dias) - Cheque',
    formaPagamentoId: '8', // Cheque
    prazoPagamento: '30/60',
    descontoExtra: 0,
    valorPedidoMinimo: 1000,
    ativo: true,
    dataCriacao: '2025-01-01T00:00:00',
    dataAtualizacao: '2025-01-01T00:00:00',
  },
  {
    id: 'cp-5',
    nome: '3x (30/60/90 dias) - Depósito',
    formaPagamentoId: '9', // Depósito Bancário
    prazoPagamento: '30/60/90',
    descontoExtra: 0,
    valorPedidoMinimo: 2000,
    ativo: true,
    dataCriacao: '2025-01-01T00:00:00',
    dataAtualizacao: '2025-01-01T00:00:00',
  },
  {
    id: 'cp-6',
    nome: 'Cartão de Crédito - À Vista',
    formaPagamentoId: '5', // Cartão de Crédito
    prazoPagamento: '0',
    descontoExtra: 0,
    valorPedidoMinimo: 0,
    ativo: true,
    dataCriacao: '2025-01-01T00:00:00',
    dataAtualizacao: '2025-01-01T00:00:00',
  },
  {
    id: 'cp-7',
    nome: 'Cartão de Débito - À Vista',
    formaPagamentoId: '6', // Cartão de Débito
    prazoPagamento: '0',
    descontoExtra: 0,
    valorPedidoMinimo: 0,
    ativo: true,
    dataCriacao: '2025-01-01T00:00:00',
    dataAtualizacao: '2025-01-01T00:00:00',
  },
  {
    id: 'cp-8',
    nome: '4x (30/60/90/120 dias) - Transferência',
    formaPagamentoId: '3', // Transferência Bancária
    prazoPagamento: '30/60/90/120',
    descontoExtra: 0,
    valorPedidoMinimo: 5000,
    ativo: true,
    dataCriacao: '2025-01-01T00:00:00',
    dataAtualizacao: '2025-01-01T00:00:00',
  },
  {
    id: 'cp-9',
    nome: '45 dias - PIX',
    formaPagamentoId: '7', // PIX
    prazoPagamento: '45',
    descontoExtra: 0,
    valorPedidoMinimo: 1500,
    ativo: true,
    dataCriacao: '2025-01-01T00:00:00',
    dataAtualizacao: '2025-01-01T00:00:00',
  },
  {
    id: 'cp-10',
    nome: '60 dias - Transferência Premium',
    formaPagamentoId: '3', // Transferência Bancária
    prazoPagamento: '60',
    descontoExtra: 0,
    valorPedidoMinimo: 10000,
    ativo: false, // Desativada como exemplo
    dataCriacao: '2025-01-01T00:00:00',
    dataAtualizacao: '2025-01-01T00:00:00',
  },
];

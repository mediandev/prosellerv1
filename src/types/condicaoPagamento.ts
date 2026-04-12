// Tipos para Condições de Pagamento

export interface CondicaoPagamento {
  id: string;
  nome: string; // Nome descritivo da condição (ex: "À Vista com Desconto", "30 dias - PIX")
  formaPagamentoId: string; // ID da forma de pagamento
  prazoPagamento: string; // Prazo em dias (ex: "30" ou "30/60/90" para parcelado)
  descontoExtra: number; // Percentual de desconto extra (0 a 100)
  valorPedidoMinimo: number; // Valor mínimo do pedido para usar esta condição
  ativo: boolean;
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface NovaCondicaoPagamento {
  nome: string;
  formaPagamentoId: string;
  prazoPagamento: string;
  descontoExtra: number;
  valorPedidoMinimo: number;
}

// Helper para calcular número de parcelas a partir do prazo
export function calcularNumeroParcelas(prazoPagamento: string): number {
  if (!prazoPagamento || prazoPagamento.trim() === '') return 0;
  const parcelas = prazoPagamento.split('/').filter(p => p.trim() !== '');
  return parcelas.length;
}

// Helper para formatar prazo de pagamento de forma legível
export function formatarPrazoPagamento(prazoPagamento: string): string {
  if (!prazoPagamento || prazoPagamento.trim() === '') return 'Não definido';
  
  const parcelas = prazoPagamento.split('/').filter(p => p.trim() !== '');
  
  if (parcelas.length === 1) {
    return `${parcelas[0]} dias`;
  }
  
  return `${parcelas.length}x (${prazoPagamento.replace(/\//g, ' / ')} dias)`;
}

// Helper para validar formato do prazo de pagamento
export function validarPrazoPagamento(prazoPagamento: string): { valido: boolean; erro?: string } {
  if (!prazoPagamento || prazoPagamento.trim() === '') {
    return { valido: false, erro: 'Prazo de pagamento é obrigatório' };
  }

  // Validar formato: deve ser números separados por barra
  const regex = /^(\d+)(\/\d+)*$/;
  if (!regex.test(prazoPagamento)) {
    return { 
      valido: false, 
      erro: 'Formato inválido. Use números separados por barra (ex: 30 ou 30/60/90)' 
    };
  }

  // Validar se os prazos estão em ordem crescente
  const parcelas = prazoPagamento.split('/').map(p => parseInt(p, 10));
  for (let i = 1; i < parcelas.length; i++) {
    if (parcelas[i] <= parcelas[i - 1]) {
      return { 
        valido: false, 
        erro: 'Os prazos devem estar em ordem crescente (ex: 30/60/90)' 
      };
    }
  }

  return { valido: true };
}

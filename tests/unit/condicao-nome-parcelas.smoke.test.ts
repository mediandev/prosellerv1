// Invariante das condições de pagamento (V 1.70, incidente "10/15/20 → 20 dias"):
// o nome gerado usa TODAS as parcelas, nunca só a última. O faturamento usa o
// intervalo_parcela (dado), nunca o nome — mas o nome orienta o vendedor no pedido.
// Keep in sync com gerarDescricao em supabase/functions/condicoes-pagamento-v2/index.ts.

import { describe, it, expect } from 'vitest';

function processarPrazoPagamento(prazoInput: string): { intervaloParcela: number[] } {
  if (!prazoInput || prazoInput.trim() === '') return { intervaloParcela: [] };
  const valores = prazoInput
    .split('/')
    .map((v) => v.trim())
    .filter((v) => v !== '')
    .map((v) => parseFloat(v))
    .filter((v) => !isNaN(v) && v >= 0);
  return { intervaloParcela: valores };
}

function gerarDescricao(formaPagamentoNome: string, prazoInput: string, desconto: number): string {
  const { intervaloParcela } = processarPrazoPagamento(prazoInput);
  let prazoTexto: string;
  if (intervaloParcela.length === 0) {
    prazoTexto = 'À vista';
  } else if (intervaloParcela.length === 1) {
    prazoTexto = intervaloParcela[0] === 0 ? 'À vista' : `${intervaloParcela[0]} dias`;
  } else {
    prazoTexto = `${intervaloParcela.join('/')} dias`;
  }
  const descontoTexto = desconto > 0 ? `desc extra ${desconto}%` : 'desc extra 0%';
  return `${formaPagamentoNome} - ${prazoTexto} - ${descontoTexto}`;
}

describe('Condição de pagamento — nome com TODAS as parcelas (V 1.70)', () => {
  it('caso do incidente: 10/15/20 não vira "20 dias"', () => {
    expect(gerarDescricao('boleto', '10/15/20', 0)).toBe('boleto - 10/15/20 dias - desc extra 0%');
  });

  it('caso da condição ID 15: 10/20/30', () => {
    expect(gerarDescricao('boleto', '10/20/30', 0)).toBe('boleto - 10/20/30 dias - desc extra 0%');
  });

  it('parcela única continua "N dias" (sem regressão)', () => {
    expect(gerarDescricao('boleto', '30', 0)).toBe('boleto - 30 dias - desc extra 0%');
  });

  it('prazo 0 é "À vista"', () => {
    expect(gerarDescricao('boleto', '0', 0)).toBe('boleto - À vista - desc extra 0%');
  });

  it('desconto extra aparece no nome', () => {
    expect(gerarDescricao('pix', '30/60/90', 5)).toBe('pix - 30/60/90 dias - desc extra 5%');
  });

  it('entrada suja (espaços, barras extras) não corrompe', () => {
    expect(gerarDescricao('boleto', ' 10 / 20 / 30 ', 0)).toBe('boleto - 10/20/30 dias - desc extra 0%');
    expect(gerarDescricao('boleto', '10//20', 0)).toBe('boleto - 10/20 dias - desc extra 0%');
  });
});

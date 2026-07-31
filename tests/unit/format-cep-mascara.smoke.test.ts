// Invariante do CEP (migration 146 + V 1.74, decisão do cliente 2026-07-31):
// banco guarda SÓ dígitos preservando zeros à esquerda; exibição usa máscara
// NN.NNN-NNN (ponto + hífen).
// Keep in sync com formatCEP em src/components/CustomerFormDadosCadastrais.tsx.

import { describe, it, expect } from 'vitest';

const formatCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2}\.\d{3})(\d)/, '$1-$2');
};

const normalizaCepBanco = (value: string) => value.replace(/\D/g, '').slice(0, 8);

describe('CEP — máscara de exibição NN.NNN-NNN (V 1.74)', () => {
  it('formata 8 dígitos com ponto e hífen', () => {
    expect(formatCEP('13345400')).toBe('13.345-400');
  });

  it('preserva zero à esquerda (nunca tratar CEP como número)', () => {
    expect(formatCEP('01310100')).toBe('01.310-100');
    expect(normalizaCepBanco('01.310-100')).toBe('01310100');
  });

  it('é idempotente: mascarar um valor já mascarado não corrompe', () => {
    expect(formatCEP(formatCEP('13345400'))).toBe('13.345-400');
  });

  it('aceita o formato corrompido legado (13.345400) e re-normaliza', () => {
    expect(normalizaCepBanco('13.345400')).toBe('13345400');
    expect(formatCEP('13.345400')).toBe('13.345-400');
  });

  it('entrada parcial durante digitação não quebra', () => {
    expect(formatCEP('1')).toBe('1');
    expect(formatCEP('133')).toBe('13.3');
    expect(formatCEP('13345')).toBe('13.345');
  });

  it('descarta excedente além de 8 dígitos', () => {
    expect(formatCEP('133454009999')).toBe('13.345-400');
  });
});

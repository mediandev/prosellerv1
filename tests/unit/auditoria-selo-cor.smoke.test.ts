import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tomAcao, rotuloAcao, descreverDetalhe, ACOES } from '../../src/services/auditoriaService';

/**
 * Smoke da tela de Auditoria (V 1.80).
 *
 * Por que este teste existe: o projeto serve CSS PRÉ-COMPILADO — não há Tailwind
 * gerando classe sob demanda. Usar uma classe que não está em `src/index.css`
 * não quebra nada: simplesmente não pinta. Foi o que aconteceu em produção com
 * `bg-rose-100`/`bg-emerald-100`, e os selos de Exclusão e Criação apareceram
 * sem cor — falha silenciosa, a classe de defeito que este sistema mais teve.
 *
 * Este teste lê o CSS de verdade e exige que toda classe usada exista lá.
 */

const CSS = readFileSync(resolve(__dirname, '../../src/index.css'), 'utf8');

describe('auditoria — selo de ação', () => {
  it.each(Object.keys(ACOES))('a cor de "%s" usa classes que existem no CSS', (acao) => {
    for (const classe of tomAcao(acao).split(/\s+/)) {
      expect(CSS.includes(`.${classe}`), `classe "${classe}" não existe em src/index.css — o selo sairia sem cor`).toBe(true);
    }
  });

  // Ações do mesmo grupo COMPARTILHAM cor de propósito (excluir, desativar e
  // rejeitar são todas destrutivas). O que não pode é destrutivo e construtivo
  // saírem iguais — aí a cor deixa de informar qualquer coisa.
  it.each([
    ['destrutivo', ['excluiu', 'desativou', 'rejeitou']],
    ['construtivo', ['criou', 'aprovou', 'reativou']],
  ])('ações %s compartilham a mesma cor', (_grupo, acoes) => {
    expect(new Set((acoes as string[]).map(tomAcao)).size).toBe(1);
  });

  it('destrutivo, construtivo e neutro têm cores diferentes entre si', () => {
    const cores = [tomAcao('excluiu'), tomAcao('criou'), tomAcao('alterou')];
    expect(new Set(cores).size).toBe(3);
  });

  it('toda ação conhecida tem rótulo em português', () => {
    for (const acao of Object.keys(ACOES)) {
      expect(rotuloAcao(acao)).not.toBe(acao);
    }
  });
});

describe('auditoria — descrição da mudança', () => {
  const registro = (detalhe: unknown) => ({
    id: 1, ocorrido_em: '2026-08-03T19:44:00Z', acao: 'alterou',
    entidade: 'Conta Corrente', entidade_id: '9', usuario_id: null,
    usuario_nome: 'Sistema', descricao: '', detalhe,
  });

  it('alteração vira "campo: de → para"', () => {
    const texto = descreverDetalhe(registro([{ campo: 'valor', de: '1.00', para: '2.00' }]));
    expect(texto).toBe('valor: 1.00 → 2.00');
  });

  it('campo que estava vazio é dito explicitamente', () => {
    const texto = descreverDetalhe(registro([{ campo: 'titulo', de: null, para: 'Novo' }]));
    expect(texto).toContain('(vazio)');
  });

  it('exclusão mostra o que identifica o registro apagado', () => {
    const texto = descreverDetalhe(registro({ id: 9, valor: 2, titulo: 'Compromisso X' }));
    expect(texto).toContain('valor: 2');
    expect(texto).toContain('Compromisso X');
  });

  it('sem detalhe não quebra', () => {
    expect(descreverDetalhe(registro(null))).toBe('');
  });
});

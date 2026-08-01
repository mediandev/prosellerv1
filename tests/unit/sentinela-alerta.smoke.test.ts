import { describe, it, expect } from 'vitest';
import {
  resumirAlerta,
  agruparPorRegra,
  rotuloRegra,
  explicacaoRegra,
  REGRAS_SENTINELA,
  type SentinelaAlerta,
} from '../../src/services/sentinelaService';

/**
 * Smoke test da tela Sentinela (V 1.76).
 *
 * Por que existe: o valor da sentinela depende do alerta ser LEGÍVEL por quem
 * não conhece o banco. Se `resumirAlerta` cair no default, a tela mostra a
 * chave crua (`wipe_campo_cliente:6705:nome_fantasia`) e o alerta vira ruído —
 * uma falha silenciosa da própria estrutura anti-falha-silenciosa.
 *
 * Fixa: toda regra conhecida tem rótulo, explicação e resumo próprio (não-default).
 */

const alerta = (regra: string, detalhe: Record<string, unknown>): SentinelaAlerta => ({
  id: 1,
  regra,
  chave: `${regra}:chave-crua`,
  detalhe,
  criado_em: '2026-08-01T12:00:00Z',
  resolvido_em: null,
});

describe('sentinela — resumo legível do alerta', () => {
  it('descreve campo apagado com cliente, campo e valor perdido', () => {
    const texto = resumirAlerta(
      alerta('wipe_campo_cliente', {
        cliente_id: 6705,
        campo: 'nome_fantasia',
        label: 'Nome Fantasia',
        valor_anterior: 'Época Cosméticos',
        usuario: 'Valentim',
      }),
    );
    expect(texto).toContain('6705');
    expect(texto).toContain('Nome Fantasia');
    expect(texto).toContain('Época Cosméticos');
    expect(texto).toContain('Valentim');
  });

  it('usa o nome técnico do campo quando não há label', () => {
    const texto = resumirAlerta(
      alerta('wipe_campo_cliente', { cliente_id: 1, campo: 'grupo_id', valor_anterior: 'x' }),
    );
    expect(texto).toContain('grupo_id');
  });

  it('não quebra quando `detalhe` vem nulo', () => {
    const semDetalhe: SentinelaAlerta = { ...alerta('cep_invalido', {}), detalhe: null };
    expect(() => resumirAlerta(semDetalhe)).not.toThrow();
  });

  it('cai na chave crua apenas para regra desconhecida', () => {
    expect(resumirAlerta(alerta('regra_que_nao_existe', {}))).toBe('regra_que_nao_existe:chave-crua');
  });

  // Esta é a asserção que protege contra "alerta ilegível": qualquer regra nova
  // adicionada ao mapa precisa também ganhar um `case` em resumirAlerta.
  it.each(Object.keys(REGRAS_SENTINELA).filter((r) => r !== 'wipe_observacao'))(
    'regra %s tem rótulo, explicação e resumo próprio',
    (regra) => {
      expect(rotuloRegra(regra)).not.toBe(regra);
      expect(explicacaoRegra(regra).length).toBeGreaterThan(10);
      expect(resumirAlerta(alerta(regra, {}))).not.toBe(`${regra}:chave-crua`);
    },
  );
});

describe('sentinela — agrupamento', () => {
  it('ordena as regras da mais violada para a menos', () => {
    const grupos = agruparPorRegra([
      alerta('cep_invalido', {}),
      alerta('wipe_campo_cliente', {}),
      alerta('wipe_campo_cliente', {}),
      alerta('wipe_campo_cliente', {}),
      alerta('cep_invalido', {}),
    ]);
    expect(grupos.map((g) => g.regra)).toEqual(['wipe_campo_cliente', 'cep_invalido']);
    expect(grupos[0].itens).toHaveLength(3);
    expect(grupos[1].itens).toHaveLength(2);
  });

  it('lista vazia gera zero grupos (estado "tudo em conformidade")', () => {
    expect(agruparPorRegra([])).toEqual([]);
  });
});

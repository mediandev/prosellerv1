// Unit Vitest do mapper SSW → status_entrega (F-LOG-CRM R-LOG-4).
// Cobre todos os caminhos do mapeamento definido no plano R-LOG-4.

import { describe, it, expect } from 'vitest';

// ⚠️ ATENÇÃO: este arquivo REIMPLEMENTA o mapper (os helpers são módulos Deno e
// o Vitest não os carrega). Portanto ele NÃO protege o código de produção — é uma
// cópia testando a si mesma. Descoberto em 2026-08-03, quando a troca de status
// foi feita na função real e este arquivo continuou verde.
// A cobertura de verdade, sobre a função REAL, está em
// tests/edge/ssw-tracking-helpers.test.ts. Mantido aqui só como documentação
// executável das regras de mapeamento; se divergir da função real, é este que está
// errado.

type StatusEntrega =
  | 'Em Separação'
  | 'Aguardando Coleta'
  | 'Em Trânsito'
  | 'Aguardando Agendamento'
  | 'Em Trânsito - Reentrega'
  | 'Entregue'
  | 'Agendado'
  | 'Recusado'
  | 'Devolvido - Trânsito'
  | 'Devolvido - Entregue';

function mapOcorrenciaToStatus(tipo: string, ocorrencia: string): StatusEntrega {
  if (tipo === 'Entrega' && /\(01\)/.test(ocorrencia)) return 'Entregue';
  if (/DEVOLU[CÇ][AÃ]O\s+ENTREGUE/i.test(ocorrencia) || /DEVOLVIDO\s*-\s*ENTREGUE/i.test(ocorrencia)) return 'Devolvido - Entregue';
  if (/DEVOLVID[AO]/i.test(ocorrencia) || /DEVOLU[CÇ][AÃ]O/i.test(ocorrencia)) return 'Devolvido - Trânsito';
  if (/RECUSAD[AO]/i.test(ocorrencia)) return 'Recusado';
  if (tipo === 'Cliente' && /\(02\)/.test(ocorrencia)) return 'Agendado';
  if (/AGENDAD[AO]\s*\(08\)/i.test(ocorrencia)) return 'Agendado';
  if (/REENTREGA/i.test(ocorrencia.toUpperCase())) return 'Aguardando Agendamento';
  return 'Em Trânsito';
}

function isTerminalStatus(status: string): boolean {
  return status === 'Entregue' || status === 'Devolvido - Entregue';
}

describe('mapOcorrenciaToStatus (R-LOG-4)', () => {
  it('tipo Entrega + (01) → Entregue', () => {
    expect(mapOcorrenciaToStatus('Entrega', 'MERCADORIA ENTREGUE (01)')).toBe('Entregue');
  });

  it('tipo Cliente + (02) → Agendado', () => {
    expect(mapOcorrenciaToStatus('Cliente', 'AGUARDANDO AGENDAMENTO DO CLIENTE (02)')).toBe('Agendado');
  });

  it('AGENDADA (08) → Agendado', () => {
    expect(mapOcorrenciaToStatus('Informativo', 'ENTREGA AGENDADA (08)')).toBe('Agendado');
  });

  it('RECUSADA → Recusado', () => {
    expect(mapOcorrenciaToStatus('Cliente', 'MERCADORIA RECUSADA PELO DESTINATÁRIO')).toBe('Recusado');
  });

  it('DEVOLVIDA → Devolvido - Trânsito', () => {
    expect(mapOcorrenciaToStatus('Informativo', 'MERCADORIA DEVOLVIDA EM TRANSITO')).toBe('Devolvido - Trânsito');
  });

  it('DEVOLUÇÃO ENTREGUE → Devolvido - Entregue', () => {
    expect(mapOcorrenciaToStatus('Entrega', 'DEVOLUÇÃO ENTREGUE AO REMETENTE')).toBe('Devolvido - Entregue');
  });

  it('DEVOLVIDO - ENTREGUE variant → Devolvido - Entregue', () => {
    expect(mapOcorrenciaToStatus('Informativo', 'DEVOLVIDO - ENTREGUE')).toBe('Devolvido - Entregue');
  });

  it('REENTREGA → Aguardando Agendamento', () => {
    expect(mapOcorrenciaToStatus('Informativo', 'SAIU PARA REENTREGA')).toBe('Aguardando Agendamento');
  });

  it('Informativo genérico → Em Trânsito', () => {
    expect(mapOcorrenciaToStatus('Informativo', 'DOCUMENTO DE TRANSPORTE EMITIDO (67)')).toBe('Em Trânsito');
  });

  it('tipo desconhecido → Em Trânsito', () => {
    expect(mapOcorrenciaToStatus('Sistema', 'EVENTO QUALQUER')).toBe('Em Trânsito');
  });
});

describe('isTerminalStatus (R-LOG-4)', () => {
  it('Entregue é terminal', () => expect(isTerminalStatus('Entregue')).toBe(true));
  it('Devolvido - Entregue é terminal', () => expect(isTerminalStatus('Devolvido - Entregue')).toBe(true));
  it('Em Trânsito NÃO é terminal', () => expect(isTerminalStatus('Em Trânsito')).toBe(false));
  it('Recusado NÃO é terminal', () => expect(isTerminalStatus('Recusado')).toBe(false));
});

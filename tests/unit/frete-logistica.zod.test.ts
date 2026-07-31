// Unit Vitest do schema Zod `FreteLogisticaCreate` (F-LOG-CRM R-LOG-1).
// Cobre CA-5 do F-LOG-1: o schema rejeita payload inválido e aceita válido.

import { describe, it, expect } from 'vitest';
import {
  FreteLogisticaCreate,
  StatusEntregaFrete,
} from '@shared/types/frete-logistica';
import {
  TransportadorLogisticaCreate,
  GrupoTransportador,
} from '@shared/types/transportador-logistica';

describe('FreteLogisticaCreate (F-LOG-CRM R-LOG-1)', () => {
  it('aceita payload mínimo válido (empresaId obrigatório, defaults preenchidos)', () => {
    const result = FreteLogisticaCreate.safeParse({ empresaId: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.empresaId).toBe(1);
      expect(result.data.statusEntrega).toBe('Em Separação');
      expect(result.data.valorProdutos).toBe(0);
      expect(result.data.rateio).toBe(false);
      expect(result.data.reentrega).toBe(false);
    }
  });

  it('rejeita quando empresaId ausente', () => {
    const result = FreteLogisticaCreate.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejeita valor_produtos negativo', () => {
    const result = FreteLogisticaCreate.safeParse({
      empresaId: 1,
      valorProdutos: -10,
    });
    expect(result.success).toBe(false);
  });

  it('rejeita NFe chave de acesso com formato errado', () => {
    const result = FreteLogisticaCreate.safeParse({
      empresaId: 1,
      nfeChaveAcesso: '12345', // não tem 44 dígitos
    });
    expect(result.success).toBe(false);
  });

  it('aceita NFe chave de acesso com exatamente 44 dígitos', () => {
    const result = FreteLogisticaCreate.safeParse({
      empresaId: 1,
      nfeChaveAcesso: '1'.repeat(44),
    });
    expect(result.success).toBe(true);
  });

  // ⚠️ PENDÊNCIA CONHECIDA (2026-07-31): o zod/front trocou 'Em Trânsito - Reentrega'
  // por 'Aguardando Agendamento' (changelog V1.5x), mas o ENUM DO BANCO nunca foi
  // migrado (segue com Reentrega e SEM Aguardando Agendamento). Consequências reais:
  // drop no Kanban p/ "Aguardando Agendamento" é rejeitado pelo banco; o resolver SSW
  // ainda pode gravar Reentrega, que o front não exibe. Registrado em
  // docs/plans/EXECUCAO-LOTE-2026-07.md para completar a migração do enum.
  // Este teste valida o schema zod COMO ESTÁ HOJE.
  it('aceita todos os 9 valores de StatusEntregaFrete', () => {
    const status: Array<string> = [
      'Em Separação',
      'Aguardando Coleta',
      'Em Trânsito',
      'Aguardando Agendamento',
      'Entregue',
      'Agendado',
      'Recusado',
      'Devolvido - Trânsito',
      'Devolvido - Entregue',
    ];
    for (const s of status) {
      expect(StatusEntregaFrete.safeParse(s).success).toBe(true);
    }
  });

  it('rejeita StatusEntregaFrete fora do enum', () => {
    expect(StatusEntregaFrete.safeParse('Inválido').success).toBe(false);
  });
});

describe('TransportadorLogisticaCreate (F-LOG-CRM R-LOG-1)', () => {
  it('aceita payload mínimo com CNPJ digits-only', () => {
    const result = TransportadorLogisticaCreate.safeParse({
      razaoSocial: 'Transportadora Teste S.A.',
      cnpj: '12345678000190',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.grupo).toBe('OUTROS');
    }
  });

  it('rejeita CNPJ formatado (com pontos/barras)', () => {
    const result = TransportadorLogisticaCreate.safeParse({
      razaoSocial: 'Transp.',
      cnpj: '12.345.678/0001-90',
    });
    expect(result.success).toBe(false);
  });

  it('rejeita razaoSocial curta', () => {
    const result = TransportadorLogisticaCreate.safeParse({
      razaoSocial: 'A',
      cnpj: '12345678000190',
    });
    expect(result.success).toBe(false);
  });

  it('aceita todos os 5 valores de GrupoTransportador', () => {
    const grupos = ['ATIVA', 'BRASSPRESS', 'TA_AMERICANA', 'CAMILO', 'OUTROS'];
    for (const g of grupos) {
      expect(GrupoTransportador.safeParse(g).success).toBe(true);
    }
  });
});

// Unit Vitest do schema Zod SSW Tracking (F-LOG-CRM R-LOG-4).
// Cobre: parse de resposta SSW success com dados reais, parse de erro, union discriminada.

import { describe, it, expect } from 'vitest';
import {
  SswTrackingResponse,
  SswTrackingSuccess,
  SswTrackingError,
  SswTrackingItem,
} from '@shared/types/ssw-tracking';

const REAL_SUCCESS_RESPONSE = {
  success: true as const,
  message: 'Documento localizado com sucesso',
  documento: {
    header: {
      remetente: 'CANTICO DISTRIBUIDORA DE COSMETICOS LTDA',
      destinatario: 'RAIA DROGASIL S/A',
      nro_nf: '6299',
      pedido: '',
    },
    tracking: [
      {
        data_hora: '2026-05-15T14:30:00',
        dominio: 'FAV',
        filial: 'VIX',
        cidade: 'VIANA / ES',
        ocorrencia: 'DOCUMENTO DE TRANSPORTE EMITIDO (67)',
        descricao: 'CT-e emitido pela transportadora',
        tipo: 'Informativo',
        data_hora_efetiva: '2026-05-15T14:30:00',
        nome_recebedor: '',
        nro_doc_recebedor: '',
        codigo_ssw: '80',
      },
      {
        data_hora: '2026-05-20T09:15:00',
        dominio: 'FAV',
        filial: 'CBA',
        cidade: 'CUIABA / MT',
        ocorrencia: 'MERCADORIA ENTREGUE (01)',
        descricao: 'Entrega realizada com sucesso',
        tipo: 'Entrega',
        data_hora_efetiva: '2026-05-20T09:15:00',
        nome_recebedor: 'MARIA SILVA',
        nro_doc_recebedor: '12345678900',
        codigo_ssw: '01',
      },
    ],
  },
};

const ERROR_RESPONSE = {
  success: false as const,
  message: 'Nenhum documento localizado',
};

describe('SswTrackingResponse Zod (R-LOG-4)', () => {
  it('parse de resposta success com tracking real', () => {
    const result = SswTrackingResponse.safeParse(REAL_SUCCESS_RESPONSE);
    expect(result.success).toBe(true);
    if (result.success && result.data.success) {
      expect(result.data.documento.tracking).toHaveLength(2);
      expect(result.data.documento.header.nro_nf).toBe('6299');
    }
  });

  it('parse de resposta error', () => {
    const result = SswTrackingResponse.safeParse(ERROR_RESPONSE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      if (!result.data.success) {
        expect(result.data.message).toBe('Nenhum documento localizado');
      }
    }
  });

  it('SswTrackingItem aceita item com nome_recebedor preenchido', () => {
    const item = REAL_SUCCESS_RESPONSE.documento.tracking[1];
    const result = SswTrackingItem.safeParse(item);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nome_recebedor).toBe('MARIA SILVA');
      expect(result.data.tipo).toBe('Entrega');
    }
  });

  it('discriminated union rejeita success sem documento', () => {
    const invalid = { success: true, message: 'ok' };
    const result = SswTrackingResponse.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejeita payload sem campo success', () => {
    const result = SswTrackingResponse.safeParse({ message: 'no success field' });
    expect(result.success).toBe(false);
  });
});

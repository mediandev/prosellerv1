// sentinelaService.ts — leitura dos alertas da SENTINELA (migrations 148/150).
//
// A sentinela roda no banco (cron `sentinela-diaria`, 6h BRT) e grava violações de
// invariante em `sentinela_alerta`. Até V1.75 esses alertas só eram visíveis por SQL —
// ou seja, detecção sem notificação. Este serviço leva o alerta para dentro do app.
//
// Acesso via supabase-js direto (RLS: SELECT liberado para `authenticated`),
// mesmo padrão já usado em Storage/logística. Somente leitura: a resolução dos
// alertas é automática no próprio banco quando a violação some.

import { getSupabaseClient } from './supabase';

export interface SentinelaAlerta {
  id: number;
  regra: string;
  chave: string;
  detalhe: Record<string, unknown> | null;
  criado_em: string;
  resolvido_em: string | null;
}

/** Rótulo e explicação de cada regra, em português, para quem não conhece o banco. */
export const REGRAS_SENTINELA: Record<string, { titulo: string; explicacao: string }> = {
  wipe_campo_cliente: {
    titulo: 'Campo de cliente apagado',
    explicacao:
      'Um campo que tinha valor ficou vazio e continua vazio. Foi a classe do incidente de dados dos clientes (Época).',
  },
  comissao_pedido_excluido: {
    titulo: 'Comissão de pedido excluído',
    explicacao: 'Existe comissão com valor para um pedido que foi excluído — deveria ter sido estornada.',
  },
  pedido_aberto_sem_tiny: {
    titulo: 'Pedido sem confirmação do ERP',
    explicacao: 'Pedido marcado como enviado, mas sem ID do Tiny — indício de envio que não chegou ao ERP.',
  },
  frete_entregue_preso: {
    titulo: 'Frete entregue preso em trânsito',
    explicacao: 'A transportadora registrou a entrega, mas o frete continua num status não-terminal.',
  },
  cep_invalido: {
    titulo: 'CEP fora do padrão',
    explicacao: 'CEP gravado com caracteres não numéricos ou fora das 8 posições.',
  },
  cliente_novo_sem_condicao: {
    titulo: 'Cliente novo sem condição de pagamento',
    explicacao: 'Cliente criado após 29/07 sem nenhuma condição de pagamento vinculada.',
  },
  condicao_nome_divergente: {
    titulo: 'Condição parcelada com nome divergente',
    explicacao: 'O nome da condição não reflete o intervalo de parcelas configurado.',
  },
  wipe_observacao: {
    titulo: 'Observação de contato apagada',
    explicacao: 'Regra antiga, substituída por "Campo de cliente apagado" na V1.76.',
  },
};

export const rotuloRegra = (regra: string): string =>
  REGRAS_SENTINELA[regra]?.titulo ?? regra;

export const explicacaoRegra = (regra: string): string =>
  REGRAS_SENTINELA[regra]?.explicacao ?? '';

/** Alertas em aberto (violação ativa agora), mais recentes primeiro. */
export async function listarAlertasAbertos(): Promise<SentinelaAlerta[]> {
  const { data, error } = await getSupabaseClient()
    .from('sentinela_alerta')
    .select('id, regra, chave, detalhe, criado_em, resolvido_em')
    .is('resolvido_em', null)
    .order('criado_em', { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data ?? []) as SentinelaAlerta[];
}

// Cache curto para o badge do menu não disparar uma query por render.
let cache: { at: number; total: number } | null = null;
const CACHE_MS = 60_000;

/** Total de alertas em aberto. Falha silenciosa: badge nunca quebra a navegação. */
export async function contarAlertasAbertos(): Promise<number> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.total;

  try {
    const { count, error } = await getSupabaseClient()
      .from('sentinela_alerta')
      .select('id', { count: 'exact', head: true })
      .is('resolvido_em', null);

    if (error) throw new Error(error.message);
    cache = { at: Date.now(), total: count ?? 0 };
    return cache.total;
  } catch (e) {
    console.warn('[SENTINELA] contagem indisponível:', e);
    return cache?.total ?? 0;
  }
}

export function invalidarCacheSentinela(): void {
  cache = null;
}

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

const formatarDataHora = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
};

/**
 * Resumo legível do alerta a partir do jsonb `detalhe`, sem exigir leitura de JSON.
 * Fica no serviço (e não no componente) para poder ser testado sem a cadeia de
 * imports versionados do shadcn — mesma restrição dos outros smoke tests do repo.
 */
export function resumirAlerta(alerta: Pick<SentinelaAlerta, 'regra' | 'chave' | 'detalhe'>): string {
  const d = alerta.detalhe ?? {};
  const v = (k: string) => (d[k] === undefined || d[k] === null ? '' : String(d[k]));

  switch (alerta.regra) {
    case 'wipe_campo_cliente':
      return `Cliente ${v('cliente_id')} · campo "${v('label') || v('campo')}" · valor perdido: "${v('valor_anterior')}"`
        + (v('usuario') ? ` · por ${v('usuario')}` : '');
    case 'comissao_pedido_excluido':
      return `Pedido ${v('pedido_id')} · comissão de R$ ${v('valor')}`;
    case 'pedido_aberto_sem_tiny':
      return `Pedido ${v('numero')} · status "${v('status')}" sem ID do Tiny`;
    case 'frete_entregue_preso':
      return `NFe ${v('nfe')} · status atual "${v('status')}"`;
    case 'cep_invalido':
      return `CEP gravado: "${v('cep')}"`;
    case 'cliente_novo_sem_condicao':
      return `${v('nome')} · criado em ${v('criado_em') ? formatarDataHora(v('criado_em')) : '—'}`;
    case 'condicao_nome_divergente':
      return `"${v('nome')}" · intervalo configurado: ${v('intervalo')}`;
    default:
      return alerta.chave;
  }
}

/** Agrupa por regra, da regra com mais alertas para a com menos. */
export function agruparPorRegra(
  alertas: SentinelaAlerta[],
): Array<{ regra: string; itens: SentinelaAlerta[] }> {
  const mapa = alertas.reduce<Record<string, SentinelaAlerta[]>>((acc, a) => {
    (acc[a.regra] ||= []).push(a);
    return acc;
  }, {});
  return Object.keys(mapa)
    .sort((a, b) => mapa[b].length - mapa[a].length)
    .map((regra) => ({ regra, itens: mapa[regra] }));
}

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

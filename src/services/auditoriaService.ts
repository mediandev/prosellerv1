// auditoriaService.ts — leitura do registro de auditoria (migration 154).
//
// Decisão do cliente (2026-08-03): registrar ações com impacto, visível só com
// permissão específica, sem prazo de expurgo.
//
// Somente leitura. A tabela não tem policy de UPDATE nem DELETE de propósito:
// registro de auditoria que pode ser editado não serve como auditoria.

import { getSupabaseClient } from './supabase';

export interface RegistroAuditoria {
  id: number;
  ocorrido_em: string;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  usuario_id: string | null;
  usuario_nome: string;
  descricao: string;
  detalhe: unknown;
}

export interface FiltroAuditoria {
  entidade?: string;
  usuario?: string;
  acao?: string;
  de?: string;
  ate?: string;
  limite?: number;
}

/** Rótulo em português para cada ação registrada. */
export const ACOES: Record<string, string> = {
  criou: 'Criação',
  alterou: 'Alteração',
  excluiu: 'Exclusão',
};

export const rotuloAcao = (acao: string): string => ACOES[acao] ?? acao;

/**
 * Cor do selo por tipo de ação — exclusão precisa saltar aos olhos.
 *
 * ⚠️ Só usar classes que EXISTEM em src/index.css. O projeto serve CSS
 * pré-compilado (não há Tailwind gerando classe sob demanda): a primeira versão
 * usava `rose`/`emerald`, que não existem no arquivo, e os selos de Exclusão e
 * Criação saíram sem cor nenhuma em produção. Disponíveis hoje para fundo:
 * amber, gray, green, red (nível 100).
 */
export const tomAcao = (acao: string): string => {
  if (acao === 'excluiu') return 'bg-red-100 text-red-800';
  if (acao === 'criou') return 'bg-green-100 text-green-800';
  return 'bg-amber-100 text-amber-800';
};

/**
 * Descreve a mudança em uma frase legível, sem exigir leitura de JSON.
 * Ex.: 'valor: 1.500,00 → 2.000,00'
 */
export function descreverDetalhe(registro: RegistroAuditoria): string {
  const d = registro.detalhe;
  if (!d) return '';

  // Alteração: lista de {campo, de, para}
  if (Array.isArray(d)) {
    return d
      .map((m: any) => `${m.campo}: ${m.de ?? '(vazio)'} → ${m.para ?? '(vazio)'}`)
      .join(' · ');
  }

  // Exclusão: a linha inteira que foi apagada. Mostra só o que ajuda a
  // reconhecer o registro — o objeto completo fica no banco para quem precisar.
  if (typeof d === 'object') {
    const o = d as Record<string, unknown>;
    const interessantes = ['valor', 'valor_comissao', 'titulo', 'descricao', 'periodo', 'tipo', 'status'];
    const partes = interessantes
      .filter((k) => o[k] !== undefined && o[k] !== null && o[k] !== '')
      .map((k) => `${k}: ${String(o[k])}`);
    return partes.join(' · ');
  }

  return '';
}

export async function listarAuditoria(filtro: FiltroAuditoria = {}): Promise<RegistroAuditoria[]> {
  let q = getSupabaseClient()
    .from('auditoria')
    .select('id, ocorrido_em, acao, entidade, entidade_id, usuario_id, usuario_nome, descricao, detalhe')
    .order('ocorrido_em', { ascending: false })
    .limit(filtro.limite ?? 200);

  if (filtro.entidade) q = q.eq('entidade', filtro.entidade);
  if (filtro.acao) q = q.eq('acao', filtro.acao);
  if (filtro.usuario) q = q.ilike('usuario_nome', `%${filtro.usuario}%`);
  if (filtro.de) q = q.gte('ocorrido_em', filtro.de);
  if (filtro.ate) q = q.lte('ocorrido_em', `${filtro.ate}T23:59:59`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as RegistroAuditoria[];
}

/** Entidades presentes no registro, para montar o filtro sem lista fixa. */
export async function listarEntidades(): Promise<string[]> {
  const { data, error } = await getSupabaseClient()
    .from('auditoria')
    .select('entidade')
    .limit(1000);
  if (error) return [];
  return [...new Set((data ?? []).map((r: any) => r.entidade))].sort();
}

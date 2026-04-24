// F-001 · Helper puro para resolver qual `tiny_valor` usar ao enviar pedido Tiny.
// Consumido por `tiny-enviar-pedido-venda-v1` (Deno Edge Function) e pelos
// smoke tests em `tests/edge/simples-nacional.test.ts`.
//
// Fonte de verdade dos tipos: `packages/shared/types/natureza-operacao.ts`.
// O helper aceita um subset estrutural (NaturezaMapeamento) para permanecer
// trivialmente testável sem importar zod do runtime Deno.

export type FallbackUsed =
  | "none"
  | "no_dual"
  | "no_dual_company"
  | "null_optante"
  | "revalidation_failed";

export interface NaturezaMapeamento {
  tinyValor: string;
  tinyValorSimples: string | null;
}

export interface ResolveNaturezaParams {
  mapeamento: NaturezaMapeamento;
  optanteSimples: boolean | null;
  /**
   * DP-006 (2026-04-24): quando `false`, a empresa inteira não possui nenhum
   * mapeamento ativo com `tiny_valor_simples` preenchido — o caller já
   * evitou a consulta ReceitaWS, e aqui apenas retornamos `tinyValor` com
   * fallback `no_dual_company` para registrar a razão no log.
   * Default (ausente ou `true`): comportamento pré-DP-006 (avalia per-row).
   */
  companyHasDualMapping?: boolean;
}

export interface ResolveNaturezaResult {
  tinyValor: string;
  fallbackUsed: FallbackUsed;
}

/**
 * Escolhe `tiny_valor` para o payload Tiny aplicando as regras de F-001 (CA-007):
 *  - DP-006: `companyHasDualMapping === false` → `tinyValor`, fallback "no_dual_company".
 *  - Mapeamento sem dual (`tinyValorSimples` null/vazio) → usa `tinyValor`, fallback "no_dual".
 *  - Mapeamento com dual e `optanteSimples === null` → usa `tinyValor`, fallback "null_optante".
 *  - Mapeamento com dual e `optanteSimples === true` → usa `tinyValorSimples`, fallback "none".
 *  - Mapeamento com dual e `optanteSimples === false` → usa `tinyValor`, fallback "none".
 *
 * Função 100% pura: sem I/O, sem logging, sem exceptions. O caller (a Edge
 * Function) é quem constrói o evento `natureza.resolvida` conforme o schema
 * `NaturezaOperacaoResolucao` em `packages/shared/types/natureza-operacao.ts`
 * usando `traceId`, `empresaId`, `naturezaOperacaoId` + este resultado.
 */
export function resolveNaturezaTiny(
  params: ResolveNaturezaParams,
): ResolveNaturezaResult {
  const { mapeamento, optanteSimples, companyHasDualMapping } = params;

  // DP-006 · Short-circuit: empresa inteira sem dual-ID. Precede regras
  // per-row porque, se a empresa não tem NENHUM mapeamento com Simples,
  // o log deve indicar a razão empresa-level (e não row-level).
  if (companyHasDualMapping === false) {
    return { tinyValor: mapeamento.tinyValor, fallbackUsed: "no_dual_company" };
  }

  const tinyValorSimples =
    mapeamento.tinyValorSimples === null ||
    mapeamento.tinyValorSimples === ""
      ? null
      : mapeamento.tinyValorSimples;

  if (tinyValorSimples === null) {
    return { tinyValor: mapeamento.tinyValor, fallbackUsed: "no_dual" };
  }

  if (optanteSimples === null) {
    return { tinyValor: mapeamento.tinyValor, fallbackUsed: "null_optante" };
  }

  if (optanteSimples === true) {
    return { tinyValor: tinyValorSimples, fallbackUsed: "none" };
  }

  return { tinyValor: mapeamento.tinyValor, fallbackUsed: "none" };
}

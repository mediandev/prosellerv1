import { z } from "zod";

/**
 * Mapeamento empresa × natureza de operação ProSeller → valor Tiny.
 * Espelha a tabela `tiny_empresa_natureza_operacao` (migration 085) com a
 * extensão dual-ID introduzida por F-001 via migration 108.
 *
 * Invariante: se `tinyValorSimples` não é null, `tinyValor` também não pode
 * ser null/vazio (ver CB-003 e DP-003 na SPEC).
 */
export const TinyEmpresaNaturezaOperacao = z.object({
  id: z.string(),
  empresaId: z.string(),
  naturezaOperacaoId: z.string(),
  naturezaOperacaoNome: z.string(),
  tinyValor: z.string().min(1),
  tinyValorSimples: z.string().min(1).nullable(),
  ativo: z.boolean(),
});
export type TinyEmpresaNaturezaOperacao = z.infer<typeof TinyEmpresaNaturezaOperacao>;

/**
 * Input do POST para a Edge Function `tiny-empresa-natureza-operacao-v2`.
 * `tinyValorSimples` é opcional:
 *  - ausente / null → "não usar dual-ID" (comportamento pré-F-001 preservado).
 *  - string não-vazia → habilita seleção por optante do Simples no envio.
 *
 * Se `tinyValor` vier vazio, a Edge Function soft-deleta o mapeamento (comportamento
 * atual, ver supabase/functions/tiny-empresa-natureza-operacao-v2/index.ts linhas 147-164).
 * Nesse caso, `tinyValorSimples` é ignorado.
 */
export const TinyEmpresaNaturezaOperacaoUpsertInput = z.object({
  empresaId: z.union([z.string(), z.number()]),
  naturezaOperacaoId: z.union([z.string(), z.number()]),
  tinyValor: z.string(),
  tinyValorSimples: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
});
export type TinyEmpresaNaturezaOperacaoUpsertInput = z.infer<typeof TinyEmpresaNaturezaOperacaoUpsertInput>;

/**
 * Resultado da resolução de qual `tiny_valor` usar ao enviar um pedido Tiny.
 * Produzido internamente pela Edge Function `tiny-enviar-pedido-venda-v1`
 * e emitido em log estruturado — ver RNF-002 e CA-007.
 */
export const NaturezaOperacaoResolucao = z.object({
  event: z.literal("natureza.resolvida"),
  traceId: z.string(),
  empresaId: z.number().int(),
  naturezaOperacaoId: z.number().int(),
  optanteAplicado: z.boolean().nullable(),
  tinyValorEscolhido: z.string(),
  fallbackUsed: z.enum(["none", "no_dual", "no_dual_company", "null_optante", "revalidation_failed"]),
});
export type NaturezaOperacaoResolucao = z.infer<typeof NaturezaOperacaoResolucao>;

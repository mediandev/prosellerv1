import { z } from "zod";

/**
 * Schema de resposta da API ReceitaWS (https://developers.receitaws.com.br/).
 * Somente os campos usados por F-001. A resposta real contém muito mais, mas
 * persistimos apenas `optante` + timestamp — ver Anti-SPEC da SPEC §6.
 *
 * NOTA: plano gratuito da ReceitaWS NÃO retorna o objeto `simples`.
 * Por isso todos os campos são opcionais — ausência é tratada como inconclusiva (CB-001).
 */
export const ReceitaWsSimplesSchema = z
  .object({
    optante: z.boolean().optional(),
    data_opcao: z.string().nullable().optional(),
    data_exclusao: z.string().nullable().optional(),
    ultima_atualizacao: z.string().nullable().optional(),
  })
  .passthrough();

export const ReceitaWsResponseSchema = z
  .object({
    status: z.enum(["OK", "ERROR"]).optional(),
    cnpj: z.string().optional(),
    simples: ReceitaWsSimplesSchema.optional(),
    message: z.string().optional(),
  })
  .passthrough();
export type ReceitaWsResponse = z.infer<typeof ReceitaWsResponseSchema>;

/**
 * Resultado normalizado e pronto para persistir no cliente após a consulta.
 * É o que a Edge Function produz internamente a partir da ReceitaWsResponse.
 */
export const SimplesNacionalLookupResult = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    optante: z.boolean(),
    consultadoEm: z.string().datetime(),
  }),
  z.object({
    status: z.literal("inconclusive"),
    reason: z.enum(["missing_field", "plano_gratuito", "cnpj_inativo"]),
    consultadoEm: z.string().datetime(),
  }),
  z.object({
    status: z.literal("failed"),
    reason: z.enum(["timeout", "rate_limited", "invalid_response", "network_error"]),
    consultadoEm: z.string().datetime(),
  }),
]);
export type SimplesNacionalLookupResult = z.infer<typeof SimplesNacionalLookupResult>;

/**
 * Telemetria emitida a cada chamada ReceitaWS (console.log estruturado,
 * não persistido em tabela — ver Anti-SPEC §6).
 */
export const SimplesNacionalLookupLog = z.object({
  event: z.literal("receitaws.lookup"),
  traceId: z.string(),
  cnpjMasked: z.string(),
  httpStatus: z.number().int().nullable(),
  simplesOptante: z.boolean().nullable(),
  durationMs: z.number().int(),
  outcome: z.enum(["ok", "missing_field", "timeout", "rate_limited", "invalid_response", "network_error"]),
});
export type SimplesNacionalLookupLog = z.infer<typeof SimplesNacionalLookupLog>;

import { z } from "zod";

/**
 * Fragmento do cliente introduzido por F-001 · Consulta Simples Nacional.
 * Esta não é a definição completa de Cliente — a migração do tipo completo
 * de `src/types/customer.ts` para cá é escopo da Onda R-4 (ver TODO §3).
 *
 * Regra de domínio: campos só se aplicam a cliente PJ (CNPJ, 14 dígitos).
 * Cliente PF (CPF) mantém `optanteSimplesNacional = null` permanentemente.
 */
export const ClienteSimplesNacional = z.object({
  optanteSimplesNacional: z.boolean().nullable(),
  optanteSimplesNacionalConsultadoEm: z.string().datetime().nullable(),
});
export type ClienteSimplesNacional = z.infer<typeof ClienteSimplesNacional>;

/**
 * Payload interno usado pela Edge Function para atualizar os 2 campos novos
 * após uma consulta ReceitaWS bem-sucedida. Não é exposto diretamente ao
 * frontend — trafega apenas como UPDATE na tabela `cliente` via supabase-js.
 */
export const ClienteSimplesNacionalUpdate = z.object({
  clienteId: z.number().int().positive(),
  optanteSimplesNacional: z.boolean().nullable(),
  optanteSimplesNacionalConsultadoEm: z.string().datetime(),
});
export type ClienteSimplesNacionalUpdate = z.infer<typeof ClienteSimplesNacionalUpdate>;

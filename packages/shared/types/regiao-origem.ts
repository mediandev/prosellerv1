import { z } from "zod";

/**
 * Lookups de regiões de destino e origens de frete (F-LOG-CRM R-LOG-1).
 * Ambas têm CRUD próprio em Edge Functions distintas:
 *   - `regiao-destino-v1`
 *   - `origem-frete-v1`
 *
 * Regra de domínio: regiões de destino são globais (Brasil); origens são
 * por empresa (cada subsidiária do grupo tem origens distintas).
 */

const ufBR = z
  .string()
  .regex(/^[A-Z]{2}$/, "UF deve ter 2 letras maiúsculas")
  .nullable();

// ---------- Região destino ----------

export const RegiaoDestino = z.object({
  id: z.string(),
  nome: z.string().min(2),
  uf: ufBR,
  ativo: z.boolean(),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
});
export type RegiaoDestino = z.infer<typeof RegiaoDestino>;

export const RegiaoDestinoCreate = z.object({
  nome: z.string().min(2),
  uf: ufBR.optional(),
});
export type RegiaoDestinoCreate = z.infer<typeof RegiaoDestinoCreate>;

export const RegiaoDestinoUpdate = RegiaoDestinoCreate.partial().extend({
  ativo: z.boolean().optional(),
});
export type RegiaoDestinoUpdate = z.infer<typeof RegiaoDestinoUpdate>;

// ---------- Origem frete ----------

export const OrigemFrete = z.object({
  id: z.string(),
  nome: z.string().min(2),
  uf: ufBR,
  empresaId: z.number().int().positive(),
  ativo: z.boolean(),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
});
export type OrigemFrete = z.infer<typeof OrigemFrete>;

export const OrigemFreteCreate = z.object({
  nome: z.string().min(2),
  uf: ufBR.optional(),
  empresaId: z.number().int().positive(),
});
export type OrigemFreteCreate = z.infer<typeof OrigemFreteCreate>;

export const OrigemFreteUpdate = OrigemFreteCreate.partial().extend({
  ativo: z.boolean().optional(),
});
export type OrigemFreteUpdate = z.infer<typeof OrigemFreteUpdate>;

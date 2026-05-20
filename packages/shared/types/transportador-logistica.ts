import { z } from "zod";

/**
 * Schemas Zod do transportador logístico (F-LOG-CRM R-LOG-1).
 * Fonte de verdade dos contratos da Edge Function `transportador-logistica-v1`.
 *
 * Regra de domínio: CNPJ persistido como dígitos puros (14 chars). Sanitização
 * acontece tanto no boundary do form quanto na Edge Function (defesa em 2 camadas
 * — lição do INC-011).
 */

export const GrupoTransportador = z.enum([
  "ATIVA",
  "BRASSPRESS",
  "TA_AMERICANA",
  "CAMILO",
  "OUTROS",
]);
export type GrupoTransportador = z.infer<typeof GrupoTransportador>;

const cnpjDigits = z
  .string()
  .regex(/^[0-9]{14}$/, "CNPJ deve ter 14 dígitos numéricos");

const ufBR = z
  .string()
  .regex(/^[A-Z]{2}$/, "UF deve ter 2 letras maiúsculas")
  .nullable();

export const TransportadorLogistica = z.object({
  id: z.string(),
  razaoSocial: z.string().min(2),
  nomeFantasia: z.string().nullable(),
  cnpj: cnpjDigits,
  inscricaoEstadual: z.string().nullable(),
  uf: ufBR,
  email: z.string().email().nullable(),
  telefone: z.string().nullable(),
  grupo: GrupoTransportador,
  sswDominio: z.string().min(2).max(8).nullable(),
  ativo: z.boolean(),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
});
export type TransportadorLogistica = z.infer<typeof TransportadorLogistica>;

export const TransportadorLogisticaCreate = z.object({
  razaoSocial: z.string().min(2),
  nomeFantasia: z.string().optional().nullable(),
  cnpj: cnpjDigits,
  inscricaoEstadual: z.string().optional().nullable(),
  uf: ufBR.optional(),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  grupo: GrupoTransportador.default("OUTROS"),
  sswDominio: z.string().min(2).max(8).optional().nullable(),
});
export type TransportadorLogisticaCreate = z.infer<typeof TransportadorLogisticaCreate>;

export const TransportadorLogisticaUpdate = TransportadorLogisticaCreate.partial().extend({
  ativo: z.boolean().optional(),
});
export type TransportadorLogisticaUpdate = z.infer<typeof TransportadorLogisticaUpdate>;

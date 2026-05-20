import { z } from "zod";

/**
 * Schemas Zod de Fatura Transportadora + itens (F-LOG-CRM, base criada
 * em R-LOG-1; CRUD em R-LOG-6).
 *
 * Em R-LOG-1 só usamos os schemas para tipar a estrutura. O endpoint
 * `fatura-transportadora-v1` virá apenas na R-LOG-6.
 */

export const StatusFaturaTransportadora = z.enum([
  "Aberta",
  "Paga",
  "Em_Analise",
]);
export type StatusFaturaTransportadora = z.infer<typeof StatusFaturaTransportadora>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data esperada em YYYY-MM-DD");
const isoDateNullable = isoDate.nullable();

// ---------- Item ----------

export const FaturaTransportadoraItem = z.object({
  id: z.string(),
  faturaId: z.string(),
  freteId: z.string().nullable(),
  cteNumero: z.string().nullable(),
  dataEmissaoCte: isoDateNullable,
  nfeNumero: z.number().int().positive().nullable(),
  destinatario: z.string().nullable(),
  valorMercadoria: z.number().min(0).nullable(),
  pesoKg: z.number().min(0).nullable(),
  valorFreteCobrado: z.number().min(0),
});
export type FaturaTransportadoraItem = z.infer<typeof FaturaTransportadoraItem>;

export const FaturaTransportadoraItemCreate = z.object({
  freteId: z.string().optional().nullable(),
  cteNumero: z.string().optional().nullable(),
  dataEmissaoCte: isoDateNullable.optional(),
  nfeNumero: z.number().int().positive().optional().nullable(),
  destinatario: z.string().optional().nullable(),
  valorMercadoria: z.number().min(0).optional().nullable(),
  pesoKg: z.number().min(0).optional().nullable(),
  valorFreteCobrado: z.number().min(0).default(0),
});
export type FaturaTransportadoraItemCreate = z.infer<typeof FaturaTransportadoraItemCreate>;

// ---------- Fatura ----------

export const FaturaTransportadora = z.object({
  id: z.string(),
  transportadorId: z.string(),
  empresaId: z.number().int().positive(),
  numeroFatura: z.string().min(1),
  valorTotal: z.number().min(0),
  dataEmissao: isoDateNullable,
  dataVencimento: isoDateNullable,
  status: StatusFaturaTransportadora,
  arquivoUrl: z.string().url().nullable(),
  observacoes: z.string().nullable(),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
  itens: z.array(FaturaTransportadoraItem).optional(),
});
export type FaturaTransportadora = z.infer<typeof FaturaTransportadora>;

export const FaturaTransportadoraCreate = z.object({
  transportadorId: z.string(),
  empresaId: z.number().int().positive(),
  numeroFatura: z.string().min(1),
  valorTotal: z.number().min(0).default(0),
  dataEmissao: isoDateNullable.optional(),
  dataVencimento: isoDateNullable.optional(),
  status: StatusFaturaTransportadora.default("Aberta"),
  arquivoUrl: z.string().url().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  itens: z.array(FaturaTransportadoraItemCreate).optional(),
});
export type FaturaTransportadoraCreate = z.infer<typeof FaturaTransportadoraCreate>;

export const FaturaTransportadoraUpdate = FaturaTransportadoraCreate.partial();
export type FaturaTransportadoraUpdate = z.infer<typeof FaturaTransportadoraUpdate>;

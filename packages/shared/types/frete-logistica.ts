import { z } from "zod";

/**
 * Schemas Zod do frete logístico (cabeçalho) e suas ocorrências SSW.
 * Fonte de verdade do contrato da Edge Function `frete-logistica-v1`.
 *
 * F-LOG-CRM R-LOG-1: criação manual (sem pedido associado obrigatório).
 * R-LOG-3 vai popular `pedidoVendaId` automaticamente via hook no
 * `tiny-enviar-pedido-venda-v1`.
 */

export const StatusEntregaFrete = z.enum([
  "Em Separação",
  "Aguardando Coleta",
  "Em Trânsito",
  "Em Trânsito - Reentrega",
  "Entregue",
  "Agendado",
  "Recusado",
  "Devolvido - Trânsito",
  "Devolvido - Entregue",
]);
export type StatusEntregaFrete = z.infer<typeof StatusEntregaFrete>;

export const TipoOcorrenciaSSW = z.enum([
  "Cliente",
  "Informativo",
  "Entrega",
  "Sistema",
  "Operacional",
]);
export type TipoOcorrenciaSSW = z.infer<typeof TipoOcorrenciaSSW>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data esperada em YYYY-MM-DD");
const isoDateNullable = isoDate.nullable();

const nfeChave = z
  .string()
  .regex(/^[0-9]{44}$/, "Chave NFe deve ter 44 dígitos")
  .nullable();

// ---------- Ocorrência SSW ----------

export const OcorrenciaSSW = z.object({
  id: z.string(),
  freteId: z.string(),
  codigoSsw: z.string().min(1),
  descricaoOcorrencia: z.string().nullable(),
  tipo: TipoOcorrenciaSSW,
  dataHora: z.string().datetime(),
  dominio: z.string().nullable(),
  filial: z.string().nullable(),
  cidade: z.string().nullable(),
  uf: z.string().regex(/^[A-Z]{2}$/).nullable(),
  nomeRecebedor: z.string().nullable(),
  nroDocRecebedor: z.string().nullable(),
  dataHoraEfetiva: z.string().datetime().nullable(),
  rawPayload: z.unknown().nullable(),
});
export type OcorrenciaSSW = z.infer<typeof OcorrenciaSSW>;

// ---------- Frete (cabeçalho) ----------

export const FreteLogistica = z.object({
  id: z.string(),
  pedidoVendaId: z.number().int().positive().nullable(),
  nfeNumero: z.number().int().positive().nullable(),
  nfeChaveAcesso: nfeChave,
  clienteId: z.number().int().positive().nullable(),
  empresaId: z.number().int().positive(),
  vendedorId: z.string().uuid().nullable(),
  transportadorId: z.number().int().positive().nullable(),
  regiaoDestinoId: z.number().int().positive().nullable(),
  origemFreteId: z.number().int().positive().nullable(),
  dataEmissao: isoDateNullable,
  dataSaida: isoDateNullable,
  previsaoEntrega: isoDateNullable,
  dataEntrega: isoDateNullable,
  valorProdutos: z.number().min(0),
  valorCotacao: z.number().min(0).nullable(),
  volumes: z.number().int().min(0).nullable(),
  numeroExpedicao: z.string().nullable(),
  numeroColeta: z.string().nullable(),
  statusEntrega: StatusEntregaFrete,
  rateio: z.boolean(),
  reentrega: z.boolean(),
  dacteUrl: z.string().url().nullable(),
  comprovanteEntregaUrl: z.string().url().nullable(),
  observacoes: z.string().nullable(),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
  ocorrencias: z.array(OcorrenciaSSW).optional(),
});
export type FreteLogistica = z.infer<typeof FreteLogistica>;

export const FreteLogisticaCreate = z.object({
  pedidoVendaId: z.number().int().positive().optional().nullable(),
  nfeNumero: z.number().int().positive().optional().nullable(),
  nfeChaveAcesso: nfeChave.optional(),
  clienteId: z.number().int().positive().optional().nullable(),
  empresaId: z.number().int().positive(),
  vendedorId: z.string().uuid().optional().nullable(),
  transportadorId: z.number().int().positive().optional().nullable(),
  regiaoDestinoId: z.number().int().positive().optional().nullable(),
  origemFreteId: z.number().int().positive().optional().nullable(),
  dataEmissao: isoDateNullable.optional(),
  dataSaida: isoDateNullable.optional(),
  previsaoEntrega: isoDateNullable.optional(),
  dataEntrega: isoDateNullable.optional(),
  valorProdutos: z.number().min(0).default(0),
  valorCotacao: z.number().min(0).optional().nullable(),
  volumes: z.number().int().min(0).optional().nullable(),
  numeroExpedicao: z.string().optional().nullable(),
  numeroColeta: z.string().optional().nullable(),
  statusEntrega: StatusEntregaFrete.default("Em Separação"),
  rateio: z.boolean().default(false),
  reentrega: z.boolean().default(false),
  dacteUrl: z.string().url().optional().nullable(),
  comprovanteEntregaUrl: z.string().url().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});
export type FreteLogisticaCreate = z.infer<typeof FreteLogisticaCreate>;

export const FreteLogisticaUpdate = FreteLogisticaCreate.partial();
export type FreteLogisticaUpdate = z.infer<typeof FreteLogisticaUpdate>;

// ---------- R-LOG-2: filtros da Busca + retorno enriquecido ----------

/**
 * Filtros aceitos por `frete-logistica-v1?action=list`.
 * Todos os campos são opcionais; `limit` é hard-capado em 100 no backend (lição INC-016).
 */
export interface ListFretesFilters {
  empresaId?: number;
  clienteId?: number;
  transportadorId?: number;
  /** CSV de status na chamada HTTP; aqui aceita array. */
  statusEntrega?: string[];
  /** Data de emissão >= dataInicio (YYYY-MM-DD). */
  dataInicio?: string;
  /** Data de emissão <= dataFim (YYYY-MM-DD). */
  dataFim?: string;
  /** Substring LIKE no número da NFe (cast para texto). */
  nfeNumero?: string;
  /** 1..100 (default 20). */
  limit?: number;
  offset?: number;
}

/**
 * Frete enriquecido com joins leves usados em Dashboard, Busca e Detalhe.
 * O backend já calcula `diasEmTransito` (data_saida → hoje quando data_entrega é NULL).
 */
export type FreteLogisticaEnriched = FreteLogistica & {
  clienteNome: string | null;
  transportadorRazaoSocial: string | null;
  empresaNome: string | null;
  diasEmTransito: number | null;
};

/** Buckets da Torre de Controle (`action=list_by_status`). */
export type DashboardBucketLabel =
  | "Em Trânsito"
  | "Reentrega"
  | "Agendados"
  | "Devoluções em Trânsito"
  | "Recusadas";

export type DashboardBuckets = Record<DashboardBucketLabel, FreteLogisticaEnriched[]>;

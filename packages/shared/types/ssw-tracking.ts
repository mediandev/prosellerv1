import { z } from "zod";

// ---------- Item individual de tracking SSW ----------

export const SswTrackingItem = z.object({
  data_hora: z.string(),
  dominio: z.string(),
  filial: z.string(),
  cidade: z.string(),
  ocorrencia: z.string(),
  descricao: z.string(),
  tipo: z.string(),
  data_hora_efetiva: z.string(),
  nome_recebedor: z.string(),
  nro_doc_recebedor: z.string(),
  codigo_ssw: z.string(),
});
export type SswTrackingItem = z.infer<typeof SswTrackingItem>;

// ---------- Resposta success=true ----------

export const SswTrackingSuccess = z.object({
  success: z.literal(true),
  message: z.string(),
  documento: z.object({
    header: z.object({
      remetente: z.string(),
      destinatario: z.string(),
      nro_nf: z.string(),
      pedido: z.string(),
    }),
    tracking: z.array(SswTrackingItem),
  }),
});
export type SswTrackingSuccess = z.infer<typeof SswTrackingSuccess>;

// ---------- Resposta success=false ----------

export const SswTrackingError = z.object({
  success: z.literal(false),
  message: z.string(),
});
export type SswTrackingError = z.infer<typeof SswTrackingError>;

// ---------- Union discriminada ----------

export const SswTrackingResponse = z.discriminatedUnion("success", [
  SswTrackingSuccess,
  SswTrackingError,
]);
export type SswTrackingResponse = z.infer<typeof SswTrackingResponse>;

// Helpers puros usados por `frete-logistica-v1` (R-LOG-2).
// Mantidos aqui para serem testados via Deno sem subir o servidor `serve()`.

/**
 * Parse de query CSV (ex.: ?status_entrega=Em Trânsito,Recusado).
 * Trim espaços, remove strings vazias, retorna [] se null/vazio.
 */
export function csvParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Clamp do parâmetro `limit` da paginação:
 *  - default 20 se inválido ou ausente
 *  - mínimo 1
 *  - máximo 100 (lição INC-016: list sem cap estoura timeout em prod)
 */
export function clampLimit(rawLimit: string | number | null | undefined): number {
  const n = typeof rawLimit === "number" ? rawLimit : parseInt(String(rawLimit ?? ""));
  if (!n || !Number.isFinite(n)) return 20;
  return Math.min(Math.max(n, 1), 100);
}

/**
 * Clamp do parâmetro `offset` da paginação. Default 0, mínimo 0.
 */
export function clampOffset(rawOffset: string | number | null | undefined): number {
  const n = typeof rawOffset === "number" ? rawOffset : parseInt(String(rawOffset ?? ""));
  if (!n || !Number.isFinite(n)) return 0;
  return Math.max(n, 0);
}

/**
 * Buckets do Dashboard / Torre de Controle. Cada chave mapeia para 1+ status
 * de entrega que a Edge Function filtra via `.in('status_entrega', [...])`.
 *
 * "Em Trânsito" inclui "Em Trânsito - Reentrega" (visão consolidada);
 * "Reentrega" mostra apenas "Em Trânsito - Reentrega" (visão focada).
 */
export const DASHBOARD_BUCKETS: Record<string, string[]> = {
  "Em Trânsito": ["Em Trânsito", "Em Trânsito - Reentrega"],
  "Reentrega": ["Em Trânsito - Reentrega"],
  "Agendados": ["Agendado"],
  "Devoluções em Trânsito": ["Devolvido - Trânsito"],
  "Recusadas": ["Recusado"],
};

/**
 * Calcula dias em trânsito para um frete, dada a `data_saida` (YYYY-MM-DD)
 * e a `data_entrega` (YYYY-MM-DD ou null). Retorna null se data inválida ou
 * se já houve entrega (não há trânsito ativo).
 */
export function diasEmTransito(
  dataSaida: string | null | undefined,
  dataEntrega: string | null | undefined,
  agoraMs: number = Date.now(),
): number | null {
  if (!dataSaida || dataEntrega) return null;
  const inicio = new Date(`${dataSaida}T00:00:00Z`).getTime();
  if (isNaN(inicio) || agoraMs < inicio) return null;
  return Math.floor((agoraMs - inicio) / (1000 * 60 * 60 * 24));
}

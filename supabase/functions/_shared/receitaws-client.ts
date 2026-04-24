// F-001 · Cliente ReceitaWS para consulta Simples Nacional (ADR-002).
// Helper isolado consumido por `create-cliente-v2` e `tiny-enviar-pedido-venda-v1`.
//
// Schemas espelham `packages/shared/types/simples-nacional.ts` (Zod + TS).
// Como Edge Functions Deno hoje não importam zod diretamente, aqui reproduzimos
// os shapes como `type` — fonte de verdade continua sendo os schemas Zod.

const RECEITAWS_BASE_URL = "https://www.receitaws.com.br/v1/cnpj";
const DEFAULT_TIMEOUT_MS = 5_000;

export type LookupOutcome =
  | "ok"
  | "missing_field"
  | "timeout"
  | "rate_limited"
  | "invalid_response"
  | "network_error";

export interface SimplesNacionalLookupResult {
  status: "ok" | "inconclusive" | "failed";
  optante: boolean | null;
  reason: LookupOutcome | null;
  consultadoEm: string;
}

export interface SimplesNacionalLookupLog {
  event: "receitaws.lookup";
  traceId: string;
  cnpjMasked: string;
  httpStatus: number | null;
  simplesOptante: boolean | null;
  durationMs: number;
  outcome: LookupOutcome;
}

/**
 * Mascara CNPJ preservando apenas os 3 primeiros dígitos + "*" + 2 últimos.
 * Ver SPEC RNF-003 (NÃO logar CNPJ completo em texto claro).
 */
export function maskCnpj(cnpj: string): string {
  const digits = (cnpj || "").replace(/\D/g, "");
  if (digits.length < 5) return "***";
  return `${digits.slice(0, 3)}*****${digits.slice(-2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function emitLog(log: SimplesNacionalLookupLog): void {
  // Log estruturado único ponto — aderente ao padrão das Edge Functions -v2.
  console.log(JSON.stringify(log));
}

/**
 * Consulta ReceitaWS pelo CNPJ e devolve um resultado normalizado pronto para
 * persistir no cliente.
 *
 * - Timeout 5s (AbortController) — DP-002 resolvida 2026-04-22.
 * - Token lido de `RECEITAWS_TOKEN` (ADR-002). Ausente → retorna failed com
 *   outcome `network_error` (sem chamada à rede), preservando graceful degradation.
 * - Resposta bruta NUNCA persistida (Anti-SPEC §6).
 * - `simples.optante` ausente → status `inconclusive` com reason `missing_field`
 *   (CB-001 · plano gratuito não retorna o objeto `simples`).
 */
export async function consultarSimplesNacional(params: {
  cnpj: string;
  traceId: string;
  timeoutMs?: number;
}): Promise<SimplesNacionalLookupResult> {
  const { cnpj, traceId } = params;
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cnpjMasked = maskCnpj(cnpj);
  const start = Date.now();
  const digits = (cnpj || "").replace(/\D/g, "");

  if (digits.length !== 14) {
    const durationMs = Date.now() - start;
    emitLog({
      event: "receitaws.lookup",
      traceId,
      cnpjMasked,
      httpStatus: null,
      simplesOptante: null,
      durationMs,
      outcome: "invalid_response",
    });
    return {
      status: "failed",
      optante: null,
      reason: "invalid_response",
      consultadoEm: nowIso(),
    };
  }

  const token = (Deno.env.get("RECEITAWS_TOKEN") || "").trim();
  if (!token) {
    const durationMs = Date.now() - start;
    emitLog({
      event: "receitaws.lookup",
      traceId,
      cnpjMasked,
      httpStatus: null,
      simplesOptante: null,
      durationMs,
      outcome: "network_error",
    });
    console.warn("[RECEITAWS] RECEITAWS_TOKEN ausente — caindo em fallback.");
    return {
      status: "failed",
      optante: null,
      reason: "network_error",
      consultadoEm: nowIso(),
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${RECEITAWS_BASE_URL}/${digits}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    const durationMs = Date.now() - start;

    if (res.status === 429) {
      emitLog({
        event: "receitaws.lookup",
        traceId,
        cnpjMasked,
        httpStatus: 429,
        simplesOptante: null,
        durationMs,
        outcome: "rate_limited",
      });
      return {
        status: "failed",
        optante: null,
        reason: "rate_limited",
        consultadoEm: nowIso(),
      };
    }

    if (!res.ok) {
      emitLog({
        event: "receitaws.lookup",
        traceId,
        cnpjMasked,
        httpStatus: res.status,
        simplesOptante: null,
        durationMs,
        outcome: "invalid_response",
      });
      return {
        status: "failed",
        optante: null,
        reason: "invalid_response",
        consultadoEm: nowIso(),
      };
    }

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      emitLog({
        event: "receitaws.lookup",
        traceId,
        cnpjMasked,
        httpStatus: res.status,
        simplesOptante: null,
        durationMs,
        outcome: "invalid_response",
      });
      return {
        status: "failed",
        optante: null,
        reason: "invalid_response",
        consultadoEm: nowIso(),
      };
    }

    const simples =
      body && typeof body === "object" && "simples" in body
        ? (body as { simples?: { optante?: unknown } }).simples
        : undefined;
    const optanteRaw = simples?.optante;

    if (typeof optanteRaw !== "boolean") {
      emitLog({
        event: "receitaws.lookup",
        traceId,
        cnpjMasked,
        httpStatus: res.status,
        simplesOptante: null,
        durationMs,
        outcome: "missing_field",
      });
      return {
        status: "inconclusive",
        optante: null,
        reason: "missing_field",
        consultadoEm: nowIso(),
      };
    }

    emitLog({
      event: "receitaws.lookup",
      traceId,
      cnpjMasked,
      httpStatus: res.status,
      simplesOptante: optanteRaw,
      durationMs,
      outcome: "ok",
    });
    return {
      status: "ok",
      optante: optanteRaw,
      reason: null,
      consultadoEm: nowIso(),
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const isAbort = err instanceof Error && err.name === "AbortError";
    const outcome: LookupOutcome = isAbort ? "timeout" : "network_error";
    emitLog({
      event: "receitaws.lookup",
      traceId,
      cnpjMasked,
      httpStatus: null,
      simplesOptante: null,
      durationMs,
      outcome,
    });
    return {
      status: "failed",
      optante: null,
      reason: outcome,
      consultadoEm: nowIso(),
    };
  } finally {
    clearTimeout(timer);
  }
}

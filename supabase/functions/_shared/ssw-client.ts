// SSW Tracking client — shared entre ssw-tracking-v1 e frete-logistica-v1.
// Endpoint público, sem auth, rate limit 20 req/s.
// ADR-008: on-demand com cache 30 min em frete_logistica_ocorrencia.created_at.

const SSW_URL = 'https://ssw.inf.br/api/trackingdanfe';
const SSW_TIMEOUT_MS = 10_000;

export interface SswTrackingItemRaw {
  data_hora: string;
  dominio: string;
  filial: string;
  cidade: string;
  ocorrencia: string;
  descricao: string;
  tipo: string;
  data_hora_efetiva: string;
  nome_recebedor: string;
  nro_doc_recebedor: string;
  codigo_ssw: string;
}

export interface SswSuccessResponse {
  success: true;
  message: string;
  documento: {
    header: {
      remetente: string;
      destinatario: string;
      nro_nf: string;
      pedido: string;
    };
    tracking: SswTrackingItemRaw[];
  };
}

export interface SswErrorResponse {
  success: false;
  message: string;
}

export type SswResponse = SswSuccessResponse | SswErrorResponse;

export interface OcorrenciaInsert {
  frete_id: string;
  codigo_ssw: string;
  descricao_ocorrencia: string | null;
  tipo: string;
  data_hora: string;
  dominio: string | null;
  filial: string | null;
  cidade: string | null;
  uf: string | null;
  nome_recebedor: string | null;
  nro_doc_recebedor: string | null;
  data_hora_efetiva: string | null;
  raw_payload: unknown;
}

export async function fetchSswTracking(chaveNfe: string): Promise<SswResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SSW_TIMEOUT_MS);
  try {
    const res = await fetch(SSW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave_nfe: chaveNfe }),
      signal: controller.signal,
    });
    const json = await res.json();
    return json as SswResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `SSW fetch error: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

function parseCidadeUf(cidade: string): { cidade: string | null; uf: string | null } {
  if (!cidade) return { cidade: null, uf: null };
  const match = cidade.match(/^(.+?)\s*\/\s*([A-Z]{2})$/);
  if (match) return { cidade: match[1].trim(), uf: match[2] };
  return { cidade, uf: null };
}

function parseIsoTimestamp(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function mapTipoToEnum(tipo: string): string {
  const known = ['Cliente', 'Informativo', 'Entrega', 'Sistema', 'Operacional'];
  if (known.includes(tipo)) return tipo;
  return 'Informativo';
}

export function mapSswToOcorrencias(
  sswResponse: SswSuccessResponse,
  freteId: string,
): OcorrenciaInsert[] {
  return sswResponse.documento.tracking.map((item) => {
    const { cidade, uf } = parseCidadeUf(item.cidade);
    return {
      frete_id: freteId,
      codigo_ssw: item.codigo_ssw,
      descricao_ocorrencia: item.ocorrencia || null,
      tipo: mapTipoToEnum(item.tipo),
      data_hora: parseIsoTimestamp(item.data_hora) || new Date().toISOString(),
      dominio: item.dominio || null,
      filial: item.filial || null,
      cidade,
      uf,
      nome_recebedor: item.nome_recebedor || null,
      nro_doc_recebedor: item.nro_doc_recebedor || null,
      data_hora_efetiva: parseIsoTimestamp(item.data_hora_efetiva),
      raw_payload: item,
    };
  });
}

const CACHE_TTL_MS = 30 * 60 * 1000;

export function isCacheStale(
  latestCreatedAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!latestCreatedAt) return true;
  const ts = new Date(latestCreatedAt).getTime();
  if (isNaN(ts)) return true;
  return (nowMs - ts) > CACHE_TTL_MS;
}

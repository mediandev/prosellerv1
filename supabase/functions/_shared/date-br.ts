// BUG-001 · Edge Functions Deno rodam com TZ default UTC. `new Date().toISOString()`
// (e os métodos `getDate/getMonth/getFullYear` em runtime UTC) devolviam o dia
// UTC, o que estoura para D+1 entre 21h-23h59 BRT. O Tiny exibia a data UTC
// sem reconverter para America/Sao_Paulo.
//
// Esta função usa `Intl.DateTimeFormat` com `timeZone: America/Sao_Paulo` para
// extrair os componentes da data já no fuso brasileiro.

export function formatDateBR(date: Date): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

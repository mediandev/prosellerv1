// Utilitários para trabalhar com status de vendas de forma dinâmica
import { StatusVenda } from '../types/venda';

function normalizeStatus(value: unknown): string {
  return (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Lista de TODOS os status possíveis de vendas no sistema.
 * ✅ FONTE ÚNICA DE VERDADE para status de vendas
 * 
 * IMPORTANTE: Esta lista deve ser atualizada se novos status forem adicionados ao tipo StatusVenda
 */
export const STATUS_VENDAS_DISPONIVEIS: StatusVenda[] = [
  'Rascunho',
  'Em Análise',
  'Em aberto',
  'Aprovado',
  'Preparando envio',
  'Faturado',
  'Pronto para envio',
  'Enviado',
  'Entregue',
  'Não Entregue',
  'Cancelado'
];

/**
 * Verifica se um status é considerado "concluído" (venda finalizada)
 */
export function isStatusConcluido(status: StatusVenda | string): boolean {
  // Consideramos "concluído" tudo que já passou pelo faturamento (inclusive etapas posteriores).
  // Também aceitamos strings legadas (ex: "concluida") vindas de importações antigas.
  const norm = normalizeStatus(status);
  return [
    'faturado',
    'pronto para envio',
    'enviado',
    'entregue',
    'nao entregue',
    // Compat legado
    'concluido',
    'concluida',
  ].includes(norm);
}

/**
 * Verifica se um status é considerado "em andamento" (venda em processamento)
 */
export function isStatusEmAndamento(status: StatusVenda | string): boolean {
  const norm = normalizeStatus(status);
  return [
    normalizeStatus('Aprovado'),
    normalizeStatus('Preparando envio'),
    normalizeStatus('Pronto para envio'),
  ].includes(norm);
}

/**
 * Verifica se um status é considerado "pendente" (aguardando ação)
 */
export function isStatusPendente(status: StatusVenda | string): boolean {
  const norm = normalizeStatus(status);
  return [
    normalizeStatus('Rascunho'),
    normalizeStatus('Em Análise'),
    normalizeStatus('Em aberto'),
  ].includes(norm);
}

/**
 * Verifica se um status é "cancelado"
 */
export function isStatusCancelado(status: StatusVenda | string): boolean {
  return status === 'Cancelado';
}

/**
 * Obtém a configuração visual de um status (cor, variante do badge, label)
 */
export function getStatusConfig(status: StatusVenda): {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
  color: string;
} {
  const statusConfigMap: Record<StatusVenda, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; color: string }> = {
    'Rascunho': { label: "Rascunho", variant: "outline", color: "text-gray-500" },
    'Em Análise': { label: "Em Análise", variant: "secondary", color: "text-yellow-600" },
    'Em aberto': { label: "Em aberto", variant: "secondary", color: "text-amber-700" },
    'Aprovado': { label: "Aprovado", variant: "secondary", color: "text-blue-500" },
    'Preparando envio': { label: "Preparando envio", variant: "secondary", color: "text-purple-500" },
    'Faturado': { label: "Faturado", variant: "default", color: "text-green-600" },
    'Pronto para envio': { label: "Pronto para envio", variant: "secondary", color: "text-indigo-600" },
    'Enviado': { label: "Enviado", variant: "default", color: "text-cyan-500" },
    'Entregue': { label: "Entregue", variant: "default", color: "text-emerald-600" },
    'Não Entregue': { label: "Não Entregue", variant: "destructive", color: "text-orange-600" },
    'Cancelado': { label: "Cancelado", variant: "destructive", color: "text-red-500" }
  };

  return statusConfigMap[status] || { label: status, variant: "outline", color: "text-gray-500" };
}

/**
 * Extrai status únicos de uma lista de vendas
 * Útil para criar filtros dinâmicos
 */
export function extrairStatusUnicos<T extends { status: StatusVenda }>(vendas: T[]): StatusVenda[] {
  const statusSet = new Set<StatusVenda>();
  vendas.forEach(venda => {
    if (venda.status) {
      statusSet.add(venda.status);
    }
  });
  return Array.from(statusSet).sort((a, b) => {
    // Ordenar pela ordem definida em STATUS_VENDAS_DISPONIVEIS
    return STATUS_VENDAS_DISPONIVEIS.indexOf(a) - STATUS_VENDAS_DISPONIVEIS.indexOf(b);
  });
}

/**
 * Filtra vendas por status (aceita múltiplos status)
 */
export function filtrarPorStatus<T extends { status: StatusVenda }>(
  vendas: T[],
  statusFiltro: StatusVenda | StatusVenda[] | 'all' | 'concluidas' | 'todas'
): T[] {
  if (statusFiltro === 'all' || statusFiltro === 'todas') {
    return vendas;
  }

  if (statusFiltro === 'concluidas') {
    return vendas.filter(v => isStatusConcluido(v.status));
  }

  if (Array.isArray(statusFiltro)) {
    return vendas.filter(v => statusFiltro.includes(v.status));
  }

  return vendas.filter(v => v.status === statusFiltro);
}

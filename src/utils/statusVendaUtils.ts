// Utilitários para trabalhar com status de vendas de forma dinâmica
import { StatusVenda } from '../types/venda';

/**
 * Lista de TODOS os status possíveis de vendas no sistema.
 * ✅ FONTE ÚNICA DE VERDADE para status de vendas
 * 
 * IMPORTANTE: Esta lista deve ser atualizada se novos status forem adicionados ao tipo StatusVenda
 */
export const STATUS_VENDAS_DISPONIVEIS: StatusVenda[] = [
  'Rascunho',
  'Em Análise',
  'Aprovado',
  'Em Separação',
  'Faturado',
  'Concluído',
  'Enviado',
  'Cancelado'
];

/**
 * Verifica se um status é considerado "concluído" (venda finalizada)
 */
export function isStatusConcluido(status: StatusVenda | string): boolean {
  const statusConcluidos: StatusVenda[] = ['Faturado', 'Concluído', 'Enviado'];
  return statusConcluidos.includes(status as StatusVenda);
}

/**
 * Verifica se um status é considerado "em andamento" (venda em processamento)
 */
export function isStatusEmAndamento(status: StatusVenda | string): boolean {
  const statusEmAndamento: StatusVenda[] = ['Aprovado', 'Em Separação'];
  return statusEmAndamento.includes(status as StatusVenda);
}

/**
 * Verifica se um status é considerado "pendente" (aguardando ação)
 */
export function isStatusPendente(status: StatusVenda | string): boolean {
  const statusPendentes: StatusVenda[] = ['Rascunho', 'Em Análise'];
  return statusPendentes.includes(status as StatusVenda);
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
    'Aprovado': { label: "Aprovado", variant: "secondary", color: "text-blue-500" },
    'Em Separação': { label: "Em Separação", variant: "secondary", color: "text-purple-500" },
    'Faturado': { label: "Faturado", variant: "default", color: "text-green-600" },
    'Concluído': { label: "Concluído", variant: "default", color: "text-green-500" },
    'Enviado': { label: "Enviado", variant: "default", color: "text-cyan-500" },
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

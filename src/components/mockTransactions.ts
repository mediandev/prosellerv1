// Mapeamento de nomes de vendedores para IDs de usuários
export const VENDEDOR_TO_USER_ID: Record<string, string> = {
  "João Silva": "user-2",
  "Maria Santos": "user-3",
  "Carlos Oliveira": "user-4",
  "Ana Paula": "user-5",
  "Pedro Costa": "user-6",
};

// Estrutura de transação detalhada
export interface Transaction {
  id: string;
  cliente: string;
  vendedor: string;
  valor: number;
  quantidade?: number; // Quantidade de produtos vendidos (opcional, calculado automaticamente se não fornecido)
  natureza: string;
  segmento: string;
  statusCliente: string;
  grupoRede?: string; // Grupo/Rede do cliente (opcional)
  uf: string; // UF do cliente
  data: string;
  periodo: string; // Para agrupar no gráfico (dia da semana, semana, mês, etc)
  dia: string; // Dia da semana (Seg, Ter, Qua, etc) - para exibição diária
  semana?: number; // Número da semana (1-4) para agrupamento visual
}

// Transações dos últimos 7 dias (com clientes repetidos - mais realista)
export const transactions7Days: Transaction[] = [
  // Domingo - 20/10
  { id: "#VD-1240", cliente: "Startup Inovação", vendedor: "Pedro Costa", valor: 9800, quantidade: 14, natureza: "Venda Direta", segmento: "Startup", statusCliente: "Ativo", grupoRede: "Grupo A", uf: "SP", data: "20/10/2025", periodo: "Dom", dia: "Dom", semana: 1 },
  { id: "#VD-1241", cliente: "Tech Solutions", vendedor: "João Silva", valor: 5200, quantidade: 8, natureza: "Serviço", segmento: "PME", statusCliente: "Ativo", grupoRede: "Rede Tech", uf: "RJ", data: "20/10/2025", periodo: "Dom", dia: "Dom", semana: 1 },
  { id: "#VD-1242", cliente: "Innovation Labs", vendedor: "Maria Santos", valor: 3000, quantidade: 5, natureza: "Locação", segmento: "VIP", statusCliente: "Ativo", grupoRede: "Grupo B", uf: "MG", data: "20/10/2025", periodo: "Dom", dia: "Dom", semana: 1 },
  
  // Sábado - 19/10
  { id: "#VD-1239", cliente: "Grupo Omega", vendedor: "João Silva", valor: 15200, quantidade: 22, natureza: "Revenda", segmento: "Corporativo", statusCliente: "Ativo", grupoRede: "Grupo Omega", uf: "SP", data: "19/10/2025", periodo: "Sáb", dia: "Sáb", semana: 1 },
  { id: "#VD-1243", cliente: "Business Pro", vendedor: "Carlos Oliveira", valor: 8500, quantidade: 12, natureza: "Venda Direta", segmento: "Premium", statusCliente: "Ativo", grupoRede: "Rede Business", uf: "RS", data: "19/10/2025", periodo: "Sáb", dia: "Sáb", semana: 1 },
  { id: "#VD-1244", cliente: "Corp ABC", vendedor: "Ana Paula", valor: 4200, quantidade: 6, natureza: "Demonstração", segmento: "Standard", statusCliente: "Inativo", grupoRede: "Grupo C", uf: "PR", data: "19/10/2025", periodo: "Sáb", dia: "Sáb", semana: 1 },
  
  // Sexta - 18/10
  { id: "#VD-1238", cliente: "Digital Hub", vendedor: "Maria Santos", valor: 6500, quantidade: 10, natureza: "Serviço", segmento: "PME", statusCliente: "Ativo", uf: "SC", data: "18/10/2025", periodo: "Sex", dia: "Sex", semana: 1 },
  { id: "#VD-1245", cliente: "Innovation Labs", vendedor: "Pedro Costa", valor: 12300, quantidade: 18, natureza: "Venda Direta", segmento: "VIP", statusCliente: "Ativo", uf: "MG", data: "18/10/2025", periodo: "Sex", dia: "Sex", semana: 1 },
  { id: "#VD-1246", cliente: "Future Tech", vendedor: "João Silva", valor: 7800, quantidade: 11, natureza: "Revenda", segmento: "Startup", statusCliente: "Ativo", uf: "BA", data: "18/10/2025", periodo: "Sex", dia: "Sex", semana: 1 },
  
  // Quinta - 17/10
  { id: "#VD-1237", cliente: "Tech Ventures", vendedor: "Carlos Oliveira", valor: 11200, quantidade: 16, natureza: "Venda Direta", segmento: "Premium", statusCliente: "Ativo", uf: "SP", data: "17/10/2025", periodo: "Qui", dia: "Qui", semana: 1 },
  { id: "#VD-1247", cliente: "Smart Solutions", vendedor: "Ana Paula", valor: 9400, quantidade: 13, natureza: "Serviço", segmento: "Corporativo", statusCliente: "Ativo", uf: "RJ", data: "17/10/2025", periodo: "Qui", dia: "Qui", semana: 1 },
  { id: "#VD-1248", cliente: "Grupo Omega", vendedor: "Maria Santos", valor: 6200, quantidade: 9, natureza: "Locação", segmento: "Corporativo", statusCliente: "Ativo", uf: "SP", data: "17/10/2025", periodo: "Qui", dia: "Qui", semana: 1 },
  
  // Quarta - 16/10
  { id: "#VD-1236", cliente: "Business Pro", vendedor: "Ana Paula", valor: 8700, quantidade: 12, natureza: "Venda Direta", segmento: "Premium", statusCliente: "Ativo", uf: "RS", data: "16/10/2025", periodo: "Qua", dia: "Qua", semana: 1 },
  { id: "#VD-1249", cliente: "Tech Solutions", vendedor: "Pedro Costa", valor: 5600, quantidade: 8, natureza: "Serviço", segmento: "PME", statusCliente: "Ativo", uf: "RJ", data: "16/10/2025", periodo: "Qua", dia: "Qua", semana: 1 },
  { id: "#VD-1250", cliente: "Digital Corp", vendedor: "João Silva", valor: 4200, quantidade: 6, natureza: "Locação", segmento: "Standard", statusCliente: "Ativo", uf: "ES", data: "16/10/2025", periodo: "Qua", dia: "Qua", semana: 1 },
  
  // Terça - 15/10
  { id: "#VD-1235", cliente: "Innovation Labs", vendedor: "Pedro Costa", valor: 19850, quantidade: 29, natureza: "Demonstração", segmento: "VIP", statusCliente: "Ativo", uf: "MG", data: "15/10/2025", periodo: "Ter", dia: "Ter", semana: 1 },
  { id: "#VD-1251", cliente: "Global Trade", vendedor: "Carlos Oliveira", valor: 7300, quantidade: 10, natureza: "Revenda", segmento: "PME", statusCliente: "Inativo", uf: "DF", data: "15/10/2025", periodo: "Ter", dia: "Ter", semana: 1 },
  { id: "#VD-1252", cliente: "Smart Solutions", vendedor: "Maria Santos", valor: 3950, quantidade: 6, natureza: "Serviço", segmento: "Corporativo", statusCliente: "Ativo", uf: "RJ", data: "15/10/2025", periodo: "Ter", dia: "Ter", semana: 1 },
  
  // Segunda - 14/10
  { id: "#VD-1234", cliente: "Startup Inovação", vendedor: "Ana Paula", valor: 8900, quantidade: 13, natureza: "Venda Direta", segmento: "Startup", statusCliente: "Ativo", uf: "SP", data: "14/10/2025", periodo: "Seg", dia: "Seg", semana: 1 },
  { id: "#VD-1253", cliente: "Global Systems", vendedor: "João Silva", valor: 11200, quantidade: 16, natureza: "Locação", segmento: "Premium", statusCliente: "Ativo", uf: "PE", data: "14/10/2025", periodo: "Seg", dia: "Seg", semana: 1 },
  { id: "#VD-1254", cliente: "Future Tech", vendedor: "Pedro Costa", valor: 5400, quantidade: 8, natureza: "Revenda", segmento: "Startup", statusCliente: "Ativo", uf: "BA", data: "14/10/2025", periodo: "Seg", dia: "Seg", semana: 1 },
];

// Transações dos últimos 30 dias (com clientes repetidos - mais realista)
export const transactions30Days: Transaction[] = [
  // Semana 4 (14-20 Out - mais recente) - mesmas transações dos últimos 7 dias
  { id: "#VD-1240", cliente: "Startup Inovação", vendedor: "Pedro Costa", valor: 9800, natureza: "Venda Direta", segmento: "Startup", statusCliente: "Ativo", uf: "SP", data: "20/10/2025", periodo: "Sem 4", dia: "Dom", semana: 4 },
  { id: "#VD-1241", cliente: "Tech Solutions", vendedor: "João Silva", valor: 5200, natureza: "Serviço", segmento: "PME", statusCliente: "Ativo", uf: "RJ", data: "20/10/2025", periodo: "Sem 4", dia: "Dom", semana: 4 },
  { id: "#VD-1242", cliente: "Innovation Labs", vendedor: "Maria Santos", valor: 3000, natureza: "Locação", segmento: "VIP", statusCliente: "Ativo", uf: "MG", data: "20/10/2025", periodo: "Sem 4", dia: "Dom", semana: 4 },
  { id: "#VD-1239", cliente: "Grupo Omega", vendedor: "João Silva", valor: 15200, natureza: "Revenda", segmento: "Corporativo", statusCliente: "Ativo", uf: "SP", data: "19/10/2025", periodo: "Sem 4", dia: "Sáb", semana: 4 },
  { id: "#VD-1243", cliente: "Business Pro", vendedor: "Carlos Oliveira", valor: 8500, natureza: "Venda Direta", segmento: "Premium", statusCliente: "Ativo", uf: "RS", data: "19/10/2025", periodo: "Sem 4", dia: "Sáb", semana: 4 },
  { id: "#VD-1244", cliente: "Corp ABC", vendedor: "Ana Paula", valor: 4200, natureza: "Demonstração", segmento: "Standard", statusCliente: "Inativo", uf: "PR", data: "19/10/2025", periodo: "Sem 4", dia: "Sáb", semana: 4 },
  { id: "#VD-1238", cliente: "Digital Hub", vendedor: "Maria Santos", valor: 6500, natureza: "Serviço", segmento: "PME", statusCliente: "Ativo", uf: "SC", data: "18/10/2025", periodo: "Sem 4", dia: "Sex", semana: 4 },
  { id: "#VD-1245", cliente: "Innovation Labs", vendedor: "Pedro Costa", valor: 12300, natureza: "Venda Direta", segmento: "VIP", statusCliente: "Ativo", uf: "MG", data: "18/10/2025", periodo: "Sem 4", dia: "Sex", semana: 4 },
  { id: "#VD-1246", cliente: "Future Tech", vendedor: "João Silva", valor: 7800, natureza: "Revenda", segmento: "Startup", statusCliente: "Ativo", uf: "BA", data: "18/10/2025", periodo: "Sem 4", dia: "Sex", semana: 4 },
  { id: "#VD-1237", cliente: "Tech Ventures", vendedor: "Carlos Oliveira", valor: 11200, natureza: "Venda Direta", segmento: "Premium", statusCliente: "Ativo", uf: "SP", data: "17/10/2025", periodo: "Sem 4", dia: "Qui", semana: 4 },
  { id: "#VD-1247", cliente: "Smart Solutions", vendedor: "Ana Paula", valor: 9400, natureza: "Serviço", segmento: "Corporativo", statusCliente: "Ativo", uf: "RJ", data: "17/10/2025", periodo: "Sem 4", dia: "Qui", semana: 4 },
  { id: "#VD-1248", cliente: "Grupo Omega", vendedor: "Maria Santos", valor: 6200, natureza: "Locação", segmento: "Corporativo", statusCliente: "Ativo", uf: "SP", data: "17/10/2025", periodo: "Sem 4", dia: "Qui", semana: 4 },
  { id: "#VD-1236", cliente: "Business Pro", vendedor: "Ana Paula", valor: 8700, natureza: "Venda Direta", segmento: "Premium", statusCliente: "Ativo", uf: "RS", data: "16/10/2025", periodo: "Sem 4", dia: "Qua", semana: 4 },
  { id: "#VD-1249", cliente: "Tech Solutions", vendedor: "Pedro Costa", valor: 5600, natureza: "Serviço", segmento: "PME", statusCliente: "Ativo", uf: "RJ", data: "16/10/2025", periodo: "Sem 4", dia: "Qua", semana: 4 },
  { id: "#VD-1250", cliente: "Digital Corp", vendedor: "João Silva", valor: 4200, natureza: "Locação", segmento: "Standard", statusCliente: "Ativo", uf: "ES", data: "16/10/2025", periodo: "Sem 4", dia: "Qua", semana: 4 },
  { id: "#VD-1235", cliente: "Innovation Labs", vendedor: "Pedro Costa", valor: 19850, natureza: "Demonstração", segmento: "VIP", statusCliente: "Ativo", uf: "MG", data: "15/10/2025", periodo: "Sem 4", dia: "Ter", semana: 4 },
  { id: "#VD-1251", cliente: "Global Trade", vendedor: "Carlos Oliveira", valor: 7300, natureza: "Revenda", segmento: "PME", statusCliente: "Inativo", uf: "DF", data: "15/10/2025", periodo: "Sem 4", dia: "Ter", semana: 4 },
  { id: "#VD-1252", cliente: "Smart Solutions", vendedor: "Maria Santos", valor: 3950, natureza: "Serviço", segmento: "Corporativo", statusCliente: "Ativo", uf: "RJ", data: "15/10/2025", periodo: "Sem 4", dia: "Ter", semana: 4 },
  { id: "#VD-1234", cliente: "Startup Inovação", vendedor: "Ana Paula", valor: 8900, natureza: "Venda Direta", segmento: "Startup", statusCliente: "Ativo", uf: "SP", data: "14/10/2025", periodo: "Sem 4", dia: "Seg", semana: 4 },
  { id: "#VD-1253", cliente: "Global Systems", vendedor: "João Silva", valor: 11200, natureza: "Locação", segmento: "Premium", statusCliente: "Ativo", uf: "PE", data: "14/10/2025", periodo: "Sem 4", dia: "Seg", semana: 4 },
  { id: "#VD-1254", cliente: "Future Tech", vendedor: "Pedro Costa", valor: 5400, natureza: "Revenda", segmento: "Startup", statusCliente: "Ativo", uf: "BA", data: "14/10/2025", periodo: "Sem 4", dia: "Seg", semana: 4 },
  
  // Semana 3 (7-13 Out)
  { id: "#VD-1220", cliente: "Empresa ABC", vendedor: "João Silva", valor: 12500, natureza: "Venda Direta", segmento: "Standard", statusCliente: "Ativo", uf: "SP", data: "13/10/2025", periodo: "Sem 3", dia: "Dom", semana: 3 },
  { id: "#VD-1221", cliente: "Tech Solutions", vendedor: "Maria Santos", valor: 8300, natureza: "Serviço", segmento: "PME", statusCliente: "Ativo", uf: "RJ", data: "12/10/2025", periodo: "Sem 3", dia: "Sáb", semana: 3 },
  { id: "#VD-1222", cliente: "Indústria XYZ", vendedor: "Carlos Oliveira", valor: 25800, natureza: "Revenda", segmento: "Corporativo", statusCliente: "Ativo", uf: "MG", data: "11/10/2025", periodo: "Sem 3", dia: "Sex", semana: 3 },
  { id: "#VD-1223", cliente: "Comércio Beta", vendedor: "Ana Paula", valor: 5600, natureza: "Venda Direta", segmento: "PME", statusCliente: "Inativo", uf: "GO", data: "10/10/2025", periodo: "Sem 3", dia: "Qui", semana: 3 },
  { id: "#VD-1224", cliente: "Serviços Delta", vendedor: "Pedro Costa", valor: 15200, natureza: "Locação", segmento: "Standard", statusCliente: "Ativo", uf: "PR", data: "09/10/2025", periodo: "Sem 3", dia: "Qua", semana: 3 },
  { id: "#VD-1225", cliente: "Grupo Omega Plus", vendedor: "João Silva", valor: 32400, natureza: "Venda Direta", segmento: "VIP", statusCliente: "Ativo", uf: "SP", data: "08/10/2025", periodo: "Sem 3", dia: "Ter", semana: 3 },
  { id: "#VD-1226", cliente: "Digital Hub Pro", vendedor: "Maria Santos", valor: 18900, natureza: "Demonstração", segmento: "Premium", statusCliente: "Ativo", uf: "SC", data: "07/10/2025", periodo: "Sem 3", dia: "Seg", semana: 3 },
  
  // Semana 2 (30 Set - 6 Out)
  { id: "#VD-1210", cliente: "Innovation Co", vendedor: "Carlos Oliveira", valor: 22300, natureza: "Venda Direta", segmento: "Corporativo", statusCliente: "Ativo", uf: "RJ", data: "06/10/2025", periodo: "Sem 2", dia: "Dom", semana: 2 },
  { id: "#VD-1211", cliente: "Business Pro Ltda", vendedor: "Ana Paula", valor: 14200, natureza: "Serviço", segmento: "PME", statusCliente: "Ativo", uf: "RS", data: "05/10/2025", periodo: "Sem 2", dia: "Sáb", semana: 2 },
  { id: "#VD-1212", cliente: "Tech Ventures SA", vendedor: "Pedro Costa", valor: 16800, natureza: "Revenda", segmento: "Premium", statusCliente: "Ativo", uf: "SP", data: "04/10/2025", periodo: "Sem 2", dia: "Sex", semana: 2 },
  { id: "#VD-1213", cliente: "Smart Solutions Inc", vendedor: "João Silva", valor: 28500, natureza: "Venda Direta", segmento: "VIP", statusCliente: "Ativo", uf: "RJ", data: "03/10/2025", periodo: "Sem 2", dia: "Qui", semana: 2 },
  { id: "#VD-1214", cliente: "Empresa ABC", vendedor: "Maria Santos", valor: 19200, natureza: "Locação", segmento: "Standard", statusCliente: "Ativo", uf: "SP", data: "02/10/2025", periodo: "Sem 2", dia: "Qua", semana: 2 },
  { id: "#VD-1215", cliente: "Digital Masters Ltd", vendedor: "Carlos Oliveira", valor: 11700, natureza: "Demonstração", segmento: "Standard", statusCliente: "Inativo", uf: "CE", data: "01/10/2025", periodo: "Sem 2", dia: "Ter", semana: 2 },
  { id: "#VD-1216", cliente: "Future Systems Co", vendedor: "Ana Paula", valor: 9800, natureza: "Venda Direta", segmento: "Startup", statusCliente: "Ativo", uf: "BA", data: "30/09/2025", periodo: "Sem 2", dia: "Seg", semana: 2 },
  
  // Semana 1 (23-29 Set)
  { id: "#VD-1200", cliente: "Enterprise Ltd", vendedor: "Pedro Costa", valor: 34200, natureza: "Serviço", segmento: "VIP", statusCliente: "Ativo", uf: "SP", data: "29/09/2025", periodo: "Sem 1", dia: "Dom", semana: 1 },
  { id: "#VD-1201", cliente: "Corp Solutions Pro", vendedor: "João Silva", valor: 15600, natureza: "Revenda", segmento: "Premium", statusCliente: "Ativo", uf: "RJ", data: "28/09/2025", periodo: "Sem 1", dia: "Sáb", semana: 1 },
  { id: "#VD-1202", cliente: "Tech Leaders Inc", vendedor: "Maria Santos", valor: 21400, natureza: "Venda Direta", segmento: "Corporativo", statusCliente: "Ativo", uf: "MG", data: "27/09/2025", periodo: "Sem 1", dia: "Sex", semana: 1 },
  { id: "#VD-1203", cliente: "Innovation Hub SA", vendedor: "Carlos Oliveira", valor: 12900, natureza: "Locação", segmento: "PME", statusCliente: "Ativo", uf: "PR", data: "26/09/2025", periodo: "Sem 1", dia: "Qui", semana: 1 },
  { id: "#VD-1204", cliente: "Digital Pro Ltda", vendedor: "Ana Paula", valor: 18700, natureza: "Demonstração", segmento: "Standard", statusCliente: "Inativo", uf: "AM", data: "25/09/2025", periodo: "Sem 1", dia: "Qua", semana: 1 },
  { id: "#VD-1205", cliente: "Business Experts Co", vendedor: "Pedro Costa", valor: 26300, natureza: "Venda Direta", segmento: "Premium", statusCliente: "Ativo", uf: "RS", data: "24/09/2025", periodo: "Sem 1", dia: "Ter", semana: 1 },
  { id: "#VD-1206", cliente: "Smart Tech Labs", vendedor: "João Silva", valor: 14500, natureza: "Serviço", segmento: "Startup", statusCliente: "Ativo", uf: "SP", data: "23/09/2025", periodo: "Sem 1", dia: "Seg", semana: 1 },
];

// Transações do período anterior de 7 dias (7-13 Out)
export const transactionsPrevious7Days: Transaction[] = [
  { id: "#VD-1220", cliente: "Empresa ABC", vendedor: "João Silva", valor: 12500, quantidade: 18, natureza: "Venda Direta", segmento: "Standard", statusCliente: "Ativo", uf: "SP", data: "13/10/2025", periodo: "Dom" },
  { id: "#VD-1221", cliente: "Tech Solutions", vendedor: "Maria Santos", valor: 8300, quantidade: 12, natureza: "Serviço", segmento: "Premium", statusCliente: "Ativo", uf: "RJ", data: "12/10/2025", periodo: "Sáb" },
  { id: "#VD-1222", cliente: "Indústria XYZ", vendedor: "Carlos Oliveira", valor: 25800, quantidade: 37, natureza: "Revenda", segmento: "Corporativo", statusCliente: "Ativo", uf: "MG", data: "11/10/2025", periodo: "Sex" },
  { id: "#VD-1223", cliente: "Comércio Beta", vendedor: "Ana Paula", valor: 5600, quantidade: 8, natureza: "Venda Direta", segmento: "PME", statusCliente: "Inativo", uf: "GO", data: "10/10/2025", periodo: "Qui" },
  { id: "#VD-1224", cliente: "Serviços Delta", vendedor: "Pedro Costa", valor: 15200, quantidade: 22, natureza: "Locação", segmento: "Standard", statusCliente: "Ativo", uf: "PR", data: "09/10/2025", periodo: "Qua" },
  { id: "#VD-1225", cliente: "Grupo Omega Plus", vendedor: "João Silva", valor: 13400, quantidade: 19, natureza: "Venda Direta", segmento: "VIP", statusCliente: "Ativo", uf: "SP", data: "08/10/2025", periodo: "Ter" },
  { id: "#VD-1226", cliente: "Digital Hub Pro", vendedor: "Maria Santos", valor: 6900, quantidade: 10, natureza: "Demonstração", segmento: "Premium", statusCliente: "Ativo", uf: "SC", data: "07/10/2025", periodo: "Seg" },
];

// Transações do período anterior de 30 dias (23 Ago - 22 Set)
export const transactionsPrevious30Days: Transaction[] = [
  // Semana 4
  { id: "#VD-1180", cliente: "Alpha Corp", vendedor: "João Silva", valor: 11200, natureza: "Venda Direta", segmento: "Standard", statusCliente: "Ativo", uf: "SP", data: "22/09/2025", periodo: "Sem 4" },
  { id: "#VD-1181", cliente: "Beta Systems", vendedor: "Maria Santos", valor: 8900, natureza: "Serviço", segmento: "Premium", statusCliente: "Ativo", uf: "RJ", data: "21/09/2025", periodo: "Sem 4" },
  { id: "#VD-1182", cliente: "Gamma Industries", vendedor: "Carlos Oliveira", valor: 22100, natureza: "Revenda", segmento: "Corporativo", statusCliente: "Ativo", uf: "MG", data: "20/09/2025", periodo: "Sem 4" },
  { id: "#VD-1183", cliente: "Delta Commerce", vendedor: "Ana Paula", valor: 6200, natureza: "Venda Direta", segmento: "PME", statusCliente: "Ativo", uf: "PR", data: "19/09/2025", periodo: "Sem 4" },
  { id: "#VD-1184", cliente: "Epsilon Services", vendedor: "Pedro Costa", valor: 14800, natureza: "Locação", segmento: "Standard", statusCliente: "Ativo", uf: "SC", data: "18/09/2025", periodo: "Sem 4" },
  { id: "#VD-1185", cliente: "Zeta Group", vendedor: "João Silva", valor: 18900, natureza: "Venda Direta", segmento: "Premium", statusCliente: "Ativo", uf: "RS", data: "17/09/2025", periodo: "Sem 4" },
  { id: "#VD-1186", cliente: "Eta Digital", vendedor: "Maria Santos", valor: 9800, natureza: "Demonstração", segmento: "Startup", statusCliente: "Ativo", uf: "BA", data: "16/09/2025", periodo: "Sem 4" },
  
  // Semana 3
  { id: "#VD-1170", cliente: "Theta Tech", vendedor: "Carlos Oliveira", valor: 16500, natureza: "Venda Direta", segmento: "Corporativo", statusCliente: "Ativo", uf: "SP", data: "15/09/2025", periodo: "Sem 3" },
  { id: "#VD-1171", cliente: "Iota Business", vendedor: "Ana Paula", valor: 11200, natureza: "Serviço", segmento: "PME", statusCliente: "Ativo", uf: "RJ", data: "14/09/2025", periodo: "Sem 3" },
  { id: "#VD-1172", cliente: "Kappa Ventures", vendedor: "Pedro Costa", valor: 19400, natureza: "Revenda", segmento: "Premium", statusCliente: "Ativo", uf: "MG", data: "13/09/2025", periodo: "Sem 3" },
  { id: "#VD-1173", cliente: "Lambda Smart", vendedor: "João Silva", valor: 24600, natureza: "Venda Direta", segmento: "VIP", statusCliente: "Ativo", uf: "SP", data: "12/09/2025", periodo: "Sem 3" },
  { id: "#VD-1174", cliente: "Mu Global", vendedor: "Maria Santos", valor: 15800, natureza: "Locação", segmento: "Corporativo", statusCliente: "Ativo", uf: "RJ", data: "11/09/2025", periodo: "Sem 3" },
  { id: "#VD-1175", cliente: "Nu Digital", vendedor: "Carlos Oliveira", valor: 8900, natureza: "Demonstração", segmento: "Standard", statusCliente: "Inativo", uf: "ES", data: "10/09/2025", periodo: "Sem 3" },
  { id: "#VD-1176", cliente: "Xi Future", vendedor: "Ana Paula", valor: 12300, natureza: "Venda Direta", segmento: "Startup", statusCliente: "Ativo", uf: "PE", data: "09/09/2025", periodo: "Sem 3" },
  
  // Semana 2
  { id: "#VD-1160", cliente: "Omicron Enterprise", vendedor: "Pedro Costa", valor: 28900, natureza: "Serviço", segmento: "VIP", statusCliente: "Ativo", uf: "SP", data: "08/09/2025", periodo: "Sem 2" },
  { id: "#VD-1161", cliente: "Pi Corp", vendedor: "João Silva", valor: 13400, natureza: "Revenda", segmento: "Premium", statusCliente: "Ativo", uf: "RJ", data: "07/09/2025", periodo: "Sem 2" },
  { id: "#VD-1162", cliente: "Rho Leaders", vendedor: "Maria Santos", valor: 17800, natureza: "Venda Direta", segmento: "Corporativo", statusCliente: "Ativo", uf: "MG", data: "06/09/2025", periodo: "Sem 2" },
  { id: "#VD-1163", cliente: "Sigma Hub", vendedor: "Carlos Oliveira", valor: 10500, natureza: "Locação", segmento: "PME", statusCliente: "Ativo", uf: "PR", data: "05/09/2025", periodo: "Sem 2" },
  { id: "#VD-1164", cliente: "Tau Pro", vendedor: "Ana Paula", valor: 15600, natureza: "Demonstração", segmento: "Standard", statusCliente: "Inativo", uf: "DF", data: "04/09/2025", periodo: "Sem 2" },
  { id: "#VD-1165", cliente: "Upsilon Experts", vendedor: "Pedro Costa", valor: 21200, natureza: "Venda Direta", segmento: "Premium", statusCliente: "Ativo", uf: "RS", data: "03/09/2025", periodo: "Sem 2" },
  { id: "#VD-1166", cliente: "Phi Smart", vendedor: "João Silva", valor: 11900, natureza: "Serviço", segmento: "Startup", statusCliente: "Ativo", uf: "SC", data: "02/09/2025", periodo: "Sem 2" },
  
  // Semana 1
  { id: "#VD-1150", cliente: "Chi Partners", vendedor: "Maria Santos", valor: 16700, natureza: "Revenda", segmento: "Corporativo", statusCliente: "Ativo", uf: "SP", data: "01/09/2025", periodo: "Sem 1" },
  { id: "#VD-1151", cliente: "Psi Future", vendedor: "Carlos Oliveira", valor: 9800, natureza: "Venda Direta", segmento: "PME", statusCliente: "Ativo", uf: "RJ", data: "31/08/2025", periodo: "Sem 1" },
  { id: "#VD-1152", cliente: "Omega Ltd", vendedor: "Ana Paula", valor: 25400, natureza: "Serviço", segmento: "VIP", statusCliente: "Ativo", uf: "MG", data: "30/08/2025", periodo: "Sem 1" },
  { id: "#VD-1153", cliente: "Alpha Solutions", vendedor: "Pedro Costa", valor: 12800, natureza: "Revenda", segmento: "Premium", statusCliente: "Ativo", uf: "BA", data: "29/08/2025", periodo: "Sem 1" },
  { id: "#VD-1154", cliente: "Beta Tech", vendedor: "João Silva", valor: 18300, natureza: "Venda Direta", segmento: "Corporativo", statusCliente: "Ativo", uf: "SP", data: "28/08/2025", periodo: "Sem 1" },
  { id: "#VD-1155", cliente: "Gamma Innovation", vendedor: "Maria Santos", valor: 10900, natureza: "Locação", segmento: "Standard", statusCliente: "Ativo", uf: "CE", data: "27/08/2025", periodo: "Sem 1" },
  { id: "#VD-1156", cliente: "Delta Digital", vendedor: "Carlos Oliveira", valor: 14700, natureza: "Demonstração", segmento: "PME", statusCliente: "Inativo", uf: "GO", data: "26/08/2025", periodo: "Sem 1" },
  { id: "#VD-1157", cliente: "Epsilon Business", vendedor: "Ana Paula", valor: 19600, natureza: "Venda Direta", segmento: "Premium", statusCliente: "Ativo", uf: "RS", data: "25/08/2025", periodo: "Sem 1" },
  { id: "#VD-1158", cliente: "Zeta Labs", vendedor: "Pedro Costa", valor: 11500, natureza: "Serviço", segmento: "Startup", statusCliente: "Ativo", uf: "PR", data: "24/08/2025", periodo: "Sem 1" },
  { id: "#VD-1159", cliente: "Eta Corp", vendedor: "João Silva", valor: 16200, natureza: "Revenda", segmento: "Corporativo", statusCliente: "Ativo", uf: "AM", data: "23/08/2025", periodo: "Sem 1" },
];

// Função helper para calcular quantidade de produtos (se não existir no objeto)
function getQuantidade(transaction: Transaction): number {
  // Se a transação já tem quantidade definida, usa ela
  if (transaction.quantidade !== undefined) {
    return transaction.quantidade;
  }
  // Caso contrário, calcula baseado no valor (média de R$ 700 por produto)
  return Math.max(1, Math.round(transaction.valor / 700));
}

// Função para calcular métricas a partir de transações
export function calculateMetrics(
  transactions: Transaction[], 
  metaMensalCustom?: number,
  vendedorNome?: string
) {
  const vendasTotais = transactions.reduce((sum, t) => sum + t.valor, 0);
  const negociosFechados = transactions.length;
  const produtosVendidos = transactions.reduce((sum, t) => sum + getQuantidade(t), 0);
  
  // Contar vendedores únicos
  const vendedoresUnicos = new Set(transactions.map(t => t.vendedor)).size;
  
  // Calcular Positivação usando a mesma lógica do CustomerWalletCard
  // Passa o vendedor para filtrar apenas clientes desse vendedor
  const positivationData = calculatePositivation(transactions, vendedorNome);
  
  // Calcular Ticket Médio
  const ticketMedio = negociosFechados > 0 ? vendasTotais / negociosFechados : 0;
  
  // Calcular porcentagem da meta
  // Se uma meta customizada foi fornecida, usa ela; senão, usa meta padrão de R$ 500k
  const metaMensal = metaMensalCustom || 500000;
  const porcentagemMeta = Math.round((vendasTotais / metaMensal) * 100);
  
  return {
    vendasTotais,
    porcentagemMeta,
    vendedoresAtivos: vendedoresUnicos,
    negociosFechados,
    produtosVendidos,
    positivacao: positivationData.positivationPercentage, // Retorna o percentual
    positivacaoCount: positivationData.positivatedCount, // Número de clientes que compraram
    positivacaoTotal: positivationData.totalCustomers, // Total de clientes na base
    ticketMedio
  };
}

// Função para calcular variação percentual entre dois valores
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10; // Arredonda para 1 casa decimal
}

// Função para calcular métricas comparadas com período anterior
export function calculateMetricsWithComparison(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[],
  metaMensalCustom?: number,
  vendedorNome?: string
) {
  const current = calculateMetrics(currentTransactions, metaMensalCustom, vendedorNome);
  const previous = calculateMetrics(previousTransactions, metaMensalCustom, vendedorNome);
  
  return {
    vendasTotais: current.vendasTotais,
    vendasTotaisChange: calculatePercentageChange(current.vendasTotais, previous.vendasTotais),
    
    produtosVendidos: current.produtosVendidos,
    produtosVendidosChange: calculatePercentageChange(current.produtosVendidos, previous.produtosVendidos),
    
    porcentagemMeta: current.porcentagemMeta,
    porcentagemMetaChange: calculatePercentageChange(current.porcentagemMeta, previous.porcentagemMeta),
    
    vendedoresAtivos: current.vendedoresAtivos,
    vendedoresAtivosChange: calculatePercentageChange(current.vendedoresAtivos, previous.vendedoresAtivos),
    
    negociosFechados: current.negociosFechados,
    negociosFechadosChange: calculatePercentageChange(current.negociosFechados, previous.negociosFechados),
    
    positivacao: current.positivacao,
    positivacaoChange: calculatePercentageChange(current.positivacao, previous.positivacao),
    positivacaoCount: current.positivacaoCount,
    positivacaoTotal: current.positivacaoTotal,
    
    ticketMedio: current.ticketMedio,
    ticketMedioChange: calculatePercentageChange(current.ticketMedio, previous.ticketMedio),
  };
}

// Função para agrupar transações por período para o gráfico
export function groupTransactionsByPeriod(transactions: Transaction[]) {
  const grouped = new Map<string, number>();
  
  transactions.forEach(t => {
    const current = grouped.get(t.periodo) || 0;
    grouped.set(t.periodo, current + t.valor);
  });
  
  // Define a ordem correta dos períodos
  const periodOrder: Record<string, string[]> = {
    days: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    weeks: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"]
  };
  
  const result = Array.from(grouped.entries()).map(([periodo, vendas]) => ({
    periodo,
    vendas
  }));
  
  // Ordenar baseado no tipo de período
  if (result.length > 0 && result[0].periodo.includes("Sem")) {
    result.sort((a, b) => {
      const indexA = periodOrder.weeks.indexOf(a.periodo);
      const indexB = periodOrder.weeks.indexOf(b.periodo);
      return indexA - indexB;
    });
  } else if (result.length > 0 && periodOrder.days.includes(result[0].periodo)) {
    result.sort((a, b) => {
      const indexA = periodOrder.days.indexOf(a.periodo);
      const indexB = periodOrder.days.indexOf(b.periodo);
      return indexA - indexB;
    });
  }
  
  return result;
}

// Função para gerar dados diários detalhados agrupados por semana
export function groupTransactionsByDay(transactions: Transaction[]) {
  const grouped = new Map<string, number>();
  
  transactions.forEach(t => {
    const current = grouped.get(t.dia) || 0;
    grouped.set(t.dia, current + t.valor);
  });
  
  // Mapeamento de dias para números (para ordenação)
  const diasOrdem: Record<string, number> = {
    "Seg": 1, "Ter": 2, "Qua": 3, "Qui": 4, "Sex": 5, "Sáb": 6, "Dom": 7
  };
  
  const result = Array.from(grouped.entries()).map(([dia, vendas]) => ({
    dia,
    vendas,
    ordem: diasOrdem[dia] || 0
  }));
  
  // Ordenar por ordem de dia da semana
  result.sort((a, b) => a.ordem - b.ordem);
  
  return result.map(({ dia, vendas }) => ({ dia, vendas }));
}

// Interface para clientes
export interface Customer {
  id: string;
  nome: string;
  segmento: string;
  status: "Ativo" | "Inativo" | "Excluído";
  vendedorResponsavel: string;
}

// Lista completa de clientes
export const allCustomers: Customer[] = [
  // Clientes Ativos
  { id: "C001", nome: "Startup Inovação", segmento: "Startup", status: "Ativo", vendedorResponsavel: "Pedro Costa" },
  { id: "C002", nome: "Tech Solutions", segmento: "PME", status: "Ativo", vendedorResponsavel: "João Silva" },
  { id: "C003", nome: "Digital Corp", segmento: "Standard", status: "Ativo", vendedorResponsavel: "Maria Santos" },
  { id: "C004", nome: "Grupo Omega", segmento: "Corporativo", status: "Ativo", vendedorResponsavel: "João Silva" },
  { id: "C005", nome: "Business Pro", segmento: "Premium", status: "Ativo", vendedorResponsavel: "Carlos Oliveira" },
  { id: "C006", nome: "Digital Hub", segmento: "PME", status: "Ativo", vendedorResponsavel: "Maria Santos" },
  { id: "C007", nome: "Innovation Labs", segmento: "VIP", status: "Ativo", vendedorResponsavel: "Pedro Costa" },
  { id: "C008", nome: "Future Tech", segmento: "Startup", status: "Ativo", vendedorResponsavel: "João Silva" },
  { id: "C009", nome: "Tech Ventures", segmento: "Premium", status: "Ativo", vendedorResponsavel: "Carlos Oliveira" },
  { id: "C010", nome: "Smart Solutions", segmento: "Corporativo", status: "Ativo", vendedorResponsavel: "Ana Paula" },
  { id: "C011", nome: "Startup Alpha", segmento: "Startup", status: "Ativo", vendedorResponsavel: "Ana Paula" },
  { id: "C012", nome: "Global Systems", segmento: "Premium", status: "Ativo", vendedorResponsavel: "João Silva" },
  { id: "C013", nome: "Empresa ABC", segmento: "Standard", status: "Ativo", vendedorResponsavel: "João Silva" },
  { id: "C014", nome: "Tech Solutions Pro", segmento: "Premium", status: "Ativo", vendedorResponsavel: "Maria Santos" },
  { id: "C015", nome: "Indústria XYZ", segmento: "Corporativo", status: "Ativo", vendedorResponsavel: "Carlos Oliveira" },
  { id: "C016", nome: "Serviços Delta", segmento: "Standard", status: "Ativo", vendedorResponsavel: "Pedro Costa" },
  { id: "C017", nome: "Grupo Omega Plus", segmento: "VIP", status: "Ativo", vendedorResponsavel: "João Silva" },
  { id: "C018", nome: "Digital Hub Pro", segmento: "Premium", status: "Ativo", vendedorResponsavel: "Maria Santos" },
  { id: "C019", nome: "Innovation Co", segmento: "Corporativo", status: "Ativo", vendedorResponsavel: "Carlos Oliveira" },
  { id: "C020", nome: "Business Pro Ltda", segmento: "PME", status: "Ativo", vendedorResponsavel: "Ana Paula" },
  { id: "C021", nome: "Tech Ventures SA", segmento: "Premium", status: "Ativo", vendedorResponsavel: "Pedro Costa" },
  { id: "C022", nome: "Smart Solutions Inc", segmento: "VIP", status: "Ativo", vendedorResponsavel: "João Silva" },
  { id: "C023", nome: "Global Corp SA", segmento: "Corporativo", status: "Ativo", vendedorResponsavel: "Maria Santos" },
  { id: "C024", nome: "Future Systems Co", segmento: "Startup", status: "Ativo", vendedorResponsavel: "Ana Paula" },
  { id: "C025", nome: "Enterprise Ltd", segmento: "VIP", status: "Ativo", vendedorResponsavel: "Pedro Costa" },
  { id: "C026", nome: "Corp Solutions Pro", segmento: "Premium", status: "Ativo", vendedorResponsavel: "João Silva" },
  { id: "C027", nome: "Tech Leaders Inc", segmento: "Corporativo", status: "Ativo", vendedorResponsavel: "Maria Santos" },
  { id: "C028", nome: "Innovation Hub SA", segmento: "PME", status: "Ativo", vendedorResponsavel: "Carlos Oliveira" },
  { id: "C029", nome: "Business Experts Co", segmento: "Premium", status: "Ativo", vendedorResponsavel: "Pedro Costa" },
  { id: "C030", nome: "Smart Tech Labs", segmento: "Startup", status: "Ativo", vendedorResponsavel: "João Silva" },
  
  // Clientes Inativos
  { id: "C031", nome: "Corp ABC", segmento: "Standard", status: "Inativo", vendedorResponsavel: "Ana Paula" },
  { id: "C032", nome: "Global Trade", segmento: "PME", status: "Inativo", vendedorResponsavel: "Maria Santos" },
  { id: "C033", nome: "Corp Solutions", segmento: "Standard", status: "Inativo", vendedorResponsavel: "Ana Paula" },
  { id: "C034", nome: "Digital Experts", segmento: "Standard", status: "Inativo", vendedorResponsavel: "Pedro Costa" },
  { id: "C035", nome: "Comércio Beta", segmento: "PME", status: "Inativo", vendedorResponsavel: "Ana Paula" },
  { id: "C036", nome: "Digital Masters Ltd", segmento: "Standard", status: "Inativo", vendedorResponsavel: "Carlos Oliveira" },
  { id: "C037", nome: "Digital Pro Ltda", segmento: "Standard", status: "Inativo", vendedorResponsavel: "Ana Paula" },
  { id: "C038", nome: "Tech Masters Pro", segmento: "PME", status: "Inativo", vendedorResponsavel: "Maria Santos" },
  { id: "C039", nome: "Old Systems Inc", segmento: "Standard", status: "Inativo", vendedorResponsavel: "João Silva" },
  { id: "C040", nome: "Legacy Corp", segmento: "PME", status: "Inativo", vendedorResponsavel: "Carlos Oliveira" },
  
  // Clientes Excluídos (não devem ser contados)
  { id: "C041", nome: "Closed Business", segmento: "Standard", status: "Excluído", vendedorResponsavel: "João Silva" },
  { id: "C042", nome: "Defunct Corp", segmento: "PME", status: "Excluído", vendedorResponsavel: "Maria Santos" },
  { id: "C043", nome: "Old Client Ltd", segmento: "Standard", status: "Excluído", vendedorResponsavel: "Pedro Costa" },
];

// Função para calcular positivação (clientes únicos que compraram no período)
export function calculatePositivation(transactions: Transaction[], vendedorNome?: string) {
  // Clientes únicos que compraram
  const uniqueCustomers = new Set(transactions.map(t => t.cliente));
  const positivatedCount = uniqueCustomers.size;
  
  // Total de clientes na carteira (excluindo "Excluído")
  // Se vendedor especificado, contar apenas clientes desse vendedor
  let totalCustomers: number;
  if (vendedorNome) {
    totalCustomers = allCustomers.filter(c => 
      c.status !== "Excluído" && c.vendedorResponsavel === vendedorNome
    ).length;
  } else {
    totalCustomers = allCustomers.filter(c => c.status !== "Excluído").length;
  }
  
  // Percentual de positivação
  const positivationPercentage = totalCustomers > 0 
    ? Math.round((positivatedCount / totalCustomers) * 100 * 10) / 10 
    : 0;
  
  return {
    positivatedCount,
    totalCustomers,
    positivationPercentage
  };
}

// Função para calcular distribuição de clientes por status
export function calculateCustomerDistribution(vendedorNome?: string) {
  // Filtrar clientes por vendedor se especificado
  let filteredCustomers = allCustomers;
  if (vendedorNome) {
    filteredCustomers = allCustomers.filter(c => c.vendedorResponsavel === vendedorNome);
  }
  
  // Filtrar apenas clientes Ativos e Inativos (excluir "Excluído")
  const activeCustomers = filteredCustomers.filter(c => c.status === "Ativo");
  const inactiveCustomers = filteredCustomers.filter(c => c.status === "Inativo");
  const totalInWallet = activeCustomers.length + inactiveCustomers.length;
  
  const activePercentage = totalInWallet > 0 
    ? Math.round((activeCustomers.length / totalInWallet) * 100 * 10) / 10 
    : 0;
  const inactivePercentage = totalInWallet > 0 
    ? Math.round((inactiveCustomers.length / totalInWallet) * 100 * 10) / 10 
    : 0;
  
  return {
    active: activeCustomers.length,
    inactive: inactiveCustomers.length,
    total: totalInWallet,
    activePercentage,
    inactivePercentage
  };
}

// Função para calcular o ranking de vendedores baseado nas transações
export interface TopSeller {
  nome: string;
  vendas: string;
  vendas_valor: number;
  fechamentos: number;
  iniciais: string;
  posicao: number;
}

export function calculateTopSellers(transactions: Transaction[]): TopSeller[] {
  // Agrupar transações por vendedor
  const sellerStats = new Map<string, { valor: number; count: number }>();
  
  transactions.forEach(transaction => {
    const current = sellerStats.get(transaction.vendedor) || { valor: 0, count: 0 };
    sellerStats.set(transaction.vendedor, {
      valor: current.valor + transaction.valor,
      count: current.count + 1
    });
  });
  
  // Converter para array e ordenar por valor total de vendas
  const sellers: TopSeller[] = Array.from(sellerStats.entries())
    .map(([nome, stats]) => {
      // Extrair iniciais do nome
      const iniciais = nome
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      return {
        nome,
        vendas: `R$ ${stats.valor.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
        vendas_valor: stats.valor,
        fechamentos: stats.count,
        iniciais,
        posicao: 0 // Será atribuído após ordenação
      };
    })
    .sort((a, b) => b.vendas_valor - a.vendas_valor);
  
  // Atribuir posições
  sellers.forEach((seller, index) => {
    seller.posicao = index + 1;
  });
  
  // Retornar top 5
  return sellers.slice(0, 5);
}

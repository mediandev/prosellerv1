// Tipos para sistema de usuários e permissões

export type TipoUsuario = 'backoffice' | 'vendedor';

export interface Permissao {
  id: string;
  nome: string;
  descricao: string;
  categoria: 'clientes' | 'vendas' | 'relatorios' | 'configuracoes' | 'usuarios' | 'contacorrente';
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  permissoes: string[]; // IDs das permissões
  ativo: boolean;
  
  // Para vendedores
  clientesAtribuidos?: string[]; // IDs dos clientes
  
  // Metadados
  dataCadastro: string;
  ultimoAcesso?: string;
}

// Lista de permissões disponíveis
export const PERMISSOES_DISPONIVEIS: Permissao[] = [
  // Clientes
  { id: 'clientes.visualizar', nome: 'Visualizar Clientes', descricao: 'Permite visualizar lista de clientes', categoria: 'clientes' },
  { id: 'clientes.criar', nome: 'Criar Clientes', descricao: 'Permite cadastrar novos clientes', categoria: 'clientes' },
  { id: 'clientes.editar', nome: 'Editar Clientes', descricao: 'Permite editar dados de clientes', categoria: 'clientes' },
  { id: 'clientes.excluir', nome: 'Excluir Clientes', descricao: 'Permite excluir clientes', categoria: 'clientes' },
  { id: 'clientes.todos', nome: 'Ver Todos os Clientes', descricao: 'Permite ver clientes de todos os vendedores (backoffice)', categoria: 'clientes' },
  
  // Vendas
  { id: 'vendas.visualizar', nome: 'Visualizar Vendas', descricao: 'Permite visualizar vendas', categoria: 'vendas' },
  { id: 'vendas.criar', nome: 'Criar Vendas', descricao: 'Permite criar novas vendas', categoria: 'vendas' },
  { id: 'vendas.editar', nome: 'Editar Vendas', descricao: 'Permite editar vendas', categoria: 'vendas' },
  { id: 'vendas.excluir', nome: 'Excluir Vendas', descricao: 'Permite excluir vendas', categoria: 'vendas' },
  { id: 'vendas.todas', nome: 'Ver Todas as Vendas', descricao: 'Permite ver vendas de todos os vendedores (backoffice)', categoria: 'vendas' },
  
  // Relatórios
  { id: 'relatorios.visualizar', nome: 'Visualizar Relatórios', descricao: 'Permite acessar relatórios', categoria: 'relatorios' },
  { id: 'relatorios.todos', nome: 'Ver Todos os Relatórios', descricao: 'Permite ver relatórios de todos os vendedores (backoffice)', categoria: 'relatorios' },
  
  // Configurações
  { id: 'config.minhas_empresas', nome: 'Gerenciar Minhas Empresas', descricao: 'Permite acessar e configurar empresas de faturamento', categoria: 'configuracoes' },
  { id: 'config.geral', nome: 'Configurações Gerais', descricao: 'Permite acessar configurações gerais do sistema', categoria: 'configuracoes' },
  
  // Usuários
  { id: 'usuarios.visualizar', nome: 'Visualizar Usuários', descricao: 'Permite visualizar lista de usuários', categoria: 'usuarios' },
  { id: 'usuarios.criar', nome: 'Criar Usuários', descricao: 'Permite criar novos usuários', categoria: 'usuarios' },
  { id: 'usuarios.editar', nome: 'Editar Usuários', descricao: 'Permite editar usuários', categoria: 'usuarios' },
  { id: 'usuarios.excluir', nome: 'Excluir Usuários', descricao: 'Permite excluir usuários', categoria: 'usuarios' },
  { id: 'usuarios.permissoes', nome: 'Gerenciar Permissões', descricao: 'Permite gerenciar permissões de usuários', categoria: 'usuarios' },
  
  // Financeiro - Conta Corrente
  { id: 'contacorrente.visualizar', nome: 'Visualizar Conta Corrente', descricao: 'Permite visualizar lançamentos de conta corrente', categoria: 'contacorrente' },
  { id: 'contacorrente.criar', nome: 'Criar Lançamentos', descricao: 'Permite criar novos lançamentos de conta corrente', categoria: 'contacorrente' },
  { id: 'contacorrente.editar', nome: 'Editar Lançamentos', descricao: 'Permite editar lançamentos de conta corrente', categoria: 'contacorrente' },
  { id: 'contacorrente.excluir', nome: 'Excluir Lançamentos', descricao: 'Permite excluir lançamentos de conta corrente', categoria: 'contacorrente' },
];
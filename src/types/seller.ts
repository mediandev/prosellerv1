export type SellerStatus = "ativo" | "inativo" | "excluido";
export type AccountType = "corrente" | "poupanca" | "salario" | "pagamento";
export type PixKeyType = "cpf_cnpj" | "email" | "telefone" | "aleatoria";
export type CommissionRule = "aliquota_fixa" | "lista_preco";

export interface AdditionalContact {
  id: string;
  nome: string;
  email: string;
  telefoneCelular: string;
  telefoneFixo: string;
  ramal: string;
  observacoes: string;
}

export interface BankData {
  banco: string;
  agencia: string;
  digitoAgencia: string;
  tipoConta: AccountType;
  numeroConta: string;
  digitoConta: string;
  nomeTitular: string;
  cpfCnpjTitular: string;
  tipoChavePix: PixKeyType;
  chavePix: string;
}

export interface Address {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  uf: string;
  municipio: string;
  enderecoEntregaDiferente: boolean;
}

export interface MonthlyGoal {
  mes: number; // 1-12
  valor: number;
}

export interface YearlyGoals {
  ano: number;
  metas: MonthlyGoal[];
}

export interface CommissionSettings {
  regraAplicavel: CommissionRule;
  aliquotaFixa?: number; // Percentual
}

export interface UserPermissions {
  dashboard: { visualizar: boolean; criar: boolean; editar: boolean; excluir: boolean };
  vendas: { visualizar: boolean; criar: boolean; editar: boolean; excluir: boolean };
  pipeline: { visualizar: boolean; criar: boolean; editar: boolean; excluir: boolean };
  clientes: { visualizar: boolean; criar: boolean; editar: boolean; excluir: boolean };
  metas: { visualizar: boolean; criar: boolean; editar: boolean; excluir: boolean };
  comissoes: { visualizar: boolean; criar: boolean; editar: boolean; excluir: boolean };
  produtos: { visualizar: boolean; criar: boolean; editar: boolean; excluir: boolean };
  relatorios: { visualizar: boolean; criar: boolean; editar: boolean; excluir: boolean };
  equipe: { visualizar: boolean; criar: boolean; editar: boolean; excluir: boolean };
  configuracoes: { visualizar: boolean; criar: boolean; editar: boolean; excluir: boolean };
}

export interface UserSettings {
  usuarioCriado: boolean;
  email: string;
  conviteEnviado: boolean;
  dataConvite?: string;
  senhaDefinida: boolean;
  requisitosSeguranca: boolean;
  permissoes: UserPermissions;
}

export interface ERPIntegration {
  erpNome: string;
  ativo: boolean;
  empresas: Array<{
    empresaId: string;
    empresaNome: string;
    chaveCorrespondente: string; // ID Tiny, por exemplo
  }>;
}

export interface Seller {
  id: string;
  
  // Identificação
  nome: string;
  iniciais: string;
  cpf: string;
  email: string;
  telefone: string;
  dataAdmissao: string;
  status: SellerStatus;
  
  // Acesso ao Sistema
  acessoSistema?: boolean;
  emailAcesso?: string;
  usuarioId?: string;
  
  // Contatos Adicionais
  contatosAdicionais: AdditionalContact[];
  
  // Dados PJ
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  
  // Dados Bancários
  dadosBancarios: BankData;
  
  // Endereço
  endereco: Address;
  
  // Observações Internas
  observacoesInternas: string;
  
  // Metas
  metasAnuais: YearlyGoals[];
  
  // Comissões
  comissoes: CommissionSettings;
  
  // Usuário
  usuario: UserSettings;
  
  // Integrações
  integracoes: ERPIntegration[];
  
  // Performance (dados existentes)
  vendas: {
    total: number;
    mes: number;
    qtdFechamentos: number;
    ticketMedio: number;
    positivacao: number;
  };
  performance: {
    taxaConversao: number;
    tempoMedioFechamento: number;
    clientesAtivos: number;
  };
  historico: Array<{
    mes: string;
    valor: number;
    meta: number;
  }>;
}

export interface Bank {
  codigo: string;
  nome: string;
  nomeCompleto: string;
}

// Tipos para o sistema de clientes

export type TipoPessoa = 'Pessoa Física' | 'Pessoa Jurídica';
export type SituacaoCliente = 'Ativo' | 'Inativo' | 'Excluído' | 'Análise' | 'Reprovado';
export type StatusAprovacaoCliente = 'aprovado' | 'pendente' | 'rejeitado';
export type TipoContaCliente = 'corrente' | 'poupanca' | 'salario' | 'pagamento';
export type TipoChavePixCliente = 'cpf_cnpj' | 'email' | 'telefone' | 'aleatoria';

export interface DadosBancariosCliente {
  id: string;
  banco: string;
  agencia: string;
  digitoAgencia: string;
  tipoConta: TipoContaCliente;
  numeroConta: string;
  digitoConta: string;
  nomeTitular: string;
  cpfCnpjTitular: string;
  tipoChavePix: TipoChavePixCliente;
  chavePix: string;
  principal: boolean; // Define se é a conta principal
}

export interface EnderecoEntrega {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  uf: string;
  municipio: string;
}

export interface PessoaContato {
  id: string;
  nome: string;
  departamento: string;
  cargo: string;
  email: string;
  telefoneCelular: string;
  telefoneFixo?: string;
  ramal?: string;
}

export interface HorarioRecebimento {
  id: string;
  diasSemana: string[]; // ['Segunda', 'Terça', ...]
  horarioInicial1: string; // HH:mm
  horarioFinal1: string; // HH:mm
  temIntervalo: boolean;
  horarioInicial2?: string; // HH:mm (após intervalo)
  horarioFinal2?: string; // HH:mm (após intervalo)
}

export interface InstrucoesAgendamento {
  emails: string[];
  telefones: string[];
  whatsapps: string[];
}

export interface RequisitosLogisticos {
  entregaAgendada: boolean;
  horarioRecebimentoHabilitado: boolean;
  horariosRecebimento: HorarioRecebimento[];
  instrucoesAgendamento?: InstrucoesAgendamento;
  tipoVeiculoEspecifico: boolean;
  tipoVeiculo?: string;
  umSkuPorCaixa: boolean;
  observacoesObrigatorias: string[];
}

export interface VendedorAtribuido {
  id: string;
  nome: string;
  email: string;
}

// DEPRECATED: Usar vendedorAtribuido (singular) ao invés de vendedoresAtribuidos (plural)
// Mantido apenas para compatibilidade com dados antigos

export interface CondicaoPagamento {
  id: string;
  nome: string;
  formaPagamento: string;
  prazoPagamento: string; // Ex: "30", "30/60", "30/60/90"
  descontoExtra: number; // Percentual
  valorPedidoMinimo: number;
}

export interface Cliente {
  id: string;
  codigo?: string; // Código do cliente (manual ou automático)
  
  // Dados Cadastrais - Identificação
  tipoPessoa: TipoPessoa;
  cpfCnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  situacao: SituacaoCliente;
  segmentoMercado: string;
  grupoRede?: string;
  
  // Dados Cadastrais - Endereço
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  uf: string;
  municipio: string;
  enderecoEntregaDiferente: boolean;
  enderecoEntrega?: EnderecoEntrega;
  
  // Dados Cadastrais - Observações
  observacoesInternas?: string;
  
  // Contato - Informações Principais
  site?: string;
  emailPrincipal?: string;
  emailNFe?: string; // E-mail específico para envio de notas fiscais
  telefoneFixoPrincipal?: string;
  telefoneCelularPrincipal?: string;
  
  // Contato - Pessoas de Contato
  pessoasContato: PessoaContato[];
  
  // Dados Bancários
  dadosBancarios: DadosBancariosCliente[];
  
  // Condição Comercial
  empresaFaturamento: string;
  vendedorAtribuido?: VendedorAtribuido; // Um único vendedor por cliente
  vendedoresAtribuidos?: VendedorAtribuido[]; // DEPRECATED: Mantido para compatibilidade
  listaPrecos?: string;
  descontoPadrao: number;
  descontoFinanceiro: number;
  condicoesPagamentoAssociadas: string[]; // IDs das condições de pagamento
  pedidoMinimo: number;
  
  // Logística
  requisitosLogisticos?: RequisitosLogisticos;
  
  // Aprovação (para clientes cadastrados por vendedores)
  statusAprovacao: StatusAprovacaoCliente;
  motivoRejeicao?: string;
  aprovadoPor?: string;
  dataAprovacao?: string;
  
  // Metadados
  dataCadastro: string;
  dataAtualizacao: string;
  criadoPor: string;
  atualizadoPor: string;
}

export interface GrupoRede {
  id: string;
  nome: string;
  descricao?: string;
}

export interface SegmentoMercado {
  id: string;
  nome: string;
  descricao?: string;
}

export interface ListaPrecos {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
}

export interface EmpresaFaturamento {
  id: string;
  nome: string;
  cnpj: string;
  ativo: boolean;
  erpIntegrado?: {
    tipo: string; // Ex: "SAP", "TOTVS", "Omie"
    apiKey: string;
  };
}

export interface TipoVeiculo {
  id: string;
  nome: string;
  descricao?: string;
}

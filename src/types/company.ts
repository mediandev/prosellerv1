export interface CompanyBankAccount {
  id: string;
  banco: string;
  agencia: string;
  digitoAgencia: string;
  tipoConta: "corrente" | "poupanca" | "salario" | "pagamento";
  numeroConta: string;
  digitoConta: string;
  tipoChavePix: "cpf_cnpj" | "email" | "telefone" | "aleatoria";
  chavePix: string;
}

export interface CompanyAddress {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  uf: string;
  municipio: string;
}

export interface CompanyERPConfig {
  erpNome: string; // "Tiny ERP", etc
  ativo: boolean;
  apiToken: string;
  apiUrl?: string;
  
  // Configurações de Envio Automático
  envioAutomatico?: {
    habilitado: boolean; // Se deve enviar pedidos automaticamente ao ERP
    tentativasMaximas: number; // Quantas vezes retentar em caso de erro
    intervaloRetentativa: number; // Minutos entre retentativas
  };
  
  // Configurações de Sincronização (Tiny ERP)
  sincronizacao?: {
    habilitado: boolean;
    sincronizarAutomaticamente: boolean;
    intervaloMinutos: number;
    notificarAlteracoes: boolean;
    sincronizarDadosAdicionais: boolean;
    webhookUrl?: string; // URL específica para esta empresa
  };
}

export interface Company {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  /** Chave/token de API (ex.: Tiny ERP) - vem do campo chave_api da tabela ref_empresas_subsidiarias */
  chaveApi?: string;
  endereco: CompanyAddress;
  contasBancarias: CompanyBankAccount[];
  integracoesERP: CompanyERPConfig[];
  ativo: boolean;
  dataCadastro: string;
}

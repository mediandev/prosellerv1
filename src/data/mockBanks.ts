import { Bank } from "../types/seller";

// Lista dos principais bancos brasileiros baseada no Banco Central do Brasil
export const mockBanks: Bank[] = [
  { codigo: "001", nome: "Banco do Brasil", nomeCompleto: "001 - Banco do Brasil S.A." },
  { codigo: "033", nome: "Santander", nomeCompleto: "033 - Banco Santander (Brasil) S.A." },
  { codigo: "104", nome: "Caixa Econômica Federal", nomeCompleto: "104 - Caixa Econômica Federal" },
  { codigo: "237", nome: "Bradesco", nomeCompleto: "237 - Banco Bradesco S.A." },
  { codigo: "341", nome: "Itaú", nomeCompleto: "341 - Itaú Unibanco S.A." },
  { codigo: "077", nome: "Banco Inter", nomeCompleto: "077 - Banco Inter S.A." },
  { codigo: "260", nome: "Nu Pagamentos", nomeCompleto: "260 - Nu Pagamentos S.A. (Nubank)" },
  { codigo: "290", nome: "PagSeguro", nomeCompleto: "290 - PagSeguro Internet S.A." },
  { codigo: "323", nome: "Mercado Pago", nomeCompleto: "323 - Mercado Pago" },
  { codigo: "336", nome: "C6 Bank", nomeCompleto: "336 - Banco C6 S.A." },
  { codigo: "389", nome: "Banco Mercantil", nomeCompleto: "389 - Banco Mercantil do Brasil S.A." },
  { codigo: "422", nome: "Banco Safra", nomeCompleto: "422 - Banco Safra S.A." },
  { codigo: "748", nome: "Sicredi", nomeCompleto: "748 - Banco Cooperativo Sicredi S.A." },
  { codigo: "756", nome: "Sicoob/Bancoob", nomeCompleto: "756 - Banco Cooperativo do Brasil S.A. (Sicoob/Bancoob)" },
  { codigo: "212", nome: "Banco Original", nomeCompleto: "212 - Banco Original S.A." },
  { codigo: "070", nome: "BRB", nomeCompleto: "070 - Banco de Brasília S.A." },
  { codigo: "041", nome: "Banrisul", nomeCompleto: "041 - Banco do Estado do Rio Grande do Sul S.A." },
  { codigo: "047", nome: "Banco do Estado de Sergipe", nomeCompleto: "047 - Banco do Estado de Sergipe S.A." },
  { codigo: "004", nome: "Banco do Nordeste", nomeCompleto: "004 - Banco do Nordeste do Brasil S.A." },
  { codigo: "021", nome: "Banestes", nomeCompleto: "021 - Banco do Estado do Espírito Santo S.A." },
  { codigo: "655", nome: "Banco Votorantim", nomeCompleto: "655 - Banco Votorantim S.A." },
  { codigo: "633", nome: "Banco Rendimento", nomeCompleto: "633 - Banco Rendimento S.A." },
  { codigo: "218", nome: "Banco BS2", nomeCompleto: "218 - Banco BS2 S.A." },
  { codigo: "208", nome: "Banco BTG Pactual", nomeCompleto: "208 - Banco BTG Pactual S.A." },
  { codigo: "246", nome: "Banco ABC Brasil", nomeCompleto: "246 - Banco ABC Brasil S.A." },
  { codigo: "025", nome: "Banco Alfa", nomeCompleto: "025 - Banco Alfa S.A." },
  { codigo: "075", nome: "Banco ABN AMRO", nomeCompleto: "075 - Banco ABN AMRO S.A." },
  { codigo: "623", nome: "Banco Pan", nomeCompleto: "623 - Banco Pan S.A." },
  { codigo: "224", nome: "Banco Fibra", nomeCompleto: "224 - Banco Fibra S.A." },
  { codigo: "626", nome: "Banco C6 Consignado", nomeCompleto: "626 - Banco C6 Consignado S.A." },
  { codigo: "654", nome: "Banco Digimais", nomeCompleto: "654 - Banco Digimais S.A." },
  { codigo: "739", nome: "Banco Cetelem", nomeCompleto: "739 - Banco Cetelem S.A." },
  { codigo: "743", nome: "Banco Semear", nomeCompleto: "743 - Banco Semear S.A." },
  { codigo: "745", nome: "Banco Citibank", nomeCompleto: "745 - Banco Citibank S.A." },
  { codigo: "747", nome: "Banco Rabobank", nomeCompleto: "747 - Banco Rabobank International Brasil S.A." },
  { codigo: "010", nome: "Credicoamo", nomeCompleto: "010 - Credicoamo Crédito Rural Cooperativa" },
  { codigo: "085", nome: "Cooperativa Central", nomeCompleto: "085 - Cooperativa Central de Crédito - Ailos" },
];

export const accountTypes = [
  { value: "corrente", label: "Conta Corrente" },
  { value: "poupanca", label: "Conta Poupança" },
  { value: "salario", label: "Conta Salário" },
  { value: "pagamento", label: "Conta Pagamento" },
];

export const pixKeyTypes = [
  { value: "cpf_cnpj", label: "CPF/CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Chave Aleatória" },
];

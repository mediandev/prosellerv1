// Tipos para Natureza de Operação

export interface NaturezaOperacao {
  id: string;
  nome: string;
  codigo?: string;
  descricao?: string;
  geraComissao: boolean;
  geraReceita: boolean;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

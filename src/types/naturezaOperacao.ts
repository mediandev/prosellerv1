// Tipos para Natureza de Operação

export interface NaturezaOperacao {
  id: string;
  nome: string;
  codigo?: string;
  descricao?: string;
  geraComissao: boolean;
  geraReceita: boolean;
  ativo: boolean;
  tiny_id?: string;
  createdAt: Date;
  updatedAt: Date;
}

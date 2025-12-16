export interface TipoVeiculo {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

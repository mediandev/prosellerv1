import { TipoProduto } from '../types/produto';

export const mockTiposProduto: TipoProduto[] = [
  {
    id: '1',
    nome: 'Revenda',
    descricao: 'Produtos destinados à revenda',
    ativo: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    nome: 'Promocional',
    descricao: 'Produtos promocionais e brindes',
    ativo: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    nome: 'Uso e Consumo',
    descricao: 'Produtos para uso e consumo interno',
    ativo: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '4',
    nome: 'Matéria Prima',
    descricao: 'Matérias primas para produção',
    ativo: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '5',
    nome: 'Imobilizado',
    descricao: 'Produtos do ativo imobilizado',
    ativo: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

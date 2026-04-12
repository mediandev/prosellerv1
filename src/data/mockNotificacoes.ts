import { Notificacao } from '../types/notificacao';

export const notificacoesMock: Notificacao[] = [
  {
    id: 'not-001',
    tipo: 'cliente_pendente_aprovacao',
    titulo: 'Novo cliente aguardando aprovação',
    mensagem: 'O vendedor João Silva cadastrou um novo cliente: Farmácia São José LTDA',
    link: '/clientes/pendentes',
    status: 'nao_lida',
    usuarioId: 'user-1', // Admin
    dataCriacao: '2025-11-01T09:30:00Z',
    dadosAdicionais: {
      clienteId: 'cliente-pendente-1',
      clienteNome: 'Farmácia São José LTDA',
      vendedorId: 'seller-1',
      vendedorNome: 'João Silva',
    },
  },
  {
    id: 'not-002',
    tipo: 'cliente_pendente_aprovacao',
    mensagem: 'O vendedor João Silva cadastrou um novo cliente: Mercearia Central LTDA',
    link: '/clientes/pendentes',
    titulo: 'Novo cliente aguardando aprovação',
    status: 'nao_lida',
    usuarioId: 'user-1', // Admin
    dataCriacao: '2025-10-31T15:45:00Z',
    dadosAdicionais: {
      clienteId: 'cliente-pendente-2',
      clienteNome: 'Mercearia Central LTDA',
      vendedorId: 'seller-1',
      vendedorNome: 'João Silva',
    },
  },
  {
    id: 'not-003',
    tipo: 'cliente_aprovado',
    titulo: 'Cliente aprovado',
    mensagem: 'Seu cadastro do cliente "Supermercado Bom Preço LTDA" foi aprovado pelo gestor',
    link: '/clientes/cliente-1',
    status: 'lida',
    usuarioId: 'seller-1',
    dataCriacao: '2025-10-30T10:20:00Z',
    dataLeitura: '2025-10-30T14:30:00Z',
    dadosAdicionais: {
      clienteId: 'cliente-1',
      clienteNome: 'Supermercado Bom Preço LTDA',
    },
  },
  {
    id: 'not-004',
    tipo: 'sistema',
    titulo: 'Bem-vindo ao sistema',
    mensagem: 'Seja bem-vindo ao sistema de gestão comercial. Configure suas preferências no menu de configurações.',
    link: '/configuracoes',
    status: 'lida',
    usuarioId: 'user-1',
    dataCriacao: '2025-10-01T08:00:00Z',
    dataLeitura: '2025-10-01T08:05:00Z',
  },
];

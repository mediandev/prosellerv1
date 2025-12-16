export type TipoNotificacao = 
  | 'cliente_pendente_aprovacao'
  | 'cliente_aprovado'
  | 'cliente_rejeitado'
  | 'pedido_novo'
  | 'meta_atingida'
  | 'sistema';

export type StatusNotificacao = 'nao_lida' | 'lida' | 'arquivada';

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  link?: string; // Link para onde navegar ao clicar na notificação
  status: StatusNotificacao;
  usuarioId: string; // ID do usuário que deve receber a notificação
  dataCriacao: string;
  dataLeitura?: string;
  // Dados adicionais específicos por tipo
  dadosAdicionais?: {
    clienteId?: string;
    clienteNome?: string;
    vendedorId?: string;
    vendedorNome?: string;
    pedidoId?: string;
    [key: string]: any;
  };
}

export interface NotificacaoSettings {
  receberEmailClientePendente: boolean;
  receberEmailClienteAprovado: boolean;
  receberEmailClienteRejeitado: boolean;
  receberEmailNovoPedido: boolean;
}

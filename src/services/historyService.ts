// Serviço de histórico de alterações

import { HistoricoAlteracao, TipoAlteracao, CampoAlterado } from '../types/history';
import { Cliente } from '../types/customer';

// Mock data - histórico de alterações
let historicoData: HistoricoAlteracao[] = [
  {
    id: 'hist-1',
    entidadeTipo: 'cliente',
    entidadeId: 'cliente-1',
    tipo: 'criacao',
    descricao: 'Cliente criado',
    usuarioId: 'user-1',
    usuarioNome: 'Admin Backoffice',
    dataHora: '2025-01-10T10:30:00',
  },
  {
    id: 'hist-2',
    entidadeTipo: 'cliente',
    entidadeId: 'cliente-1',
    tipo: 'edicao',
    descricao: 'Dados cadastrais atualizados',
    camposAlterados: [
      {
        campo: 'telefoneFixoPrincipal',
        valorAnterior: '(11) 3000-1111',
        valorNovo: '(11) 3000-1000',
        label: 'Telefone Fixo Principal',
      },
      {
        campo: 'descontoPadrao',
        valorAnterior: 3,
        valorNovo: 5,
        label: 'Desconto Padrão',
      },
    ],
    usuarioId: 'user-1',
    usuarioNome: 'Admin Backoffice',
    dataHora: '2025-01-15T14:20:00',
  },
  {
    id: 'hist-3',
    entidadeTipo: 'cliente',
    entidadeId: 'cliente-1',
    tipo: 'adicao_vendedor',
    descricao: 'Vendedor João Silva atribuído ao cliente',
    usuarioId: 'user-1',
    usuarioNome: 'Admin Backoffice',
    dataHora: '2025-01-15T14:25:00',
  },
  {
    id: 'hist-4',
    entidadeTipo: 'cliente',
    entidadeId: 'cliente-3',
    tipo: 'criacao',
    descricao: 'Cliente criado',
    usuarioId: 'user-1',
    usuarioNome: 'Admin Backoffice',
    dataHora: '2025-01-05T09:15:00',
  },
  {
    id: 'hist-5',
    entidadeTipo: 'cliente',
    entidadeId: 'cliente-3',
    tipo: 'sincronizacao_erp',
    descricao: 'Cliente sincronizado com Tiny ERP',
    metadados: {
      observacoes: 'Sincronização automática executada com sucesso',
    },
    usuarioId: 'system',
    usuarioNome: 'Sistema',
    dataHora: '2025-01-05T09:20:00',
  },
  {
    id: 'hist-6',
    entidadeTipo: 'cliente',
    entidadeId: 'cliente-3',
    tipo: 'edicao_condicao_comercial',
    descricao: 'Condições comerciais atualizadas',
    camposAlterados: [
      {
        campo: 'descontoPadrao',
        valorAnterior: 8,
        valorNovo: 10,
        label: 'Desconto Padrão',
      },
      {
        campo: 'pedidoMinimo',
        valorAnterior: 1500,
        valorNovo: 2000,
        label: 'Pedido Mínimo',
      },
    ],
    usuarioId: 'user-3',
    usuarioNome: 'Maria Santos',
    dataHora: '2025-01-18T16:45:00',
  },
];

class HistoryService {
  // Obter histórico de uma entidade
  getHistoricoByEntidade(
    entidadeTipo: 'cliente' | 'venda' | 'produto' | 'usuario',
    entidadeId: string
  ): HistoricoAlteracao[] {
    return historicoData
      .filter((h) => h.entidadeTipo === entidadeTipo && h.entidadeId === entidadeId)
      .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }

  // Registrar nova alteração
  registrarAlteracao(alteracao: Omit<HistoricoAlteracao, 'id' | 'dataHora'>): HistoricoAlteracao {
    const novaAlteracao: HistoricoAlteracao = {
      ...alteracao,
      id: `hist-${Date.now()}`,
      dataHora: new Date().toISOString(),
    };

    historicoData.push(novaAlteracao);
    return novaAlteracao;
  }

  // Comparar dois objetos e gerar campos alterados
  compararObjetos(objetoAnterior: any, objetoNovo: any, mapeamentoCampos: Record<string, string>): CampoAlterado[] {
    const camposAlterados: CampoAlterado[] = [];

    Object.keys(mapeamentoCampos).forEach((campo) => {
      const valorAnterior = objetoAnterior[campo];
      const valorNovo = objetoNovo[campo];

      // Comparação profunda simplificada
      if (JSON.stringify(valorAnterior) !== JSON.stringify(valorNovo)) {
        camposAlterados.push({
          campo,
          valorAnterior,
          valorNovo,
          label: mapeamentoCampos[campo],
        });
      }
    });

    return camposAlterados;
  }

  // Registrar edição de cliente
  registrarEdicaoCliente(
    clienteAnterior: Cliente,
    clienteNovo: Cliente,
    usuarioId: string,
    usuarioNome: string
  ): HistoricoAlteracao {
    const mapeamentoCampos: Record<string, string> = {
      razaoSocial: 'Razão Social',
      nomeFantasia: 'Nome Fantasia',
      cpfCnpj: 'CPF/CNPJ',
      inscricaoEstadual: 'Inscrição Estadual',
      situacao: 'Situação',
      segmentoMercado: 'Segmento de Mercado',
      grupoRede: 'Grupo/Rede',
      cep: 'CEP',
      logradouro: 'Logradouro',
      numero: 'Número',
      bairro: 'Bairro',
      municipio: 'Município',
      uf: 'UF',
      emailPrincipal: 'E-mail Principal',
      telefoneFixoPrincipal: 'Telefone Fixo',
      telefoneCelularPrincipal: 'Telefone Celular',
      empresaFaturamento: 'Empresa de Faturamento',
      listaPrecos: 'Lista de Preços',
      descontoPadrao: 'Desconto Padrão',
      descontoFinanceiro: 'Desconto Financeiro',
      pedidoMinimo: 'Pedido Mínimo',
    };

    const camposAlterados = this.compararObjetos(clienteAnterior, clienteNovo, mapeamentoCampos);

    if (camposAlterados.length === 0) {
      // Nenhuma alteração detectada
      return this.registrarAlteracao({
        entidadeTipo: 'cliente',
        entidadeId: clienteNovo.id,
        tipo: 'edicao',
        descricao: 'Sem alterações detectadas',
        usuarioId,
        usuarioNome,
      });
    }

    return this.registrarAlteracao({
      entidadeTipo: 'cliente',
      entidadeId: clienteNovo.id,
      tipo: 'edicao',
      descricao: `${camposAlterados.length} campo(s) alterado(s)`,
      camposAlterados,
      usuarioId,
      usuarioNome,
    });
  }

  // Registrar criação de cliente
  registrarCriacaoCliente(cliente: Cliente, usuarioId: string, usuarioNome: string): HistoricoAlteracao {
    return this.registrarAlteracao({
      entidadeTipo: 'cliente',
      entidadeId: cliente.id,
      tipo: 'criacao',
      descricao: `Cliente "${cliente.razaoSocial}" criado`,
      usuarioId,
      usuarioNome,
    });
  }

  // Registrar exclusão de cliente
  registrarExclusaoCliente(cliente: Cliente, usuarioId: string, usuarioNome: string): HistoricoAlteracao {
    return this.registrarAlteracao({
      entidadeTipo: 'cliente',
      entidadeId: cliente.id,
      tipo: 'exclusao',
      descricao: `Cliente "${cliente.razaoSocial}" excluído`,
      usuarioId,
      usuarioNome,
    });
  }

  // Registrar sincronização com ERP
  registrarSincronizacaoERP(
    entidadeTipo: 'cliente' | 'venda' | 'produto',
    entidadeId: string,
    erpNome: string,
    sucesso: boolean,
    observacoes?: string
  ): HistoricoAlteracao {
    return this.registrarAlteracao({
      entidadeTipo,
      entidadeId,
      tipo: 'sincronizacao_erp',
      descricao: sucesso
        ? `Sincronizado com ${erpNome} com sucesso`
        : `Falha na sincronização com ${erpNome}`,
      metadados: {
        observacoes: observacoes || '',
      },
      usuarioId: 'system',
      usuarioNome: 'Sistema',
    });
  }

  // Registrar importação em lote
  registrarImportacao(
    qtdRegistros: number,
    qtdSucesso: number,
    qtdErros: number,
    usuarioId: string,
    usuarioNome: string
  ): HistoricoAlteracao {
    return this.registrarAlteracao({
      entidadeTipo: 'cliente',
      entidadeId: 'importacao-lote',
      tipo: 'importacao',
      descricao: `Importação em lote: ${qtdSucesso} sucesso, ${qtdErros} erros de ${qtdRegistros} registros`,
      usuarioId,
      usuarioNome,
    });
  }
}

export const historyService = new HistoryService();

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Cliente, TipoPessoa, SituacaoCliente } from '../types/customer';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { ArrowLeft, Save, Edit, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { CustomerFormDadosCadastrais } from './CustomerFormDadosCadastrais';
import { CustomerFormContato } from './CustomerFormContato';
import { CustomerFormCondicaoComercial } from './CustomerFormCondicaoComercial';
import { CustomerFormLogistica } from './CustomerFormLogistica';
import { CustomerFormContaCorrente } from './CustomerFormContaCorrente';
import { CustomerHistoryTab } from './CustomerHistoryTab';
import { CustomerMixTab } from './CustomerMixTab';
import { CustomerIndicatorsTab } from './CustomerIndicatorsTab';
import { CNPJDebugger } from './CNPJDebugger';
import { FormDataDebugger } from './FormDataDebugger';
import { historyService } from '../services/historyService';
import { customerCodeService } from '../services/customerCodeService';
import { emailService } from '../services/emailService';
import { api } from '../services/api';

interface CustomerFormPageProps {
  clienteId?: string; // Se fornecido, é edição
  modo: 'criar' | 'editar' | 'visualizar' | 'aprovar';
  onVoltar: () => void;
  onAprovar?: () => void;
  onRejeitar?: () => void;
}

export function CustomerFormPage({ clienteId, modo, onVoltar, onAprovar, onRejeitar }: CustomerFormPageProps) {
  const { usuario, temPermissao } = useAuth();
  const [activeTab, setActiveTab] = useState('dados-cadastrais');
  const [modoAtual, setModoAtual] = useState(modo);
  const [editandoNoModoAprovar, setEditandoNoModoAprovar] = useState(false);
  const [mostrarDialogRejeitar, setMostrarDialogRejeitar] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [formData, setFormData] = useState<Partial<Cliente>>({
    tipoPessoa: 'Pessoa Jurídica',
    situacao: 'Ativo',
    enderecoEntregaDiferente: false,
    pessoasContato: [],
    vendedorAtribuido: undefined,
    descontoPadrao: 0,
    descontoFinanceiro: 0,
    condicoesPagamentoAssociadas: [],
    pedidoMinimo: 0,
    empresaFaturamento: '',
    requisitosLogisticos: {
      entregaAgendada: false,
      horarioRecebimentoHabilitado: false,
      horariosRecebimento: [],
      tipoVeiculoEspecifico: false,
      umSkuPorCaixa: false,
      observacoesObrigatorias: [],
    },
  });
  const [formDataOriginal, setFormDataOriginal] = useState<Partial<Cliente> | null>(null);

  useEffect(() => {
    if (clienteId && modo !== 'criar') {
      carregarCliente();
    } else if (modo === 'criar' && usuario?.tipo === 'vendedor') {
      // Se for vendedor criando um cliente, atribuir automaticamente
      setFormData(prev => ({
        ...prev,
        vendedorAtribuido: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email || '',
        },
      }));
    }
  }, [clienteId, modo, usuario]);

  const carregarCliente = async () => {
    if (!clienteId) return;
    
    try {
      console.log('[CUSTOMER-FORM] Carregando cliente:', clienteId);
      const clientes = await api.get('clientes');
      const cliente = clientes.find((c: Cliente) => c.id === clienteId);
      
      if (cliente) {
        console.log('[CUSTOMER-FORM] Cliente encontrado:', {
          id: cliente.id,
          razaoSocial: cliente.razaoSocial,
          pessoasContato: cliente.pessoasContato?.length || 0,
          dadosBancarios: cliente.dadosBancarios?.length || 0,
          condicoesPagamento: cliente.condicoesPagamentoAssociadas?.length || 0,
          empresaFaturamento: cliente.empresaFaturamento,
          listaPrecos: cliente.listaPrecos,
          segmentoMercado: cliente.segmentoMercado,
          grupoRede: cliente.grupoRede,
          campos: Object.keys(cliente),
        });
        setFormData(cliente);
        setFormDataOriginal(cliente);
      } else {
        console.error('[CUSTOMER-FORM] Cliente não encontrado no Supabase:', clienteId);
        toast.error('Cliente não encontrado no banco de dados');
      }
    } catch (error: any) {
      console.error('[CUSTOMER-FORM] Erro ao carregar cliente do Supabase:', error);
      toast.error('Erro ao carregar dados do cliente: ' + error.message);
    }
  };

  const handleSave = async () => {
    console.log('='.repeat(80));
    console.log('[SAVE] Botão Salvar foi clicado!');
    console.log('[SAVE] Modo:', modo, '| ModoAtual:', modoAtual);
    console.log('[SAVE] ClienteId:', clienteId);
    console.log('[SAVE] FormData SNAPSHOT:', JSON.parse(JSON.stringify(formData)));
    console.log('='.repeat(80));
    
    // Validações básicas
    if (!formData.razaoSocial) {
      toast.error('Razão Social é obrigatória');
      setActiveTab('dados-cadastrais');
      return;
    }

    if (!formData.cpfCnpj) {
      toast.error('CPF/CNPJ é obrigatório');
      setActiveTab('dados-cadastrais');
      return;
    }

    if (!formData.cep || !formData.logradouro) {
      toast.error('Endereço é obrigatório');
      setActiveTab('dados-cadastrais');
      return;
    }

    // Validar código de cliente (modo manual)
    if (!customerCodeService.ehModoAutomatico()) {
      try {
        const clientesReais = await api.get('clientes');
        const validacao = customerCodeService.validarCodigoManual(
          formData.codigo || '',
          formData.id || '',
          clientesReais
        );
        
        if (!validacao.valido) {
          toast.error(validacao.erro || 'Código do cliente inválido');
          setActiveTab('dados-cadastrais');
          return;
        }
      } catch (error: any) {
        console.error('[CLIENTE] Erro ao validar código:', error);
        toast.error('Erro ao validar código do cliente');
        return;
      }
    }

    // Gerar código automático se necessário
    let codigoFinal = formData.codigo;
    if (modo === 'criar' && customerCodeService.ehModoAutomatico()) {
      if (!codigoFinal || codigoFinal.trim() === '') {
        codigoFinal = customerCodeService.gerarProximoCodigo() || undefined;
        setFormData({ ...formData, codigo: codigoFinal });
      }
    }

    // Log detalhado do formData antes de salvar
    console.log('[CLIENTE] FormData completo antes de salvar:', {
      id: clienteId,
      pessoasContato: formData.pessoasContato?.length || 0,
      dadosBancarios: formData.dadosBancarios?.length || 0,
      condicoesPagamento: formData.condicoesPagamentoAssociadas?.length || 0,
      empresaFaturamento: formData.empresaFaturamento,
      listaPrecos: formData.listaPrecos,
      segmentoMercado: formData.segmentoMercado,
      grupoRede: formData.grupoRede,
      vendedorAtribuido: formData.vendedorAtribuido?.id,
      descontoPadrao: formData.descontoPadrao,
      descontoFinanceiro: formData.descontoFinanceiro,
      pedidoMinimo: formData.pedidoMinimo,
      campos: Object.keys(formData),
    });

    // Registrar no histórico e salvar cliente
    if (usuario) {
      try {
        if (modo === 'criar') {
          const novoCliente: Cliente = {
            ...formData as Cliente,
            id: `cliente-${Date.now()}`,
            codigo: codigoFinal,
            dataCadastro: new Date().toISOString(),
            dataAtualizacao: new Date().toISOString(),
            criadoPor: usuario.nome,
            atualizadoPor: usuario.nome,
            // Se for vendedor, definir status como pendente e situação como Análise
            statusAprovacao: usuario.tipo === 'vendedor' ? 'pendente' : (formData.statusAprovacao || 'aprovado'),
            situacao: usuario.tipo === 'vendedor' ? 'Análise' : (formData.situacao || 'Ativo'),
            vendedorAtribuido: usuario.tipo === 'vendedor' 
              ? { id: usuario.id, nome: usuario.nome, email: usuario.email || '' }
              : formData.vendedorAtribuido,
          };
          
          console.log('[CLIENTE] Criando cliente no Supabase:', {
            razaoSocial: novoCliente.razaoSocial,
            cpfCnpj: novoCliente.cpfCnpj,
            usuarioId: usuario.id,
            usuarioTipo: usuario.tipo,
          });
          
          // Salvar no Supabase
          try {
            const clienteSalvo = await api.create('clientes', novoCliente);
            console.log('[CLIENTE] Cliente criado no Supabase com sucesso:', clienteSalvo);
          } catch (apiError: any) {
            console.error('[CLIENTE] Erro ao salvar no Supabase:', apiError);
            toast.error('Erro ao salvar cliente no banco de dados: ' + apiError.message);
            throw apiError; // Propagar o erro para não continuar o fluxo
          }
          
          // Se for vendedor, criar notificação para backoffice
          if (usuario.tipo === 'vendedor') {
            const { notificacoesMock } = await import('../data/mockNotificacoes');
            const { mockUsuarios } = await import('../data/mockUsers');
            
            // Encontrar todos os usuários backoffice
            const usuariosBackoffice = mockUsuarios.filter(u => u.tipo === 'backoffice');
            
            // Criar notificação para cada usuário backoffice
            usuariosBackoffice.forEach(userBackoffice => {
              notificacoesMock.push({
                id: `not-${Date.now()}-${userBackoffice.id}`,
                tipo: 'cliente_pendente_aprovacao',
                titulo: 'Novo cliente aguardando aprovação',
                mensagem: `O vendedor ${usuario.nome} cadastrou um novo cliente: ${novoCliente.razaoSocial}`,
                link: '/clientes/pendentes',
                status: 'nao_lida',
                usuarioId: userBackoffice.id,
                dataCriacao: new Date().toISOString(),
                dadosAdicionais: {
                  clienteId: novoCliente.id,
                  clienteNome: novoCliente.razaoSocial,
                  vendedorId: usuario.id,
                  vendedorNome: usuario.nome,
                },
              });
            });
            
            console.log('[NOTIFICAÇÃO] Notificações criadas para usuários backoffice:', {
              clienteId: novoCliente.id,
              clienteNome: novoCliente.razaoSocial,
              vendedor: usuario.nome,
              quantidadeNotificacoes: usuariosBackoffice.length,
            });
          }
          
          historyService.registrarCriacaoCliente(novoCliente, usuario.id, usuario.nome);
        } else if ((modo === 'editar' || modoAtual === 'editar') && clienteId) {
          // Usar formDataOriginal como base (dados carregados do Supabase)
          const clienteAnterior = formDataOriginal || {} as Cliente;
          
          // Atualizar o cliente - mesclando com dados originais para garantir que nada seja perdido
          const clienteAtualizado: Cliente = {
            ...clienteAnterior, // Manter todos os dados originais como base
            ...formData as Cliente, // Sobrescrever com os dados editados
            id: clienteId, // Garantir que o ID não muda
            dataAtualizacao: new Date().toISOString(),
            atualizadoPor: usuario.nome,
            // Preservar campos que podem ser undefined no formData
            dataCadastro: formData.dataCadastro || clienteAnterior.dataCadastro,
            criadoPor: formData.criadoPor || clienteAnterior.criadoPor,
            codigo: formData.codigo || clienteAnterior.codigo,
          };
          
          console.log('[CLIENTE] Atualizando cliente no Supabase:', {
            id: clienteId,
            razaoSocial: clienteAtualizado.razaoSocial,
            camposEnviados: Object.keys(clienteAtualizado),
            pessoasContato: clienteAtualizado.pessoasContato?.length || 0,
            dadosBancarios: clienteAtualizado.dadosBancarios?.length || 0,
            condicoesPagamento: clienteAtualizado.condicoesPagamentoAssociadas?.length || 0,
            empresaFaturamento: clienteAtualizado.empresaFaturamento,
            listaPrecos: clienteAtualizado.listaPrecos,
            segmentoMercado: clienteAtualizado.segmentoMercado,
            grupoRede: clienteAtualizado.grupoRede,
          });
          
          // Atualizar no Supabase
          try {
            const clienteSalvo = await api.update('clientes', clienteId, clienteAtualizado);
            console.log('[CLIENTE] Cliente atualizado no Supabase com sucesso:', {
              id: clienteSalvo.id,
              pessoasContato: clienteSalvo.pessoasContato?.length || 0,
              dadosBancarios: clienteSalvo.dadosBancarios?.length || 0,
              condicoesPagamento: clienteSalvo.condicoesPagamentoAssociadas?.length || 0,
              empresaFaturamento: clienteSalvo.empresaFaturamento,
              listaPrecos: clienteSalvo.listaPrecos,
              segmentoMercado: clienteSalvo.segmentoMercado,
              grupoRede: clienteSalvo.grupoRede,
            });
          } catch (apiError: any) {
            console.error('[CLIENTE] Erro ao atualizar no Supabase:', apiError);
            toast.error('Erro ao atualizar cliente no banco de dados: ' + apiError.message);
            throw apiError; // Propagar o erro
          }
          
          historyService.registrarEdicaoCliente(
            clienteAnterior,
            clienteAtualizado,
            usuario.id,
            usuario.nome
          );
        }
      } catch (error) {
        console.error('[CLIENTE] Erro ao salvar cliente:', error);
        toast.error('Erro ao salvar cliente. Verifique o console para mais detalhes.');
        return;
      }
    }

    // Aqui você faria a gravação real dos dados
    const mensagem = modo === 'criar' 
      ? `Cliente "${formData.razaoSocial}" cadastrado com sucesso!`
      : `Cliente "${formData.razaoSocial}" atualizado com sucesso!`;
    
    // Ajustar mensagem para vendedores
    if (modo === 'criar' && usuario?.tipo === 'vendedor') {
      toast.success(`Cliente "${formData.razaoSocial}" cadastrado com sucesso! O cadastro será submetido à aprovação do backoffice.`);
    } else {
      toast.success(mensagem);
    }
    
    // Se estava em modo de edição alternado, voltar para visualização
    if (modo === 'visualizar' && modoAtual === 'editar') {
      setModoAtual('visualizar');
      setFormDataOriginal(formData);
    } else {
      onVoltar();
    }
  };

  const handleHabilitarEdicao = () => {
    if (!temPermissao('clientes.editar')) {
      toast.error('Você não tem permissão para editar clientes');
      return;
    }
    setModoAtual('editar');
  };

  const handleCancelarEdicao = () => {
    if (formDataOriginal) {
      setFormData(formDataOriginal);
    }
    setModoAtual('visualizar');
  };

  const handleHabilitarEdicaoAprovar = () => {
    setEditandoNoModoAprovar(true);
  };

  const handleCancelarEdicaoAprovar = () => {
    if (formDataOriginal) {
      setFormData(formDataOriginal);
    }
    setEditandoNoModoAprovar(false);
  };

  const handleSalvarEdicaoAprovar = () => {
    // Validações básicas
    if (!formData.razaoSocial) {
      toast.error('Razão Social é obrigatória');
      setActiveTab('dados-cadastrais');
      return;
    }

    if (!formData.cpfCnpj) {
      toast.error('CPF/CNPJ é obrigatório');
      setActiveTab('dados-cadastrais');
      return;
    }

    if (!formData.cep || !formData.logradouro) {
      toast.error('Endereço é obrigatório');
      setActiveTab('dados-cadastrais');
      return;
    }

    // Atualizar dados originais e sair do modo de edição
    setFormDataOriginal(formData);
    setEditandoNoModoAprovar(false);
    toast.success('Alterações salvas com sucesso!');
  };

  const handleAprovarCliente = async () => {
    if (!usuario || !formData || !clienteId) return;

    try {
      // Atualizar o cliente no Supabase
      const clienteAtualizado = {
        ...formData,
        statusAprovacao: 'aprovado',
        situacao: 'Ativo',
        dataAtualizacao: new Date().toISOString(),
        atualizadoPor: usuario.nome,
      };
      
      try {
        await api.update('clientes', clienteId, clienteAtualizado);
        console.log('[APROVAÇÃO] Cliente atualizado no Supabase:', {
          clienteId,
          statusAprovacao: 'aprovado',
          situacao: 'Ativo',
        });
      } catch (apiError: any) {
        console.error('[APROVAÇÃO] Erro ao atualizar no Supabase:', apiError);
        toast.error('Erro ao aprovar cliente no banco de dados: ' + apiError.message);
        throw apiError;
      }
      
      // Enviar e-mail ao vendedor
      if (formData.criadoPor) {
        await emailService.enviarEmailClienteAprovado(
          'vendedor@exemplo.com', // Email do vendedor (em produção, vem do banco de dados)
          formData.razaoSocial || '',
          usuario.nome
        );
      }
      
      // Criar notificação para o vendedor
      const { notificacoesMock } = await import('../data/mockNotificacoes');
      if (formData.vendedorAtribuido?.id) {
        notificacoesMock.push({
          id: `not-aprovacao-${Date.now()}`,
          tipo: 'cliente_aprovado',
          titulo: 'Cliente aprovado',
          mensagem: `Seu cadastro do cliente "${formData.razaoSocial}" foi aprovado pelo gestor ${usuario.nome}`,
          link: `/clientes/${clienteId}`,
          status: 'nao_lida',
          usuarioId: formData.vendedorAtribuido.id,
          dataCriacao: new Date().toISOString(),
          dadosAdicionais: {
            clienteId: formData.id,
            clienteNome: formData.razaoSocial,
          },
        });
      }

      toast.success(`Cliente "${formData.razaoSocial}" aprovado com sucesso!`);
      
      console.log('[APROVAÇÃO] Cliente aprovado:', {
        clienteId: formData.id,
        aprovadoPor: usuario.nome,
        data: new Date().toISOString(),
      });

      if (onAprovar) {
        onAprovar();
      } else {
        onVoltar();
      }
    } catch (error) {
      console.error('Erro ao aprovar cliente:', error);
      toast.error('Erro ao aprovar cliente. Tente novamente.');
    }
  };

  const handleRejeitarCliente = async () => {
    if (!usuario || !formData || !clienteId) return;

    if (!motivoRejeicao.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }

    try {
      // Atualizar o cliente no Supabase
      const clienteAtualizado = {
        ...formData,
        statusAprovacao: 'rejeitado',
        situacao: 'Reprovado',
        dataAtualizacao: new Date().toISOString(),
        atualizadoPor: usuario.nome,
      };
      
      try {
        await api.update('clientes', clienteId, clienteAtualizado);
        console.log('[REJEIÇÃO] Cliente atualizado no Supabase:', {
          clienteId,
          statusAprovacao: 'rejeitado',
          situacao: 'Reprovado',
        });
      } catch (apiError: any) {
        console.error('[REJEIÇÃO] Erro ao atualizar no Supabase:', apiError);
        toast.error('Erro ao rejeitar cliente no banco de dados: ' + apiError.message);
        throw apiError;
      }
      
      // Enviar e-mail ao vendedor
      if (formData.criadoPor) {
        await emailService.enviarEmailClienteRejeitado(
          'vendedor@exemplo.com', // Email do vendedor (em produção, vem do banco de dados)
          formData.razaoSocial || '',
          usuario.nome,
          motivoRejeicao
        );
      }
      
      // Criar notificação para o vendedor
      const { notificacoesMock } = await import('../data/mockNotificacoes');
      if (formData.vendedorAtribuido?.id) {
        notificacoesMock.push({
          id: `not-rejeicao-${Date.now()}`,
          tipo: 'cliente_rejeitado',
          titulo: 'Cliente rejeitado',
          mensagem: `Seu cadastro do cliente "${formData.razaoSocial}" foi rejeitado pelo gestor ${usuario.nome}. Motivo: ${motivoRejeicao}`,
          link: `/clientes/${clienteId}`,
          status: 'nao_lida',
          usuarioId: formData.vendedorAtribuido.id,
          dataCriacao: new Date().toISOString(),
          dadosAdicionais: {
            clienteId: formData.id,
            clienteNome: formData.razaoSocial,
            motivoRejeicao: motivoRejeicao,
          },
        });
      }

      toast.success(`Cadastro de "${formData.razaoSocial}" rejeitado.`);
      
      console.log('[REJEIÇÃO] Cliente rejeitado:', {
        clienteId: formData.id,
        rejeitadoPor: usuario.nome,
        motivo: motivoRejeicao,
        data: new Date().toISOString(),
      });

      if (onRejeitar) {
        onRejeitar();
      } else {
        onVoltar();
      }
    } catch (error) {
      console.error('Erro ao rejeitar cliente:', error);
      toast.error('Erro ao rejeitar cadastro. Tente novamente.');
    }
  };

  const updateFormData = (updates: Partial<Cliente>) => {
    console.log('[CUSTOMER-FORM] Atualizando formData:', {
      camposAtualizados: Object.keys(updates),
      pessoasContato: updates.pessoasContato?.length,
      dadosBancarios: updates.dadosBancarios?.length,
      condicoesPagamento: updates.condicoesPagamentoAssociadas?.length,
      empresaFaturamento: updates.empresaFaturamento,
      listaPrecos: updates.listaPrecos,
      segmentoMercado: updates.segmentoMercado,
      grupoRede: updates.grupoRede,
    });
    setFormData((prev) => {
      const updated = { ...prev, ...updates };
      console.log('[CUSTOMER-FORM] FormData após atualização:', {
        pessoasContato: updated.pessoasContato?.length || 0,
        dadosBancarios: updated.dadosBancarios?.length || 0,
        condicoesPagamento: updated.condicoesPagamentoAssociadas?.length || 0,
        empresaFaturamento: updated.empresaFaturamento,
        listaPrecos: updated.listaPrecos,
        segmentoMercado: updated.segmentoMercado,
        grupoRede: updated.grupoRede,
      });
      return updated;
    });
  };

  const readOnly = modoAtual === 'visualizar' || (modo === 'aprovar' && !editandoNoModoAprovar);
  const titulo = modo === 'criar' 
    ? 'Novo Cliente' 
    : modo === 'aprovar'
    ? editandoNoModoAprovar ? 'Editar Cliente para Aprovação' : 'Aprovar Cliente'
    : modoAtual === 'editar' 
    ? 'Editar Cliente' 
    : 'Visualizar Cliente';

  const podeEditar = temPermissao('clientes.editar');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onVoltar}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{titulo}</h2>
            {(modo === 'visualizar' || modo === 'aprovar') && formData.razaoSocial && (
              <p className="text-muted-foreground">{formData.razaoSocial}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {modo === 'aprovar' && !editandoNoModoAprovar && (
            <>
              {podeEditar && (
                <Button 
                  onClick={handleHabilitarEdicaoAprovar} 
                  variant="outline"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              <Button 
                onClick={() => setMostrarDialogRejeitar(true)} 
                variant="outline"
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
              <Button 
                onClick={handleAprovarCliente}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            </>
          )}
          {modo === 'aprovar' && editandoNoModoAprovar && (
            <>
              <Button 
                onClick={handleCancelarEdicaoAprovar} 
                variant="outline"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                onClick={handleSalvarEdicaoAprovar}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </>
          )}
          {modo === 'visualizar' && modoAtual === 'visualizar' && podeEditar && (
            <Button onClick={handleHabilitarEdicao} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {modo === 'visualizar' && modoAtual === 'editar' && (
            <>
              <Button onClick={handleCancelarEdicao} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <FormDataDebugger formData={formData} />
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </>
          )}
          {modo !== 'visualizar' && modo !== 'aprovar' && !readOnly && (
            <>
              <FormDataDebugger formData={formData} />
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Debug Tool - Mostrar apenas em modo de criação para não poluir */}
      {modo === 'criar' && <CNPJDebugger />}

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full h-auto">
                <TabsTrigger value="dados-cadastrais" className="whitespace-nowrap">Dados Cadastrais</TabsTrigger>
                <TabsTrigger value="contato" className="whitespace-nowrap">Contato</TabsTrigger>
                <TabsTrigger value="condicao-comercial" className="whitespace-nowrap">Condição Comercial</TabsTrigger>
                <TabsTrigger value="logistica" className="whitespace-nowrap">Logística</TabsTrigger>
                {(modo === 'visualizar' || modo === 'editar' || modo === 'aprovar') && clienteId && (
                  <>
                    <TabsTrigger value="conta-corrente" className="whitespace-nowrap">Conta Corrente</TabsTrigger>
                    <TabsTrigger value="mix" className="whitespace-nowrap">Mix</TabsTrigger>
                    <TabsTrigger value="indicadores" className="whitespace-nowrap">Indicadores</TabsTrigger>
                    <TabsTrigger value="historico" className="whitespace-nowrap">Histórico</TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>

            <TabsContent value="dados-cadastrais" className="space-y-6 mt-6">
              <CustomerFormDadosCadastrais
                formData={formData}
                updateFormData={updateFormData}
                readOnly={readOnly}
              />
            </TabsContent>

            <TabsContent value="contato" className="space-y-6 mt-6">
              <CustomerFormContato
                formData={formData}
                updateFormData={updateFormData}
                readOnly={readOnly}
              />
            </TabsContent>

            <TabsContent value="condicao-comercial" className="space-y-6 mt-6">
              <CustomerFormCondicaoComercial
                formData={formData}
                updateFormData={updateFormData}
                readOnly={readOnly}
              />
            </TabsContent>

            <TabsContent value="logistica" className="space-y-6 mt-6">
              <CustomerFormLogistica
                formData={formData}
                updateFormData={updateFormData}
                readOnly={readOnly}
              />
            </TabsContent>

            {(modo === 'visualizar' || modo === 'editar' || modo === 'aprovar' || modoAtual === 'editar') && clienteId && (
              <>
                <TabsContent value="conta-corrente" className="space-y-6 mt-6">
                  <CustomerFormContaCorrente
                    formData={formData}
                    readOnly={readOnly}
                  />
                </TabsContent>

                <TabsContent value="mix" className="mt-6">
                  <CustomerMixTab clienteId={clienteId} />
                </TabsContent>

                <TabsContent value="indicadores" className="mt-6">
                  <CustomerIndicatorsTab clienteId={clienteId} />
                </TabsContent>

                <TabsContent value="historico" className="mt-6">
                  <CustomerHistoryTab clienteId={clienteId} />
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Alert informativo no modo de aprovação */}
      {modo === 'aprovar' && formData.criadoPor && !editandoNoModoAprovar && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este cadastro foi realizado por <strong>{formData.criadoPor}</strong> em{' '}
            <strong>
              {formData.dataCadastro 
                ? new Date(formData.dataCadastro).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'}
            </strong>.
            <br />
            Revise todas as informações antes de aprovar ou rejeitar.
          </AlertDescription>
        </Alert>
      )}

      {/* Alert informativo quando está editando no modo de aprovação */}
      {modo === 'aprovar' && editandoNoModoAprovar && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você está editando o cadastro antes da aprovação. Lembre-se de <strong>salvar</strong> as alterações antes de aprovar o cliente.
          </AlertDescription>
        </Alert>
      )}

      {/* Dialog de rejeição */}
      {mostrarDialogRejeitar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Rejeitar Cadastro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Você está rejeitando o cadastro de <strong>{formData.razaoSocial}</strong>.
                  <br /><br />
                  O vendedor será notificado por e-mail com o motivo da rejeição.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo da Rejeição *</Label>
                <Textarea
                  id="motivo"
                  placeholder="Descreva o motivo da rejeição do cadastro..."
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setMostrarDialogRejeitar(false);
                    setMotivoRejeicao('');
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleRejeitarCliente}
                  variant="destructive"
                  disabled={!motivoRejeicao.trim()}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirmar Rejeição
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!readOnly && modo !== 'aprovar' && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={modo === 'visualizar' ? handleCancelarEdicao : onVoltar}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Cliente
          </Button>
        </div>
      )}
    </div>
  );
}
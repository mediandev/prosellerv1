import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompanies } from '../hooks/useCompanies';
import { Venda, ItemVenda, StatusVenda } from '../types/venda';
import { Cliente } from '../types/customer';
import { Produto } from '../types/produto';
import { CondicaoPagamento } from '../types/condicaoPagamento';
import { NaturezaOperacao } from '../types/naturezaOperacao';
import { erpAutoSendService } from '../services/erpAutoSendService';
import { companyService } from '../services/companyService';
import { api } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  ShoppingCart,
  User,
  FileText,
  Package,
  Calculator,
  Lock,
  AlertCircle,
  Edit,
  X,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { formatCurrency, formatCNPJ } from '../lib/masks';

// Função auxiliar para converter Date para string local (yyyy-mm-dd) sem conversão de fuso horário
const formatarDataParaInput = (data: Date | string): string => {
  const dateObj = typeof data === 'string' ? new Date(data) : data;
  const ano = dateObj.getFullYear();
  const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dia = String(dateObj.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

// Função auxiliar para criar Date a partir de string local (yyyy-mm-dd) sem conversão de fuso horário
const criarDataLocal = (dataString: string): Date => {
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0); // Meio-dia para evitar problemas de fuso horário
};

interface SaleFormPageProps {
  vendaId?: string;
  modo: 'criar' | 'editar' | 'visualizar';
  onVoltar: () => void;
}

export function SaleFormPage({ vendaId, modo, onVoltar }: SaleFormPageProps) {
  const { usuario, temPermissao } = useAuth();
  const { companies } = useCompanies();
  const [modoAtual, setModoAtual] = useState(modo);
  const isReadOnly = modoAtual === 'visualizar';
  const isBackoffice = usuario?.tipo === 'backoffice';

  // Estados principais
  const [formData, setFormData] = useState<Partial<Venda>>({
    status: 'Rascunho',
    itens: [],
    dataPedido: new Date(),
    percentualDescontoPadrao: 0,
    percentualDescontoExtra: 0,
    totalQuantidades: 0,
    totalItens: 0,
    pesoBrutoTotal: 0,
    pesoLiquidoTotal: 0,
    valorTotalProdutos: 0,
    valorDescontoExtra: 0,
    valorPedido: 0,
  });

  // Guardar dados originais para cancelar edição
  const [dadosOriginais, setDadosOriginais] = useState<Partial<Venda> | null>(null);

  // Estados para adição de itens
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemVenda | null>(null);
  const [selectedProdutoId, setSelectedProdutoId] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  
  // Estado para controlar o combobox de clientes
  const [clienteComboOpen, setClienteComboOpen] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  
  // Estados para controlar exibição por etapas (apenas no modo criar)
  const [mostrarCamposCliente, setMostrarCamposCliente] = useState(modo !== 'criar');
  const [mostrarDemaisCampos, setMostrarDemaisCampos] = useState(modo !== 'criar');

  // Dados de apoio
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [naturezas, setNaturezas] = useState<NaturezaOperacao[]>([]);
  const [condicoes, setCondicoes] = useState<CondicaoPagamento[]>([]);
  const [listasPreco, setListasPreco] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para controlar validação visual de campos
  const [camposComErro, setCamposComErro] = useState<Set<string>>(new Set());
  const [tentouSalvar, setTentouSalvar] = useState(false);

  // Verificar se pedido está bloqueado para edição (já foi enviado ao ERP)
  const pedidoBloqueado = useMemo(() => {
    if (modo === 'criar') return false;
    if (!formData.integracaoERP?.erpPedidoId) return false;
    return true;
  }, [modo, formData.integracaoERP]);

  // Verificar se usuário pode editar este pedido
  const podeEditar = useMemo(() => {
    // Se está criando, sempre pode editar
    if (modo === 'criar') return true;

    // Se o pedido está bloqueado (enviado ao ERP), não pode editar
    if (pedidoBloqueado) return false;

    // Verificar permissão de editar vendas
    if (!temPermissao('vendas.editar')) return false;

    // Vendedores só podem editar seus próprios pedidos
    if (!isBackoffice && formData.vendedorId !== usuario?.id) {
      return false;
    }

    return true;
  }, [modo, pedidoBloqueado, temPermissao, isBackoffice, formData.vendedorId, usuario]);

  // Forçar modo visualização se pedido estiver bloqueado
  useEffect(() => {
    if (pedidoBloqueado && modo === 'editar') {
      console.log('[SALE-FORM] Pedido bloqueado detectado - forçando modo visualização');
      setModoAtual('visualizar');
    }
  }, [pedidoBloqueado, modo]);

  // Clientes filtrados por permissão
  const clientesDisponiveis = useMemo(() => {
    return clientes.filter(cliente => {
      // Excluir clientes com situação excluído, em análise ou reprovado
      if (cliente.situacao === 'Excluído' || cliente.situacao === 'Análise' || cliente.situacao === 'Reprovado') {
        return false;
      }
      
      // Excluir clientes que não foram aprovados (apenas clientes com statusAprovacao === 'aprovado' são permitidos)
      if (cliente.statusAprovacao !== 'aprovado') {
        return false;
      }

      // Backoffice vê todos os clientes aprovados
      if (isBackoffice) return true;

      // Vendedor vê apenas seus clientes aprovados
      // Suporta tanto vendedorAtribuido (novo) quanto vendedoresAtribuidos (legado)
      if (cliente.vendedorAtribuido) {
        return cliente.vendedorAtribuido.id === usuario?.id;
      }
      if (cliente.vendedoresAtribuidos && Array.isArray(cliente.vendedoresAtribuidos)) {
        return cliente.vendedoresAtribuidos.some(v => v.id === usuario?.id);
      }
      return false;
    });
  }, [clientes, isBackoffice, usuario]);

  // Clientes filtrados pela busca
  const clientesFiltrados = useMemo(() => {
    if (!clienteSearchTerm.trim()) return clientesDisponiveis;

    const searchLower = clienteSearchTerm.toLowerCase().trim();
    
    const filtered = clientesDisponiveis.filter(cliente => {
      // Buscar por nome/razão social
      const matchRazao = cliente.razaoSocial?.toLowerCase().includes(searchLower);
      
      // Buscar por nome fantasia
      const matchFantasia = cliente.nomeFantasia?.toLowerCase().includes(searchLower);
      
      // Buscar por grupo/rede
      const matchGrupo = cliente.grupoRede?.toLowerCase().includes(searchLower);
      
      // Buscar por CNPJ (remover caracteres especiais)
      const cnpjLimpo = cliente.cpfCnpj?.replace(/\D/g, '') || '';
      const searchCnpj = searchLower.replace(/\D/g, '');
      const matchCnpj = searchCnpj && cnpjLimpo.includes(searchCnpj);
      
      // Buscar por código do cliente
      const matchCodigo = cliente.codigo?.toLowerCase().includes(searchLower);
      
      const match = matchRazao || matchFantasia || matchGrupo || matchCnpj || matchCodigo;
      
      if (match) {
        console.log(`✅ Match encontrado: ${cliente.razaoSocial}`, {
          razao: matchRazao,
          fantasia: matchFantasia,
          grupo: matchGrupo,
          cnpj: matchCnpj,
          codigo: matchCodigo,
          razaoSocial: cliente.razaoSocial,
          nomeFantasia: cliente.nomeFantasia,
          grupoRede: cliente.grupoRede,
          cpfCnpj: cliente.cpfCnpj,
          codigo: cliente.codigo,
        });
      }
      
      return match;
    });
    
    console.log('🔍 Termo de busca:', `"${clienteSearchTerm}"`);
    console.log('📊 Total de resultados:', filtered.length);
    
    return filtered;
  }, [clientesDisponiveis, clienteSearchTerm]);

  // Condições de pagamento do cliente selecionado
  const condicoesPagamentoDisponiveis = useMemo(() => {
    if (!formData.clienteId) return [];
    
    const cliente = clientes.find(c => c.id === formData.clienteId);
    if (!cliente) return [];

    const condicoesIds = cliente.condicoesPagamentoAssociadas || [];
    const condicoesFiltradasPorCliente = condicoes.filter(c => condicoesIds.includes(c.id));

    console.log('[VENDAS] Condições de pagamento disponíveis:', {
      clienteId: cliente.id,
      clienteNome: cliente.razaoSocial,
      condicoesAssociadas: condicoesIds,
      condicoesFiltradas: condicoesFiltradasPorCliente.length,
      todasCondicoes: condicoes.length,
    });

    // Filtrar por pedido mínimo atendido
    const condicoesDisponiveis = condicoesFiltradasPorCliente.filter(c => {
      if (!c.pedidoMinimo) return true;
      return (formData.valorTotalProdutos || 0) >= c.pedidoMinimo;
    });

    console.log('[VENDAS] Condições após filtro de pedido mínimo:', condicoesDisponiveis.length);

    return condicoesDisponiveis;
  }, [formData.clienteId, formData.valorTotalProdutos, clientes, condicoes]);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      console.log('[VENDAS] Carregando dados iniciais...');
      
      const [clientesAPI, produtosAPI, naturezasAPI, condicoesAPI, listasPrecoAPI, vendasAPI] = await Promise.all([
        api.get('clientes'),
        api.get('produtos'),
        api.get('naturezas-operacao'),
        api.get('condicoes-pagamento'),
        api.get('listasPreco').catch(() => []),
        vendaId && modo !== 'criar' ? api.get('vendas') : Promise.resolve([])
      ]);

      console.log('[VENDAS] Naturezas recebidas da API:', {
        total: naturezasAPI?.length || 0,
        naturezas: naturezasAPI,
        ativas: naturezasAPI?.filter((n: any) => n.ativo).length || 0
      });
      
      setClientes(clientesAPI);
      setProdutos(produtosAPI);
      setNaturezas(naturezasAPI);
      setCondicoes(condicoesAPI);
      setListasPreco(listasPrecoAPI);

      // Se for edição, carregar venda existente
      if (vendaId && modo !== 'criar') {
        const vendaExistente = vendasAPI.find((v: Venda) => v.id === vendaId);
        if (vendaExistente) {
          console.log('[VENDAS] Venda carregada para edição/visualização:', {
            id: vendaExistente.id,
            numero: vendaExistente.numero,
            clienteId: vendaExistente.clienteId,
            nomeCliente: vendaExistente.nomeCliente,
            vendedorId: vendaExistente.vendedorId,
            nomeVendedor: vendaExistente.nomeVendedor,
            listaPrecoId: vendaExistente.listaPrecoId,
            nomeListaPreco: vendaExistente.nomeListaPreco,
            condicaoPagamentoId: vendaExistente.condicaoPagamentoId,
            nomeCondicaoPagamento: vendaExistente.nomeCondicaoPagamento,
          });
          
          // Garantir que dataPedido seja um objeto Date
          const vendaComDataCorrigida = {
            ...vendaExistente,
            dataPedido: vendaExistente.dataPedido instanceof Date 
              ? vendaExistente.dataPedido 
              : new Date(vendaExistente.dataPedido),
            createdAt: vendaExistente.createdAt instanceof Date
              ? vendaExistente.createdAt
              : new Date(vendaExistente.createdAt),
            updatedAt: vendaExistente.updatedAt instanceof Date
              ? vendaExistente.updatedAt
              : new Date(vendaExistente.updatedAt),
          };
          
          setFormData(vendaComDataCorrigida);
          setDadosOriginais(vendaComDataCorrigida);
          setClienteJaCarregado(true);
        } else {
          console.error('[VENDAS] Venda não encontrada:', vendaId);
          toast.error('Venda não encontrada');
        }
      }

      console.log('[VENDAS] Dados carregados:', {
        clientes: clientesAPI.length,
        produtos: produtosAPI.length,
        naturezas: naturezasAPI.length,
        condicoes: condicoesAPI.length,
        listasPreco: listasPrecoAPI.length
      });
    } catch (error) {
      console.error('[VENDAS] Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados.');
      setClientes([]);
      setProdutos([]);
      setNaturezas(mockNaturezasOperacao);
      setCondicoes(condicoesPagamentoMock);
    } finally {
      setLoading(false);
    }
  };

  // Auto-preencher dados do cliente (apenas ao criar nova venda)
  const [clienteJaCarregado, setClienteJaCarregado] = useState(false);
  
  useEffect(() => {
    // Só auto-preencher se for modo criar ou se o cliente foi alterado manualmente
    if (formData.clienteId && modo === 'criar' && !clienteJaCarregado) {
      const cliente = clientes.find(c => c.id === formData.clienteId);
      if (cliente && companies.length > 0) {
        // Buscar lista de preços: primeiro por ID, depois por nome exato, depois por nome parcial
        let listaPreco = listasPreco.find(lp => lp.id === cliente.listaPrecos);
        if (!listaPreco && cliente.listaPrecos) {
          listaPreco = listasPreco.find(lp => lp.nome === cliente.listaPrecos);
        }
        if (!listaPreco && cliente.listaPrecos) {
          // Busca parcial: verifica se o nome da lista contém o texto do cliente
          listaPreco = listasPreco.find(lp => lp.nome.toLowerCase().includes(cliente.listaPrecos.toLowerCase()));
        }
        
        // Buscar a empresa de faturamento do cliente
        let empresaFaturamentoId = '';
        let nomeEmpresaFaturamento = '';
        
        if (cliente.empresaFaturamento) {
          console.log('[AUTO-PREENCHIMENTO] Buscando empresa de faturamento:', {
            empresaNoCliente: cliente.empresaFaturamento,
            todasEmpresas: companies.map(c => ({
              id: c.id,
              razaoSocial: c.razaoSocial,
              nomeFantasia: c.nomeFantasia
            }))
          });
          
          // Tentar encontrar a empresa por ID primeiro (o mais comum)
          let empresa = companies.find(c => c.id === cliente.empresaFaturamento);
          
          // Se não encontrou por ID, tentar por nome
          if (!empresa) {
            // Normalizar para comparação (remover espaços extras, converter para maiúsculas)
            const empresaNormalizada = cliente.empresaFaturamento.trim().toUpperCase();
            
            // Busca exata por nome
            empresa = companies.find(c => 
              c.razaoSocial?.trim().toUpperCase() === empresaNormalizada || 
              c.nomeFantasia?.trim().toUpperCase() === empresaNormalizada
            );
            
            // Se não encontrou, tentar busca parcial
            if (!empresa) {
              empresa = companies.find(c => 
                c.razaoSocial?.trim().toUpperCase().includes(empresaNormalizada) ||
                c.nomeFantasia?.trim().toUpperCase().includes(empresaNormalizada) ||
                empresaNormalizada.includes(c.razaoSocial?.trim().toUpperCase() || '') ||
                empresaNormalizada.includes(c.nomeFantasia?.trim().toUpperCase() || '')
              );
            }
          }
          
          console.log('[AUTO-PREENCHIMENTO] Empresa encontrada?', {
            encontrada: !!empresa,
            empresaId: empresa?.id,
            empresaRazao: empresa?.razaoSocial,
            empresaFantasia: empresa?.nomeFantasia
          });
          
          if (empresa) {
            empresaFaturamentoId = empresa.id;
            nomeEmpresaFaturamento = empresa.razaoSocial;
          } else {
            // Se não encontrou, usar o nome armazenado no cliente mesmo que não esteja na lista
            nomeEmpresaFaturamento = cliente.empresaFaturamento;
            console.warn('[AUTO-PREENCHIMENTO] ⚠️ Empresa não encontrada na lista! Valor no cliente:', cliente.empresaFaturamento);
          }
        }
        
        // Se não encontrou empresa, NÃO usar fallback - deixar vazio para o usuário selecionar
        if (!empresaFaturamentoId) {
          console.warn('[AUTO-PREENCHIMENTO] ⚠️ Empresa de faturamento não definida. Campo ficará vazio.');
        }
        
        console.log('[AUTO-PREENCHIMENTO] Resultado final:', {
          empresaFaturamentoId,
          nomeEmpresaFaturamento
        });
        
        console.log('[VENDAS] Auto-preenchendo dados do cliente:', {
          clienteId: cliente.id,
          clienteNome: cliente.razaoSocial,
          empresaFaturamento: cliente.empresaFaturamento,
          empresaFaturamentoId: empresaFaturamentoId,
          listaPrecoCliente: cliente.listaPrecos,
          listaPrecoEncontrada: listaPreco?.nome,
          listaPrecoId: listaPreco?.id,
          condicoesPagamento: cliente.condicoesPagamentoAssociadas?.length || 0,
        });
        
        setFormData(prev => ({
          ...prev,
          nomeCliente: cliente.razaoSocial || cliente.nomeFantasia || '',
          cnpjCliente: cliente.cpfCnpj || '',
          inscricaoEstadualCliente: cliente.inscricaoEstadual || '',
          listaPrecoId: listaPreco?.id || cliente.listaPrecos || '',
          nomeListaPreco: listaPreco?.nome || cliente.listaPrecos || '',
          percentualDescontoPadrao: cliente.descontoPadrao || 0,
          vendedorId: cliente.vendedorAtribuido?.id || cliente.vendedoresAtribuidos?.[0]?.id || '',
          nomeVendedor: cliente.vendedorAtribuido?.nome || cliente.vendedoresAtribuidos?.[0]?.nome || '',
          empresaFaturamentoId: empresaFaturamentoId,
          nomeEmpresaFaturamento: nomeEmpresaFaturamento,
        }));
        setClienteJaCarregado(true);
      }
    }
  }, [formData.clienteId, clientes, modo, clienteJaCarregado, companies, listasPreco]);

  // Recalcular totais quando itens mudam
  useEffect(() => {
    const itens = formData.itens || [];
    
    const totalQuantidades = itens.reduce((sum, item) => sum + item.quantidade, 0);
    const totalItens = itens.length;
    const pesoBrutoTotal = itens.reduce((sum, item) => sum + (item.pesoBruto * item.quantidade), 0);
    const pesoLiquidoTotal = itens.reduce((sum, item) => sum + (item.pesoLiquido * item.quantidade), 0);
    const valorTotalProdutos = itens.reduce((sum, item) => sum + item.subtotal, 0);
    
    const percentualDescontoExtra = formData.percentualDescontoExtra || 0;
    const valorDescontoExtra = (valorTotalProdutos * percentualDescontoExtra) / 100;
    const valorPedido = valorTotalProdutos - valorDescontoExtra;

    setFormData(prev => ({
      ...prev,
      totalQuantidades,
      totalItens,
      pesoBrutoTotal,
      pesoLiquidoTotal,
      valorTotalProdutos,
      valorDescontoExtra,
      valorPedido,
    }));
  }, [formData.itens, formData.percentualDescontoExtra]);

  // Atualizar desconto extra baseado na condição de pagamento (removido - agora é feito no handler)

  // Handler para mudança de cliente
  const handleClienteChange = (clienteId: string) => {
    limparErro('clienteId'); // Limpar erro ao selecionar cliente
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      // Buscar lista de preços: primeiro por ID, depois por nome exato, depois por nome parcial
      let listaPreco = listasPreco.find(lp => lp.id === cliente.listaPrecos);
      if (!listaPreco && cliente.listaPrecos) {
        listaPreco = listasPreco.find(lp => lp.nome === cliente.listaPrecos);
      }
      if (!listaPreco && cliente.listaPrecos) {
        // Busca parcial: verifica se o nome da lista contém o texto do cliente
        listaPreco = listasPreco.find(lp => lp.nome.toLowerCase().includes(cliente.listaPrecos.toLowerCase()));
      }
      
      // Buscar a empresa de faturamento do cliente
      let empresaFaturamentoId = '';
      let nomeEmpresaFaturamento = '';
      
      if (cliente.empresaFaturamento) {
        console.log('[HANDLER] Buscando empresa de faturamento:', {
          empresaNoCliente: cliente.empresaFaturamento,
          todasEmpresas: companies.map(c => ({
            id: c.id,
            razaoSocial: c.razaoSocial,
            nomeFantasia: c.nomeFantasia
          }))
        });
        
        // Tentar encontrar a empresa por ID primeiro (o mais comum)
        let empresa = companies.find(c => c.id === cliente.empresaFaturamento);
        
        // Se não encontrou por ID, tentar por nome
        if (!empresa) {
          // Normalizar para comparação (remover espaços extras, converter para maiúsculas)
          const empresaNormalizada = cliente.empresaFaturamento.trim().toUpperCase();
          
          // Busca exata por nome
          empresa = companies.find(c => 
            c.razaoSocial?.trim().toUpperCase() === empresaNormalizada || 
            c.nomeFantasia?.trim().toUpperCase() === empresaNormalizada
          );
          
          // Se não encontrou, tentar busca parcial
          if (!empresa) {
            empresa = companies.find(c => 
              c.razaoSocial?.trim().toUpperCase().includes(empresaNormalizada) ||
              c.nomeFantasia?.trim().toUpperCase().includes(empresaNormalizada) ||
              empresaNormalizada.includes(c.razaoSocial?.trim().toUpperCase() || '') ||
              empresaNormalizada.includes(c.nomeFantasia?.trim().toUpperCase() || '')
            );
          }
        }
        
        console.log('[HANDLER] Empresa encontrada?', {
          encontrada: !!empresa,
          empresaId: empresa?.id,
          empresaRazao: empresa?.razaoSocial,
          empresaFantasia: empresa?.nomeFantasia
        });
        
        if (empresa) {
          empresaFaturamentoId = empresa.id;
          nomeEmpresaFaturamento = empresa.razaoSocial;
        } else {
          // Se não encontrou, usar o nome armazenado no cliente mesmo que não esteja na lista
          nomeEmpresaFaturamento = cliente.empresaFaturamento;
          console.warn('[HANDLER] ⚠️ Empresa não encontrada na lista! Valor no cliente:', cliente.empresaFaturamento);
        }
      }
      
      // Se não encontrou empresa, NÃO usar fallback - deixar vazio para o usuário selecionar
      if (!empresaFaturamentoId) {
        console.warn('[HANDLER] ⚠️ Empresa de faturamento não definida. Campo ficará vazio.');
      }
      
      console.log('[HANDLER] Resultado final:', {
        empresaFaturamentoId,
        nomeEmpresaFaturamento
      });
      
      console.log('[VENDAS] Cliente selecionado:', {
        id: cliente.id,
        nome: cliente.razaoSocial,
        vendedorId: cliente.vendedorAtribuido?.id,
        vendedorNome: cliente.vendedorAtribuido?.nome,
        empresaFaturamento: cliente.empresaFaturamento,
        empresaFaturamentoId: empresaFaturamentoId,
        listaPrecoCliente: cliente.listaPrecos,
        listaPrecoEncontrada: listaPreco?.nome,
        listaPrecoId: listaPreco?.id,
        condicoesPagamentoIds: cliente.condicoesPagamentoAssociadas,
        condicoesPagamentoTotal: condicoes.length,
      });
      
      setFormData(prev => ({
        ...prev,
        clienteId,
        nomeCliente: cliente.razaoSocial || cliente.nomeFantasia || '',
        cnpjCliente: cliente.cpfCnpj || '',
        inscricaoEstadualCliente: cliente.inscricaoEstadual || '',
        listaPrecoId: listaPreco?.id || cliente.listaPrecos || '',
        nomeListaPreco: listaPreco?.nome || cliente.listaPrecos || '',
        percentualDescontoPadrao: cliente.descontoPadrao || 0,
        vendedorId: cliente.vendedorAtribuido?.id || cliente.vendedoresAtribuidos?.[0]?.id || '',
        nomeVendedor: cliente.vendedorAtribuido?.nome || cliente.vendedoresAtribuidos?.[0]?.nome || '',
        empresaFaturamentoId: empresaFaturamentoId,
        nomeEmpresaFaturamento: nomeEmpresaFaturamento,
        // Limpar condição de pagamento e natureza para forçar nova seleção
        condicaoPagamentoId: '',
        nomeCondicaoPagamento: '',
        naturezaOperacaoId: '',
        nomeNaturezaOperacao: '',
      }));
      setClienteComboOpen(false);
      setClienteSearchTerm('');
      
      // Mostrar campos do cliente após seleção (apenas no modo criar)
      if (modo === 'criar') {
        setMostrarCamposCliente(true);
      }
    }
  };

  const handleAddItem = () => {
    if (!selectedProdutoId || quantidade <= 0) {
      toast.error('Selecione um produto e informe a quantidade');
      return;
    }

    const produto = produtos.find(p => p.id === selectedProdutoId);
    if (!produto) return;

    // Buscar preço do produto na lista de preços do cliente
    let valorTabela = 0;
    
    if (formData.listaPrecoId) {
      // Buscar a lista de preços
      const listaPreco = listasPreco.find(lp => lp.id === formData.listaPrecoId);
      
      if (listaPreco) {
        // Buscar o preço do produto nesta lista
        const produtoPreco = listaPreco.produtos?.find(pp => pp.produtoId === produto.id);
        
        if (produtoPreco && produtoPreco.preco > 0) {
          valorTabela = produtoPreco.preco;
          console.log('[VENDAS] Preço encontrado na lista:', {
            listaId: listaPreco.id,
            listaNome: listaPreco.nome,
            produtoId: produto.id,
            produtoNome: produto.descricao,
            preco: valorTabela,
          });
        } else {
          console.warn('[VENDAS] Produto não encontrado na lista de preços:', {
            listaId: listaPreco.id,
            listaNome: listaPreco.nome,
            produtoId: produto.id,
            produtoNome: produto.descricao,
          });
          toast.error(`Produto "${produto.descricao}" não possui preço cadastrado na lista "${listaPreco.nome}"`);
          return;
        }
      } else {
        console.warn('[VENDAS] Lista de preços não encontrada:', formData.listaPrecoId);
        toast.error('Lista de preços não encontrada. Verifique o cadastro do cliente.');
        return;
      }
    } else {
      console.warn('[VENDAS] Cliente não possui lista de preços associada');
      toast.error('Cliente não possui lista de preços associada. Verifique o cadastro do cliente.');
      return;
    }

    const percentualDesconto = formData.percentualDescontoPadrao || 0;
    const valorUnitario = valorTabela * (1 - percentualDesconto / 100);
    const subtotal = valorUnitario * quantidade;

    const novoItem: ItemVenda = {
      id: `item-${Date.now()}`,
      numero: (formData.itens?.length || 0) + 1,
      produtoId: produto.id,
      descricaoProduto: produto.descricao,
      codigoSku: produto.codigoSku,
      codigoEan: produto.codigoEan,
      valorTabela,
      percentualDesconto,
      valorUnitario,
      quantidade,
      subtotal,
      pesoBruto: produto.pesoBruto,
      pesoLiquido: produto.pesoLiquido,
      unidade: produto.siglaUnidade || 'UN', // Usar siglaUnidade do produto, ou 'UN' como fallback
    };

    console.log('[VENDAS] Item adicionado:', {
      produtoId: produto.id,
      descricao: produto.descricao,
      valorTabela,
      percentualDesconto,
      valorUnitario,
      quantidade,
      subtotal,
    });

    setFormData(prev => ({
      ...prev,
      itens: [...(prev.itens || []), novoItem],
    }));

    setAddItemDialogOpen(false);
    setSelectedProdutoId('');
    setQuantidade(1);
    limparErro('itens'); // Limpar erro ao adicionar item
    toast.success('Item adicionado ao pedido');
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      itens: (prev.itens || []).filter(item => item.id !== itemId),
    }));
    toast.success('Item removido do pedido');
  };

  // Alternar para modo edição
  const handleEntrarModoEdicao = () => {
    if (!podeEditar) {
      toast.error('Você não tem permissão para editar este pedido');
      return;
    }
    
    if (pedidoBloqueado) {
      toast.error('Este pedido já foi enviado ao ERP e não pode ser editado');
      return;
    }

    setModoAtual('editar');
    toast.info('Modo de edição ativado');
  };

  // Cancelar edição e voltar para modo visualização
  const handleCancelarEdicao = () => {
    // Restaurar dados originais
    if (dadosOriginais) {
      setFormData(dadosOriginais);
    }
    setModoAtual('visualizar');
    toast.info('Edição cancelada');
  };

  const handleSave = async () => {
    // Marcar que houve tentativa de salvar
    setTentouSalvar(true);
    
    // Verificar se pedido está bloqueado para edição
    if (modoAtual === 'editar' && pedidoBloqueado) {
      toast.error('Este pedido já foi enviado ao ERP e não pode ser editado');
      return;
    }

    // Coletar campos com erro
    const erros = new Set<string>();

    if (!formData.clienteId) {
      erros.add('clienteId');
      toast.error('Selecione um cliente');
    }

    if (!formData.naturezaOperacaoId) {
      erros.add('naturezaOperacaoId');
      toast.error('Selecione uma natureza de operação');
    }

    if (!formData.itens || formData.itens.length === 0) {
      erros.add('itens');
      toast.error('Adicione pelo menos um item ao pedido');
    }

    if (!formData.condicaoPagamentoId) {
      erros.add('condicaoPagamentoId');
      toast.error('Selecione uma condição de pagamento');
    }
    
    if (!formData.empresaFaturamentoId) {
      erros.add('empresaFaturamentoId');
    }

    // Se houver erros, atualizar estado e parar
    if (erros.size > 0) {
      setCamposComErro(erros);
      return;
    }
    
    // Limpar erros se passou na validação
    setCamposComErro(new Set());

    // Garantir que todos os campos de nome estão preenchidos
    const cliente = clientes.find(c => c.id === formData.clienteId);
    const condicao = condicoes.find(c => c.id === formData.condicaoPagamentoId);
    const natureza = naturezas.find(n => n.id === formData.naturezaOperacaoId);
    const empresa = companies.find(e => e.id === formData.empresaFaturamentoId);

    // Salvar venda
    const vendaCompleta: Venda = {
      ...formData,
      id: vendaId || `venda-${Date.now()}`,
      numero: formData.numero || `PV-2025-${String(Date.now()).substring(7, 11)}`,
      status: 'Em Análise',
      createdAt: formData.createdAt || new Date(),
      updatedAt: new Date(),
      createdBy: usuario?.id || '',
      // Garantir que os nomes estão salvos
      nomeCliente: formData.nomeCliente || cliente?.razaoSocial || cliente?.nomeFantasia || '',
      nomeListaPreco: formData.nomeListaPreco || cliente?.listaPrecos || '',
      nomeVendedor: formData.nomeVendedor || cliente?.vendedorAtribuido?.nome || '',
      nomeCondicaoPagamento: formData.nomeCondicaoPagamento || condicao?.nome || '',
      nomeNaturezaOperacao: formData.nomeNaturezaOperacao || natureza?.nome || '',
      nomeEmpresaFaturamento: formData.nomeEmpresaFaturamento || empresa?.razaoSocial || '',
      // Incluir observações da nota fiscal (geradas dinamicamente)
      observacoesNotaFiscal: observacoesNF,
    } as Venda;

    console.log('💾 Salvando venda:', {
      id: vendaCompleta.id,
      numero: vendaCompleta.numero,
      dataPedido: vendaCompleta.dataPedido,
      dataPedidoFormatada: vendaCompleta.dataPedido ? formatarDataParaInput(vendaCompleta.dataPedido) : '',
      clienteId: vendaCompleta.clienteId,
      nomeCliente: vendaCompleta.nomeCliente,
      vendedorId: vendaCompleta.vendedorId,
      nomeVendedor: vendaCompleta.nomeVendedor,
      listaPrecoId: vendaCompleta.listaPrecoId,
      nomeListaPreco: vendaCompleta.nomeListaPreco,
      condicaoPagamentoId: vendaCompleta.condicaoPagamentoId,
      nomeCondicaoPagamento: vendaCompleta.nomeCondicaoPagamento,
      empresaFaturamentoId: vendaCompleta.empresaFaturamentoId,
      nomeEmpresaFaturamento: vendaCompleta.nomeEmpresaFaturamento,
      observacoesNotaFiscal: vendaCompleta.observacoesNotaFiscal,
    });
    
    // Se for criação de novo pedido, verificar envio automático ao ERP ANTES de adicionar ao array
    if (modoAtual === 'criar' && formData.empresaFaturamentoId) {
      console.log('🔄 Iniciando verificação de envio automático...');
      console.log('🔄 vendaCompleta.empresaFaturamentoId:', vendaCompleta.empresaFaturamentoId);
      
      try {
        const empresa = await companyService.getById(formData.empresaFaturamentoId);
        console.log('🏢 Empresa encontrada:', empresa?.razaoSocial, '- ID:', formData.empresaFaturamentoId);
        console.log('🏢 Dados da empresa:', empresa);
        
        if (empresa) {
          const envioHabilitado = erpAutoSendService.estaHabilitado(empresa);
          console.log('📤 Envio automático habilitado?', envioHabilitado);
          
          if (envioHabilitado) {
            console.log('✅ Iniciando envio ao ERP com venda:', {
              id: vendaCompleta.id,
              numero: vendaCompleta.numero,
              empresaFaturamentoId: vendaCompleta.empresaFaturamentoId,
            });
            
            toast.info('Enviando pedido ao ERP...');
            
            try {
              const resultado = await erpAutoSendService.enviarVendaComRetry(vendaCompleta, empresa);
              console.log('📊 Resultado do envio:', resultado);
              
              if (resultado.sucesso && resultado.erpPedidoId) {
                // Atualizar venda com dados de integração ANTES de adicionar ao array
                vendaCompleta.integracaoERP = {
                  erpPedidoId: resultado.erpPedidoId,
                  sincronizacaoAutomatica: true,
                  tentativasSincronizacao: 0,
                };
                
                toast.success(`Pedido enviado ao ERP com sucesso! (ID: ${resultado.erpPedidoId})`);
                console.log('✅ Venda atualizada com integração ERP:', vendaCompleta.integracaoERP);
              } else {
                toast.error(`Erro ao enviar ao ERP: ${resultado.erro}`);
                console.error('❌ Erro no envio automático:', resultado.erro);
              }
            } catch (error) {
              console.error('❌ Erro inesperado no envio automático:', error);
              toast.error('Erro inesperado ao enviar pedido ao ERP');
            }
          } else {
            console.log('⚠️ Envio automático não está habilitado para esta empresa');
          }
        } else {
          console.error('❌ Empresa não encontrada com ID:', formData.empresaFaturamentoId);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar empresa:', error);
      }
    }

    // Persistir venda no Supabase (DEPOIS do envio ao ERP para já incluir os dados de integração)
    try {
      if (modoAtual === 'criar') {
        await api.create('vendas', vendaCompleta);
        console.log('✅ Venda criada no Supabase:', vendaCompleta.id, 'com integração ERP:', vendaCompleta.integracaoERP);
      } else {
        await api.update('vendas', vendaId!, vendaCompleta);
        console.log('✅ Venda atualizada no Supabase:', vendaCompleta.id);
      }

      toast.success(modoAtual === 'criar' ? 'Pedido criado com sucesso!' : 'Pedido atualizado com sucesso!');
    } catch (error: any) {
      console.error('[VENDAS] Erro ao salvar venda:', error);
      toast.error(`Erro ao salvar pedido: ${error.message || 'Erro desconhecido'}`);
      
      // Fallback: salvar no localStorage
      console.warn('[VENDAS] Salvando no localStorage como fallback...');
      // Agora os dados são persistidos via API
      console.log('[SALE-FORM] Venda salva com sucesso:', vendaCompleta.id);
      const { salvarVendasNoLocalStorage } = await import('../data/mockVendas');
      salvarVendasNoLocalStorage(mockVendas);
      return; // Interromper execução em caso de erro
    }

    // Ativar Status Mix automaticamente para os produtos do pedido
    if (modoAtual === 'criar' && vendaCompleta.clienteId && vendaCompleta.itens && vendaCompleta.itens.length > 0) {
      try {
        const produtoIds = vendaCompleta.itens.map(item => item.produtoId);
        await api.statusMix.ativarPorPedido(vendaCompleta.clienteId, produtoIds);
        console.log('[STATUS MIX] Produtos ativados automaticamente:', produtoIds.length);
      } catch (error) {
        // Não bloquear o fluxo se falhar a ativação do status mix
        console.error('[STATUS MIX] Erro ao ativar produtos automaticamente:', error);
      }
    }

    // Se estava editando, atualizar dados originais e voltar para modo visualização
    if (modoAtual === 'editar') {
      setDadosOriginais(vendaCompleta); // Atualizar dados originais com os novos dados salvos
      setTimeout(() => {
        setModoAtual('visualizar');
      }, 500);
    } else {
      // Se estava criando, voltar para lista
      setTimeout(() => onVoltar(), 1500);
    }
  };

  // Gerar observações da NF (pré-visualização)
  const observacoesNF = useMemo(() => {
    const partes: string[] = [];

    // OC do cliente
    if (formData.ordemCompraCliente && formData.ordemCompraCliente.trim()) {
      partes.push(`OC: ${formData.ordemCompraCliente}`);
    } else {
      partes.push('OC: [Aguardando]');
    }

    // Buscar requisitos logísticos do cliente
    if (formData.clienteId) {
      const cliente = clientes.find(c => c.id === formData.clienteId);
      if (cliente && cliente.requisitosLogisticos) {
        const requisitos = cliente.requisitosLogisticos;
        
        // Verificar se há requisitos logísticos preenchidos
        const temRequisitos =
          requisitos.entregaAgendada ||
          requisitos.horarioRecebimentoHabilitado ||
          requisitos.tipoVeiculoEspecifico ||
          requisitos.umSkuPorCaixa ||
          requisitos.observacoesObrigatorias?.length > 0;

        if (temRequisitos) {
          const instrucoesLogistica: string[] = [];

          // Horário de Recebimento
          if (
            requisitos.horarioRecebimentoHabilitado &&
            requisitos.horariosRecebimento?.length > 0
          ) {
            requisitos.horariosRecebimento.forEach((horario) => {
              if (horario.diasSemana.length > 0 && horario.horarioInicial1 && horario.horarioFinal1) {
                const dias = horario.diasSemana.join(', ');
                let horarioTexto = `${dias}: ${horario.horarioInicial1} às ${horario.horarioFinal1}`;
                
                if (horario.temIntervalo && horario.horarioInicial2 && horario.horarioFinal2) {
                  horarioTexto += ` e ${horario.horarioInicial2} às ${horario.horarioFinal2}`;
                }
                
                instrucoesLogistica.push(`Horário de Recebimento: ${horarioTexto}`);
              }
            });
          }

          // Entrega Agendada
          if (requisitos.entregaAgendada && requisitos.instrucoesAgendamento) {
            const inst = requisitos.instrucoesAgendamento;
            const contatos: string[] = [];

            if (inst.emails && inst.emails.filter((e) => e).length > 0) {
              contatos.push(`E-mail(s): ${inst.emails.filter((e) => e).join(', ')}`);
            }
            if (inst.telefones && inst.telefones.filter((t) => t).length > 0) {
              contatos.push(`Tel: ${inst.telefones.filter((t) => t).join(', ')}`);
            }
            if (inst.whatsapps && inst.whatsapps.filter((w) => w).length > 0) {
              contatos.push(`WhatsApp: ${inst.whatsapps.filter((w) => w).join(', ')}`);
            }

            if (contatos.length > 0) {
              instrucoesLogistica.push(`Entrega Agendada - ${contatos.join(' | ')}`);
            }
          }

          // Tipo de Veículo Específico
          if (requisitos.tipoVeiculoEspecifico && requisitos.tipoVeiculo) {
            instrucoesLogistica.push(`Tipo de Veículo: ${requisitos.tipoVeiculo}`);
          }

          // 1 SKU por Caixa
          if (requisitos.umSkuPorCaixa) {
            instrucoesLogistica.push('Atenção: 1 SKU/EAN por caixa.');
          }

          // Observações obrigatórias
          if (requisitos.observacoesObrigatorias) {
            requisitos.observacoesObrigatorias
              .filter((obs) => obs.trim())
              .forEach((obs) => {
                instrucoesLogistica.push(obs);
              });
          }

          if (instrucoesLogistica.length > 0) {
            partes.push('***INSTRUÇÕES LOGÍSTICA:***');
            partes.push(instrucoesLogistica.join(' // '));
          }
        }
      }
    }

    return partes.join('\n\n');
  }, [formData.ordemCompraCliente, formData.clienteId, clientes]);

  // Função auxiliar para verificar se um campo tem erro
  const campoTemErro = (nomeCampo: string) => {
    return tentouSalvar && camposComErro.has(nomeCampo);
  };

  // Função auxiliar para obter classes CSS de campos com erro
  const getErrorClasses = (nomeCampo: string) => {
    return campoTemErro(nomeCampo) 
      ? 'border-destructive focus-visible:ring-destructive' 
      : '';
  };

  // Limpar erro quando o campo for preenchido
  const limparErro = (nomeCampo: string) => {
    if (camposComErro.has(nomeCampo)) {
      const novosErros = new Set(camposComErro);
      novosErros.delete(nomeCampo);
      setCamposComErro(novosErros);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onVoltar}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="flex items-center gap-2">
                <ShoppingCart className="h-6 w-6" />
                {modo === 'criar' ? 'Novo Pedido de Venda' : 
                 modoAtual === 'editar' ? 'Editar Pedido de Venda' : 
                 'Visualizar Pedido de Venda'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {formData.numero || 'Preencha as informações do pedido'}
              </p>
            </div>
          </div>
          
          {/* Botões de ação */}
          <div className="flex gap-2">
            {/* Modo Visualização - Mostrar botão Editar */}
            {isReadOnly && modo !== 'criar' && podeEditar && !pedidoBloqueado && (
              <Button onClick={handleEntrarModoEdicao}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            
            {/* Modo Edição - Mostrar botões Cancelar e Salvar */}
            {!isReadOnly && !pedidoBloqueado && (
              <>
                <Button 
                  variant="outline" 
                  onClick={modoAtual === 'editar' ? handleCancelarEdicao : onVoltar}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  {modo === 'criar' ? 'Criar Pedido' : 'Salvar Alterações'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Alerta de Pedido Bloqueado */}
        {pedidoBloqueado && (
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertTitle>Pedido Bloqueado para Edição</AlertTitle>
            <AlertDescription>
              Este pedido já foi enviado ao ERP (ID: {formData.integracaoERP?.erpPedidoId}) e não pode mais ser editado.
              Para fazer alterações, entre em contato com o backoffice.
            </AlertDescription>
          </Alert>
        )}

        {/* Informações do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3 space-y-2">
                <Label className={campoTemErro('clienteId') ? 'text-destructive' : ''}>
                  Cliente *
                </Label>
                <Popover open={clienteComboOpen} onOpenChange={setClienteComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clienteComboOpen}
                      className={`w-full justify-between ${getErrorClasses('clienteId')}`}
                      disabled={isReadOnly || pedidoBloqueado}
                    >
                      {formData.clienteId ? (
                        <span className="truncate">
                          {clientes.find(c => c.id === formData.clienteId)?.razaoSocial || 
                           clientes.find(c => c.id === formData.clienteId)?.nomeFantasia || 
                           'Cliente selecionado'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Buscar cliente...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[600px] p-0" align="start">
                    <div className="flex flex-col">
                      {/* Campo de busca */}
                      <div className="flex items-center border-b px-3 py-2">
                        <Input
                          placeholder="Buscar por nome, razão social, fantasia, grupo/rede, CNPJ ou código..."
                          value={clienteSearchTerm}
                          onChange={(e) => setClienteSearchTerm(e.target.value)}
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                      
                      {/* Lista de resultados */}
                      <div className="max-h-[300px] overflow-y-auto">
                        {clientesFiltrados.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Nenhum cliente encontrado.
                          </div>
                        ) : (
                          <div className="p-1">
                            {clientesFiltrados.map((cliente) => (
                              <button
                                key={cliente.id}
                                onClick={() => handleClienteChange(cliente.id)}
                                className="w-full flex flex-col items-start py-3 px-2 hover:bg-accent rounded-sm transition-colors"
                              >
                                <div className="flex items-center w-full">
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      formData.clienteId === cliente.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">
                                        {cliente.razaoSocial || cliente.nomeFantasia}
                                      </span>
                                      {cliente.codigo && (
                                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                          #{cliente.codigo}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                                      {cliente.cpfCnpj && (
                                        <span>CNPJ: {formatCNPJ(cliente.cpfCnpj)}</span>
                                      )}
                                      {cliente.nomeFantasia && cliente.razaoSocial && (
                                        <span>• {cliente.nomeFantasia}</span>
                                      )}
                                      {cliente.grupoRede && (
                                        <span>• Grupo: {cliente.grupoRede}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {campoTemErro('clienteId') && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    Por favor, selecione um cliente
                  </p>
                )}
                {formData.clienteId && !campoTemErro('clienteId') && (
                  <p className="text-xs text-muted-foreground">
                    Cliente selecionado: {formData.nomeCliente} - {formatCNPJ(formData.cnpjCliente || '')}
                  </p>
                )}
              </div>

              {/* Campos que aparecem após selecionar o cliente */}
              {mostrarCamposCliente && (
                <>
                  <div className="space-y-2">
                    <Label>Lista de Preço</Label>
                <Input
                  value={formData.nomeListaPreco || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Desconto Padrão (%)</Label>
                <Input
                  value={formData.percentualDescontoPadrao || 0}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={formatCNPJ(formData.cnpjCliente || '')}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Inscrição Estadual</Label>
                <Input
                  value={formData.inscricaoEstadualCliente || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Input
                  value={formData.nomeVendedor || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label className={campoTemErro('empresaFaturamentoId') ? 'text-destructive' : ''}>
                  Empresa de Faturamento *
                </Label>
                <Select
                  value={formData.empresaFaturamentoId || ''}
                  onValueChange={(value) => {
                    limparErro('empresaFaturamentoId');
                    const empresa = companies.find(c => c.id === value);
                    setFormData({ 
                      ...formData, 
                      empresaFaturamentoId: value,
                      nomeEmpresaFaturamento: empresa?.razaoSocial || '',
                    });
                  }}
                  disabled={isReadOnly || !isBackoffice || pedidoBloqueado}
                >
                  <SelectTrigger className={getErrorClasses('empresaFaturamentoId')}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} align="start" className="max-h-[300px] w-full min-w-[var(--radix-select-trigger-width)]">
                    {companies.map(empresa => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nomeFantasia || empresa.razaoSocial || `Empresa ${empresa.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {campoTemErro('empresaFaturamentoId') && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Por favor, selecione uma empresa de faturamento
                  </p>
                )}
                {!campoTemErro('empresaFaturamentoId') && !isBackoffice && (
                  <p className="text-xs text-muted-foreground">
                    Apenas usuários backoffice podem alterar
                  </p>
                )}
              </div>

              {/* Natureza de Operação - Última linha da seção, ocupando toda a largura */}
              <div className="md:col-span-3 space-y-2">
                <Label className={campoTemErro('naturezaOperacaoId') ? 'text-destructive' : ''}>
                  Natureza da Operação *
                </Label>
                <Select
                  value={formData.naturezaOperacaoId || ''}
                  onValueChange={(value) => {
                    limparErro('naturezaOperacaoId');
                    const natureza = naturezas.find(n => n.id === value);
                    setFormData({ 
                      ...formData, 
                      naturezaOperacaoId: value,
                      nomeNaturezaOperacao: natureza?.nome || '',
                    });
                    
                    // Mostrar demais campos após selecionar natureza (apenas no modo criar)
                    if (modo === 'criar') {
                      setMostrarDemaisCampos(true);
                    }
                  }}
                  disabled={isReadOnly || pedidoBloqueado}
                >
                  <SelectTrigger className={getErrorClasses('naturezaOperacaoId')}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {naturezas.filter(n => n.ativo).map(natureza => (
                      <SelectItem key={natureza.id} value={natureza.id}>
                        {natureza.nome} {natureza.codigo ? `(${natureza.codigo})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {campoTemErro('naturezaOperacaoId') && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Por favor, selecione uma natureza de operação
                  </p>
                )}
              </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Demais cards - Apenas após selecionar natureza de operação */}
        {mostrarDemaisCampos && (
          <>
            {/* Itens do Pedido */}
            <Card className={campoTemErro('itens') ? 'border-destructive' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={`flex items-center gap-2 ${campoTemErro('itens') ? 'text-destructive' : ''}`}>
                <Package className="h-5 w-5" />
                Itens do Pedido *
              </CardTitle>
              {!isReadOnly && !pedidoBloqueado && (
                <Button onClick={() => setAddItemDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Nº</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>EAN</TableHead>
                  <TableHead className="text-right">Vlr. Tabela</TableHead>
                  <TableHead className="text-right">Desc. %</TableHead>
                  <TableHead className="text-right">Vlr. Unit.</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  {!isReadOnly && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!formData.itens || formData.itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isReadOnly ? 9 : 10} className={`text-center ${campoTemErro('itens') ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {campoTemErro('itens') ? (
                        <span className="flex items-center justify-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Adicione pelo menos um item ao pedido
                        </span>
                      ) : (
                        'Nenhum item adicionado'
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  formData.itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.numero}</TableCell>
                      <TableCell>{item.descricaoProduto}</TableCell>
                      <TableCell>{item.codigoSku}</TableCell>
                      <TableCell>{item.codigoEan || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valorTabela)}</TableCell>
                      <TableCell className="text-right">{item.percentualDesconto}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valorUnitario)}</TableCell>
                      <TableCell className="text-right">{item.quantidade} {item.unidade}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                      {!isReadOnly && !pedidoBloqueado && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Totais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Totais do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Soma das Quantidades</Label>
                <p>{formData.totalQuantidades || 0}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Total de Itens (SKU)</Label>
                <p>{formData.totalItens || 0}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Peso Bruto (kg)</Label>
                <p>{(formData.pesoBrutoTotal || 0).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Peso Líquido (kg)</Label>
                <p>{(formData.pesoLiquidoTotal || 0).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Valor Total de Produtos</Label>
                <p>{formatCurrency(formData.valorTotalProdutos || 0)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Desconto Extra ({formData.percentualDescontoExtra || 0}%)</Label>
                <p className="text-destructive">- {formatCurrency(formData.valorDescontoExtra || 0)}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-muted-foreground">Valor do Pedido</Label>
                <p>{formatCurrency(formData.valorPedido || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalhes e Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data do Pedido *</Label>
                <Input
                  type="date"
                  className="w-[140px]"
                  value={formData.dataPedido ? formatarDataParaInput(formData.dataPedido) : ''}
                  onChange={(e) => setFormData({ ...formData, dataPedido: criarDataLocal(e.target.value) })}
                  disabled={isReadOnly || pedidoBloqueado}
                />
                <p className="text-xs text-muted-foreground">Data de emissão do pedido pelo cliente</p>
              </div>

              <div className="space-y-2">
                <Label>O.C. Cliente</Label>
                <Input
                  placeholder="Ordem de compra do cliente"
                  value={formData.ordemCompraCliente || ''}
                  onChange={(e) => setFormData({ ...formData, ordemCompraCliente: e.target.value })}
                  disabled={isReadOnly || pedidoBloqueado}
                />
              </div>

              <div className="space-y-2">
                <Label className={campoTemErro('condicaoPagamentoId') ? 'text-destructive' : ''}>
                  Condição de Pagamento *
                </Label>
                <Select
                  value={formData.condicaoPagamentoId || ''}
                  onValueChange={(value) => {
                    limparErro('condicaoPagamentoId');
                    const condicao = condicoes.find(c => c.id === value);
                    console.log('[VENDAS] Condição de pagamento selecionada:', {
                      id: value,
                      nome: condicao?.nome,
                      descontoExtra: condicao?.descontoExtra
                    });
                    setFormData({ 
                      ...formData, 
                      condicaoPagamentoId: value,
                      nomeCondicaoPagamento: condicao?.nome || '',
                      percentualDescontoExtra: condicao?.descontoExtra || 0,
                    });
                  }}
                  disabled={isReadOnly || pedidoBloqueado}
                >
                  <SelectTrigger className={getErrorClasses('condicaoPagamentoId')}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {condicoesPagamentoDisponiveis.map(condicao => (
                      <SelectItem key={condicao.id} value={condicao.id}>
                        {condicao.nome}
                        {condicao.descontoExtra ? ` (${condicao.descontoExtra}% desc.)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {campoTemErro('condicaoPagamentoId') && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Por favor, selecione uma condição de pagamento
                  </p>
                )}
                {!campoTemErro('condicaoPagamentoId') && condicoesPagamentoDisponiveis.length === 0 && formData.clienteId && (
                  <p className="text-xs text-muted-foreground text-destructive">
                    Nenhuma condição disponível (verifique pedido mínimo)
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Observações da Nota Fiscal (Pré-Visualização)</Label>
              <Textarea
                value={observacoesNF}
                disabled
                className="bg-muted min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Estas observações serão impressas na nota fiscal
              </p>
            </div>

            <div className="space-y-2">
              <Label>Observações Internas</Label>
              <Textarea
                placeholder="Observações internas do pedido (não serão impressas na NF)"
                value={formData.observacoesInternas || ''}
                onChange={(e) => setFormData({ ...formData, observacoesInternas: e.target.value })}
                disabled={isReadOnly || pedidoBloqueado}
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

            {/* Dialog Adicionar Item */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Adicionar Item ao Pedido</DialogTitle>
            <DialogDescription>
              Selecione um produto e informe a quantidade
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select
                value={selectedProdutoId}
                onValueChange={setSelectedProdutoId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Buscar por descrição, SKU ou EAN" />
                </SelectTrigger>
                <SelectContent>
                  {produtos.filter(p => p.ativo).map(produto => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome} - SKU: {produto.codigo}
                      {produto.codigoEan ? ` - EAN: ${produto.codigoEan}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={quantidade}
                onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
              />
            </div>

            {selectedProdutoId && (
              <div className="border rounded-lg p-4 bg-muted">
                <h4 className="mb-2">Informações do Produto</h4>
                {(() => {
                  const produto = produtos.find(p => p.id === selectedProdutoId);
                  if (!produto) return null;
                  
                  // Buscar preço do produto na lista de preços do cliente
                  let valorTabela = 0;
                  let mensagemErro = '';
                  
                  if (formData.listaPrecoId) {
                    const listaPreco = listasPreco.find(lp => lp.id === formData.listaPrecoId);
                    
                    if (listaPreco) {
                      const produtoPreco = listaPreco.produtos?.find(pp => pp.produtoId === produto.id);
                      
                      if (produtoPreco && produtoPreco.preco > 0) {
                        valorTabela = produtoPreco.preco;
                      } else {
                        mensagemErro = 'Produto sem preço cadastrado nesta lista';
                      }
                    } else {
                      mensagemErro = 'Lista de preços não encontrada';
                    }
                  } else {
                    mensagemErro = 'Cliente sem lista de preços associada';
                  }
                  
                  const percentualDesconto = formData.percentualDescontoPadrao || 0;
                  const valorUnitario = valorTabela * (1 - percentualDesconto / 100);
                  const subtotal = valorUnitario * quantidade;

                  if (mensagemErro) {
                    return (
                      <div className="text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 inline mr-2" />
                        {mensagemErro}
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Valor de Tabela:</span>
                        <p>{formatCurrency(valorTabela)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Desconto:</span>
                        <p>{percentualDesconto}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor Unitário:</span>
                        <p>{formatCurrency(valorUnitario)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Subtotal:</span>
                        <p>{formatCurrency(subtotal)}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </>
        )}
      </div>
    </div>
  );
}

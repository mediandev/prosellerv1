import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompanies } from '../hooks/useCompanies';
import { Venda, ItemVenda, StatusVenda, ItemFaturado } from '../types/venda';
import { Cliente } from '../types/customer';
import { Produto } from '../types/produto';
import { CondicaoPagamento } from '../types/condicaoPagamento';
import { NaturezaOperacao } from '../types/naturezaOperacao';
import { isStatusConcluido } from '../utils/statusVendaUtils';
import { erpAutoSendService } from '../services/erpAutoSendService';
import { companyService } from '../services/companyService';
import { api } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
  Send,
  X,
  Check,
  ChevronsUpDown,
  Receipt,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatCNPJ, formatCPF } from '../lib/masks';
import { mockNaturezasOperacao } from '../data/mockNaturezasOperacao';
import { condicoesPagamentoMock } from '../data/mockCondicoesPagamento';

// Função auxiliar para converter Date para string local (yyyy-mm-dd) sem conversão de fuso horário
const formatarDataParaInput = (data: Date | string): string => {
  if (typeof data === 'string') {
    // Evita problemas de fuso com strings no formato date-only (YYYY-MM-DD).
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  }

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

// Função auxiliar para remover duplicatas de arrays por ID
const removeDuplicatesById = <T extends { id: string }>(array: T[]): T[] => {
  return Array.from(new Map(array.map(item => [item.id, item])).values());
};

export function SaleFormPage({ vendaId, modo, onVoltar }: SaleFormPageProps) {
  const { usuario, temPermissao } = useAuth();
  const { companies: companiesRaw } = useCompanies();

  // Garantir que companies não tem duplicatas
  const companies = useMemo(() => removeDuplicatesById(companiesRaw), [companiesRaw]);

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
  const [produtoComboboxOpen, setProdutoComboboxOpen] = useState(false);

  // Estado para controlar o combobox de clientes
  const [clienteComboOpen, setClienteComboOpen] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [clienteSearchDebounced, setClienteSearchDebounced] = useState('');
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [isLoadingCliente, setIsLoadingCliente] = useState(false); // Estado para carregamento dos dados completos do cliente
  const clienteSearchTimeout = useRef<number | null>(null);

  // Estados para controlar exibição por etapas (apenas no modo criar)
  const [mostrarCamposCliente, setMostrarCamposCliente] = useState(modo !== 'criar');
  const [mostrarDemaisCampos, setMostrarDemaisCampos] = useState(modo !== 'criar');

  // Dados de apoio
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesIniciais, setClientesIniciais] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  // Estados para itens faturados
  const [itensFaturados, setItensFaturados] = useState<ItemFaturado[]>([]);
  const [loadingItensFaturados, setLoadingItensFaturados] = useState(false);

  // Estados para dados da NFe
  const [dadosNFe, setDadosNFe] = useState<{
    situacao?: string;
    numero?: string;
    serie?: string;
    tipo?: string;
    chaveAcesso?: string;
    dataEmissao?: string;
    naturezaOperacao?: string;
  } | null>(null);
  const [loadingDadosNFe, setLoadingDadosNFe] = useState(false);

  const [naturezas, setNaturezas] = useState<NaturezaOperacao[]>([]);
  const [condicoes, setCondicoes] = useState<CondicaoPagamento[]>([]);
  const [listasPreco, setListasPreco] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para controlar validação visual de campos
  const [camposComErro, setCamposComErro] = useState<Set<string>>(new Set());
  const [tentouSalvar, setTentouSalvar] = useState(false);

  const produtosDisponiveisParaPedido = useMemo(() => {
    if (!formData.listaPrecoId) {
      return [];
    }

    const listaPreco = listasPreco.find(lp => lp.id === formData.listaPrecoId);
    if (!listaPreco?.produtos?.length) {
      return [];
    }

    return listaPreco.produtos
      .filter(pp => pp.preco > 0 && pp.disponivel !== false && pp.ativo !== false)
      .map(pp => ({
        id: pp.produtoId,
        descricao: pp.descricao || 'Produto sem descricao',
        codigoSku: pp.codigoSku || '',
        codigoEan: pp.codigoEan || '',
      }));
  }, [formData.listaPrecoId, listasPreco]);

  const produtoSelecionadoNoCombobox = useMemo(
    () => produtosDisponiveisParaPedido.find(produto => produto.id === selectedProdutoId),
    [produtosDisponiveisParaPedido, selectedProdutoId]
  );

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
    // A API já aplica os filtros de status e vendedor (quando aplicável).
    // Não aplicar filtro local para evitar ocultar clientes válidos do payload.
    return clientes;
  }, [clientes]);

  const handleClienteSearchChange = (value: string) => {
    setClienteSearchTerm(value);
    if (clienteSearchTimeout.current) {
      clearTimeout(clienteSearchTimeout.current);
    }
    if (!value.trim()) {
      setClienteSearchDebounced('');
      return;
    }
    clienteSearchTimeout.current = window.setTimeout(() => {
      setClienteSearchDebounced(value);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (clienteSearchTimeout.current) {
        clearTimeout(clienteSearchTimeout.current);
      }
    };
  }, []);

  // Buscar clientes na API quando o termo de busca mudar
  useEffect(() => {
    const buscarClientes = async () => {
      // Se não há termo de busca, restaurar lista inicial
      if (!clienteSearchDebounced.trim()) {
        if (clientesIniciais.length > 0) {
          console.log('[VENDAS] Restaurando lista inicial de clientes:', clientesIniciais.length);
          setClientes(clientesIniciais);
        }
        return;
      }

      setLoadingClientes(true);
      try {
        console.log('[VENDAS] Buscando clientes na API com termo:', clienteSearchDebounced);

        const params: Record<string, string | number | undefined> = {
          page: 1,
          limit: 100, // Limite razoável para busca
          search: clienteSearchDebounced.trim(),
          status_aprovacao: 'aprovado', // Apenas clientes aprovados
          vendedor: isBackoffice ? undefined : usuario?.id,
        };

        const response = await api.get<{ clientes: Cliente[]; pagination?: any }>('clientes', { params });

        // Extrair array de clientes da resposta
        const clientesEncontrados = Array.isArray(response)
          ? response
          : (response?.clientes || response?.data?.clientes || []);

        console.log('[VENDAS] Clientes encontrados na busca:', clientesEncontrados.length);

        // Atualizar lista de clientes com os resultados da busca
        // Remover duplicatas e manter apenas os clientes encontrados
        setClientes(removeDuplicatesById(clientesEncontrados));
      } catch (error: any) {
        console.error('[VENDAS] Erro ao buscar clientes:', error);
        toast.error('Erro ao buscar clientes. Tente novamente.');
      } finally {
        setLoadingClientes(false);
      }
    };

    buscarClientes();
  }, [clienteSearchDebounced, clientesIniciais, isBackoffice, usuario?.id]);

  // Clientes filtrados pela busca (agora usa os clientes já filtrados pela API)
  const clientesFiltrados = useMemo(() => {
    // Se não há termo de busca, retornar todos os clientes disponíveis
    if (!clienteSearchTerm.trim()) {
      return clientesDisponiveis;
    }

    // Se há termo de busca, os clientes já vêm filtrados da API
    // Apenas aplicar o filtro de permissões
    return clientesDisponiveis;
  }, [clientesDisponiveis, clienteSearchTerm]);

  // Condições de pagamento do cliente selecionado
  const condicoesPagamentoDisponiveis = useMemo(() => {
    if (!formData.clienteId) return [];

    const cliente = clientes.find(c => c.id === formData.clienteId) ?? {
      id: String(formData.clienteId),
      razaoSocial: formData.nomeCliente || '',
      condicoesPagamentoAssociadas: [],
      condicoesCliente: Array.isArray(formData.condicoesCliente) ? formData.condicoesCliente : [],
    } as Cliente;

    const condicoesClienteDoPayload =
      Array.isArray(formData.condicoesCliente) && String(formData.clienteId) === String(cliente.id)
        ? formData.condicoesCliente
        : Array.isArray(cliente.condicoesCliente)
          ? cliente.condicoesCliente
          : [];

    const condicoesIds = condicoesClienteDoPayload.length > 0
      ? condicoesClienteDoPayload
        .map((item) => {
          const raw =
            (item as any)?.['ID_condições'] ??
            (item as any)?.['ID_condiÃ§Ãµes'] ??
            (item as any)?.ID_condicoes ??
            (item as any)?.id_condicao;
          return raw != null ? String(raw) : null;
        })
        .filter((id): id is string => Boolean(id))
      : (cliente.condicoesPagamentoAssociadas || []).map(id => String(id));

    // Converter IDs para string para garantir comparação correta
    const condicoesIdsStr = condicoesIds.map(id => String(id));

    console.log('[VENDAS] Debug condições de pagamento:', {
      clienteId: cliente.id,
      clienteNome: cliente.razaoSocial,
      condicoesClienteDoPayload: condicoesClienteDoPayload.length,
      condicoesAssociadas: condicoesIds,
      condicoesAssociadasStr: condicoesIdsStr,
      todasCondicoes: condicoes.length,
      primeiraCondicaoId: condicoes[0]?.id,
      tipoIdCondicao: typeof condicoes[0]?.id,
      tipoIdCliente: typeof condicoesIds[0],
    });

    const condicoesFiltradasPorCliente = condicoes.filter(c => {
      const match = condicoesIdsStr.includes(String(c.id));
      if (match) {
        console.log('[VENDAS] Condição encontrada:', { id: c.id, nome: c.nome });
      }
      return match;
    });

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

    // Remover duplicatas por ID
    return removeDuplicatesById(condicoesDisponiveis);
  }, [formData.clienteId, formData.valorTotalProdutos, clientes, condicoes]);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      console.log('[VENDAS] Carregando dados iniciais...');

      // Load only the first page of approved clients (avoid many requests on mount).
      // Debounced search already queries the API as the user types.
      console.log('[VENDAS] Buscando clientes aprovados (pagina inicial)...');
      const clientesResponse = await api.get('clientes', {
        params: {
          page: 1,
          limit: 100,
          status_aprovacao: 'aprovado',
          vendedor: isBackoffice ? undefined : usuario?.id,
        }
      });

      const clientesAPI = Array.isArray(clientesResponse)
        ? clientesResponse
        : (clientesResponse?.clientes || clientesResponse?.data?.clientes || []);

      const deveCarregarCatalogoProdutos = false;

      const [produtosAPI, naturezasAPI, condicoesAPI, listasPrecoAPI, vendaExistenteAPI] = await Promise.all([
        deveCarregarCatalogoProdutos ? api.get('produtos').catch(() => []) : Promise.resolve([]),
        api.naturezasOperacao.list({ apenasAtivas: true, page: 1, limit: 100 }).catch(() => []),
        api.get('condicoes-pagamento').catch(() => []),
        api.get('listasPreco').catch(() => []),
        vendaId && modo !== 'criar' ? api.getById('vendas', vendaId).catch(() => null) : Promise.resolve(null)
      ]);

      console.log('[VENDAS] Naturezas recebidas da API:', {
        total: naturezasAPI?.length || 0,
        naturezas: naturezasAPI,
        ativas: naturezasAPI?.filter((n: any) => n.ativo).length || 0
      });

      // Remover duplicatas por ID antes de setar os estados
      const clientesUnicos = removeDuplicatesById(clientesAPI);
      setClientes(clientesUnicos);
      setClientesIniciais(clientesUnicos); // Guardar lista inicial para restaurar quando busca for limpa
      setProdutos(removeDuplicatesById(produtosAPI));
      setNaturezas(removeDuplicatesById(naturezasAPI));
      setCondicoes(removeDuplicatesById(condicoesAPI));
      setListasPreco(removeDuplicatesById(listasPrecoAPI));

      // Se for edição, carregar venda existente
      if (vendaId && modo !== 'criar') {
        const vendaExistente = vendaExistenteAPI as Venda | null;
        if (vendaExistente && vendaExistente.id === vendaId) {
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

      // Log detalhado dos clientes carregados
      console.log('[VENDAS] Primeiros 5 clientes carregados:', clientesAPI.slice(0, 5).map(c => ({
        id: c.id,
        razaoSocial: c.razaoSocial,
        nomeFantasia: c.nomeFantasia,
        statusAprovacao: c.statusAprovacao,
        situacao: c.situacao
      })));
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

  // Função para buscar itens faturados da nota fiscal
  const carregarItensFaturados = async () => {
    if (
      modoAtual !== 'visualizar' ||
      !formData.integracaoERP?.erpPedidoId ||
      !formData.empresaFaturamentoId
    ) {
      return;
    }

    if (!isStatusConcluido(formData.status || '')) {
      return;
    }

    try {
      setLoadingItensFaturados(true);
      console.log('[ITENS FATURADOS] Buscando detalhes do pedido no Tiny ERP:', formData.integracaoERP.erpPedidoId);

      const pedidoData = await api.tinyObterPedido(
        formData.empresaFaturamentoId,
        formData.integracaoERP.erpPedidoId
      );

      console.log('[ITENS FATURADOS] Resposta completa do pedido:', JSON.stringify(pedidoData, null, 2));

      const pedido = pedidoData.pedido || pedidoData.pedidos?.[0];

      if (!pedido) {
        console.warn('[ITENS FATURADOS] Pedido não encontrado na resposta');
        return;
      }

      // Verificar múltiplas possibilidades de estrutura para o ID da nota fiscal
      const notaFiscalId =
        pedido.id_nota_fiscal ||
        pedido.nota_fiscal?.id ||
        pedido.notaFiscal?.id ||
        pedido.nota?.id;

      console.log('[ITENS FATURADOS] ID da Nota Fiscal encontrado:', notaFiscalId);
      console.log('[ITENS FATURADOS] Estrutura do pedido:', {
        id_nota_fiscal: pedido.id_nota_fiscal,
        nota_fiscal: pedido.nota_fiscal,
        notaFiscal: pedido.notaFiscal,
        nota: pedido.nota,
        situacao: pedido.situacao
      });

      // Validar se o ID da nota fiscal é válido (diferente de "0", null, undefined, ou string vazia)
      const notaFiscalIdValido = notaFiscalId && notaFiscalId !== '0' && notaFiscalId !== 0;

      if (notaFiscalIdValido) {
        console.log('[ITENS FATURADOS] Tentando buscar nota fiscal:', notaFiscalId);

        try {
          const notaFiscalData = await api.tinyObterNotaFiscal(
            formData.empresaFaturamentoId,
            notaFiscalId
          );

          console.log('[ITENS FATURADOS] Dados da nota fiscal recebidos:', notaFiscalData);

          const notaFiscal = notaFiscalData.nota_fiscal;

          if (notaFiscal && notaFiscal.itens) {
            // Log detalhado da estrutura dos itens para debug
            console.log('[ITENS FATURADOS] 📋 Estrutura completa dos itens da NF:', JSON.stringify(notaFiscal.itens, null, 2));

            // Buscar dados completos dos produtos (incluindo EAN) em paralelo
            const itensComEAN = await Promise.all(
              (notaFiscal.itens || []).map(async (item: any, index: number) => {
                const idProduto = item.id_produto || item.item?.id_produto;

                // Log individual de cada item para debug
                console.log(`[ITENS FATURADOS] 🔍 Item ${index + 1} - Estrutura:`, {
                  item_completo: item,
                  id_produto: idProduto,
                  gtin: item.gtin,
                  'item.gtin': item.item?.gtin,
                  codigo_ean: item.codigo_ean,
                  ean: item.ean,
                  valor_unitario: item.valor_unitario,
                  'item.valor_unitario': item.item?.valor_unitario,
                  valor_total: item.valor_total,
                  'item.valor_total': item.item?.valor_total
                });

                // Se tem ID do produto, buscar dados completos do Tiny para pegar o EAN
                let eanDoProduto = null;
                if (idProduto) {
                  try {
                    console.log(`[ITENS FATURADOS] 🔎 Buscando produto ${idProduto} no Tiny para obter EAN...`);
                    const produtoCompleto = await api.tinyObterProduto(
                      formData.empresaFaturamentoId!,
                      idProduto
                    );

                    console.log(`[ITENS FATURADOS] 📦 Dados completos do produto ${idProduto}:`, {
                      tem_produto: !!produtoCompleto.produto,
                      gtin: produtoCompleto.produto?.gtin,
                      codigo_barras: produtoCompleto.produto?.codigo_barras,
                      gtin_ean: produtoCompleto.produto?.gtin_ean,
                      ean: produtoCompleto.produto?.ean,
                      status_processamento: produtoCompleto.status_processamento,
                      status: produtoCompleto.status,
                      produto_keys: produtoCompleto.produto ? Object.keys(produtoCompleto.produto) : []
                    });

                    eanDoProduto = produtoCompleto.produto?.gtin
                      || produtoCompleto.produto?.codigo_barras
                      || produtoCompleto.produto?.gtin_ean
                      || produtoCompleto.produto?.ean;

                    if (eanDoProduto) {
                      console.log(`[ITENS FATURADOS] ✅ EAN do produto ${idProduto}:`, eanDoProduto);
                    } else {
                      console.warn(`[ITENS FATURADOS] ⚠️ Produto ${idProduto} não possui EAN/GTIN cadastrado no Tiny ERP`);
                    }
                  } catch (error: any) {
                    console.error(`[ITENS FATURADOS] ❌ Erro ao buscar EAN do produto ${idProduto}:`, {
                      error: error.message,
                      stack: error.stack,
                      fullError: error
                    });
                    // Não falhar - continuar sem o EAN
                  }
                }

                // Extrair valores com fallback para estrutura aninhada item.item
                const valorUnitario = parseFloat(item.valor_unitario || item.item?.valor_unitario || '0');
                const quantidade = parseFloat(item.quantidade || item.item?.quantidade || '0');
                const valorTotalDireto = item.valor_total || item.item?.valor_total;

                // Se valor_total não existir, calcular: quantidade * valor_unitario
                const subtotal = valorTotalDireto
                  ? parseFloat(valorTotalDireto)
                  : valorUnitario * quantidade;

                return {
                  id: `faturado-${index + 1}`,
                  numero: index + 1,
                  produtoId: idProduto,
                  descricaoProduto: item.descricao || item.item?.descricao || '',
                  codigoSku: item.codigo || item.item?.codigo || '',
                  codigoEan: eanDoProduto || item.gtin || item.item?.gtin || item.codigo_ean || item.ean,
                  valorUnitario,
                  quantidade,
                  subtotal,
                  unidade: item.unidade || item.item?.unidade || 'UN',
                  cfop: item.cfop || item.item?.cfop,
                  ncm: item.ncm || item.item?.ncm,
                  valorIpi: parseFloat(item.valor_ipi || item.item?.valor_ipi || '0'),
                  valorIcms: parseFloat(item.valor_icms || item.item?.valor_icms || '0'),
                  valorPis: parseFloat(item.valor_pis || item.item?.valor_pis || '0'),
                  valorCofins: parseFloat(item.valor_cofins || item.item?.valor_cofins || '0'),
                };
              })
            );

            setItensFaturados(itensComEAN);
            console.log('[ITENS FATURADOS] Itens faturados da NF carregados com sucesso:', itensComEAN.length);
            console.log('[ITENS FATURADOS] 📊 Dados convertidos:', itensComEAN);
            return;
          }
        } catch (nfError: any) {
          // Log informativo em vez de warning (situação esperada quando NF ainda não foi emitida)
          console.log('[ITENS FATURADOS] ℹ️ Não foi possível carregar a nota fiscal, usando itens do pedido');
        }
      } else if (notaFiscalId === '0' || notaFiscalId === 0) {
        console.log('[ITENS FATURADOS] ℹ️ Nota fiscal ainda não emitida (ID = 0), usando itens do pedido');
      } else {
        console.log('[ITENS FATURADOS] ℹ️ ID da nota fiscal não encontrado, usando itens do pedido');
      }

      console.log('[ITENS FATURADOS] 📦 Carregando itens do pedido');
      console.log('[ITENS FATURADOS] 📋 Estrutura completa dos itens do pedido:', JSON.stringify(pedido.itens, null, 2));

      if (pedido.itens && Array.isArray(pedido.itens) && pedido.itens.length > 0) {
        // Processar itens do pedido e buscar EAN de cada produto
        const itensConvertidos: ItemFaturado[] = await Promise.all(
          pedido.itens.map(async (item: any, index: number) => {
            // Log individual de cada item para debug
            console.log(`[ITENS FATURADOS] 🔍 Item do pedido ${index + 1} - Estrutura:`, {
              item_completo: item,
              gtin: item.gtin,
              'item.gtin': item.item?.gtin,
              codigo_ean: item.codigo_ean,
              ean: item.ean,
              id_produto: item.id_produto,
              'item.id_produto': item.item?.id_produto,
              valor_unitario: item.valor_unitario,
              'item.valor_unitario': item.item?.valor_unitario,
              valor_total: item.valor_total,
              'item.valor_total': item.item?.valor_total
            });

            // Buscar ID do produto
            const idProduto = item.id_produto || item.item?.id_produto;

            // Se tem ID do produto, buscar dados completos do Tiny para pegar o EAN
            let eanDoProduto = null;
            if (idProduto) {
              try {
                console.log(`[ITENS FATURADOS] 🔎 Buscando produto ${idProduto} no Tiny para obter EAN...`);
                const produtoCompleto = await api.tinyObterProduto(
                  formData.empresaFaturamentoId!,
                  idProduto
                );

                console.log(`[ITENS FATURADOS] 📦 Dados completos do produto ${idProduto}:`, {
                  tem_produto: !!produtoCompleto.produto,
                  gtin: produtoCompleto.produto?.gtin,
                  codigo_barras: produtoCompleto.produto?.codigo_barras,
                  gtin_ean: produtoCompleto.produto?.gtin_ean,
                  ean: produtoCompleto.produto?.ean,
                  status_processamento: produtoCompleto.status_processamento,
                  status: produtoCompleto.status,
                  produto_keys: produtoCompleto.produto ? Object.keys(produtoCompleto.produto) : []
                });

                eanDoProduto = produtoCompleto.produto?.gtin
                  || produtoCompleto.produto?.codigo_barras
                  || produtoCompleto.produto?.gtin_ean
                  || produtoCompleto.produto?.ean;

                if (eanDoProduto) {
                  console.log(`[ITENS FATURADOS] ✅ EAN do produto ${idProduto}:`, eanDoProduto);
                } else {
                  console.warn(`[ITENS FATURADOS] ⚠️ Produto ${idProduto} não possui EAN/GTIN cadastrado no Tiny ERP`);
                }
              } catch (error: any) {
                console.error(`[ITENS FATURADOS] ❌ Erro ao buscar EAN do produto ${idProduto}:`, {
                  error: error.message,
                  stack: error.stack,
                  fullError: error
                });
                // Não falhar - continuar sem o EAN
              }
            }

            // Extrair valores com fallback para estrutura aninhada item.item
            const valorUnitario = parseFloat(item.valor_unitario || item.item?.valor_unitario || '0');
            const quantidade = parseFloat(item.quantidade || item.item?.quantidade || '0');
            const valorTotalDireto = item.valor_total || item.item?.valor_total;

            // Se valor_total não existir, calcular: quantidade * valor_unitario
            const subtotal = valorTotalDireto
              ? parseFloat(valorTotalDireto)
              : valorUnitario * quantidade;

            return {
              id: `faturado-pedido-${index + 1}`,
              numero: index + 1,
              produtoId: idProduto,
              descricaoProduto: item.descricao || item.item?.descricao || '',
              codigoSku: item.codigo || item.item?.codigo || '',
              codigoEan: eanDoProduto || item.gtin || item.item?.gtin || item.codigo_ean || item.ean,
              valorUnitario,
              quantidade,
              subtotal,
              unidade: item.unidade || item.item?.unidade || 'UN',
            };
          })
        );

        setItensFaturados(itensConvertidos);
        console.log('[ITENS FATURADOS] Itens do pedido carregados como fallback:', itensConvertidos.length);
        console.log('[ITENS FATURADOS] 📊 Dados convertidos do pedido:', itensConvertidos);
      } else {
        console.warn('[ITENS FATURADOS] Pedido sem itens disponíveis');
      }
    } catch (error) {
      console.error('[ITENS FATURADOS] Erro ao buscar itens faturados:', error);
    } finally {
      setLoadingItensFaturados(false);
    }
  };

  useEffect(() => {
    if (formData.id && modoAtual === 'visualizar' && formData.integracaoERP?.erpPedidoId) {
      carregarItensFaturados();
    }
  }, [formData.id, formData.integracaoERP?.erpPedidoId, formData.status, formData.empresaFaturamentoId, modoAtual]);

  // Carregar dados completos da NFe quando necessário
  const carregarDadosNFe = async () => {
    setLoadingDadosNFe(true);

    // Se tiver ID da nota fiscal válido, buscar dados completos do ERP
    if (formData.integracaoERP?.notaFiscalId &&
      formData.integracaoERP.notaFiscalId !== '0' &&
      formData.empresaFaturamentoId) {
      try {
        console.log('[DADOS NFE] Buscando dados da nota fiscal:', formData.integracaoERP.notaFiscalId);

        const notaFiscalData = await api.tinyObterNotaFiscal(
          formData.empresaFaturamentoId,
          formData.integracaoERP.notaFiscalId
        );

        console.log('[DADOS NFE] Dados recebidos:', notaFiscalData);

        if (notaFiscalData?.nota_fiscal) {
          const nf = notaFiscalData.nota_fiscal;

          console.log('[DADOS NFE] 🔍 Estrutura da nota fiscal:', {
            situacao: nf.situacao,
            situacao_nfe: nf.situacao_nfe,
            data_emissao: nf.data_emissao,
            data_hora_emissao: nf.data_hora_emissao,
            numero: nf.numero,
            serie: nf.serie,
            chave_acesso: nf.chave_acesso,
            tipo_nota: nf.tipo_nota,
            tipo: nf.tipo,
            tpNF: nf.tpNF,
            finalidade: nf.finalidade,
            natureza_operacao: nf.natureza_operacao,
            cfop: nf.cfop
          });

          // Mapear situação da SEFAZ
          let situacaoTexto = 'Não informado';
          if (nf.situacao) {
            const situacaoMap: Record<string, string> = {
              '1': 'Autorizada',
              '2': 'Autorizada - Uso Denegado',
              '3': 'Cancelada',
              '4': 'Inutilizada',
              '5': 'Denegada',
              '6': 'Autorizada',  // Situação 6 também é Autorizada (emitida e autorizada pela SEFAZ)
              '7': 'Autorizada',  // Situação 7 = Emitida DANFE (nota autorizada pela SEFAZ)
            };
            situacaoTexto = situacaoMap[nf.situacao.toString()] || `Situação ${nf.situacao}`;
          }

          // Mapear tipo de NF baseado no campo "finalidade" (campo oficial da NFe)
          let tipoNF = 'Não informado';

          if (nf.finalidade) {
            const finalidadeMap: Record<string, string> = {
              '1': 'Saída',           // NF-e Normal (venda/saída)
              '2': 'Complementar',    // NF-e Complementar
              '3': 'Ajuste',          // NF-e de Ajuste
              '4': 'Entrada',         // Devolução de Mercadoria (entrada)
            };
            tipoNF = finalidadeMap[nf.finalidade.toString()] || `Finalidade ${nf.finalidade}`;
          }

          const dadosMapeados = {
            situacao: situacaoTexto,
            numero: nf.numero || nf.numero_nfe || formData.integracaoERP?.notaFiscalNumero,
            serie: nf.serie || nf.serie_nfe || '1',
            tipo: tipoNF,
            chaveAcesso: nf.chave_acesso || nf.chave_nfe || formData.integracaoERP?.notaFiscalChave,
            dataEmissao: nf.data_emissao || nf.data_hora_emissao,
            naturezaOperacao: nf.natureza_operacao || nf.natureza,
          };

          console.log('[DADOS NFE] ✅ Dados mapeados para exibição:', dadosMapeados);
          setDadosNFe(dadosMapeados);
        } else {
          console.warn('[DADOS NFE] ⚠️ Estrutura de nota fiscal não encontrada na resposta');
        }
      } catch (error: any) {
        console.log('[DADOS NFE] ℹ️ Não foi possível carregar dados completos da NFe:', error?.message);

        // Usar dados parciais que já temos na venda
        setDadosNFe({
          numero: formData.integracaoERP?.notaFiscalNumero,
          chaveAcesso: formData.integracaoERP?.notaFiscalChave,
          dataEmissao: formData.dataFaturamento ?
            (typeof formData.dataFaturamento === 'string' ?
              formData.dataFaturamento :
              formData.dataFaturamento.toISOString()) :
            undefined,
        });
      } finally {
        setLoadingDadosNFe(false);
      }
    } else {
      // Se não tiver ID, usar apenas dados parciais que já estão salvos
      console.log('[DADOS NFE] Usando dados parciais da NFe (sem ID para buscar do ERP)');
      setDadosNFe({
        numero: formData.integracaoERP?.notaFiscalNumero,
        chaveAcesso: formData.integracaoERP?.notaFiscalChave,
        dataEmissao: formData.dataFaturamento ?
          (typeof formData.dataFaturamento === 'string' ?
            formData.dataFaturamento :
            formData.dataFaturamento.toISOString()) :
          undefined,
      });
      setLoadingDadosNFe(false);
    }
  };

  useEffect(() => {
    // Mostrar dados da NFe se tiver qualquer indicação de nota fiscal
    const temNotaFiscal = formData.integracaoERP?.notaFiscalId ||
      formData.integracaoERP?.notaFiscalNumero ||
      formData.integracaoERP?.notaFiscalChave;

    if (formData.id && modoAtual === 'visualizar' && temNotaFiscal) {
      console.log('[DADOS NFE] Detectada nota fiscal:', {
        notaFiscalId: formData.integracaoERP?.notaFiscalId,
        notaFiscalNumero: formData.integracaoERP?.notaFiscalNumero,
        notaFiscalChave: formData.integracaoERP?.notaFiscalChave,
        erpPedidoId: formData.integracaoERP?.erpPedidoId
      });
      carregarDadosNFe();
    }
  }, [
    formData.id,
    formData.integracaoERP?.notaFiscalId,
    formData.integracaoERP?.notaFiscalNumero,
    formData.integracaoERP?.notaFiscalChave,
    formData.empresaFaturamentoId,
    modoAtual
  ]);

  // Log de debug para integração ERP
  useEffect(() => {
    if (modoAtual === 'visualizar' && formData.integracaoERP) {
      console.log('[DEBUG INTEGRACAO ERP] Dados completos da integração:', {
        integracaoERP: formData.integracaoERP,
        erpPedidoId: formData.integracaoERP.erpPedidoId,
        notaFiscalId: formData.integracaoERP.notaFiscalId,
        notaFiscalNumero: formData.integracaoERP.notaFiscalNumero,
        notaFiscalChave: formData.integracaoERP.notaFiscalChave,
        erpStatus: formData.integracaoERP.erpStatus,
        dataFaturamento: formData.dataFaturamento,
        valorFaturado: formData.valorFaturado
      });
    }
  }, [formData.integracaoERP, modoAtual]);

  // Auto-preencher dados do cliente (apenas ao criar nova venda)
  const [clienteJaCarregado, setClienteJaCarregado] = useState(false);

  useEffect(() => {
    // Só auto-preencher se for modo criar ou se o cliente foi alterado manualmente
    if (formData.clienteId && modo === 'criar' && !clienteJaCarregado) {
      const cliente = clientes.find(c => c.id === formData.clienteId);
      if (cliente && companies.length > 0) {
        // Função async para buscar lista de preço e processar dados do cliente
        const processarCliente = async () => {
          let listaPreco = null;

          // Buscar lista de preços: primeiro verificar se é um ID numérico e buscar na Edge Function
          if (cliente.listaPrecos) {
            // Verificar se listaPrecos é um ID numérico (string que pode ser convertida para número)
            const listaPrecosValue = String(cliente.listaPrecos).trim();
            const isNumericId = /^\d+$/.test(listaPrecosValue);

            if (isNumericId) {
              // É um ID numérico, buscar na Edge Function
              try {
                console.log('[AUTO-PREENCHIMENTO] Buscando lista de preço via Edge Function com ID:', listaPrecosValue);
                const listaPrecoCompleta = await api.getById('listas-preco', listaPrecosValue);
                if (listaPrecoCompleta) {
                  listaPreco = listaPrecoCompleta;
                  // Adicionar à lista local se não estiver lá
                  const jaExiste = listasPreco.find(lp => lp.id === listaPrecoCompleta.id);
                  if (!jaExiste) {
                    setListasPreco(prev => [...prev, listaPrecoCompleta]);
                  }
                  console.log('[AUTO-PREENCHIMENTO] Lista de preço encontrada na Edge Function:', listaPrecoCompleta.nome);
                }
              } catch (error) {
                console.error('[AUTO-PREENCHIMENTO] Erro ao buscar lista de preço na Edge Function:', error);
                // Fallback: tentar encontrar na lista local
                listaPreco = listasPreco.find(lp => lp.id === listaPrecosValue);
              }
            } else {
              // Não é um ID numérico, buscar por nome na lista local
              listaPreco = listasPreco.find(lp => lp.id === cliente.listaPrecos);
              if (!listaPreco) {
                listaPreco = listasPreco.find(lp => lp.nome === cliente.listaPrecos);
              }
              if (!listaPreco) {
                // Busca parcial: verifica se o nome da lista contém o texto do cliente
                listaPreco = listasPreco.find(lp => lp.nome.toLowerCase().includes(cliente.listaPrecos.toLowerCase()));
              }
            }
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
              // ✅ FALLBACK: Usar primeira empresa disponível se o cliente tem empresa antiga/inválida
              if (companies.length > 0) {
                const primeiraEmpresa = companies[0];
                empresaFaturamentoId = primeiraEmpresa.id;
                nomeEmpresaFaturamento = primeiraEmpresa.razaoSocial;
                console.log('[AUTO-PREENCHIMENTO] 🔄 Empresa do cliente não encontrada. Usando fallback:', {
                  empresaCliente: cliente.empresaFaturamento,
                  empresaFallback: primeiraEmpresa.razaoSocial,
                  id: primeiraEmpresa.id
                });
              } else {
                nomeEmpresaFaturamento = cliente.empresaFaturamento;
                console.error('[AUTO-PREENCHIMENTO] ❌ Nenhuma empresa cadastrada no sistema!');
              }
            }
          }

          // Se não encontrou empresa, alertar mas NÃO bloquear
          if (!empresaFaturamentoId && companies.length === 0) {
            console.error('[AUTO-PREENCHIMENTO] ❌ CRÍTICO: Nenhuma empresa cadastrada no sistema!');
            toast.error('Nenhuma empresa cadastrada! Configure as empresas antes de criar pedidos.');
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
        };

        // Chamar função async
        processarCliente();
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
  const handleClienteChange = async (clienteId: string) => {
    limparErro('clienteId'); // Limpar erro ao selecionar cliente
    setIsLoadingCliente(true); // Iniciar carregamento
    setMostrarCamposCliente(false); // Esconder campos antigos/vazios enquanto carrega

    try {
      // Buscar dados completos do cliente via API
      console.log('[VENDAS] Buscando dados completos do cliente:', clienteId);
      const clienteCompleto = await api.getById('clientes', clienteId);

      if (!clienteCompleto) {
        toast.error('Cliente não encontrado');
        return;
      }

      console.log('[VENDAS] Cliente completo carregado:', clienteCompleto);

      // Usar os dados completos do cliente
      const cliente = clienteCompleto;

      // Buscar lista de preços: primeiro verificar se é um ID numérico e buscar na Edge Function
      let listaPreco = null;
      if (cliente.listaPrecos) {
        // Verificar se listaPrecos é um ID numérico (string que pode ser convertida para número)
        const listaPrecosValue = String(cliente.listaPrecos).trim();
        const isNumericId = /^\d+$/.test(listaPrecosValue);

        if (isNumericId) {
          // É um ID numérico, buscar na Edge Function
          try {
            console.log('[VENDAS] Buscando lista de preço via Edge Function com ID:', listaPrecosValue);
            const listaPrecoCompleta = await api.getById('listas-preco', listaPrecosValue);
            if (listaPrecoCompleta) {
              listaPreco = listaPrecoCompleta;
              // Adicionar à lista local se não estiver lá
              const jaExiste = listasPreco.find(lp => lp.id === listaPrecoCompleta.id);
              if (!jaExiste) {
                setListasPreco(prev => [...prev, listaPrecoCompleta]);
              }
              console.log('[VENDAS] Lista de preço encontrada na Edge Function:', listaPrecoCompleta.nome);
            }
          } catch (error) {
            console.error('[VENDAS] Erro ao buscar lista de preço na Edge Function:', error);
            // Fallback: tentar encontrar na lista local
            listaPreco = listasPreco.find(lp => lp.id === listaPrecosValue);
          }
        } else {
          // Não é um ID numérico, buscar por nome na lista local
          listaPreco = listasPreco.find(lp => lp.id === cliente.listaPrecos);
          if (!listaPreco) {
            listaPreco = listasPreco.find(lp => lp.nome === cliente.listaPrecos);
          }
          if (!listaPreco) {
            // Busca parcial: verifica se o nome da lista contém o texto do cliente
            listaPreco = listasPreco.find(lp => lp.nome.toLowerCase().includes(cliente.listaPrecos.toLowerCase()));
          }
        }
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
          // ✅ FALLBACK: Usar primeira empresa disponível se o cliente tem empresa antiga/inválida
          if (companies.length > 0) {
            const primeiraEmpresa = companies[0];
            empresaFaturamentoId = primeiraEmpresa.id;
            nomeEmpresaFaturamento = primeiraEmpresa.razaoSocial;
            console.log('[HANDLER] 🔄 Empresa do cliente não encontrada. Usando fallback:', {
              empresaCliente: cliente.empresaFaturamento,
              empresaFallback: primeiraEmpresa.razaoSocial,
              id: primeiraEmpresa.id
            });
          } else {
            nomeEmpresaFaturamento = cliente.empresaFaturamento;
            console.error('[HANDLER] ❌ Nenhuma empresa cadastrada no sistema!');
          }
        }
      }

      // Se não encontrou empresa, alertar mas NÃO bloquear
      if (!empresaFaturamentoId && companies.length === 0) {
        console.error('[HANDLER] ❌ CRÍTICO: Nenhuma empresa cadastrada no sistema!');
        toast.error('Nenhuma empresa cadastrada! Configure as empresas antes de criar pedidos.');
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

      // Atualizar a lista local de clientes com os dados completos
      setClientes(prev => {
        const index = prev.findIndex(c => c.id === clienteId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = clienteCompleto;
          return updated;
        }
        // Se o cliente não está na lista, adicionar
        return [...prev, clienteCompleto];
      });

      // Mostrar campos do cliente após seleção (apenas no modo criar)
      if (modo === 'criar') {
        setMostrarCamposCliente(true);
      }
    } catch (error) {
      console.error('[VENDAS] Erro ao carregar dados do cliente:', error);

      // Fallback: usar dados do cliente da lista local se disponível
      const clienteLocal = clientes.find(c => c.id === clienteId);
      if (!clienteLocal) {
        toast.error('Cliente não encontrado');
        return;
      }

      console.log('[VENDAS] Usando dados locais do cliente como fallback');
      toast.info('Dados completos do cliente não puderam ser carregados. Usando dados disponíveis.');

      // Usar clienteLocal como fallback
      const cliente = clienteLocal;

      // Buscar lista de preços: primeiro verificar se é um ID numérico e buscar na Edge Function
      let listaPreco = null;
      if (cliente.listaPrecos) {
        // Verificar se listaPrecos é um ID numérico (string que pode ser convertida para número)
        const listaPrecosValue = String(cliente.listaPrecos).trim();
        const isNumericId = /^\d+$/.test(listaPrecosValue);

        if (isNumericId) {
          // É um ID numérico, buscar na Edge Function
          try {
            console.log('[HANDLER] Buscando lista de preço via Edge Function com ID:', listaPrecosValue);
            const listaPrecoCompleta = await api.getById('listas-preco', listaPrecosValue);
            if (listaPrecoCompleta) {
              listaPreco = listaPrecoCompleta;
              // Adicionar à lista local se não estiver lá
              const jaExiste = listasPreco.find(lp => lp.id === listaPrecoCompleta.id);
              if (!jaExiste) {
                setListasPreco(prev => [...prev, listaPrecoCompleta]);
              }
              console.log('[HANDLER] Lista de preço encontrada na Edge Function:', listaPrecoCompleta.nome);
            }
          } catch (error) {
            console.error('[HANDLER] Erro ao buscar lista de preço na Edge Function:', error);
            // Fallback: tentar encontrar na lista local
            listaPreco = listasPreco.find(lp => lp.id === listaPrecosValue);
          }
        } else {
          // Não é um ID numérico, buscar por nome na lista local
          listaPreco = listasPreco.find(lp => lp.id === cliente.listaPrecos);
          if (!listaPreco) {
            listaPreco = listasPreco.find(lp => lp.nome === cliente.listaPrecos);
          }
          if (!listaPreco) {
            // Busca parcial: verifica se o nome da lista contém o texto do cliente
            listaPreco = listasPreco.find(lp => lp.nome.toLowerCase().includes(cliente.listaPrecos.toLowerCase()));
          }
        }
      }

      // Buscar a empresa de faturamento do cliente
      let empresaFaturamentoId = '';
      let nomeEmpresaFaturamento = '';

      if (cliente.empresaFaturamento) {
        // Tentar encontrar a empresa por ID primeiro (o mais comum)
        let empresa = companies.find(c => c.id === cliente.empresaFaturamento);

        // Se não encontrou por ID, tentar por nome
        if (!empresa) {
          const empresaNormalizada = cliente.empresaFaturamento.trim().toUpperCase();
          empresa = companies.find(c =>
            c.razaoSocial?.trim().toUpperCase() === empresaNormalizada ||
            c.nomeFantasia?.trim().toUpperCase() === empresaNormalizada
          );

          if (!empresa) {
            empresa = companies.find(c =>
              c.razaoSocial?.trim().toUpperCase().includes(empresaNormalizada) ||
              c.nomeFantasia?.trim().toUpperCase().includes(empresaNormalizada)
            );
          }
        }

        if (empresa) {
          empresaFaturamentoId = empresa.id;
          nomeEmpresaFaturamento = empresa.razaoSocial;
        } else if (companies.length > 0) {
          const primeiraEmpresa = companies[0];
          empresaFaturamentoId = primeiraEmpresa.id;
          nomeEmpresaFaturamento = primeiraEmpresa.razaoSocial;
        } else {
          nomeEmpresaFaturamento = cliente.empresaFaturamento;
        }
      }

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
    } finally {
      setIsLoadingCliente(false); // Finalizar carregamento
    }
  };



  const handleAddItem = () => {
    if (!selectedProdutoId || quantidade <= 0) {
      toast.error('Selecione um produto e informe a quantidade');
      return;
    }

    if (!formData.listaPrecoId) {
      console.warn('[VENDAS] Cliente não possui lista de preços associada');
      toast.error('Cliente não possui lista de preços associada. Verifique o cadastro do cliente.');
      return;
    }

    const listaPreco = listasPreco.find(lp => lp.id === formData.listaPrecoId);
    if (!listaPreco) {
      console.warn('[VENDAS] Lista de preços não encontrada:', formData.listaPrecoId);
      toast.error('Lista de preços não encontrada. Verifique o cadastro do cliente.');
      return;
    }

    const produtoPreco = listaPreco.produtos?.find(pp => pp.produtoId === selectedProdutoId);
    if (!produtoPreco) {
      console.warn('[VENDAS] Produto não encontrado na lista de preços:', {
        listaId: listaPreco.id,
        listaNome: listaPreco.nome,
        produtoId: selectedProdutoId,
      });
      toast.error('Produto não encontrado na lista de preços selecionada.');
      return;
    }

    const valorTabela = Number(produtoPreco.preco) || 0;
    if (valorTabela <= 0) {
      toast.error(`Produto "${produtoPreco.descricao || selectedProdutoId}" não possui preço cadastrado na lista "${listaPreco.nome}"`);
      return;
    }

    console.log('[VENDAS] Preço encontrado na lista:', {
      listaId: listaPreco.id,
      listaNome: listaPreco.nome,
      produtoId: produtoPreco.produtoId,
      produtoNome: produtoPreco.descricao,
      preco: valorTabela,
    });

    const percentualDesconto = formData.percentualDescontoPadrao || 0;
    const valorUnitario = valorTabela * (1 - percentualDesconto / 100);
    const subtotal = valorUnitario * quantidade;

    const novoItem: ItemVenda = {
      id: `item-${Date.now()}`,
      numero: (formData.itens?.length || 0) + 1,
      produtoId: produtoPreco.produtoId,
      descricaoProduto: produtoPreco.descricao || 'Produto sem descricao',
      codigoSku: produtoPreco.codigoSku || '',
      codigoEan: produtoPreco.codigoEan || '',
      valorTabela,
      percentualDesconto,
      valorUnitario,
      quantidade,
      subtotal,
      pesoBruto: produtoPreco.pesoBruto ?? 0,
      pesoLiquido: produtoPreco.pesoLiquido ?? 0,
      unidade: 'UN',
    };

    console.log('[VENDAS] Item adicionado:', {
      produtoId: novoItem.produtoId,
      descricao: novoItem.descricaoProduto,
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

  // Função para renderizar os botões de ação (usada no topo e no final da página)
  const renderActionButtons = () => {
    return (
      <div className="flex gap-2">
        {/* Modo Visualização - Mostrar botão Editar */}
        {isReadOnly && modo !== 'criar' && podeEditar && !pedidoBloqueado && (
          <Button onClick={handleEntrarModoEdicao}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}

        {/* Modo Edição - Mostrar botões Cancelar, Salvar Rascunho e Enviar para Análise */}
        {!isReadOnly && !pedidoBloqueado && (
          <>
            <Button
              variant="outline"
              onClick={modoAtual === 'editar' ? handleCancelarEdicao : onVoltar}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>

            {/* Botões de ação baseados no modo e status */}
            {modoAtual === 'criar' ? (
              // Ao CRIAR novo pedido: opção de Rascunho OU Enviar para Análise
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Salvar como Rascunho
                </Button>

                <Button onClick={() => handleSave(false)}>
                  <Save className="h-4 w-4 mr-2" />
                  Enviar para Análise
                </Button>
              </>
            ) : modoAtual === 'editar' && formData.status === 'Rascunho' ? (
              // Ao EDITAR rascunho: opção de manter Rascunho OU Enviar para Análise
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave(true)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>

                <Button onClick={() => handleSave(false)}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para Análise
                </Button>
              </>
            ) : (
              // Ao EDITAR pedido normal: apenas Salvar Alterações
              <Button onClick={() => handleSave(false)}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            )}
          </>
        )}
      </div>
    );
  };

  const handleSave = async (salvarComoRascunho: boolean = false) => {
    // Marcar que houve tentativa de salvar
    setTentouSalvar(true);

    // Verificar se pedido está bloqueado para edição
    if (modoAtual === 'editar' && pedidoBloqueado) {
      toast.error('Este pedido já foi enviado ao ERP e não pode ser editado');
      return;
    }

    // ✅ NOVO: Validação flexível - Rascunhos não exigem todos os campos
    const erros = new Set<string>();

    // Se NÃO for rascunho, validar todos os campos obrigatórios
    if (!salvarComoRascunho) {
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
    } else {
      // ✅ Para rascunho, apenas validar que tem pelo menos UM campo preenchido
      const temAlgumCampo = formData.clienteId ||
        formData.naturezaOperacaoId ||
        formData.itens?.length > 0 ||
        formData.observacoesInternas;

      if (!temAlgumCampo) {
        toast.error('Preencha pelo menos um campo antes de salvar o rascunho');
        return;
      }
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
      // ✅ NOVO: Define status baseado no tipo de salvamento
      status: salvarComoRascunho ? 'Rascunho' : 'Em Análise',
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

    // ✅ CORREÇÃO: NÃO enviar RASCUNHOS para o ERP
    // Se for criação de novo pedido E NÃO for rascunho, verificar envio automático ao ERP
    if (modoAtual === 'criar' && !salvarComoRascunho && formData.empresaFaturamentoId) {
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
            // ✅ VALIDAÇÃO ADICIONAL: Verificar se tem itens ANTES de enviar
            console.log('🔍 VERIFICAÇÃO PRÉ-ENVIO:', {
              id: vendaCompleta.id,
              numero: vendaCompleta.numero,
              status: vendaCompleta.status,
              quantidadeItens: vendaCompleta.itens?.length || 0,
            });

            if (!vendaCompleta.itens || vendaCompleta.itens.length === 0) {
              console.error('❌ BLOQUEIO: Tentativa de enviar pedido SEM ITENS ao ERP!');
              toast.error('Não é possível enviar pedido sem itens ao ERP');
            } else {
              console.log('✅ Iniciando envio ao ERP');
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
    } else if (salvarComoRascunho) {
      // ✅ LOG: Rascunhos NÃO são enviados ao ERP
      console.log('📝 Salvando como RASCUNHO - NÃO será enviado ao ERP');
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

      // ✅ NOVO: Mensagem diferente para rascunho
      if (salvarComoRascunho) {
        toast.success('Rascunho salvo com sucesso! Você pode continuar editando depois.');
      } else {
        toast.success(modoAtual === 'criar' ? 'Pedido criado e enviado para análise!' : 'Pedido atualizado com sucesso!');
      }
    } catch (error: any) {
      console.error('[VENDAS] Erro ao salvar venda:', error);

      const message = error?.message || 'Erro desconhecido';
      toast.error(`Erro ao salvar pedido: ${message}`);

      // Evitar "falso salvo": salvar localmente apenas em rascunho + erro de rede.
      const isNetworkError =
        typeof message === 'string' &&
        /failed to fetch|networkerror|load failed|fetch/i.test(message);

      if (salvarComoRascunho && isNetworkError) {
        console.warn('[VENDAS] Erro de rede ao salvar rascunho. Salvando no localStorage como fallback...');
        toast.warning('Sem conexão. Rascunho salvo localmente; tente salvar novamente quando a internet voltar.');

        const { carregarVendasDoLocalStorage, salvarVendasNoLocalStorage } = await import('../data/mockVendas');
        const vendasLocal = carregarVendasDoLocalStorage();
        const vendasAtualizadas = vendasLocal.filter((v) => v.id !== vendaCompleta.id);
        vendasAtualizadas.unshift(vendaCompleta);
        salvarVendasNoLocalStorage(vendasAtualizadas);
      }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando dados do pedido...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 md:p-6">
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
                {/* ✅ NOVO: Badge indicando Rascunho */}
                {formData.status === 'Rascunho' && (
                  <Badge variant="outline" className="text-gray-500">
                    Rascunho
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {formData.numero || 'Preencha as informações do pedido'}
              </p>
            </div>
          </div>

          {/* Botões de ação */}
          {renderActionButtons()}
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
                            formData.nomeCliente ||
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
                          onChange={(e) => handleClienteSearchChange(e.target.value)}
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          disabled={loadingClientes}
                        />
                        {loadingClientes && (
                          <div className="ml-2 text-sm text-muted-foreground">
                            Buscando...
                          </div>
                        )}
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
                                    className={`mr-2 h-4 w-4 ${formData.clienteId === cliente.id ? "opacity-100" : "opacity-0"
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
                                        <span>
                                          {cliente.tipoPessoa === 'Pessoa Física' ? 'CPF' : 'CNPJ'}: {' '}
                                          {cliente.tipoPessoa === 'Pessoa Física'
                                            ? formatCPF(cliente.cpfCnpj)
                                            : formatCNPJ(cliente.cpfCnpj)}
                                        </span>
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
                    Cliente selecionado: {formData.nomeCliente} - {(() => {
                      const clienteSelecionado = clientes.find(c => c.id === formData.clienteId);
                      if (clienteSelecionado?.tipoPessoa === 'Pessoa Física') {
                        return formatCPF(formData.cnpjCliente || '');
                      }
                      return formatCNPJ(formData.cnpjCliente || '');
                    })()}
                  </p>
                )}
              </div>

              {/* Loader ao carregar cliente */}
              {isLoadingCliente && (
                <div className="md:col-span-3 flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Carregando dados do cliente...</span>
                  </div>
                </div>
              )}

              {/* Campos que aparecem após selecionar o cliente */}
              {mostrarCamposCliente && !isLoadingCliente && (
                <>
                  <div className="space-y-2">
                    <Label>Lista de Preço</Label>
                    <Input
                      value={(() => {
                        // Se já temos o nome, usar ele
                        if (formData.nomeListaPreco) {
                          return formData.nomeListaPreco;
                        }
                        // Se temos o ID, buscar o nome na lista de preços
                        if (formData.listaPrecoId) {
                          const listaPreco = listasPreco.find(lp => lp.id === formData.listaPrecoId);
                          if (listaPreco?.nome) {
                            return listaPreco.nome;
                          }
                        }
                        return '';
                      })()}
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
                    <Label>
                      {(() => {
                        const clienteSelecionado = clientes.find(c => c.id === formData.clienteId);
                        return clienteSelecionado?.tipoPessoa === 'Pessoa Física' ? 'CPF' : 'CNPJ';
                      })()}
                    </Label>
                    <Input
                      value={(() => {
                        const clienteSelecionado = clientes.find(c => c.id === formData.clienteId);
                        if (clienteSelecionado?.tipoPessoa === 'Pessoa Física') {
                          return formatCPF(formData.cnpjCliente || '');
                        }
                        return formatCNPJ(formData.cnpjCliente || '');
                      })()}
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
            {/* Dados NFe Vinculada - Apenas em modo visualização e status específicos */}
            {(() => {
              const statusComNotaFiscal = ['Faturado', 'Pronto para envio', 'Enviado', 'Entregue', 'Não Entregue', 'Cancelado'];
              const deveExibirNFe = statusComNotaFiscal.includes(formData.status || '');

              console.log('[DEBUG NFe] Verificando exibição da seção:', {
                isReadOnly,
                mostrarDemaisCampos,
                status: formData.status,
                deveExibirNFe,
                integracaoERPCompleta: formData.integracaoERP,
                deveExibir: isReadOnly && deveExibirNFe
              });

              return isReadOnly && deveExibirNFe;
            })() && (
                <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <Receipt className="h-5 w-5" />
                      Dados NFe Vinculada
                    </CardTitle>
                    <CardDescription>
                      Informações da nota fiscal emitida no ERP para este pedido
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingDadosNFe ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-3 text-muted-foreground">Carregando dados da NFe...</span>
                      </div>
                    ) : dadosNFe ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Situação da NF */}
                        {dadosNFe.situacao && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Situação SEFAZ</Label>
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${dadosNFe.situacao.includes('Autorizada') ? 'bg-green-500' :
                                dadosNFe.situacao.includes('Cancelada') ? 'bg-red-500' :
                                  dadosNFe.situacao.includes('Processando') ? 'bg-yellow-500' :
                                    'bg-gray-500'
                                }`} />
                              <p className="font-medium">{dadosNFe.situacao}</p>
                            </div>
                          </div>
                        )}

                        {/* Número da NF */}
                        {dadosNFe.numero && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Número da NF</Label>
                            <p className="font-medium">{dadosNFe.numero}</p>
                          </div>
                        )}

                        {/* Série da NF */}
                        {dadosNFe.serie && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Série</Label>
                            <p className="font-medium">{dadosNFe.serie}</p>
                          </div>
                        )}

                        {/* Tipo de NF */}
                        {dadosNFe.tipo && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Tipo de NF</Label>
                            <Badge variant={dadosNFe.tipo === 'Saída' ? 'default' : 'secondary'}>
                              {dadosNFe.tipo}
                            </Badge>
                          </div>
                        )}

                        {/* Data de Emissão */}
                        {dadosNFe.dataEmissao && (() => {
                          try {
                            // Função para converter data brasileira (DD/MM/YYYY) para Date
                            const parseDataBrasileira = (dataStr: string): { data: Date | null, temHora: boolean } => {
                              // Tentar formato ISO primeiro (YYYY-MM-DD ou ISO completo)
                              if (dataStr.includes('-') || dataStr.includes('T')) {
                                const data = new Date(dataStr);
                                if (!isNaN(data.getTime())) {
                                  const temHora = dataStr.includes('T') || dataStr.includes(':');
                                  return { data, temHora };
                                }
                              }

                              // Formato brasileiro DD/MM/YYYY ou DD/MM/YYYY HH:MM:SS
                              const regex = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/;
                              const match = dataStr.match(regex);
                              if (match) {
                                const [, dia, mes, ano, hora, minuto, segundo] = match;
                                const temHora = !!(hora && minuto);
                                const data = new Date(
                                  parseInt(ano),
                                  parseInt(mes) - 1,
                                  parseInt(dia),
                                  temHora ? parseInt(hora) : 0,
                                  temHora ? parseInt(minuto) : 0,
                                  segundo ? parseInt(segundo) : 0
                                );
                                return { data, temHora };
                              }

                              return { data: null, temHora: false };
                            };

                            const { data, temHora } = parseDataBrasileira(dadosNFe.dataEmissao);

                            if (!data || isNaN(data.getTime())) {
                              console.error('[DADOS NFE] Data inválida:', dadosNFe.dataEmissao);
                              return null;
                            }

                            return (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Data de Emissão</Label>
                                <p className="font-medium">
                                  {temHora ? (
                                    data.toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  ) : (
                                    data.toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    })
                                  )}
                                </p>
                              </div>
                            );
                          } catch (error) {
                            console.error('[DADOS NFE] Erro ao formatar data:', error);
                            return null;
                          }
                        })()}

                        {/* Natureza de Operação da NF */}
                        {dadosNFe.naturezaOperacao && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Natureza de Operação</Label>
                            <p className="font-medium">{dadosNFe.naturezaOperacao}</p>
                          </div>
                        )}

                        {/* Chave de Acesso - Ocupa largura completa */}
                        {dadosNFe.chaveAcesso && (
                          <div className="space-y-1 md:col-span-2 lg:col-span-3">
                            <Label className="text-xs text-muted-foreground">Chave de Acesso</Label>
                            <p className="font-mono text-sm break-all bg-muted p-2 rounded">
                              {dadosNFe.chaveAcesso}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Dados não disponíveis</AlertTitle>
                        <AlertDescription>
                          Não foi possível carregar os dados completos da nota fiscal.
                          Verifique se a NFe foi emitida corretamente no ERP.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

            {/* Itens do Pedido */}
            <Card className={campoTemErro('itens') ? 'border-destructive' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={`flex items-center gap-2 ${campoTemErro('itens') ? 'text-destructive' : ''}`}>
                    <Package className="h-5 w-5" />
                    Itens do Pedido *
                  </CardTitle>
                  {!isReadOnly && !pedidoBloqueado && (
                    <Button onClick={() => setAddItemDialogOpen(true)} disabled={isLoadingCliente}>
                      {isLoadingCliente ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      Adicionar Item
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Se estiver em modo visualização E tiver integração com ERP, mostrar abas */}
                {isReadOnly && formData.integracaoERP?.erpPedidoId ? (
                  <Tabs defaultValue="solicitados" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="solicitados">Itens Solicitados</TabsTrigger>
                      <TabsTrigger value="faturados">
                        Itens Faturados
                        {itensFaturados.length > 0 && ` (${itensFaturados.length})`}
                      </TabsTrigger>
                    </TabsList>

                    {/* Aba de Itens Solicitados */}
                    <TabsContent value="solicitados" className="mt-4">
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {!formData.itens || formData.itens.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center text-muted-foreground">
                                Nenhum item adicionado
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
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TabsContent>

                    {/* Aba de Itens Faturados */}
                    <TabsContent value="faturados" className="mt-4">
                      {loadingItensFaturados ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center space-y-2">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                            <p className="text-sm text-muted-foreground">Carregando itens faturados...</p>
                          </div>
                        </div>
                      ) : itensFaturados.length === 0 ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Itens faturados não disponíveis</AlertTitle>
                          <AlertDescription>
                            Não foi possível carregar os itens efetivamente faturados no ERP.
                            Isso pode ocorrer se o pedido ainda não foi faturado ou se a nota fiscal ainda não foi vinculada ao pedido.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Nº</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>EAN</TableHead>
                              <TableHead className="text-right">Vlr. Unit.</TableHead>
                              <TableHead className="text-right">Qtd</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itensFaturados.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.numero}</TableCell>
                                <TableCell>{item.descricaoProduto}</TableCell>
                                <TableCell>{item.codigoSku}</TableCell>
                                <TableCell>{item.codigoEan || '-'}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.valorUnitario)}</TableCell>
                                <TableCell className="text-right">{item.quantidade} {item.unidade}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}

                      {/* Totais dos itens faturados */}
                      {itensFaturados.length > 0 && (
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Total Faturado:</span>
                            <span className="text-lg font-bold">
                              {formatCurrency(itensFaturados.reduce((sum, item) => sum + item.subtotal, 0))}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            * Este é o valor base para cálculo das comissões de vendas
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  /* Tabela simples para modos de criação e edição */
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
                )}
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

            {/* Botões de ação no final da página */}
            <div className="flex justify-end pt-6 border-t">
              {renderActionButtons()}
            </div>

            {/* Dialog Adicionar Item */}
            <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
              <DialogContent
                className="max-w-2xl w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto overflow-x-hidden"
                aria-describedby={undefined}
              >
                <DialogHeader>
                  <DialogTitle>Adicionar Item ao Pedido</DialogTitle>
                  <DialogDescription>
                    Selecione um produto e informe a quantidade
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 overflow-x-hidden">
                  <div className="space-y-2">
                    <Label>Produto *</Label>
                    <Popover open={produtoComboboxOpen} onOpenChange={setProdutoComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          <span className="truncate">
                            {produtoSelecionadoNoCombobox
                              ? `${produtoSelecionadoNoCombobox.descricao}${produtoSelecionadoNoCombobox.codigoSku ? ` - SKU: ${produtoSelecionadoNoCombobox.codigoSku}` : ''}${produtoSelecionadoNoCombobox.codigoEan ? ` - EAN: ${produtoSelecionadoNoCombobox.codigoEan}` : ''}`
                              : 'Buscar por descricao, SKU ou EAN'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar por descricao, SKU ou EAN" />
                          <CommandList>
                            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                            <CommandGroup>
                              {produtosDisponiveisParaPedido.map(produto => (
                                <CommandItem
                                  key={produto.id}
                                  value={`${produto.descricao} ${produto.codigoSku} ${produto.codigoEan}`.trim().toLowerCase()}
                                  onSelect={() => {
                                    setSelectedProdutoId(produto.id);
                                    setProdutoComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={selectedProdutoId === produto.id ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                                  />
                                  <span className="truncate">
                                    {produto.descricao}
                                    {produto.codigoSku ? ` - SKU: ${produto.codigoSku}` : ''}
                                    {produto.codigoEan ? ` - EAN: ${produto.codigoEan}` : ''}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                    <div className="border rounded-lg p-4 bg-muted overflow-x-hidden">
                      <h4 className="mb-2">Informações do Produto</h4>
                      {(() => {
                        // Buscar produto na lista de preços primeiro
                        let produtoPreco: any = null;
                        let produto: any = null;

                        if (formData.listaPrecoId) {
                          const listaPreco = listasPreco.find(lp => lp.id === formData.listaPrecoId);
                          if (listaPreco && listaPreco.produtos) {
                            produtoPreco = listaPreco.produtos.find(pp => pp.produtoId === selectedProdutoId);
                          }
                        }

                        // Se não encontrou na lista de preços, buscar na lista geral de produtos
                        if (!produtoPreco) {
                          produto = produtos.find(p => p.id === selectedProdutoId);
                        }

                        // Buscar preço do produto na lista de preços do cliente
                        let valorTabela = 0;
                        let mensagemErro = '';
                        let descricao = '';
                        let sku = '';
                        let ean = '';

                        if (formData.listaPrecoId) {
                          const listaPreco = listasPreco.find(lp => lp.id === formData.listaPrecoId);

                          if (listaPreco) {
                            if (produtoPreco) {
                              valorTabela = produtoPreco.preco || 0;
                              descricao = produtoPreco.descricao || '';
                              sku = produtoPreco.codigoSku || '';
                              ean = produtoPreco.codigoEan || '';

                              if (valorTabela <= 0) {
                                mensagemErro = 'Produto sem preço cadastrado nesta lista';
                              }
                            } else {
                              mensagemErro = 'Produto não encontrado nesta lista de preços';
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
                            <div className="space-y-2 overflow-x-hidden">
                              <div className="text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 inline mr-2" />
                                {mensagemErro}
                              </div>
                              {(descricao || sku || ean) && (
                                <div className="text-sm space-y-1 min-w-0 break-words overflow-x-hidden">
                                  {descricao && (
                                    <div className="min-w-0 break-words">
                                      <span className="text-muted-foreground">Descrição:</span> {descricao}
                                    </div>
                                  )}
                                  {sku && (
                                    <div className="min-w-0 break-words">
                                      <span className="text-muted-foreground">SKU:</span> {sku}
                                    </div>
                                  )}
                                  {ean && (
                                    <div className="min-w-0 break-words">
                                      <span className="text-muted-foreground">EAN:</span> {ean}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {/* Informações do produto */}
                            {(descricao || sku || ean) && (
                              <div className="text-sm space-y-1 pb-2 border-b min-w-0 break-words overflow-x-hidden">
                                {descricao && <div className="min-w-0 break-words"><span className="text-muted-foreground">Descrição:</span> {descricao}</div>}
                                {sku && <div className="min-w-0 break-words"><span className="text-muted-foreground">SKU:</span> {sku}</div>}
                                {ean && <div className="min-w-0 break-words"><span className="text-muted-foreground">EAN:</span> {ean}</div>}
                              </div>
                            )}

                            {/* Valores */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Valor de Tabela:</span>
                                <p className="font-medium">{formatCurrency(valorTabela)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Desconto:</span>
                                <p className="font-medium">{percentualDesconto}%</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Valor Unitário:</span>
                                <p className="font-medium">{formatCurrency(valorUnitario)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Subtotal:</span>
                                <p className="font-medium">{formatCurrency(subtotal)}</p>
                              </div>
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









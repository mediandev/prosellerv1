import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { customerCodeService } from "../services/customerCodeService";
import { clientes as clientesMock } from "../data/mockCustomers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { ERPIntegrationUnified } from "./ERPIntegrationUnified";
import { CompanySettings } from "./CompanySettings";
import { CNPJTestTool } from "./CNPJTestTool";
import { PriceListManagement } from "./PriceListManagement";
import { NaturezaOperacaoManagement } from "./NaturezaOperacaoManagement";
import { BrandManagement } from "./BrandManagement";
import { ProductTypeManagement } from "./ProductTypeManagement";
import { UnitManagement } from "./UnitManagement";
import { UserManagement } from "./UserManagement";
import { GrupoRedeManagement } from "./GrupoRedeManagement";
import { CategoriaContaCorrenteManagement } from "./CategoriaContaCorrenteManagement";
import { TipoVeiculoManagement } from "./TipoVeiculoManagement";
import { StatusMixSettings } from "./StatusMixSettings";
import { DataImportSettings } from "./DataImportSettings";
import { EmailIntegrationSettings } from "./EmailIntegrationSettings";
import { ComissionDebugger } from "./ComissionDebugger";
import { VendedoresDebugger } from "./VendedoresDebugger";
import { VendaDebugger } from "./VendaDebugger";
import { DataMaintenanceTools } from "./DataMaintenanceTools";
import { FormaPagamento } from "../types/formaPagamento";
import { formasPagamentoMock } from "../data/mockFormasPagamento";
import { CondicaoPagamento, validarPrazoPagamento, formatarPrazoPagamento, calcularNumeroParcelas } from "../types/condicaoPagamento";
import { condicoesPagamentoMock } from "../data/mockCondicoesPagamento";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ListaPreco } from "../types/listaPreco";
import { toast } from "sonner@2.0.3";
import { 
  Plus, 
  Trash2, 
  Settings2, 
  Tag, 
  Users, 
  Clock,
  Edit,
  Save,
  Plug,
  TestTube,
  CreditCard,
  CheckCircle2,
  XCircle,
  Calendar,
  Percent,
  DollarSign,
  Hash,
  UserCircle,
  ChevronDown,
  ChevronRight,
  Building2,
  Package,
  Zap,
  Download,
  Wrench,
  Mail,
  Menu,
  X
} from "lucide-react";
import { api } from "../services/api";
import { cn } from "./ui/utils";

interface NaturezaOperacao {
  id: string;
  nome: string;
  descricao: string;
}

interface SegmentoCliente {
  id: string;
  nome: string;
  descricao: string;
}

const initialNaturezas: NaturezaOperacao[] = [
  { id: "1", nome: "Venda Direta", descricao: "Venda direta para cliente final" },
  { id: "2", nome: "Revenda", descricao: "Venda para revenda" },
  { id: "3", nome: "Serviço", descricao: "Prestação de serviço" },
  { id: "4", nome: "Locação", descricao: "Locação de produtos/equipamentos" },
  { id: "5", nome: "Demonstração", descricao: "Venda de demonstração" },
];

const initialSegmentos: SegmentoCliente[] = [
  { id: "1", nome: "VIP", descricao: "Clientes de alto valor" },
  { id: "2", nome: "Premium", descricao: "Clientes premium com bom potencial" },
  { id: "3", nome: "Standard", descricao: "Clientes padrão" },
  { id: "4", nome: "Corporativo", descricao: "Grandes empresas" },
  { id: "5", nome: "PME", descricao: "Pequenas e médias empresas" },
  { id: "6", nome: "Startup", descricao: "Empresas em fase inicial" },
];

interface SettingsPageProps {
  onNovaListaPreco?: () => void;
  onEditarListaPreco?: (listaId: string) => void;
  onVisualizarListaPreco?: (listaId: string) => void;
  listas?: ListaPreco[];
  onListasChange?: (listas: ListaPreco[]) => void;
}

// Definir estrutura de navegação
interface NavItem {
  id: string;
  label: string;
  icon: any;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    id: "cadastros",
    label: "Cadastros",
    icon: Building2,
    children: [
      { id: "empresas", label: "Empresas", icon: Building2 },
      { id: "naturezas", label: "Naturezas de Operação", icon: Tag },
      { id: "segmentos", label: "Segmentos de Cliente", icon: Tag },
      { id: "grupos-redes", label: "Grupos / Redes", icon: Users },
      { id: "formas-pagamento", label: "Formas de Pagamento", icon: CreditCard },
      { id: "condicoes-pagamento", label: "Condições de Pagamento", icon: Calendar },
      { id: "listas-preco", label: "Listas de Preço", icon: DollarSign },
      { id: "marcas", label: "Marcas", icon: Tag },
      { id: "tipos-produto", label: "Tipos de Produto", icon: Package },
      { id: "unidades", label: "Unidades de Medida", icon: Hash },
      { id: "categorias-conta-corrente", label: "Categorias Conta Corrente", icon: DollarSign },
      { id: "tipos-veiculo", label: "Tipos de Veículo", icon: Package },
    ]
  },
  {
    id: "usuarios",
    label: "Usuários",
    icon: UserCircle,
  },
  {
    id: "integracoes",
    label: "Integrações",
    icon: Plug,
    children: [
      { id: "tiny-erp", label: "Tiny ERP", icon: Plug },
      { id: "email", label: "E-mail", icon: Mail },
    ]
  },
  {
    id: "automacao",
    label: "Automação",
    icon: Zap,
    children: [
      { id: "status-mix", label: "Status Mix", icon: Settings2 },
      { id: "clientes-automacao", label: "Clientes", icon: Users },
    ]
  },
  {
    id: "importacoes",
    label: "Importações",
    icon: Download,
    children: [
      { id: "importacao-dados", label: "Importar Dados", icon: Download },
    ]
  },
  {
    id: "manutencao",
    label: "Manutenção",
    icon: Wrench,
    children: [
      { id: "ferramentas", label: "Ferramentas", icon: Wrench },
      { id: "debug-comissoes", label: "Debug Comissões", icon: TestTube },
      { id: "debug-vendedores", label: "Debug Vendedores", icon: TestTube },
      { id: "debug-vendas", label: "Debug Vendas", icon: TestTube },
      { id: "cnpj-test", label: "Teste CNPJ", icon: TestTube },
    ]
  },
];

export function SettingsPage({ 
  onNovaListaPreco, 
  onEditarListaPreco, 
  onVisualizarListaPreco,
  listas,
  onListasChange,
}: SettingsPageProps) {
  const [naturezas, setNaturezas] = useState<NaturezaOperacao[]>(initialNaturezas);
  const [segmentos, setSegmentos] = useState<SegmentoCliente[]>([]);
  const [segmentosLoading, setSegmentosLoading] = useState(false);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState<CondicaoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoInactiveEnabled, setAutoInactiveEnabled] = useState(true);
  const [inactivePeriod, setInactivePeriod] = useState("90");

  // Estados de navegação
  const [currentPage, setCurrentPage] = useState("empresas");
  const [expandedSections, setExpandedSections] = useState<string[]>(["cadastros"]);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Para mobile

  // Carregar dados do Supabase (sem segmentos e naturezas - serão carregados sob demanda)
  useEffect(() => {
    carregarDadosConfiguracao();
  }, []);

  // Carregar segmentos apenas quando a aba de segmentos for aberta
  useEffect(() => {
    if (currentPage === 'segmentos') {
      console.log('[SETTINGS] Aba de segmentos aberta, carregando dados...');
      carregarSegmentos();
    }
  }, [currentPage]);

  const carregarDadosConfiguracao = async () => {
    try {
      console.log('[SETTINGS] Carregando dados de configuração...');
      const [formasAPI, condicoesAPI] = await Promise.all([
        api.get('formas-pagamento').catch(() => formasPagamentoMock),
        api.get('condicoes-pagamento').catch(() => condicoesPagamentoMock),
      ]);
      
      setFormasPagamento(formasAPI);
      setCondicoesPagamento(condicoesAPI);
      
      console.log('[SETTINGS] Dados carregados:', {
        formasPagamento: formasAPI.length,
        condicoesPagamento: condicoesAPI.length,
      });
    } catch (error) {
      console.error('[SETTINGS] Erro ao carregar dados:', error);
      setFormasPagamento(formasPagamentoMock);
      setCondicoesPagamento(condicoesPagamentoMock);
      toast.error('Erro ao carregar configurações. Usando dados de demonstração.');
    } finally {
      setLoading(false);
    }
  };

  const carregarSegmentos = async () => {
    setSegmentosLoading(true);
    try {
      console.log('[SETTINGS] Carregando segmentos de cliente...');
      const segmentosAPI = await api.get('segmentos-cliente').catch(() => []);
      
      console.log('[SETTINGS] Resposta da API:', segmentosAPI);
      console.log('[SETTINGS] Tipo da resposta:', typeof segmentosAPI);
      console.log('[SETTINGS] É array?', Array.isArray(segmentosAPI));
      
      // Carregar segmentos do Supabase ou usar dados iniciais se vazio
      if (segmentosAPI && Array.isArray(segmentosAPI) && segmentosAPI.length > 0) {
        console.log('[SETTINGS] Segmentos carregados:', segmentosAPI.length, segmentosAPI);
        setSegmentos(segmentosAPI);
      } else if (segmentosAPI && Array.isArray(segmentosAPI)) {
        // Array vazio - não há segmentos no banco
        console.log('[SETTINGS] Nenhum segmento encontrado no banco');
        setSegmentos([]);
      } else {
        console.log('[SETTINGS] Resposta inválida, usando segmentos iniciais');
        setSegmentos(initialSegmentos);
      }
    } catch (error) {
      console.error('[SETTINGS] Erro ao carregar segmentos:', error);
      setSegmentos(initialSegmentos);
      toast.error('Erro ao carregar segmentos. Usando dados de demonstração.');
    } finally {
      setSegmentosLoading(false);
    }
  };
  
  // Configuração de código de cliente
  const [codigoClienteConfig, setCodigoClienteConfig] = useState(customerCodeService.obterConfiguracao());
  const [addNaturezaOpen, setAddNaturezaOpen] = useState(false);
  const [addSegmentoOpen, setAddSegmentoOpen] = useState(false);
  const [addFormaPagamentoOpen, setAddFormaPagamentoOpen] = useState(false);
  const [addCondicaoPagamentoOpen, setAddCondicaoPagamentoOpen] = useState(false);
  const [editFormaPagamentoOpen, setEditFormaPagamentoOpen] = useState(false);
  const [editingFormaPagamento, setEditingFormaPagamento] = useState<FormaPagamento | null>(null);
  
  const [newNatureza, setNewNatureza] = useState({ nome: "", descricao: "" });
  const [newSegmento, setNewSegmento] = useState({ nome: "", descricao: "" });
  const [newFormaPagamento, setNewFormaPagamento] = useState({
    nome: "",
    descricao: "",
    usarEmContaCorrente: true,
    usarEmCondicoesPagamento: true,
  });
  const [newCondicaoPagamento, setNewCondicaoPagamento] = useState({
    nome: "",
    formaPagamentoId: "",
    prazoPagamento: "",
    descontoExtra: 0,
    valorPedidoMinimo: 0,
  });

  // Estados para confirmação de exclusão
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "natureza" | "segmento" | "formaPagamento" | "condicaoPagamento" | null;
    id: string | null;
    name: string | null;
  }>({
    open: false,
    type: null,
    id: null,
    name: null,
  });

  // Funções de CRUD
  const handleAddNatureza = async () => {
    if (!newNatureza.nome) {
      toast.error("O nome da natureza de operação é obrigatório");
      return;
    }

    try {
      const novaNatureza = await api.post('naturezas-operacao', {
        nome: newNatureza.nome,
        descricao: newNatureza.descricao,
      });
      
      setNaturezas([...naturezas, novaNatureza]);
      setNewNatureza({ nome: "", descricao: "" });
      setAddNaturezaOpen(false);
      toast.success("Natureza de operação adicionada com sucesso!");
    } catch (error) {
      console.error('Erro ao adicionar natureza:', error);
      toast.error("Erro ao adicionar natureza de operação");
    }
  };

  const handleDeleteNatureza = async (id: string) => {
    try {
      await api.delete(`naturezas-operacao/${id}`);
      setNaturezas(naturezas.filter((n) => n.id !== id));
      toast.success("Natureza de operação removida com sucesso!");
    } catch (error) {
      console.error('Erro ao remover natureza:', error);
      toast.error("Erro ao remover natureza de operação");
    }
  };

  const handleAddSegmento = async () => {
    if (!newSegmento.nome) {
      toast.error("O nome do segmento é obrigatório");
      return;
    }

    try {
      const novoSegmento = await api.post('segmentos-cliente', {
        nome: newSegmento.nome,
        descricao: newSegmento.descricao,
      });
      
      setSegmentos([...segmentos, novoSegmento]);
      setNewSegmento({ nome: "", descricao: "" });
      setAddSegmentoOpen(false);
      toast.success("Segmento de cliente adicionado com sucesso!");
      
      // Recarregar segmentos para garantir sincronização
      await carregarSegmentos();
    } catch (error) {
      console.error('Erro ao adicionar segmento:', error);
      toast.error("Erro ao adicionar segmento de cliente");
    }
  };

  const handleDeleteSegmento = async (id: string) => {
    try {
      await api.delete(`segmentos-cliente/${id}`);
      setSegmentos(segmentos.filter((s) => s.id !== id));
      toast.success("Segmento de cliente removido com sucesso!");
      
      // Recarregar segmentos para garantir sincronização
      await carregarSegmentos();
    } catch (error) {
      console.error('Erro ao remover segmento:', error);
      toast.error("Erro ao remover segmento de cliente");
    }
  };

  const handleAddFormaPagamento = async () => {
    if (!newFormaPagamento.nome) {
      toast.error("O nome da forma de pagamento é obrigatório");
      return;
    }

    try {
      const novaForma = await api.post('formas-pagamento', newFormaPagamento);
      
      setFormasPagamento([...formasPagamento, novaForma]);
      setNewFormaPagamento({
        nome: "",
        descricao: "",
        usarEmContaCorrente: true,
        usarEmCondicoesPagamento: true,
      });
      setAddFormaPagamentoOpen(false);
      toast.success("Forma de pagamento adicionada com sucesso!");
    } catch (error) {
      console.error('Erro ao adicionar forma de pagamento:', error);
      toast.error("Erro ao adicionar forma de pagamento");
    }
  };

  const handleEditFormaPagamento = (forma: FormaPagamento) => {
    setEditingFormaPagamento(forma);
    setEditFormaPagamentoOpen(true);
  };

  const handleSaveFormaPagamento = async () => {
    if (!editingFormaPagamento) return;

    try {
      const formaAtualizada = await api.put(
        `formas-pagamento/${editingFormaPagamento.id}`,
        editingFormaPagamento
      );
      
      setFormasPagamento(
        formasPagamento.map((f) =>
          f.id === editingFormaPagamento.id ? formaAtualizada : f
        )
      );
      setEditFormaPagamentoOpen(false);
      setEditingFormaPagamento(null);
      toast.success("Forma de pagamento atualizada com sucesso!");
    } catch (error) {
      console.error('Erro ao atualizar forma de pagamento:', error);
      toast.error("Erro ao atualizar forma de pagamento");
    }
  };

  const handleDeleteFormaPagamento = async (id: string) => {
    try {
      // Verificar se há condições usando esta forma
      const condicoesVinculadas = condicoesPagamento.filter(
        (c) => c.formaPagamentoId === id
      );

      if (condicoesVinculadas.length > 0) {
        toast.error(
          `Não é possível excluir esta forma de pagamento pois existem ${condicoesVinculadas.length} condição(ões) de pagamento vinculada(s)`
        );
        return;
      }

      await api.delete(`formas-pagamento/${id}`);
      setFormasPagamento(formasPagamento.filter((f) => f.id !== id));
      toast.success("Forma de pagamento removida com sucesso!");
    } catch (error) {
      console.error('Erro ao remover forma de pagamento:', error);
      toast.error("Erro ao remover forma de pagamento");
    }
  };

  // Helper: Máscara de moeda para input (formato: R$ 1.234,56)
  const maskCurrencyInput = (value: string): string => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    
    // Converte para número e divide por 100 para ter centavos
    const amount = parseFloat(numbers) / 100;
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Helper: Converter valor formatado para número
  const unmaskCurrency = (value: string): number => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return 0;
    return parseFloat(numbers) / 100;
  };

  // Helper: Formatar prazo de pagamento com "/" automático após 2 dígitos
  const formatarPrazoInput = (value: string): string => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    if (!numbers) return '';
    
    // Adiciona "/" a cada 2 dígitos
    return numbers
      .split('')
      .reduce((acc, digit, index) => {
        if (index > 0 && index % 2 === 0) {
          return acc + '/' + digit;
        }
        return acc + digit;
      }, '');
  };

  // Helper: Processar prazo de pagamento (ex: "10/20/30" -> extrair parcelas e último valor)
  const processarPrazoPagamento = (prazoInput: string): { parcelas: number; ultimoPrazo: number } => {
    if (!prazoInput || prazoInput.trim() === '') {
      return { parcelas: 1, ultimoPrazo: 0 };
    }

    const valores = prazoInput
      .split('/')
      .map(v => v.trim())
      .filter(v => v !== '')
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v) && v >= 0);

    if (valores.length === 0) {
      return { parcelas: 1, ultimoPrazo: 0 };
    }

    return {
      parcelas: valores.length,
      ultimoPrazo: valores[valores.length - 1], // Último valor
    };
  };

  const gerarNomeCondicaoPagamento = (
    formaPagamentoId: string,
    prazoPagamento: string,
    descontoExtra: number
  ): string | null => {
    if (!formaPagamentoId || !prazoPagamento) return null;

    const formaPagamento = formasPagamento.find((f) => f.id === formaPagamentoId);
    if (!formaPagamento) return null;

    const { ultimoPrazo } = processarPrazoPagamento(prazoPagamento);
    const prazoTexto = ultimoPrazo === 0 ? 'À vista' : `${ultimoPrazo} dias`;
    const descontoTexto = descontoExtra > 0 ? `desc extra ${descontoExtra}%` : 'desc extra 0%';

    return `${formaPagamento.nome} - ${prazoTexto} - ${descontoTexto}`;
  };

  // Atualizar automaticamente o nome da condição quando os campos mudarem
  useEffect(() => {
    const nomeGerado = gerarNomeCondicaoPagamento(
      newCondicaoPagamento.formaPagamentoId,
      newCondicaoPagamento.prazoPagamento,
      newCondicaoPagamento.descontoExtra
    );
    if (nomeGerado) {
      setNewCondicaoPagamento((prev) => ({ ...prev, nome: nomeGerado }));
    }
  }, [
    newCondicaoPagamento.formaPagamentoId,
    newCondicaoPagamento.prazoPagamento,
    newCondicaoPagamento.descontoExtra,
    formasPagamento,
  ]);

  const handleAddCondicaoPagamento = async () => {
    if (!newCondicaoPagamento.formaPagamentoId) {
      toast.error("Selecione uma forma de pagamento");
      return;
    }

    if (!newCondicaoPagamento.prazoPagamento || newCondicaoPagamento.prazoPagamento.trim() === '') {
      toast.error("O prazo de pagamento é obrigatório");
      return;
    }

    try {
      const novaCondicao = await api.post('condicoes-pagamento', {
        action: 'create',
        formaPagamentoId: newCondicaoPagamento.formaPagamentoId,
        prazoPagamento: newCondicaoPagamento.prazoPagamento,
        descontoExtra: newCondicaoPagamento.descontoExtra,
        valorMinimo: newCondicaoPagamento.valorPedidoMinimo,
      });
      
      setCondicoesPagamento([...condicoesPagamento, novaCondicao]);
      setNewCondicaoPagamento({
        nome: "",
        formaPagamentoId: "",
        prazoPagamento: "",
        descontoExtra: 0,
        valorPedidoMinimo: 0,
      });
      setAddCondicaoPagamentoOpen(false);
      toast.success("Condição de pagamento adicionada com sucesso!");
    } catch (error) {
      console.error('Erro ao adicionar condição:', error);
      toast.error("Erro ao adicionar condição de pagamento");
    }
  };

  const handleDeleteCondicaoPagamento = async (id: string) => {
    try {
      await api.delete('condicoes-pagamento', id, {
        action: 'delete',
        id,
      });
      setCondicoesPagamento(condicoesPagamento.filter((c) => c.id !== id));
      toast.success("Condição de pagamento removida com sucesso!");
    } catch (error: any) {
      console.error('Erro ao remover condição:', error);
      toast.error(error.message || "Erro ao remover condição de pagamento");
    }
  };

  // Função para alternar expansão de seções
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Função para navegar
  const navigateTo = (pageId: string) => {
    setCurrentPage(pageId);
    setSidebarOpen(false); // Fechar sidebar no mobile
  };

  // Obter título da página atual
  const getCurrentPageTitle = () => {
    for (const section of navigationItems) {
      if (section.id === currentPage) return section.label;
      if (section.children) {
        const child = section.children.find(c => c.id === currentPage);
        if (child) return child.label;
      }
    }
    return "Configurações";
  };

  // Renderizar conteúdo da página
  const renderPageContent = () => {
    switch (currentPage) {
      case "empresas":
        return <CompanySettings />;
      
      case "naturezas":
        return <NaturezaOperacaoManagement />;

      case "segmentos":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Segmentos de Cliente</CardTitle>
                  <CardDescription>
                    Gerencie os segmentos de cliente do sistema
                  </CardDescription>
                </div>
                <Dialog open={addSegmentoOpen} onOpenChange={setAddSegmentoOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Segmento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Segmento de Cliente</DialogTitle>
                      <DialogDescription>
                        Adicione um novo segmento de cliente ao sistema
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="segmento-nome">Nome</Label>
                        <Input
                          id="segmento-nome"
                          value={newSegmento.nome}
                          onChange={(e) =>
                            setNewSegmento({ ...newSegmento, nome: e.target.value })
                          }
                          placeholder="Ex: VIP, Premium, Standard"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="segmento-descricao">Descrição</Label>
                        <Input
                          id="segmento-descricao"
                          value={newSegmento.descricao}
                          onChange={(e) =>
                            setNewSegmento({ ...newSegmento, descricao: e.target.value })
                          }
                          placeholder="Descrição do segmento"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddSegmentoOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddSegmento}>Adicionar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segmentosLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        Carregando segmentos...
                      </TableCell>
                    </TableRow>
                  ) : segmentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhum segmento de cliente cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    segmentos.map((segmento) => (
                      <TableRow key={segmento.id}>
                        <TableCell className="font-medium">{segmento.nome}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {segmento.descricao || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteConfirm({
                                open: true,
                                type: "segmento",
                                id: segmento.id,
                                name: segmento.nome,
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case "grupos-redes":
        return <GrupoRedeManagement />;

      case "formas-pagamento":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Formas de Pagamento</CardTitle>
                  <CardDescription>
                    Gerencie as formas de pagamento disponíveis
                  </CardDescription>
                </div>
                <Dialog open={addFormaPagamentoOpen} onOpenChange={setAddFormaPagamentoOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Forma
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Forma de Pagamento</DialogTitle>
                      <DialogDescription>
                        Adicione uma nova forma de pagamento ao sistema
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="forma-nome">Nome</Label>
                        <Input
                          id="forma-nome"
                          value={newFormaPagamento.nome}
                          onChange={(e) =>
                            setNewFormaPagamento({ ...newFormaPagamento, nome: e.target.value })
                          }
                          placeholder="Ex: Boleto, PIX, Cartão"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="forma-descricao">Descrição</Label>
                        <Input
                          id="forma-descricao"
                          value={newFormaPagamento.descricao}
                          onChange={(e) =>
                            setNewFormaPagamento({
                              ...newFormaPagamento,
                              descricao: e.target.value,
                            })
                          }
                          placeholder="Descrição da forma de pagamento"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="usar-conta-corrente">Usar em Conta Corrente</Label>
                          <Switch
                            id="usar-conta-corrente"
                            checked={newFormaPagamento.usarEmContaCorrente}
                            onCheckedChange={(checked) =>
                              setNewFormaPagamento({
                                ...newFormaPagamento,
                                usarEmContaCorrente: checked,
                              })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="usar-condicoes">Usar em Condições de Pagamento</Label>
                          <Switch
                            id="usar-condicoes"
                            checked={newFormaPagamento.usarEmCondicoesPagamento}
                            onCheckedChange={(checked) =>
                              setNewFormaPagamento({
                                ...newFormaPagamento,
                                usarEmCondicoesPagamento: checked,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddFormaPagamentoOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddFormaPagamento}>Adicionar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Conta Corrente</TableHead>
                    <TableHead>Condições</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formasPagamento.map((forma) => (
                    <TableRow key={forma.id}>
                      <TableCell className="font-medium">{forma.nome}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {forma.descricao}
                      </TableCell>
                      <TableCell>
                        {forma.usarEmContaCorrente ? (
                          <Badge variant="default">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Não
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {forma.usarEmCondicoesPagamento ? (
                          <Badge variant="default">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Não
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditFormaPagamento(forma)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteConfirm({
                                open: true,
                                type: "formaPagamento",
                                id: forma.id,
                                name: forma.nome,
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case "condicoes-pagamento":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Condições de Pagamento</CardTitle>
                  <CardDescription>
                    Gerencie as condições de pagamento disponíveis
                  </CardDescription>
                </div>
                <Dialog open={addCondicaoPagamentoOpen} onOpenChange={setAddCondicaoPagamentoOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Condição
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Nova Condição de Pagamento</DialogTitle>
                      <DialogDescription>
                        Adicione uma nova condição de pagamento ao sistema
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="condicao-forma">Forma de Pagamento</Label>
                          <select
                            id="condicao-forma"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={newCondicaoPagamento.formaPagamentoId}
                            onChange={(e) =>
                              setNewCondicaoPagamento({
                                ...newCondicaoPagamento,
                                formaPagamentoId: e.target.value,
                              })
                            }
                          >
                            <option value="">Selecione...</option>
                            {formasPagamento
                              .filter((f) => f.usarEmCondicoesPagamento)
                              .map((forma) => (
                                <option key={forma.id} value={forma.id}>
                                  {forma.nome}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="condicao-prazo">
                            Prazo de Pagamento
                            <span className="text-xs text-muted-foreground ml-2">
                              (Ex: 10/20/30/40)
                            </span>
                          </Label>
                          <Input
                            id="condicao-prazo"
                            value={newCondicaoPagamento.prazoPagamento}
                            onChange={(e) => {
                              // Remove tudo que não é dígito
                              const numbers = e.target.value.replace(/\D/g, '');
                              
                              // Formata automaticamente com "/" a cada 2 dígitos
                              const formatted = formatarPrazoInput(numbers);
                              
                              setNewCondicaoPagamento({
                                ...newCondicaoPagamento,
                                prazoPagamento: formatted,
                              });
                            }}
                            placeholder="10/20/30/40"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="condicao-desconto">Desconto Extra (%)</Label>
                          <Input
                            id="condicao-desconto"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={newCondicaoPagamento.descontoExtra}
                            onChange={(e) =>
                              setNewCondicaoPagamento({
                                ...newCondicaoPagamento,
                                descontoExtra: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="condicao-valor-minimo">Valor Mínimo do Pedido</Label>
                          <Input
                            id="condicao-valor-minimo"
                            value={newCondicaoPagamento.valorPedidoMinimo > 0 
                              ? `R$ ${maskCurrencyInput((Math.round(newCondicaoPagamento.valorPedidoMinimo * 100)).toString())}`
                              : ''
                            }
                            onChange={(e) => {
                              const numericValue = unmaskCurrency(e.target.value);
                              setNewCondicaoPagamento({
                                ...newCondicaoPagamento,
                                valorPedidoMinimo: numericValue,
                              });
                            }}
                            onBlur={(e) => {
                              // Garantir formatação ao sair do campo
                              const numericValue = unmaskCurrency(e.target.value);
                              setNewCondicaoPagamento({
                                ...newCondicaoPagamento,
                                valorPedidoMinimo: numericValue,
                              });
                            }}
                            placeholder="R$ 0,00"
                          />
                        </div>
                      </div>

                      {newCondicaoPagamento.nome && (
                        <div className="p-3 bg-muted rounded-lg">
                          <Label className="text-sm text-muted-foreground">Nome Gerado:</Label>
                          <p className="font-medium mt-1">{newCondicaoPagamento.nome}</p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setAddCondicaoPagamentoOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleAddCondicaoPagamento}>Adicionar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Valor Mínimo</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {condicoesPagamento.map((condicao) => {
                    return (
                      <TableRow key={condicao.id}>
                        <TableCell className="font-medium">{condicao.nome}</TableCell>
                        <TableCell>{condicao.formaPagamento || "N/A"}</TableCell>
                        <TableCell>
                          {condicao.prazo === 0 ? 'À vista' : `${condicao.prazo} dias`}
                        </TableCell>
                        <TableCell>
                          {condicao.parcelas}x
                        </TableCell>
                        <TableCell>
                          {condicao.descontoExtra > 0 ? (
                            <Badge variant="default">
                              <Percent className="h-3 w-3 mr-1" />
                              {condicao.descontoExtra}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {condicao.valorMinimo > 0 ? (
                            <span className="text-sm">
                              {condicao.valorMinimo.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteConfirm({
                                open: true,
                                type: "condicaoPagamento",
                                id: condicao.id,
                                name: condicao.nome,
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case "listas-preco":
        return (
          <PriceListManagement
            onNovaListaPreco={onNovaListaPreco}
            onEditarListaPreco={onEditarListaPreco}
            onVisualizarListaPreco={onVisualizarListaPreco}
            listas={listas}
            onListasChange={onListasChange}
          />
        );

      case "marcas":
        return <BrandManagement />;

      case "tipos-produto":
        return <ProductTypeManagement />;

      case "unidades":
        return <UnitManagement />;

      case "categorias-conta-corrente":
        return <CategoriaContaCorrenteManagement />;

      case "tipos-veiculo":
        return <TipoVeiculoManagement />;

      case "usuarios":
        return <UserManagement />;

      case "tiny-erp":
        return <ERPIntegrationUnified />;

      case "email":
        return <EmailIntegrationSettings />;

      case "status-mix":
        return <StatusMixSettings />;

      case "clientes-automacao":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Automação de Clientes
              </CardTitle>
              <CardDescription>
                Configure automações relacionadas ao cadastro de clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Código de Cliente */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium flex items-center gap-2 mb-3">
                    <Hash className="h-4 w-4" />
                    Código de Cliente
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure como os códigos de cliente serão gerados
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base">Código Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Gerar códigos automaticamente em ordem crescente
                    </p>
                  </div>
                  <Switch
                    checked={codigoClienteConfig.modo === 'automatico'}
                    onCheckedChange={(checked) => {
                      const novoModo = checked ? 'automatico' : 'manual';
                      const novaConfig = customerCodeService.alterarModo(novoModo, clientesMock);
                      setCodigoClienteConfig(novaConfig);
                      
                      if (checked) {
                        toast.success(`Código automático ativado. Próximo código: ${String(novaConfig.proximoCodigo).padStart(6, '0')}`);
                      } else {
                        toast.info('Código manual ativado. Você deverá informar o código ao cadastrar clientes.');
                      }
                    }}
                  />
                </div>

                {codigoClienteConfig.modo === 'automatico' && (
                  <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="proximoCodigo">Próximo Código</Label>
                      <div className="flex gap-2">
                        <Input
                          id="proximoCodigo"
                          type="number"
                          min="1"
                          value={codigoClienteConfig.proximoCodigo}
                          onChange={(e) => {
                            const novoCodigo = parseInt(e.target.value) || 1;
                            const novaConfig = customerCodeService.definirProximoCodigo(novoCodigo);
                            setCodigoClienteConfig(novaConfig);
                          }}
                          className="max-w-[200px]"
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            const novaConfig = customerCodeService.resetarCodigo(clientesMock);
                            setCodigoClienteConfig(novaConfig);
                            toast.success(`Próximo código resetado para: ${String(novaConfig.proximoCodigo).padStart(6, '0')}`);
                          }}
                        >
                          Resetar
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Código que será usado no próximo cliente cadastrado: <strong>{String(codigoClienteConfig.proximoCodigo).padStart(6, '0')}</strong>
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Informações</Label>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Maior código em uso:</span>
                          <p className="font-medium">{String(codigoClienteConfig.maiorCodigoExistente).padStart(6, '0')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total de clientes:</span>
                          <p className="font-medium">{clientesMock.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Inativação Automática */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4" />
                    Inativação Automática
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure regras para inativar clientes automaticamente
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base">Ativar Inativação Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Inativar automaticamente clientes sem compras no período
                    </p>
                  </div>
                  <Switch
                    checked={autoInactiveEnabled}
                    onCheckedChange={setAutoInactiveEnabled}
                  />
                </div>

                {autoInactiveEnabled && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <Label htmlFor="inactivePeriod">Período de inativação (dias)</Label>
                    <Input
                      id="inactivePeriod"
                      type="number"
                      min="30"
                      max="365"
                      value={inactivePeriod}
                      onChange={(e) => setInactivePeriod(e.target.value)}
                      className="max-w-[200px] mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Clientes sem compras há mais de {inactivePeriod} dias serão marcados como inativos
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case "importacao-dados":
        return <DataImportSettings />;

      case "ferramentas":
        return <DataMaintenanceTools />;

      case "debug-comissoes":
        return <ComissionDebugger />;

      case "debug-vendedores":
        return <VendedoresDebugger />;

      case "debug-vendas":
        return <VendaDebugger />;

      case "cnpj-test":
        return <CNPJTestTool />;

      default:
        return <CompanySettings />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-20 left-4 z-50"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "w-64 border-r bg-background flex-shrink-0 overflow-y-auto transition-all duration-300",
          "md:relative md:translate-x-0",
          sidebarOpen ? "fixed inset-y-0 left-0 z-40 translate-x-0" : "fixed -translate-x-full"
        )}
      >
        <nav className="p-4 space-y-1">
          {navigationItems.map((section) => (
            <div key={section.id}>
              {/* Section Header */}
              <button
                onClick={() => {
                  if (section.children) {
                    toggleSection(section.id);
                  } else {
                    navigateTo(section.id);
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  !section.children && currentPage === section.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <section.icon className="h-4 w-4" />
                  <span>{section.label}</span>
                </div>
                {section.children && (
                  expandedSections.includes(section.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )
                )}
              </button>

              {/* Children */}
              {section.children && expandedSections.includes(section.id) && (
                <div className="ml-4 mt-1 space-y-1">
                  {section.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => navigateTo(child.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        currentPage === child.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <child.icon className="h-4 w-4" />
                      <span>{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {renderPageContent()}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        onConfirm={() => {
          if (deleteConfirm.type === "natureza" && deleteConfirm.id) {
            handleDeleteNatureza(deleteConfirm.id);
          } else if (deleteConfirm.type === "segmento" && deleteConfirm.id) {
            handleDeleteSegmento(deleteConfirm.id);
          } else if (deleteConfirm.type === "formaPagamento" && deleteConfirm.id) {
            handleDeleteFormaPagamento(deleteConfirm.id);
          } else if (deleteConfirm.type === "condicaoPagamento" && deleteConfirm.id) {
            handleDeleteCondicaoPagamento(deleteConfirm.id);
          }
          setDeleteConfirm({ open: false, type: null, id: null, name: null });
        }}
        itemName={deleteConfirm.name || ""}
        itemType={
          deleteConfirm.type === "natureza"
            ? "natureza de operação"
            : deleteConfirm.type === "segmento"
            ? "segmento"
            : deleteConfirm.type === "formaPagamento"
            ? "forma de pagamento"
            : "condição de pagamento"
        }
      />

      {/* Edit Forma Pagamento Dialog */}
      <Dialog open={editFormaPagamentoOpen} onOpenChange={setEditFormaPagamentoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Forma de Pagamento</DialogTitle>
            <DialogDescription>
              Atualize as informações da forma de pagamento
            </DialogDescription>
          </DialogHeader>
          {editingFormaPagamento && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-forma-nome">Nome</Label>
                <Input
                  id="edit-forma-nome"
                  value={editingFormaPagamento.nome}
                  onChange={(e) =>
                    setEditingFormaPagamento({
                      ...editingFormaPagamento,
                      nome: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-forma-descricao">Descrição</Label>
                <Input
                  id="edit-forma-descricao"
                  value={editingFormaPagamento.descricao}
                  onChange={(e) =>
                    setEditingFormaPagamento({
                      ...editingFormaPagamento,
                      descricao: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-usar-conta-corrente">Usar em Conta Corrente</Label>
                  <Switch
                    id="edit-usar-conta-corrente"
                    checked={editingFormaPagamento.usarEmContaCorrente}
                    onCheckedChange={(checked) =>
                      setEditingFormaPagamento({
                        ...editingFormaPagamento,
                        usarEmContaCorrente: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-usar-condicoes">Usar em Condições de Pagamento</Label>
                  <Switch
                    id="edit-usar-condicoes"
                    checked={editingFormaPagamento.usarEmCondicoesPagamento}
                    onCheckedChange={(checked) =>
                      setEditingFormaPagamento({
                        ...editingFormaPagamento,
                        usarEmCondicoesPagamento: checked,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFormaPagamentoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFormaPagamento}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
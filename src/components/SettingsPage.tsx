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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
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
  UserCircle
} from "lucide-react";
import { api } from "../services/api";

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

export function SettingsPage({ 
  onNovaListaPreco, 
  onEditarListaPreco, 
  onVisualizarListaPreco,
  listas,
  onListasChange,
}: SettingsPageProps) {
  const [naturezas, setNaturezas] = useState<NaturezaOperacao[]>(initialNaturezas);
  const [segmentos, setSegmentos] = useState<SegmentoCliente[]>(initialSegmentos);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState<CondicaoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoInactiveEnabled, setAutoInactiveEnabled] = useState(true);
  const [inactivePeriod, setInactivePeriod] = useState("90");

  // Carregar dados do Supabase
  useEffect(() => {
    carregarDadosConfiguracao();
  }, []);

  const carregarDadosConfiguracao = async () => {
    try {
      console.log('[SETTINGS] Carregando dados de configuração...');
      const [formasAPI, condicoesAPI, segmentosAPI, naturezasAPI] = await Promise.all([
        api.get('formas-pagamento').catch(() => formasPagamentoMock),
        api.get('condicoes-pagamento').catch(() => condicoesPagamentoMock),
        api.get('segmentos-cliente').catch(() => []),
        api.get('naturezas-operacao').catch(() => []),
      ]);
      
      setFormasPagamento(formasAPI);
      setCondicoesPagamento(condicoesAPI);
      
      // Carregar segmentos do Supabase ou usar dados iniciais se vazio
      if (segmentosAPI && segmentosAPI.length > 0) {
        setSegmentos(segmentosAPI);
      } else {
        // Inicializar com dados padrão se não houver nada no Supabase
        setSegmentos(initialSegmentos);
      }
      
      // Carregar naturezas do Supabase ou usar dados iniciais se vazio
      if (naturezasAPI && naturezasAPI.length > 0) {
        setNaturezas(naturezasAPI);
      } else {
        // Inicializar com dados padrão se não houver nada no Supabase
        setNaturezas(initialNaturezas);
      }
      
      console.log('[SETTINGS] Dados carregados:', {
        formasPagamento: formasAPI.length,
        condicoesPagamento: condicoesAPI.length,
        segmentos: segmentosAPI?.length || 0,
        naturezas: naturezasAPI?.length || 0,
      });
    } catch (error) {
      console.error('[SETTINGS] Erro ao carregar dados:', error);
      setFormasPagamento(formasPagamentoMock);
      setCondicoesPagamento(condicoesPagamentoMock);
      setSegmentos(initialSegmentos);
      setNaturezas(initialNaturezas);
      toast.error('Erro ao carregar configurações. Usando dados de demonstração.');
    } finally {
      setLoading(false);
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

  const handleAddNatureza = async () => {
    if (newNatureza.nome.trim()) {
      const natureza: NaturezaOperacao = {
        id: `nat-${Date.now()}`,
        nome: newNatureza.nome,
        descricao: newNatureza.descricao
      };
      
      try {
        await api.create('naturezas-operacao', natureza);
        setNaturezas([...naturezas, natureza]);
        setNewNatureza({ nome: "", descricao: "" });
        setAddNaturezaOpen(false);
        toast.success(`Natureza de operação "${natureza.nome}" cadastrada com sucesso!`);
      } catch (error) {
        console.error('[SETTINGS] Erro ao salvar natureza de operação:', error);
        toast.error('Erro ao salvar natureza de operação');
      }
    } else {
      toast.error("Preencha o nome da natureza de operação");
    }
  };

  const handleAddSegmento = async () => {
    if (newSegmento.nome.trim()) {
      const segmento: SegmentoCliente = {
        id: `seg-${Date.now()}`,
        nome: newSegmento.nome,
        descricao: newSegmento.descricao
      };
      
      try {
        await api.create('segmentos-cliente', segmento);
        setSegmentos([...segmentos, segmento]);
        setNewSegmento({ nome: "", descricao: "" });
        setAddSegmentoOpen(false);
        toast.success(`Segmento de cliente "${segmento.nome}" cadastrado com sucesso!`);
      } catch (error) {
        console.error('[SETTINGS] Erro ao salvar segmento de cliente:', error);
        toast.error('Erro ao salvar segmento de cliente');
      }
    } else {
      toast.error("Preencha o nome do segmento de cliente");
    }
  };

  const handleDeleteNatureza = (id: string) => {
    const natureza = naturezas.find(n => n.id === id);
    if (natureza) {
      setDeleteConfirm({
        open: true,
        type: "natureza",
        id,
        name: natureza.nome,
      });
    }
  };

  const handleDeleteSegmento = (id: string) => {
    const segmento = segmentos.find(s => s.id === id);
    if (segmento) {
      setDeleteConfirm({
        open: true,
        type: "segmento",
        id,
        name: segmento.nome,
      });
    }
  };

  const handleAddFormaPagamento = async () => {
    if (newFormaPagamento.nome.trim()) {
      const formaPagamento: FormaPagamento = {
        id: `fp-${Date.now()}`,
        nome: newFormaPagamento.nome,
        descricao: newFormaPagamento.descricao,
        ativo: true,
        usarEmContaCorrente: newFormaPagamento.usarEmContaCorrente,
        usarEmCondicoesPagamento: newFormaPagamento.usarEmCondicoesPagamento,
        dataCriacao: new Date().toISOString(),
        dataAtualizacao: new Date().toISOString(),
      };
      
      try {
        await api.create('formas-pagamento', formaPagamento);
        setFormasPagamento([...formasPagamento, formaPagamento]);
        setNewFormaPagamento({
          nome: "",
          descricao: "",
          usarEmContaCorrente: true,
          usarEmCondicoesPagamento: true,
        });
        setAddFormaPagamentoOpen(false);
        toast.success(`Forma de pagamento "${formaPagamento.nome}" cadastrada com sucesso!`);
      } catch (error) {
        console.error('[SETTINGS] Erro ao salvar forma de pagamento:', error);
        toast.error('Erro ao salvar forma de pagamento');
      }
    } else {
      toast.error("Preencha o nome da forma de pagamento");
    }
  };

  const handleEditFormaPagamento = (forma: FormaPagamento) => {
    setEditingFormaPagamento(forma);
    setEditFormaPagamentoOpen(true);
  };

  const handleSaveEditFormaPagamento = () => {
    if (!editingFormaPagamento) return;

    if (!editingFormaPagamento.nome.trim()) {
      toast.error("Preencha o nome da forma de pagamento");
      return;
    }

    setFormasPagamento(
      formasPagamento.map((f) =>
        f.id === editingFormaPagamento.id
          ? { ...editingFormaPagamento, dataAtualizacao: new Date().toISOString() }
          : f
      )
    );
    setEditFormaPagamentoOpen(false);
    setEditingFormaPagamento(null);
    toast.success(`Forma de pagamento "${editingFormaPagamento.nome}" atualizada com sucesso!`);
  };

  const handleDeleteFormaPagamento = (id: string) => {
    const forma = formasPagamento.find(f => f.id === id);
    if (forma) {
      setDeleteConfirm({
        open: true,
        type: "formaPagamento",
        id,
        name: forma.nome,
      });
    }
  };

  const handleToggleAtivoFormaPagamento = (id: string) => {
    setFormasPagamento(
      formasPagamento.map((f) =>
        f.id === id
          ? { ...f, ativo: !f.ativo, dataAtualizacao: new Date().toISOString() }
          : f
      )
    );
  };

  const handleAddCondicaoPagamento = async () => {
    if (!newCondicaoPagamento.nome.trim()) {
      toast.error("Preencha o nome da condição de pagamento");
      return;
    }

    if (!newCondicaoPagamento.formaPagamentoId) {
      toast.error("Selecione uma forma de pagamento");
      return;
    }

    const validacao = validarPrazoPagamento(newCondicaoPagamento.prazoPagamento);
    if (!validacao.valido) {
      toast.error(validacao.erro || "Prazo de pagamento inválido");
      return;
    }

    if (newCondicaoPagamento.descontoExtra < 0 || newCondicaoPagamento.descontoExtra > 100) {
      toast.error("O desconto extra deve estar entre 0 e 100%");
      return;
    }

    if (newCondicaoPagamento.valorPedidoMinimo < 0) {
      toast.error("O valor de pedido mínimo não pode ser negativo");
      return;
    }

    const condicao: CondicaoPagamento = {
      id: `cp-${Date.now()}`,
      nome: newCondicaoPagamento.nome,
      formaPagamentoId: newCondicaoPagamento.formaPagamentoId,
      prazoPagamento: newCondicaoPagamento.prazoPagamento,
      descontoExtra: newCondicaoPagamento.descontoExtra,
      valorPedidoMinimo: newCondicaoPagamento.valorPedidoMinimo,
      ativo: true,
      dataCriacao: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString(),
    };

    try {
      await api.create('condicoes-pagamento', condicao);
      setCondicoesPagamento([...condicoesPagamento, condicao]);
      setNewCondicaoPagamento({
        nome: "",
        formaPagamentoId: "",
        prazoPagamento: "",
        descontoExtra: 0,
        valorPedidoMinimo: 0,
      });
      setAddCondicaoPagamentoOpen(false);
      toast.success(`Condição de pagamento "${condicao.nome}" cadastrada com sucesso!`);
    } catch (error) {
      console.error('[SETTINGS] Erro ao salvar condição de pagamento:', error);
      toast.error('Erro ao salvar condição de pagamento');
    }
  };

  const handleDeleteCondicaoPagamento = (id: string) => {
    const condicao = condicoesPagamento.find(c => c.id === id);
    if (condicao) {
      setDeleteConfirm({
        open: true,
        type: "condicaoPagamento",
        id,
        name: condicao.nome,
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id || !deleteConfirm.type) return;

    try {
      switch (deleteConfirm.type) {
        case "natureza":
          await api.delete('naturezas-operacao', deleteConfirm.id);
          setNaturezas(naturezas.filter(n => n.id !== deleteConfirm.id));
          toast.success(`Natureza de operação "${deleteConfirm.name}" removida`);
          break;
        case "segmento":
          await api.delete('segmentos-cliente', deleteConfirm.id);
          setSegmentos(segmentos.filter(s => s.id !== deleteConfirm.id));
          toast.success(`Segmento de cliente "${deleteConfirm.name}" removido`);
          break;
        case "formaPagamento":
          await api.delete('formas-pagamento', deleteConfirm.id);
          setFormasPagamento(formasPagamento.filter(f => f.id !== deleteConfirm.id));
          toast.success(`Forma de pagamento "${deleteConfirm.name}" removida`);
          break;
        case "condicaoPagamento":
          await api.delete('condicoes-pagamento', deleteConfirm.id);
          setCondicoesPagamento(condicoesPagamento.filter(c => c.id !== deleteConfirm.id));
          toast.success(`Condição de pagamento "${deleteConfirm.name}" removida`);
          break;
      }
    } catch (error) {
      console.error('[SETTINGS] Erro ao excluir:', error);
      toast.error(`Erro ao remover ${deleteConfirm.type}`);
    }

    setDeleteConfirm({ open: false, type: null, id: null, name: null });
  };

  const handleToggleAtivoCondicaoPagamento = (id: string) => {
    setCondicoesPagamento(
      condicoesPagamento.map((c) =>
        c.id === id
          ? { ...c, ativo: !c.ativo, dataAtualizacao: new Date().toISOString() }
          : c
      )
    );
  };

  // Filtrar formas de pagamento que podem ser usadas em condições de pagamento
  const formasPagamentoDisponiveis = formasPagamento.filter(
    (f) => f.ativo && f.usarEmCondicoesPagamento
  );

  // Função helper para obter nome da forma de pagamento
  const getNomeFormaPagamento = (formaPagamentoId: string): string => {
    const forma = formasPagamento.find(f => f.id === formaPagamentoId);
    return forma ? forma.nome : 'Forma não encontrada';
  };

  // Função para gerar nome automático da condição de pagamento
  const gerarNomeCondicaoPagamento = (formaPagamentoId: string, prazoPagamento: string, descontoExtra: number): string => {
    if (!formaPagamentoId || !prazoPagamento) return "";

    const forma = formasPagamento.find(f => f.id === formaPagamentoId);
    if (!forma) return "";

    const prazo = prazoPagamento.trim();
    const parcelas = prazo.split('/').filter(p => p.trim() !== '');
    
    let nomePrazo = "";
    if (prazo === "0") {
      nomePrazo = "À Vista";
    } else if (parcelas.length === 1) {
      nomePrazo = `${prazo} dias`;
    } else {
      nomePrazo = `${parcelas.length}x (${prazo.replace(/\//g, '/')} dias)`;
    }

    let nomeCompleto = `${nomePrazo} - ${forma.nome}`;

    if (descontoExtra > 0) {
      nomeCompleto += ` com ${descontoExtra}% desconto`;
    }

    return nomeCompleto;
  };

  const [mainMenu, setMainMenu] = useState("cadastros");

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

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-3xl">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as configurações gerais do sistema
        </p>
      </div>

      {/* Menu Principal */}
      <Tabs value={mainMenu} onValueChange={setMainMenu} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="cadastros">Cadastros</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          <TabsTrigger value="automacao">Automação</TabsTrigger>
          <TabsTrigger value="importacoes">Importações</TabsTrigger>
        </TabsList>

        {/* CADASTROS */}
        <TabsContent value="cadastros" className="space-y-4">
          <Tabs defaultValue="empresas" className="w-full">
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex w-auto min-w-full h-auto gap-1 p-1.5">
                <TabsTrigger value="empresas" className="whitespace-nowrap px-4 py-2.5">Empresas</TabsTrigger>
                <TabsTrigger value="clientes" className="whitespace-nowrap px-4 py-2.5">Clientes</TabsTrigger>
                <TabsTrigger value="naturezas" className="whitespace-nowrap px-4 py-2.5">Naturezas de Operação</TabsTrigger>
                <TabsTrigger value="segmentos" className="whitespace-nowrap px-4 py-2.5">Segmentos de Cliente</TabsTrigger>
                <TabsTrigger value="grupos-redes" className="whitespace-nowrap px-4 py-2.5">Grupos / Redes</TabsTrigger>
                <TabsTrigger value="formas-pagamento" className="whitespace-nowrap px-4 py-2.5">Formas de Pagamento</TabsTrigger>
                <TabsTrigger value="condicoes-pagamento" className="whitespace-nowrap px-4 py-2.5">Condições de Pagamento</TabsTrigger>
                <TabsTrigger value="listas-preco" className="whitespace-nowrap px-4 py-2.5">Listas de Preço</TabsTrigger>
                <TabsTrigger value="marcas" className="whitespace-nowrap px-4 py-2.5">Marcas</TabsTrigger>
                <TabsTrigger value="tipos-produto" className="whitespace-nowrap px-4 py-2.5">Tipos de Produto</TabsTrigger>
                <TabsTrigger value="unidades" className="whitespace-nowrap px-4 py-2.5">Unidades de Medida</TabsTrigger>
                <TabsTrigger value="categorias-conta-corrente" className="whitespace-nowrap px-4 py-2.5">Categorias de Conta Corrente</TabsTrigger>
                <TabsTrigger value="tipos-veiculo" className="whitespace-nowrap px-4 py-2.5">Tipos de Veículo</TabsTrigger>
              </TabsList>
            </div>

            {/* Empresas */}
            <TabsContent value="empresas" className="space-y-4">
              <CompanySettings />
            </TabsContent>

            {/* Clientes */}
            <TabsContent value="clientes" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        Código de Cliente
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Configure como os códigos de cliente serão gerados
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Modo de Geração */}
                  <div className="space-y-4">
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
                            toast.info('Código manual ativado. Você precisará informar o código ao cadastrar clientes.');
                          }
                        }}
                      />
                    </div>

                    {/* Informações do Modo Atual */}
                    {codigoClienteConfig.modo === 'automatico' ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">
                              Modo Automático Ativado
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Os códigos serão gerados automaticamente ao criar novos clientes.
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                              <Badge variant="outline" className="bg-background">
                                Próximo código: {String(codigoClienteConfig.proximoCodigo || 1).padStart(6, '0')}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Atribuir códigos a clientes existentes */}
                        <div className="flex items-start gap-3 p-4 border rounded-lg">
                          <UserCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1 space-y-2">
                            <p className="text-sm font-medium">
                              Clientes Existentes
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {(() => {
                                const clientesSemCodigo = clientesMock.filter(c => !c.codigo || c.codigo.trim() === '');
                                return clientesSemCodigo.length > 0
                                  ? `Existem ${clientesSemCodigo.length} cliente(s) sem código. Clique no botão abaixo para atribuir códigos automaticamente.`
                                  : 'Todos os clientes já possuem código atribuído.';
                              })()}
                            </p>
                            {(() => {
                              const clientesSemCodigo = clientesMock.filter(c => !c.codigo || c.codigo.trim() === '');
                              return clientesSemCodigo.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const clientesAtualizados = customerCodeService.atribuirCodigosAutomaticos(clientesMock);
                                    const novaConfig = customerCodeService.obterConfiguracao();
                                    setCodigoClienteConfig(novaConfig);
                                    toast.success(`Códigos atribuídos para ${clientesSemCodigo.length} cliente(s)!`);
                                  }}
                                >
                                  Atribuir Códigos Automaticamente
                                </Button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                        <Edit className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Modo Manual Ativado
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Você precisará informar manualmente o código ao cadastrar cada cliente.
                            O sistema validará se o código já está em uso.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Informações Adicionais */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Como Funciona</h4>
                    <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                      <li>
                        <strong>Modo Automático:</strong> Códigos de 6 dígitos gerados sequencialmente (ex: 000001, 000002, ...)
                      </li>
                      <li>
                        <strong>Modo Manual:</strong> Você define o código de cada cliente (validação de duplicidade)
                      </li>
                      <li>
                        Ao ativar o modo automático, o sistema busca o maior código existente e continua a partir dele
                      </li>
                      <li>
                        Códigos não podem ser alterados após o cadastro do cliente
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

        {/* Naturezas de Operação */}
        <TabsContent value="naturezas" className="space-y-4">
          <NaturezaOperacaoManagement />
        </TabsContent>

        {/* Segmentos de Cliente */}
        <TabsContent value="segmentos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Segmentos de Cliente
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Configure os segmentos disponíveis para classificar clientes
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
                      <DialogTitle>Adicionar Segmento de Cliente</DialogTitle>
                      <DialogDescription>
                        Cadastre um novo segmento para classificar seus clientes
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome do Segmento</Label>
                        <Input 
                          placeholder="Ex: VIP, Premium, Corporativo..."
                          value={newSegmento.nome}
                          onChange={(e) => setNewSegmento({ ...newSegmento, nome: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input 
                          placeholder="Descrição do segmento"
                          value={newSegmento.descricao}
                          onChange={(e) => setNewSegmento({ ...newSegmento, descricao: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setAddSegmentoOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddSegmento}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segmentos.map((segmento) => (
                      <TableRow key={segmento.id}>
                        <TableCell className="font-medium">{segmento.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{segmento.descricao}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSegmento(segmento.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Total: {segmentos.length} segmentos cadastrados
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grupos / Redes */}
        <TabsContent value="grupos-redes" className="space-y-4">
          <GrupoRedeManagement />
        </TabsContent>

        {/* Formas de Pagamento */}
        <TabsContent value="formas-pagamento" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Formas de Pagamento
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Configure as formas de pagamento disponíveis no sistema
                  </CardDescription>
                </div>
                <Dialog open={addFormaPagamentoOpen} onOpenChange={setAddFormaPagamentoOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Forma de Pagamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl" aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle>Adicionar Forma de Pagamento</DialogTitle>
                      <DialogDescription>
                        Cadastre uma nova forma de pagamento para uso no sistema
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="nomeFormaPagamento">Nome da Forma de Pagamento *</Label>
                        <Input 
                          id="nomeFormaPagamento"
                          placeholder="Ex: PIX, Cartão de Crédito, Boleto..."
                          value={newFormaPagamento.nome}
                          onChange={(e) => setNewFormaPagamento({ ...newFormaPagamento, nome: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="descricaoFormaPagamento">Descrição</Label>
                        <Input 
                          id="descricaoFormaPagamento"
                          placeholder="Breve descrição da forma de pagamento"
                          value={newFormaPagamento.descricao}
                          onChange={(e) => setNewFormaPagamento({ ...newFormaPagamento, descricao: e.target.value })}
                        />
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <Label>Usar esta forma de pagamento em:</Label>
                        
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="space-y-0.5">
                            <Label htmlFor="usarContaCorrente" className="cursor-pointer">
                              Conta Corrente
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Pagamentos de investimentos e ressarcimentos
                            </p>
                          </div>
                          <Switch
                            id="usarContaCorrente"
                            checked={newFormaPagamento.usarEmContaCorrente}
                            onCheckedChange={(checked) =>
                              setNewFormaPagamento({ ...newFormaPagamento, usarEmContaCorrente: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="space-y-0.5">
                            <Label htmlFor="usarCondicoesPagamento" className="cursor-pointer">
                              Condições de Pagamento
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Condições comerciais de vendas
                            </p>
                          </div>
                          <Switch
                            id="usarCondicoesPagamento"
                            checked={newFormaPagamento.usarEmCondicoesPagamento}
                            onCheckedChange={(checked) =>
                              setNewFormaPagamento({ ...newFormaPagamento, usarEmCondicoesPagamento: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddFormaPagamentoOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddFormaPagamento}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Conta Corrente</TableHead>
                      <TableHead className="text-center">Condições Pagto</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formasPagamento.map((forma) => (
                      <TableRow key={forma.id} className={!forma.ativo ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{forma.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{forma.descricao}</TableCell>
                        <TableCell className="text-center">
                          {forma.usarEmContaCorrente ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {forma.usarEmCondicoesPagamento ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleAtivoFormaPagamento(forma.id)}
                          >
                            <Badge variant={forma.ativo ? 'default' : 'secondary'}>
                              {forma.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditFormaPagamento(forma)}
                              title="Editar forma de pagamento"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteFormaPagamento(forma.id)}
                              title="Excluir forma de pagamento"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Total: {formasPagamento.length} formas cadastradas ({formasPagamento.filter(f => f.ativo).length} ativas)
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span>Disponível</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    <span>Não disponível</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dialog de Edição de Forma de Pagamento */}
          <Dialog open={editFormaPagamentoOpen} onOpenChange={setEditFormaPagamentoOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Forma de Pagamento</DialogTitle>
                <DialogDescription>
                  Altere as informações da forma de pagamento
                </DialogDescription>
              </DialogHeader>
              {editingFormaPagamento && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-nome">Nome da Forma de Pagamento *</Label>
                    <Input 
                      id="edit-nome"
                      placeholder="Ex: PIX, Boleto, Cartão de Crédito..."
                      value={editingFormaPagamento.nome}
                      onChange={(e) => setEditingFormaPagamento({ ...editingFormaPagamento, nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-descricao">Descrição</Label>
                    <Input 
                      id="edit-descricao"
                      placeholder="Descrição da forma de pagamento"
                      value={editingFormaPagamento.descricao || ""}
                      onChange={(e) => setEditingFormaPagamento({ ...editingFormaPagamento, descricao: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="edit-usarContaCorrente">Usar em Conta Corrente</Label>
                        <p className="text-xs text-muted-foreground">
                          Disponível para investimentos e ressarcimentos
                        </p>
                      </div>
                      <Switch
                        id="edit-usarContaCorrente"
                        checked={editingFormaPagamento.usarEmContaCorrente}
                        onCheckedChange={(checked) => setEditingFormaPagamento({ ...editingFormaPagamento, usarEmContaCorrente: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="edit-usarCondicoesPagamento">Usar em Condições de Pagamento</Label>
                        <p className="text-xs text-muted-foreground">
                          Disponível para cadastro de condições de pagamento
                        </p>
                      </div>
                      <Switch
                        id="edit-usarCondicoesPagamento"
                        checked={editingFormaPagamento.usarEmCondicoesPagamento}
                        onCheckedChange={(checked) => setEditingFormaPagamento({ ...editingFormaPagamento, usarEmCondicoesPagamento: checked })}
                      />
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditFormaPagamentoOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEditFormaPagamento}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Card Informativo */}
          <Card>
            <CardHeader>
              <CardTitle>Sobre as Formas de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge>Conta Corrente</Badge>
                <div>
                  <p className="text-sm">
                    Formas de pagamento disponíveis para registrar pagamentos de investimentos e ressarcimentos aos clientes.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge>Condições de Pagamento</Badge>
                <div>
                  <p className="text-sm">
                    Formas de pagamento usadas nas condições comerciais de vendas (cadastro de condições de pagamento).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-blue-600 mt-0.5">ℹ️</div>
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Dica</p>
                  <p className="text-blue-800 mt-1">
                    Uma forma de pagamento pode ser usada em ambos os contextos simultaneamente. Marque as opções conforme necessário.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Condições de Pagamento */}
        <TabsContent value="condicoes-pagamento" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Condições de Pagamento
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Configure as condições de pagamento disponíveis para as vendas
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
                      <DialogTitle>Adicionar Condição de Pagamento</DialogTitle>
                      <DialogDescription>
                        Cadastre uma nova condição de pagamento para uso nas vendas
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="nomeCondicao">Nome da Condição *</Label>
                          <Input 
                            id="nomeCondicao"
                            placeholder="O nome será gerado automaticamente"
                            value={newCondicaoPagamento.nome}
                            readOnly
                            disabled
                            className="bg-muted cursor-not-allowed"
                          />
                          <p className="text-xs text-muted-foreground">
                            O nome é gerado automaticamente com base nas opções selecionadas abaixo
                          </p>
                        </div>

                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="formaPagamento">Forma de Pagamento *</Label>
                          <select
                            id="formaPagamento"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={newCondicaoPagamento.formaPagamentoId}
                            onChange={(e) => setNewCondicaoPagamento({ ...newCondicaoPagamento, formaPagamentoId: e.target.value })}
                          >
                            <option value="">Selecione uma forma de pagamento</option>
                            {formasPagamentoDisponiveis.map((forma) => (
                              <option key={forma.id} value={forma.id}>
                                {forma.nome}
                              </option>
                            ))}
                          </select>
                          {formasPagamentoDisponiveis.length === 0 && (
                            <p className="text-sm text-amber-600">
                              Nenhuma forma de pagamento disponível. Cadastre formas de pagamento com a opção "Condições de Pagamento" habilitada.
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="prazoPagamento">Prazo de Pagamento (dias) *</Label>
                          <Input 
                            id="prazoPagamento"
                            placeholder="Ex: 30 ou 30/60/90"
                            value={newCondicaoPagamento.prazoPagamento}
                            onChange={(e) => setNewCondicaoPagamento({ ...newCondicaoPagamento, prazoPagamento: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Para parcelado, separe por barra. Ex: 30/60/90
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="descontoExtra">Desconto Extra (%)</Label>
                          <Input 
                            id="descontoExtra"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0"
                            value={newCondicaoPagamento.descontoExtra}
                            onChange={(e) => setNewCondicaoPagamento({ ...newCondicaoPagamento, descontoExtra: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Desconto sobre o subtotal de produtos
                          </p>
                        </div>

                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="valorMinimo">Valor de Pedido Mínimo (R$)</Label>
                          <Input 
                            id="valorMinimo"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={newCondicaoPagamento.valorPedidoMinimo}
                            onChange={(e) => setNewCondicaoPagamento({ ...newCondicaoPagamento, valorPedidoMinimo: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Valor mínimo que a compra deve ter para que esta condição possa ser escolhida
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-start gap-2">
                          <div className="text-blue-600 mt-0.5">ℹ️</div>
                          <div className="text-sm">
                            <p className="font-medium text-blue-900">Sobre prazos de pagamento</p>
                            <ul className="text-blue-800 mt-1 space-y-1 list-disc list-inside">
                              <li>À vista: digite <strong>0</strong></li>
                              <li>30 dias: digite <strong>30</strong></li>
                              <li>Parcelado 2x (30/60): digite <strong>30/60</strong></li>
                              <li>Parcelado 3x (30/60/90): digite <strong>30/60/90</strong></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddCondicaoPagamentoOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddCondicaoPagamento}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead className="text-center">Desconto</TableHead>
                      <TableHead className="text-right">Valor Mínimo</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {condicoesPagamento.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma condição de pagamento cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      condicoesPagamento.map((condicao) => (
                        <TableRow key={condicao.id} className={!condicao.ativo ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">{condicao.nome}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              {getNomeFormaPagamento(condicao.formaPagamentoId)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatarPrazoPagamento(condicao.prazoPagamento)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {condicao.descontoExtra > 0 ? (
                              <div className="flex items-center justify-center gap-1">
                                <Percent className="h-3 w-3 text-green-600" />
                                <span className="text-green-600">{condicao.descontoExtra}%</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {condicao.valorPedidoMinimo > 0 ? (
                              <div className="flex items-center justify-end gap-1">
                                <DollarSign className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {condicao.valorPedidoMinimo.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sem mínimo</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleAtivoCondicaoPagamento(condicao.id)}
                            >
                              <Badge variant={condicao.ativo ? 'default' : 'secondary'}>
                                {condicao.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCondicaoPagamento(condicao.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Total: {condicoesPagamento.length} condições cadastradas ({condicoesPagamento.filter(c => c.ativo).length} ativas)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card Informativo sobre Condições de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle>Como funcionam as Condições de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge>1</Badge>
                  <div>
                    <p className="font-medium">Associação com Cliente</p>
                    <p className="text-sm text-muted-foreground">
                      As condições de pagamento devem ser associadas aos clientes no cadastro de clientes.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge>2</Badge>
                  <div>
                    <p className="font-medium">Disponibilidade na Venda</p>
                    <p className="text-sm text-muted-foreground">
                      Na tela de venda, apenas as condições associadas ao cliente selecionado ficarão visíveis.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge>3</Badge>
                  <div>
                    <p className="font-medium">Validação de Valor Mínimo</p>
                    <p className="text-sm text-muted-foreground">
                      Condições só serão clicáveis se o valor total da venda for igual ou superior ao valor de pedido mínimo configurado.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge>4</Badge>
                  <div>
                    <p className="font-medium">Desconto Extra Automático</p>
                    <p className="text-sm text-muted-foreground">
                      Se a condição tiver desconto extra configurado, ele será aplicado automaticamente sobre o subtotal dos produtos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-2">
                  <div className="text-amber-600 mt-0.5">⚠️</div>
                  <div className="text-sm">
                    <p className="font-medium text-amber-900">Importante</p>
                    <p className="text-amber-800 mt-1">
                      Apenas formas de pagamento que estão com a opção <strong>"Condições de Pagamento"</strong> habilitada 
                      estarão disponíveis para criar novas condições.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-start gap-2">
                  <div className="text-green-600 mt-0.5">💡</div>
                  <div className="text-sm">
                    <p className="font-medium text-green-900">Exemplo Prático</p>
                    <p className="text-green-800 mt-1">
                      <strong>Condição:</strong> "À Vista - PIX com 5% desconto"<br />
                      <strong>Forma:</strong> PIX | <strong>Prazo:</strong> 0 dias | <strong>Desconto:</strong> 5% | <strong>Mínimo:</strong> R$ 0,00
                    </p>
                    <p className="text-green-800 mt-2">
                      Esta condição estará disponível para qualquer valor de venda e aplicará automaticamente 5% de desconto quando selecionada.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Listas de Preço */}
        <TabsContent value="listas-preco" className="space-y-4">
          <PriceListManagement 
            onNovaLista={onNovaListaPreco}
            onEditarLista={onEditarListaPreco}
            onVisualizarLista={onVisualizarListaPreco}
            listas={listas}
            onListasChange={onListasChange}
          />
        </TabsContent>

        {/* Marcas */}
        <TabsContent value="marcas" className="space-y-4">
          <BrandManagement />
        </TabsContent>

        {/* Tipos de Produto */}
        <TabsContent value="tipos-produto" className="space-y-4">
          <ProductTypeManagement />
        </TabsContent>

        {/* Unidades de Medida */}
        <TabsContent value="unidades" className="space-y-4">
          <UnitManagement />
        </TabsContent>

        {/* Categorias de Conta Corrente */}
        <TabsContent value="categorias-conta-corrente" className="space-y-4">
          <CategoriaContaCorrenteManagement />
        </TabsContent>

        {/* Tipos de Veículo */}
        <TabsContent value="tipos-veiculo" className="space-y-4">
          <TipoVeiculoManagement />
        </TabsContent>
          </Tabs>
        </TabsContent>

        {/* USUÁRIOS */}
        <TabsContent value="usuarios" className="space-y-4">
          <UserManagement />
        </TabsContent>

        {/* INTEGRAÇÕES */}
        <TabsContent value="integracoes" className="space-y-4">
          <Tabs defaultValue="erp" className="w-full">
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex w-auto min-w-full h-auto gap-1 p-1.5">
                <TabsTrigger value="erp" className="whitespace-nowrap px-4 py-2.5">Integrações ERP</TabsTrigger>
                <TabsTrigger value="email" className="whitespace-nowrap px-4 py-2.5">E-mail</TabsTrigger>
                <TabsTrigger value="testes" className="whitespace-nowrap px-4 py-2.5">Testes de API</TabsTrigger>
              </TabsList>
            </div>

        {/* Integrações ERP Unificado */}
        <TabsContent value="erp" className="space-y-4">
          <ERPIntegrationUnified />
        </TabsContent>

        {/* Integração de E-mail */}
        <TabsContent value="email" className="space-y-4">
          <EmailIntegrationSettings />
        </TabsContent>


        {/* Testes de API */}
        <TabsContent value="testes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Ferramentas de Teste
              </CardTitle>
              <CardDescription>
                Teste as integrações com APIs externas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CNPJTestTool />
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </TabsContent>

        {/* AUTOMAÇÃO */}
        <TabsContent value="automacao" className="space-y-4">
          <Tabs defaultValue="status-clientes" className="w-full">
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex w-auto min-w-full h-auto gap-1 p-1.5">
                <TabsTrigger value="status-clientes" className="whitespace-nowrap px-4 py-2.5">Status Clientes</TabsTrigger>
                <TabsTrigger value="status-mix" className="whitespace-nowrap px-4 py-2.5">Status Mix</TabsTrigger>
              </TabsList>
            </div>

        {/* Status Clientes */}
        <TabsContent value="status-clientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Automação de Status de Clientes
              </CardTitle>
              <CardDescription className="mt-2">
                Configure regras automáticas para alteração de status dos clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label>Alteração Automática para Inativo</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ativar alteração automática de status baseado no tempo sem compras
                  </p>
                </div>
                <Switch
                  checked={autoInactiveEnabled}
                  onCheckedChange={setAutoInactiveEnabled}
                />
              </div>

              {autoInactiveEnabled && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label>Período sem compras para se tornar inativo (dias)</Label>
                    <div className="flex gap-4 items-center">
                      <Input
                        type="number"
                        value={inactivePeriod}
                        onChange={(e) => setInactivePeriod(e.target.value)}
                        className="w-32"
                        min="1"
                      />
                      <span className="text-sm text-muted-foreground">dias</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Clientes que não realizarem compras por {inactivePeriod} dias ou mais serão automaticamente marcados como inativos.
                    </p>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                    <div className="text-amber-600 mt-0.5">⚠️</div>
                    <div className="text-sm">
                      <p className="font-medium text-amber-900">Atenção</p>
                      <p className="text-amber-800 mt-1">
                        Esta automação será executada diariamente. Clientes marcados como inativos podem ser reativados manualmente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Informações Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle>Regras de Automação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge>1</Badge>
                <div>
                  <p className="font-medium">Status Ativo</p>
                  <p className="text-sm text-muted-foreground">
                    Clientes recém-cadastrados recebem automaticamente o status "Ativo"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge>2</Badge>
                <div>
                  <p className="font-medium">Alteração para Inativo</p>
                  <p className="text-sm text-muted-foreground">
                    Baseado no período configurado sem compras (atualmente: {inactivePeriod} dias)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge>3</Badge>
                <div>
                  <p className="font-medium">Reativação Automática</p>
                  <p className="text-sm text-muted-foreground">
                    Clientes inativos que realizarem uma nova compra voltam automaticamente ao status "Ativo"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge>4</Badge>
                <div>
                  <p className="font-medium">Status Excluído</p>
                  <p className="text-sm text-muted-foreground">
                    Apenas alteração manual. Clientes excluídos não aparecem nas listagens padrão
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Mix */}
        <TabsContent value="status-mix" className="space-y-4">
          <StatusMixSettings />
        </TabsContent>
          </Tabs>
        </TabsContent>

        {/* IMPORTAÇÕES */}
        <TabsContent value="importacoes" className="space-y-4">
          <DataImportSettings />
        </TabsContent>
      </Tabs>

      {/* Dialog de Confirmação de Exclusão */}
      <DeleteConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm({ open, type: null, id: null, name: null })
        }
        onConfirm={confirmDelete}
        itemName={deleteConfirm.name || undefined}
        description={
          deleteConfirm.type === "condicaoPagamento"
            ? `Tem certeza que deseja excluir a condição de pagamento "${deleteConfirm.name}"? Clientes que possuem esta condição associada não serão mais capazes de utilizá-la nas vendas.`
            : undefined
        }
      />
    </div>
  );
}

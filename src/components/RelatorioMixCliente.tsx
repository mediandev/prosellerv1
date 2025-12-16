import { useState, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  CalendarIcon,
  Search,
  Download,
  Package,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ChevronsUpDown,
  Check,
  FileBarChart,
  AlertCircle,
  MoreVertical,
  Printer,
  FileSpreadsheet,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { api } from "../services/api";
import { Venda } from "../types/venda";
import { Cliente } from "../types/customer";
import { Produto } from "../types/produto";
import { StatusMix } from "../types/statusMix";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface ProdutoMix {
  produtoId: string;
  descricao: string;
  codigoSku: string;
  codigoEan?: string;
  codigoSkuCliente?: string; // Código SKU interno do cliente
  unidade: string;
  quantidadeTotal: number;
  statusMix: "ativo" | "inativo" | "sem_cadastro";
  dataUltimoPedido: string;
  numeroPedidos: number;
}

type TipoPeriodo = "dias" | "especifico";

interface RelatorioMixClienteProps {
  onNavigateBack?: () => void;
}

export function RelatorioMixCliente({ onNavigateBack }: RelatorioMixClienteProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("dias");
  const [numeroDias, setNumeroDias] = useState<number>(30); // Valor padrão
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [produtosMix, setProdutosMix] = useState<ProdutoMix[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [popoverWidth, setPopoverWidth] = useState<number>(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuExportOpen, setMenuExportOpen] = useState(false);

  // Capturar largura do trigger quando o popover abrir
  useEffect(() => {
    if (clientePopoverOpen && triggerRef.current) {
      setPopoverWidth(triggerRef.current.offsetWidth);
    }
  }, [clientePopoverOpen]);

  // Carregar clientes e configurações
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      // Carregar clientes
      console.log('[RELATORIO-MIX] Iniciando carregamento de clientes...');
      console.log('[RELATORIO-MIX] AuthToken:', localStorage.getItem('auth_token')?.substring(0, 30));
      const clientesAPI = await api.get("clientes");
      console.log('[RELATORIO-MIX] Clientes recebidos da API:', {
        quantidade: clientesAPI?.length || 0,
        clientes: clientesAPI,
      });
      
      if (!clientesAPI || clientesAPI.length === 0) {
        console.warn('[RELATORIO-MIX] ⚠️ Nenhum cliente retornado pela API!');
        console.warn('[RELATORIO-MIX] ⚠️ Verifique se você está autenticado e se há clientes cadastrados');
      }
      
      setClientes(clientesAPI);

      // Nota: O valor padrão de dias (30) já está definido no useState
      // Quando houver uma rota de configurações no backend, podemos buscar aqui:
      // const configAPI = await api.get("configuracoes");
      // if (configAPI && configAPI.diasPadraoRelatorioMix) {
      //   setNumeroDias(configAPI.diasPadraoRelatorioMix);
      // }
    } catch (error) {
      console.error("[RELATORIO-MIX] Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados iniciais");
    }
  };

  const gerarRelatorio = async () => {
    if (!clienteSelecionado) {
      toast.warning("Selecione um cliente para gerar o relatório");
      return;
    }

    if (tipoPeriodo === "especifico" && (!dateRange.from || !dateRange.to)) {
      toast.warning("Selecione o período inicial e final");
      return;
    }

    if (tipoPeriodo === "dias" && (!numeroDias || numeroDias <= 0)) {
      toast.warning("Informe um número válido de dias");
      return;
    }

    setLoading(true);

    try {
      console.log("[RELATORIO-MIX] Gerando relatório para cliente:", clienteSelecionado.id);

      // Calcular período
      let dataInicial: Date;
      let dataFinal: Date;

      if (tipoPeriodo === "dias") {
        dataFinal = new Date();
        dataFinal.setHours(23, 59, 59, 999);
        dataInicial = new Date();
        dataInicial.setDate(dataInicial.getDate() - numeroDias);
        dataInicial.setHours(0, 0, 0, 0);
      } else {
        dataInicial = new Date(dateRange.from!);
        dataInicial.setHours(0, 0, 0, 0);
        dataFinal = new Date(dateRange.to!);
        dataFinal.setHours(23, 59, 59, 999);
      }

      console.log("[RELATORIO-MIX] Período:", { dataInicial, dataFinal });

      // Buscar vendas do cliente no período
      const todasVendas = await api.get("vendas");
      const vendasCliente = todasVendas.filter((venda: Venda) => {
        if (venda.clienteId !== clienteSelecionado.id) return false;

        const dataVenda = new Date(venda.dataPedido);
        return dataVenda >= dataInicial && dataVenda <= dataFinal;
      });

      console.log("[RELATORIO-MIX] Vendas encontradas:", vendasCliente.length);

      if (vendasCliente.length === 0) {
        toast.info("Nenhuma venda encontrada para o cliente no período selecionado");
        setProdutosMix([]);
        setLoading(false);
        return;
      }

      // Buscar status mix do cliente específico
      let statusMixCliente = [];
      try {
        statusMixCliente = await api.get(`status-mix/${clienteSelecionado.id}`);
        console.log("[RELATORIO-MIX] Status mix encontrados:", statusMixCliente.length);
      } catch (error: any) {
        // Se não houver status mix cadastrado para o cliente, continua normalmente
        if (error.message.includes("404")) {
          console.log("[RELATORIO-MIX] Cliente sem status mix cadastrado");
          statusMixCliente = [];
        } else {
          throw error; // Repassar outros erros
        }
      }

      // Agrupar produtos por ID
      const mapaProdutos = new Map<string, {
        produtoId: string;
        descricao: string;
        codigoSku: string;
        codigoEan?: string;
        unidade: string;
        quantidadeTotal: number;
        dataUltimoPedido: string;
        numeroPedidos: number;
      }>();

      vendasCliente.forEach((venda: Venda) => {
        venda.itens.forEach((item) => {
          const existing = mapaProdutos.get(item.produtoId);
          
          if (existing) {
            existing.quantidadeTotal += item.quantidade;
            existing.numeroPedidos += 1;
            
            // Atualizar data do último pedido se for mais recente
            const dataVendaAtual = new Date(venda.dataPedido);
            const dataUltimoPedidoExisting = new Date(existing.dataUltimoPedido);
            if (dataVendaAtual > dataUltimoPedidoExisting) {
              existing.dataUltimoPedido = venda.dataPedido;
            }
          } else {
            mapaProdutos.set(item.produtoId, {
              produtoId: item.produtoId,
              descricao: item.descricaoProduto,
              codigoSku: item.codigoSku,
              codigoEan: item.codigoEan,
              unidade: item.unidade,
              quantidadeTotal: item.quantidade,
              dataUltimoPedido: venda.dataPedido,
              numeroPedidos: 1,
            });
          }
        });
      });

      // Adicionar status do mix e código SKU cliente
      const produtosComStatus: ProdutoMix[] = Array.from(mapaProdutos.values()).map(
        (produto) => {
          const statusMix = statusMixCliente.find(
            (sm: StatusMix) => sm.produtoId === produto.produtoId
          );

          let statusFinal: "ativo" | "inativo" | "sem_cadastro" = "sem_cadastro";
          let codigoSkuCliente: string | undefined = undefined;
          
          if (statusMix) {
            statusFinal = statusMix.status === "ativo" ? "ativo" : "inativo";
            codigoSkuCliente = statusMix.codigoSkuCliente;
          }

          return {
            ...produto,
            statusMix: statusFinal,
            codigoSkuCliente,
          };
        }
      );

      // Ordenar por quantidade (maior primeiro)
      produtosComStatus.sort((a, b) => b.quantidadeTotal - a.quantidadeTotal);

      setProdutosMix(produtosComStatus);
      toast.success(
        `Relatório gerado com sucesso! ${produtosComStatus.length} produto(s) encontrado(s)`
      );
    } catch (error: any) {
      console.error("[RELATORIO-MIX] Erro ao gerar relatório:", error);
      toast.error(`Erro ao gerar relatório: ${error.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar produtos
  const produtosFiltrados = useMemo(() => {
    return produtosMix.filter((produto) => {
      const matchesSearch =
        produto.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produto.codigoSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (produto.codigoEan && produto.codigoEan.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" || produto.statusMix === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [produtosMix, searchTerm, statusFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    return {
      totalProdutos: produtosMix.length,
      totalQuantidade: produtosMix.reduce((sum, p) => sum + p.quantidadeTotal, 0),
      produtosAtivos: produtosMix.filter((p) => p.statusMix === "ativo").length,
      produtosInativos: produtosMix.filter((p) => p.statusMix === "inativo").length,
      produtosSemCadastro: produtosMix.filter((p) => p.statusMix === "sem_cadastro").length,
    };
  }, [produtosMix]);

  const handleDateSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range) {
      setDateRange(range);
      // Não fechar automaticamente para permitir que o usuário ajuste as datas
      // O usuário pode fechar clicando fora ou no botão novamente
    }
  };

  const formatDateRange = () => {
    if (!dateRange.from || !dateRange.to) return "Selecionar perodo";
    return `${format(dateRange.from, "dd/MM/yy", { locale: ptBR })} - ${format(
      dateRange.to,
      "dd/MM/yy",
      { locale: ptBR }
    )}`;
  };

  const exportarRelatorio = () => {
    if (produtosMix.length === 0) {
      toast.warning("Não há dados para exportar");
      return;
    }

    try {
      // Criar CSV
      const headers = [
        "Código SKU",
        "Código EAN",
        "SKU Cliente",
        "Descrição",
        "Unidade",
        "Quantidade Total",
        "Nº Pedidos",
        "Último Pedido",
        "Status Mix",
      ];

      const rows = produtosMix.map((produto) => [
        produto.codigoSku,
        produto.codigoEan || "-",
        produto.codigoSkuCliente || "-",
        produto.descricao,
        produto.unidade,
        produto.quantidadeTotal.toString(),
        produto.numeroPedidos.toString(),
        format(new Date(produto.dataUltimoPedido), "dd/MM/yyyy", { locale: ptBR }),
        produto.statusMix === "ativo" ? "Ativo" : produto.statusMix === "inativo" ? "Inativo" : "Sem Cadastro",
      ]);

      const csvContent = [
        headers.join(";"),
        ...rows.map((row) => row.join(";")),
      ].join("\n");

      // Download
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `relatorio-mix-${clienteSelecionado?.codigo || "cliente"}-${format(
          new Date(),
          "yyyyMMdd-HHmmss"
        )}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("[RELATORIO-MIX] Erro ao exportar:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  const exportarExcel = () => {
    if (produtosMix.length === 0) {
      toast.warning("Não há dados para exportar");
      return;
    }

    try {
      // Criar conteúdo para Excel (usando formato TSV com extensão .xls)
      const headers = [
        "Código SKU",
        "Código EAN",
        "SKU Cliente",
        "Descrição",
        "Unidade",
        "Quantidade Total",
        "Nº Pedidos",
        "Último Pedido",
        "Status Mix",
      ];

      const rows = produtosMix.map((produto) => [
        produto.codigoSku,
        produto.codigoEan || "-",
        produto.codigoSkuCliente || "-",
        produto.descricao,
        produto.unidade,
        produto.quantidadeTotal.toString(),
        produto.numeroPedidos.toString(),
        format(new Date(produto.dataUltimoPedido), "dd/MM/yyyy", { locale: ptBR }),
        produto.statusMix === "ativo" ? "Ativo" : produto.statusMix === "inativo" ? "Inativo" : "Sem Cadastro",
      ]);

      const excelContent = [
        headers.join("\t"),
        ...rows.map((row) => row.join("\t")),
      ].join("\n");

      // Download
      const blob = new Blob(["\ufeff" + excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `relatorio-mix-${clienteSelecionado?.codigo || "cliente"}-${format(
          new Date(),
          "yyyyMMdd-HHmmss"
        )}.xls`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório exportado para Excel com sucesso!");
      setMenuExportOpen(false);
    } catch (error) {
      console.error("[RELATORIO-MIX] Erro ao exportar Excel:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  const exportarPDF = () => {
    if (produtosMix.length === 0) {
      toast.warning("Não há dados para exportar");
      return;
    }

    try {
      // Criar HTML para impressão em PDF
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório Mix de Produtos - ${clienteSelecionado?.codigo || "Cliente"}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 5px; }
            h2 { font-size: 14px; margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
            .badge-ativo { background-color: #d4edda; color: #155724; }
            .badge-inativo { background-color: #e2e3e5; color: #383d41; }
            .badge-sem { background-color: #fff3cd; color: #856404; }
            .info { margin-bottom: 20px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>Relatório Mix de Produtos por Cliente</h1>
          <h2>Relação de produtos e quantidades no período selecionado</h2>
          
          <div class="info">
            <strong>Cliente:</strong> ${clienteSelecionado?.nomeFantasia || clienteSelecionado?.razaoSocial} (Código: ${clienteSelecionado?.codigo})<br>
            <strong>Período:</strong> ${tipoPeriodo === "dias" ? `Últimos ${numeroDias} dias` : formatDateRange()}<br>
            <strong>Data/Hora:</strong> ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Código SKU</th>
                <th>Código EAN</th>
                <th>Descrição</th>
                <th>Unidade</th>
                <th class="text-right">Quantidade Total</th>
                <th class="text-center">Nº Pedidos</th>
                <th>Último Pedido</th>
                <th>Status Mix</th>
              </tr>
            </thead>
            <tbody>
              ${produtosMix.map((produto) => `
                <tr>
                  <td>${produto.codigoSku}</td>
                  <td>${produto.codigoEan || "-"}</td>
                  <td>${produto.descricao}</td>
                  <td>${produto.unidade}</td>
                  <td class="text-right">${produto.quantidadeTotal.toLocaleString("pt-BR")}</td>
                  <td class="text-center">${produto.numeroPedidos}</td>
                  <td>${format(new Date(produto.dataUltimoPedido), "dd/MM/yyyy", { locale: ptBR })}</td>
                  <td>
                    <span class="badge badge-${produto.statusMix === "ativo" ? "ativo" : produto.statusMix === "inativo" ? "inativo" : "sem"}">
                      ${produto.statusMix === "ativo" ? "Ativo" : produto.statusMix === "inativo" ? "Inativo" : "Sem Cadastro"}
                    </span>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          
          <div style="margin-top: 20px; font-size: 12px; color: #666;">
            Total de produtos: ${produtosMix.length} | 
            Quantidade total: ${stats.totalQuantidade.toLocaleString("pt-BR")} unidades
          </div>
        </body>
        </html>
      `;

      // Criar janela para impressão
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();

        // Aguardar carregamento e imprimir
        printWindow.onload = () => {
          printWindow.print();
        };

        toast.success("Abrindo visualização para PDF...");
        setMenuExportOpen(false);
      } else {
        toast.error("Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.");
      }
    } catch (error) {
      console.error("[RELATORIO-MIX] Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  const imprimirRelatorio = () => {
    if (produtosMix.length === 0) {
      toast.warning("Não há dados para imprimir");
      return;
    }

    try {
      // Usar a mesma função de PDF para impressão
      exportarPDF();
    } catch (error) {
      console.error("[RELATORIO-MIX] Erro ao imprimir:", error);
      toast.error("Erro ao imprimir relatório");
    }
  };

  const statusConfig = {
    ativo: { label: "Ativo", variant: "default" as const, color: "text-green-500", icon: CheckCircle2 },
    inativo: { label: "Inativo", variant: "secondary" as const, color: "text-gray-500", icon: XCircle },
    sem_cadastro: { label: "Sem Cadastro", variant: "outline" as const, color: "text-yellow-500", icon: AlertCircle },
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        {onNavigateBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNavigateBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1>Relatório Mix de Produtos por Cliente</h1>
          <p className="text-muted-foreground">
            Analise quais produtos de sua empresa foram comprados por cada cliente em um determinado período
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
          <CardDescription>Selecione o cliente e o período para análise</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seleção de Cliente - Linha 1 */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientePopoverOpen}
                  className="w-full justify-between"
                  ref={triggerRef}
                >
                  {clienteSelecionado
                    ? `${clienteSelecionado.codigo} - ${clienteSelecionado.nomeFantasia || clienteSelecionado.razaoSocial}`
                    : "Selecione o cliente..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start" style={{ width: popoverWidth }}>
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {clientes.map((cliente) => (
                        <CommandItem
                          key={cliente.id}
                          value={`${cliente.codigo} ${cliente.razaoSocial} ${cliente.nomeFantasia} ${cliente.cpfCnpj}`}
                          onSelect={() => {
                            setClienteSelecionado(cliente);
                            setClientePopoverOpen(false);
                            setProdutosMix([]); // Limpar relatório anterior
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              clienteSelecionado?.id === cliente.id
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          <div className="flex flex-col">
                            <span>
                              {cliente.codigo} - {cliente.nomeFantasia || cliente.razaoSocial}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              CNPJ: {cliente.cpfCnpj}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Tipo de Período e Número de Dias/Período - Linha 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de Período */}
            <div className="space-y-2">
              <Label>Tipo de Período</Label>
              <Select
                value={tipoPeriodo}
                onValueChange={(value) => {
                  setTipoPeriodo(value as TipoPeriodo);
                  setProdutosMix([]); // Limpar relatório
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dias">Quantidade de Dias</SelectItem>
                  <SelectItem value="especifico">Período específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo condicional baseado no tipo de período */}
            {tipoPeriodo === "dias" ? (
              <div className="space-y-2">
                <Label>Número de Dias</Label>
                <Input
                  type="number"
                  min="1"
                  value={numeroDias}
                  onChange={(e) => setNumeroDias(parseInt(e.target.value) || 0)}
                  placeholder="Ex: 30"
                />
                <p className="text-xs text-muted-foreground">
                  Últimos {numeroDias} dia(s) a partir de hoje
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Período</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {dateRange.from && dateRange.to ? formatDateRange() : "Selecionar período"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={handleDateSelect}
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Botão Gerar Relatório */}
          <div className="flex justify-end">
            <Button onClick={gerarRelatorio} disabled={loading}>
              {loading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-foreground" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileBarChart className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {produtosMix.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Total de Produtos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProdutos}</div>
                <p className="text-xs text-muted-foreground mt-1">produtos diferentes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Quantidade Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalQuantidade}</div>
                <p className="text-xs text-muted-foreground mt-1">unidades compradas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Mix Ativo</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.produtosAtivos}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalProdutos > 0
                    ? Math.round((stats.produtosAtivos / stats.totalProdutos) * 100)
                    : 0}
                  % do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Mix Inativo</CardTitle>
                <XCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.produtosInativos}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalProdutos > 0
                    ? Math.round((stats.produtosInativos / stats.totalProdutos) * 100)
                    : 0}
                  % do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Sem Cadastro</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.produtosSemCadastro}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalProdutos > 0
                    ? Math.round((stats.produtosSemCadastro / stats.totalProdutos) * 100)
                    : 0}
                  % do total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alerta de informação */}
          {clienteSelecionado && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cliente Selecionado</AlertTitle>
              <AlertDescription>
                Relatório gerado para <strong>{clienteSelecionado.nomeFantasia || clienteSelecionado.razaoSocial}</strong> (Código: {clienteSelecionado.codigo})
                {tipoPeriodo === "dias" ? (
                  <> - Últimos {numeroDias} dias</>
                ) : (
                  <> - Período: {formatDateRange()}</>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Tabela de Produtos */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Produtos Comprados</CardTitle>
                  <CardDescription>
                    Relação de produtos e quantidades no período selecionado
                  </CardDescription>
                </div>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMenuExportOpen(!menuExportOpen)}
                    className="w-full"
                  >
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                  {menuExportOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuExportOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 rounded-md bg-white border border-gray-200 shadow-lg z-20">
                        <div className="py-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              imprimirRelatorio();
                              setMenuExportOpen(false);
                            }}
                            className="w-full justify-start"
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimir
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              exportarPDF();
                              setMenuExportOpen(false);
                            }}
                            className="w-full justify-start"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Exportar PDF
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              exportarExcel();
                              setMenuExportOpen(false);
                            }}
                            className="w-full justify-start"
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Exportar Excel
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              exportarRelatorio();
                              setMenuExportOpen(false);
                            }}
                            className="w-full justify-start"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Exportar CSV
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros da Tabela */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="ativo">Mix Ativo</SelectItem>
                    <SelectItem value="inativo">Mix Inativo</SelectItem>
                    <SelectItem value="sem_cadastro">Sem Cadastro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabela */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código SKU</TableHead>
                      <TableHead>Código EAN</TableHead>
                      <TableHead>SKU Cliente</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Quantidade Total</TableHead>
                      <TableHead className="text-center">Nº Pedidos</TableHead>
                      <TableHead>Último Pedido</TableHead>
                      <TableHead>Status Mix</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhum produto encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      produtosFiltrados.map((produto) => {
                        const StatusIcon = statusConfig[produto.statusMix].icon;
                        return (
                          <TableRow key={produto.produtoId}>
                            <TableCell className="font-medium">{produto.codigoSku}</TableCell>
                            <TableCell>{produto.codigoEan || "-"}</TableCell>
                            <TableCell>
                              {produto.codigoSkuCliente ? (
                                <Badge variant="outline" className="text-xs">
                                  {produto.codigoSkuCliente}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{produto.descricao}</TableCell>
                            <TableCell>{produto.unidade}</TableCell>
                            <TableCell className="text-right font-medium">
                              {produto.quantidadeTotal.toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{produto.numeroPedidos}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(produto.dataUltimoPedido), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusIcon
                                  className={`h-4 w-4 ${statusConfig[produto.statusMix].color}`}
                                />
                                <Badge variant={statusConfig[produto.statusMix].variant}>
                                  {statusConfig[produto.statusMix].label}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totalizador */}
              {produtosFiltrados.length > 0 && (
                <div className="flex justify-end">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {produtosFiltrados.length} de {produtosMix.length} produto(s)
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Estado vazio - antes de gerar relatório */}
      {produtosMix.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileBarChart className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum relatório gerado</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Selecione um cliente e o período desejado, depois clique em "Gerar Relatório" para visualizar os produtos comprados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
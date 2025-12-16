import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { 
  ArrowLeft,
  Download,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wallet,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  User,
  MoreVertical,
  Plus,
  Mail,
  Edit,
  Eye
} from "lucide-react";
import { RelatorioPeriodoComissoes, RelatorioComissoesCompleto, LancamentoManual, PagamentoPeriodo, ComissaoVenda } from "../types/comissao";
import { toast } from "sonner@2.0.3";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CommissionReportPageProps {
  relatorio: RelatorioPeriodoComissoes;
  relatorioCompleto?: RelatorioComissoesCompleto; // Opcional para compatibilidade
  onVoltar: () => void;
  onAtualizarRelatorio?: (relatorioAtualizado: RelatorioPeriodoComissoes) => void;
}

export function CommissionReportPage({ relatorio, relatorioCompleto, onVoltar, onAtualizarRelatorio }: CommissionReportPageProps) {
  const [dialogLancamento, setDialogLancamento] = useState(false);
  const [dialogPagamento, setDialogPagamento] = useState(false);
  const [dialogVenda, setDialogVenda] = useState(false);
  const [dialogEmail, setDialogEmail] = useState(false);
  const [emailDestino, setEmailDestino] = useState("");
  
  // Estados para visualização/edição
  const [modoLancamento, setModoLancamento] = useState<'novo' | 'visualizar' | 'editar'>('novo');
  const [modoPagamento, setModoPagamento] = useState<'novo' | 'visualizar' | 'editar'>('novo');
  const [modoVenda, setModoVenda] = useState<'visualizar' | 'editar'>('visualizar');
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<LancamentoManual | null>(null);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<PagamentoPeriodo | null>(null);
  const [vendaSelecionada, setVendaSelecionada] = useState<ComissaoVenda | null>(null);
  
  // Dados do relatório completo vêm das props
  const vendedor = relatorioCompleto?.vendedor;
  const vendas = relatorioCompleto?.vendas || [];
  const lancamentos = relatorioCompleto?.lancamentos || [];
  const pagamentosRelatorio = relatorioCompleto?.pagamentos || [];
  
  const lancamentosCredito = lancamentos.filter((l: any) => l.tipo === 'credito');
  const lancamentosDebito = lancamentos.filter((l: any) => l.tipo === 'debito');
  
  const totalVendas = vendas.reduce((sum: number, v: any) => sum + v.valorTotalVenda, 0);
  const quantidadeVendas = vendas.length;
  const totalComissoes = vendas.reduce((sum: number, v: any) => sum + v.valorComissao, 0);
  const totalCreditos = lancamentosCredito.reduce((sum: number, l: any) => sum + l.valor, 0);
  const totalDebitos = lancamentosDebito.reduce((sum: number, l: any) => sum + l.valor, 0);
  
  // Usar dados do relatorioCompleto se fornecido, senão usar calculados
  const dadosRelatorio = relatorioCompleto || {
    relatorio,
    vendedorNome: vendedor?.nome || relatorio.vendedorId,
    vendedorEmail: vendedor?.email || "",
    vendedorIniciais: vendedor?.iniciais || "",
    vendas,
    lancamentosCredito,
    lancamentosDebito,
    pagamentos: pagamentosRelatorio,
    totalVendas,
    quantidadeVendas,
    totalComissoes,
    totalCreditos,
    totalDebitos
  };
  
  // Formulário de lançamento manual
  const [formLancamento, setFormLancamento] = useState({
    tipo: "credito" as "credito" | "debito",
    valor: "",
    descricao: "",
    data: format(new Date(), "yyyy-MM-dd"),
    periodo: relatorio.periodo
  });

  // Formulário de pagamento
  const [formPagamento, setFormPagamento] = useState({
    valor: "",
    formaPagamento: "",
    comprovante: "",
    observacoes: "",
    data: format(new Date(), "yyyy-MM-dd"),
    periodo: relatorio.periodo
  });
  
  // Formulário de venda (para visualização/edição)
  const [formVenda, setFormVenda] = useState({
    periodo: relatorio.periodo,
    observacoes: ""
  });
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, label: string }> = {
      aberto: { variant: "secondary", icon: Clock, label: "Aberto" },
      fechado: { variant: "outline", icon: AlertCircle, label: "Fechado" },
      pago: { variant: "default", icon: CheckCircle2, label: "Pago" }
    };
    
    const config = variants[status] || variants.aberto;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatPeriodo = (periodo: string) => {
    const [ano, mes] = periodo.split('-');
    if (mes) {
      const data = new Date(parseInt(ano), parseInt(mes) - 1);
      return format(data, "MMMM/yyyy", { locale: ptBR });
    }
    return ano;
  };

  const formatPeriodoInput = (periodo: string) => {
    const [ano, mes] = periodo.split('-');
    if (mes) {
      return `${mes}/${ano}`;
    }
    return '';
  };

  const parsePeriodoInput = (input: string) => {
    const parts = input.split('/');
    if (parts.length === 2) {
      const mes = parts[0].padStart(2, '0');
      const ano = parts[1];
      if (mes.length === 2 && ano.length === 4) {
        return `${ano}-${mes}`;
      }
    }
    return '';
  };

  const handleExportarPDF = () => {
    const fileName = `relatorio-comissoes-${relatorio.vendedorId}-${relatorio.periodo}.pdf`;
    
    toast.promise(
      new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            let yPos = 20;
            
            // Título
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('RELATORIO DE COMISSOES', pageWidth / 2, yPos, { align: 'center' });
            yPos += 10;
            
            // Linha divisória 1
            doc.setDrawColor(200, 200, 200);
            doc.line(15, yPos, pageWidth - 15, yPos);
            yPos += 8;
            
            // Informações do Vendedor
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('INFORMACOES DO VENDEDOR', 15, yPos);
            yPos += 8;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Vendedor: ' + dadosRelatorio.vendedorNome, 15, yPos);
            yPos += 6;
            doc.text('ID: ' + relatorio.vendedorId, 15, yPos);
            yPos += 6;
            doc.text('Periodo: ' + formatPeriodo(relatorio.periodo), 15, yPos);
            yPos += 6;
            doc.text('Status: ' + relatorio.status.toUpperCase(), 15, yPos);
            yPos += 8;
            
            // Linha divisória 2
            doc.setDrawColor(200, 200, 200);
            doc.line(15, yPos, pageWidth - 15, yPos);
            yPos += 8;
            
            // Resumo Financeiro
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('RESUMO FINANCEIRO', 15, yPos);
            yPos += 8;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Total de Vendas: ' + formatCurrency(dadosRelatorio.totalVendas), 15, yPos);
            doc.text('(' + dadosRelatorio.quantidadeVendas + ' ' + (dadosRelatorio.quantidadeVendas === 1 ? 'venda' : 'vendas') + ')', 80, yPos);
            yPos += 6;
            doc.text('Total de Comissoes: ' + formatCurrency(dadosRelatorio.totalComissoes), 15, yPos);
            yPos += 6;
            
            if (dadosRelatorio.totalCreditos > 0) {
              doc.setTextColor(0, 150, 0);
              doc.text('Creditos: +' + formatCurrency(dadosRelatorio.totalCreditos), 15, yPos);
              doc.setTextColor(0, 0, 0);
              yPos += 6;
            }
            
            if (dadosRelatorio.totalDebitos > 0) {
              doc.setTextColor(200, 0, 0);
              doc.text('Debitos: -' + formatCurrency(dadosRelatorio.totalDebitos), 15, yPos);
              doc.setTextColor(0, 0, 0);
              yPos += 6;
            }
            
            doc.setFont('helvetica', 'bold');
            doc.text('Valor Liquido: ' + formatCurrency(relatorio.valorLiquido), 15, yPos);
            yPos += 6;
            
            doc.setTextColor(0, 150, 0);
            doc.text('Total Pago: ' + formatCurrency(relatorio.totalPago), 15, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += 6;
            
            doc.setFont('helvetica', 'bold');
            if (relatorio.saldoDevedor > 0) {
              doc.setTextColor(200, 0, 0);
            } else if (relatorio.saldoDevedor < 0) {
              doc.setTextColor(0, 150, 0);
            }
            doc.text('Saldo: ' + formatCurrency(relatorio.saldoDevedor), 15, yPos);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            yPos += 8;
            
            // Linha divisória 3
            doc.setDrawColor(200, 200, 200);
            doc.line(15, yPos, pageWidth - 15, yPos);
            yPos += 8;
            
            // Tabela de Vendas
            if (dadosRelatorio.vendas.length > 0) {
              doc.setFontSize(12);
              doc.setFont('helvetica', 'bold');
              doc.text('VENDAS DO PERIODO (' + dadosRelatorio.quantidadeVendas + ')', 15, yPos);
              yPos += 5;
              
              const vendasData = dadosRelatorio.vendas.map(v => [
                v.vendaId,
                v.clienteNome.substring(0, 30) + (v.clienteNome.length > 30 ? '...' : ''),
                format(new Date(v.dataVenda), 'dd/MM/yyyy'),
                formatCurrency(v.valorTotalVenda),
                v.percentualComissao + '%',
                formatCurrency(v.valorComissao)
              ]);
              
              autoTable(doc, {
                startY: yPos,
                head: [['ID', 'Cliente', 'Data', 'Valor Venda', '%', 'Comissao']],
                body: vendasData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                  0: { cellWidth: 20 },
                  1: { cellWidth: 50 },
                  2: { cellWidth: 25 },
                  3: { cellWidth: 30 },
                  4: { cellWidth: 15 },
                  5: { cellWidth: 30 }
                }
              });
              
              yPos = (doc as any).lastAutoTable.finalY + 10;
            }
            
            // Lançamentos Manuais (se houver)
            if (dadosRelatorio.lancamentosCredito.length > 0 || dadosRelatorio.lancamentosDebito.length > 0) {
              if (yPos > 250) {
                doc.addPage();
                yPos = 20;
              }
              
              doc.setFontSize(12);
              doc.setFont('helvetica', 'bold');
              doc.text('LANCAMENTOS MANUAIS', 15, yPos);
              yPos += 5;
              
              const lancamentosData = [
                ...dadosRelatorio.lancamentosCredito.map(l => [
                  format(new Date(l.data), 'dd/MM/yyyy'),
                  'CREDITO',
                  l.descricao.substring(0, 40) + (l.descricao.length > 40 ? '...' : ''),
                  formatCurrency(l.valor)
                ]),
                ...dadosRelatorio.lancamentosDebito.map(l => [
                  format(new Date(l.data), 'dd/MM/yyyy'),
                  'DEBITO',
                  l.descricao.substring(0, 40) + (l.descricao.length > 40 ? '...' : ''),
                  formatCurrency(l.valor)
                ])
              ];
              
              autoTable(doc, {
                startY: yPos,
                head: [['Data', 'Tipo', 'Descricao', 'Valor']],
                body: lancamentosData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                  0: { cellWidth: 25 },
                  1: { cellWidth: 25 },
                  2: { cellWidth: 90 },
                  3: { cellWidth: 30 }
                }
              });
              
              yPos = (doc as any).lastAutoTable.finalY + 10;
            }
            
            // Histórico de Pagamentos (se houver)
            if (dadosRelatorio.pagamentos.length > 0) {
              if (yPos > 250) {
                doc.addPage();
                yPos = 20;
              }
              
              doc.setFontSize(12);
              doc.setFont('helvetica', 'bold');
              doc.text('HISTORICO DE PAGAMENTOS', 15, yPos);
              yPos += 5;
              
              const pagamentosData = dadosRelatorio.pagamentos.map(p => [
                format(new Date(p.data), 'dd/MM/yyyy'),
                p.formaPagamento,
                p.comprovante || '-',
                formatCurrency(p.valor)
              ]);
              
              autoTable(doc, {
                startY: yPos,
                head: [['Data', 'Forma Pagamento', 'Comprovante', 'Valor']],
                body: pagamentosData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                  0: { cellWidth: 25 },
                  1: { cellWidth: 50 },
                  2: { cellWidth: 65 },
                  3: { cellWidth: 30 }
                }
              });
              
              yPos = (doc as any).lastAutoTable.finalY + 10;
            }
            
            // Rodapé
            const totalPages = (doc as any).internal.pages.length - 1;
            for (let i = 1; i <= totalPages; i++) {
              doc.setPage(i);
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text(
                'Relatorio gerado em ' + format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR }),
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
              );
              doc.text(
                'Pagina ' + i + ' de ' + totalPages,
                pageWidth - 15,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'right' }
              );
            }
            
            // Salva o PDF
            doc.save(fileName);
            resolve(fileName);
          } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            reject(error);
          }
        }, 500);
      }),
      {
        loading: 'Gerando PDF do relatório...',
        success: (fileName) => 'PDF "' + fileName + '" baixado com sucesso!',
        error: 'Erro ao gerar PDF. Verifique o console para mais detalhes.',
      }
    );
  };

  const handleEnviarEmail = async () => {
    // Busca o vendedor para obter o e-mail atual
    const vendedorEmail = relatorioCompleto?.vendedor;
    
    if (!vendedorEmail || !vendedorEmail.email) {
      toast.error('Vendedor não possui e-mail cadastrado');
      return;
    }

    // Abre dialog de confirmação com o e-mail
    setEmailDestino(vendedorEmail.email);
    setDialogEmail(true);
  };

  const handleConfirmarEnvioEmail = async () => {
    setDialogEmail(false);
    
    const fileName = `relatorio-comissoes-${relatorio.vendedorId}-${relatorio.periodo}.pdf`;
    
    toast.promise(
      new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            // Simula a geração do PDF para anexar ao e-mail
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            let yPos = 20;
            
            // Título
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('RELATORIO DE COMISSOES', pageWidth / 2, yPos, { align: 'center' });
            yPos += 10;
            
            // Linha divisória 1
            doc.setDrawColor(200, 200, 200);
            doc.line(15, yPos, pageWidth - 15, yPos);
            yPos += 8;
            
            // Informações do Vendedor
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('INFORMACOES DO VENDEDOR', 15, yPos);
            yPos += 8;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Vendedor: ' + dadosRelatorio.vendedorNome, 15, yPos);
            yPos += 6;
            doc.text('Email: ' + emailDestino, 15, yPos);
            yPos += 6;
            doc.text('Periodo: ' + formatPeriodo(relatorio.periodo), 15, yPos);
            
            // Gera o PDF em memória (output como blob)
            const pdfBlob = doc.output('blob');
            const pdfSizeKB = (pdfBlob.size / 1024).toFixed(2);
            
            // Simula o envio do e-mail
            // Em produção, aqui você faria uma chamada para sua API de e-mail
            const corpoEmail = `Ola ${dadosRelatorio.vendedorNome},

Segue em anexo o seu relatorio de comissoes referente ao periodo ${formatPeriodo(relatorio.periodo)}.

Resumo:
- Total de Vendas: ${formatCurrency(dadosRelatorio.totalVendas)}
- Total de Comissoes: ${formatCurrency(dadosRelatorio.totalComissoes)}
- Valor Liquido: ${formatCurrency(relatorio.valorLiquido)}
- Saldo: ${formatCurrency(relatorio.saldoDevedor)}

Em caso de duvidas, entre em contato com o financeiro.

Atenciosamente,
Equipe de Vendas`;

            console.log('=== SIMULACAO DE ENVIO DE E-MAIL ===');
            console.log('Para:', emailDestino);
            console.log('Assunto:', `Relatorio de Comissoes - ${formatPeriodo(relatorio.periodo)}`);
            console.log('Anexo:', fileName, '(' + pdfSizeKB + ' KB)');
            console.log('Corpo do e-mail:');
            console.log(corpoEmail);
            console.log('====================================');
            
            resolve({ email: emailDestino, fileName, pdfSizeKB, corpoEmail });
          } catch (error) {
            console.error('Erro ao preparar e-mail:', error);
            reject(error);
          }
        }, 2500);
      }),
      {
        loading: 'Preparando e enviando relatorio por e-mail...',
        success: ({ email, pdfSizeKB }) => {
          return `E-mail enviado com sucesso para ${email}!\n\nPDF anexado: ${pdfSizeKB} KB\n\n⚠️ NOTA: Como este e um prototipo com dados mockados, o e-mail nao e enviado de fato. Em producao, seria integrado com um servico de e-mail (SendGrid, AWS SES, etc).`;
        },
        error: 'Erro ao enviar e-mail',
      }
    );
  };

  const handleLancamentoManual = () => {
    setModoLancamento('novo');
    setLancamentoSelecionado(null);
    setFormLancamento({
      tipo: "credito",
      valor: "",
      descricao: "",
      data: format(new Date(), "yyyy-MM-dd"),
      periodo: relatorio.periodo
    });
    setDialogLancamento(true);
  };

  const handleVisualizarLancamento = (lancamento: LancamentoManual) => {
    setModoLancamento('visualizar');
    setLancamentoSelecionado(lancamento);
    setFormLancamento({
      tipo: lancamento.tipo,
      valor: lancamento.valor.toString(),
      descricao: lancamento.descricao,
      data: lancamento.data,
      periodo: lancamento.periodo
    });
    setDialogLancamento(true);
  };

  const handleEditarLancamento = () => {
    setModoLancamento('editar');
  };

  const handleRegistrarPagamento = () => {
    setModoPagamento('novo');
    setPagamentoSelecionado(null);
    setFormPagamento({
      valor: relatorio.saldoDevedor > 0 ? relatorio.saldoDevedor.toFixed(2) : "",
      formaPagamento: "",
      comprovante: "",
      observacoes: "",
      data: format(new Date(), "yyyy-MM-dd"),
      periodo: relatorio.periodo
    });
    setDialogPagamento(true);
  };

  const handleVisualizarPagamento = (pagamento: PagamentoPeriodo) => {
    setModoPagamento('visualizar');
    setPagamentoSelecionado(pagamento);
    setFormPagamento({
      valor: pagamento.valor.toString(),
      formaPagamento: pagamento.formaPagamento,
      comprovante: pagamento.comprovante || "",
      observacoes: pagamento.observacoes || "",
      data: pagamento.data,
      periodo: pagamento.periodo
    });
    setDialogPagamento(true);
  };

  const handleEditarPagamento = () => {
    setModoPagamento('editar');
  };

  const handleVisualizarVenda = (venda: ComissaoVenda) => {
    setModoVenda('visualizar');
    setVendaSelecionada(venda);
    setFormVenda({
      periodo: venda.periodo,
      observacoes: venda.observacoes || ""
    });
    setDialogVenda(true);
  };

  const handleEditarVenda = () => {
    setModoVenda('editar');
  };

  const handleSalvarLancamento = () => {
    if (!formLancamento.valor || parseFloat(formLancamento.valor) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    
    if (!formLancamento.descricao.trim()) {
      toast.error("Informe a descrição do lançamento");
      return;
    }

    if (!formLancamento.periodo) {
      toast.error("Selecione o período do lançamento");
      return;
    }

    if (modoLancamento === 'editar' && lancamentoSelecionado) {
      // Editando lançamento existente
      const lancamentoAtualizado: LancamentoManual = {
        ...lancamentoSelecionado,
        data: formLancamento.data,
        valor: parseFloat(formLancamento.valor),
        descricao: formLancamento.descricao,
        periodo: formLancamento.periodo,
        editadoPor: "Usuário Atual",
        editadoEm: new Date().toISOString()
      };

      const lancamentosCredito = formLancamento.tipo === 'credito' 
        ? relatorio.lancamentosCredito.map(l => l.id === lancamentoSelecionado.id ? lancamentoAtualizado : l)
        : relatorio.lancamentosCredito;
      
      const lancamentosDebito = formLancamento.tipo === 'debito'
        ? relatorio.lancamentosDebito.map(l => l.id === lancamentoSelecionado.id ? lancamentoAtualizado : l)
        : relatorio.lancamentosDebito;

      const totalCreditos = lancamentosCredito.reduce((sum, l) => sum + l.valor, 0);
      const totalDebitos = lancamentosDebito.reduce((sum, l) => sum + l.valor, 0);
      const valorLiquido = relatorio.totalComissoes + totalCreditos - totalDebitos;
      const saldoDevedor = valorLiquido - relatorio.totalPago;

      const relatorioAtualizado = {
        ...relatorio,
        lancamentosCredito,
        lancamentosDebito,
        totalCreditos,
        totalDebitos,
        valorLiquido,
        saldoDevedor
      };

      if (onAtualizarRelatorio) {
        onAtualizarRelatorio(relatorioAtualizado);
      }

      toast.success(`Lançamento atualizado com sucesso!`);
    } else {
      // Novo lançamento
      const novoLancamento: LancamentoManual = {
        id: `L${formLancamento.tipo === 'credito' ? 'C' : 'D'}-${Date.now()}`,
        vendedorId: relatorio.vendedorId,
        data: formLancamento.data,
        tipo: formLancamento.tipo,
        valor: parseFloat(formLancamento.valor),
        descricao: formLancamento.descricao,
        periodo: formLancamento.periodo,
        criadoPor: "Usuário Atual",
        criadoEm: new Date().toISOString()
      };

      const lancamentosCredito = formLancamento.tipo === 'credito' 
        ? [...relatorio.lancamentosCredito, novoLancamento]
        : relatorio.lancamentosCredito;
      
      const lancamentosDebito = formLancamento.tipo === 'debito'
        ? [...relatorio.lancamentosDebito, novoLancamento]
        : relatorio.lancamentosDebito;

      const totalCreditos = lancamentosCredito.reduce((sum, l) => sum + l.valor, 0);
      const totalDebitos = lancamentosDebito.reduce((sum, l) => sum + l.valor, 0);
      const valorLiquido = relatorio.totalComissoes + totalCreditos - totalDebitos;
      const saldoDevedor = valorLiquido - relatorio.totalPago;

      const relatorioAtualizado = {
        ...relatorio,
        lancamentosCredito,
        lancamentosDebito,
        totalCreditos,
        totalDebitos,
        valorLiquido,
        saldoDevedor
      };

      if (onAtualizarRelatorio) {
        onAtualizarRelatorio(relatorioAtualizado);
      }

      toast.success(`Lançamento de ${formLancamento.tipo} registrado com sucesso!`);
    }
    
    setDialogLancamento(false);
  };

  const handleSalvarPagamento = () => {
    if (!formPagamento.valor || parseFloat(formPagamento.valor) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    
    if (!formPagamento.formaPagamento) {
      toast.error("Selecione a forma de pagamento");
      return;
    }

    if (!formPagamento.periodo) {
      toast.error("Selecione o período do pagamento");
      return;
    }

    if (modoPagamento === 'editar' && pagamentoSelecionado) {
      // Editando pagamento existente
      const pagamentoAtualizado: PagamentoPeriodo = {
        ...pagamentoSelecionado,
        data: formPagamento.data,
        valor: parseFloat(formPagamento.valor),
        formaPagamento: formPagamento.formaPagamento,
        comprovante: formPagamento.comprovante || undefined,
        observacoes: formPagamento.observacoes || undefined,
        periodo: formPagamento.periodo,
        editadoPor: "Usuário Atual",
        editadoEm: new Date().toISOString()
      };

      const pagamentos = relatorio.pagamentos.map(p => 
        p.id === pagamentoSelecionado.id ? pagamentoAtualizado : p
      );
      const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
      const saldoDevedor = relatorio.valorLiquido - totalPago;
      
      // Atualiza status se necessário
      let novoStatus = relatorio.status;
      if (saldoDevedor <= 0) {
        novoStatus = "pago";
      }

      const relatorioAtualizado = {
        ...relatorio,
        pagamentos,
        totalPago,
        saldoDevedor,
        status: novoStatus,
        dataPagamento: saldoDevedor <= 0 ? formPagamento.data : relatorio.dataPagamento
      };

      if (onAtualizarRelatorio) {
        onAtualizarRelatorio(relatorioAtualizado);
      }

      toast.success("Pagamento atualizado com sucesso!");
    } else {
      // Novo pagamento
      const novoPagamento: PagamentoPeriodo = {
        id: `PG-${Date.now()}`,
        vendedorId: relatorio.vendedorId,
        data: formPagamento.data,
        valor: parseFloat(formPagamento.valor),
        formaPagamento: formPagamento.formaPagamento,
        comprovante: formPagamento.comprovante || undefined,
        observacoes: formPagamento.observacoes || undefined,
        periodo: formPagamento.periodo,
        realizadoPor: "Usuário Atual",
        realizadoEm: new Date().toISOString()
      };

      const pagamentos = [...relatorio.pagamentos, novoPagamento];
      const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
      const saldoDevedor = relatorio.valorLiquido - totalPago;
      
      // Atualiza status se necessário
      let novoStatus = relatorio.status;
      if (saldoDevedor <= 0) {
        novoStatus = "pago";
      }

      const relatorioAtualizado = {
        ...relatorio,
        pagamentos,
        totalPago,
        saldoDevedor,
        status: novoStatus,
        dataPagamento: saldoDevedor <= 0 ? formPagamento.data : relatorio.dataPagamento
      };

      if (onAtualizarRelatorio) {
        onAtualizarRelatorio(relatorioAtualizado);
      }

      toast.success("Pagamento registrado com sucesso!");
    }
    
    setDialogPagamento(false);
  };

  const handleSalvarVenda = () => {
    if (!formVenda.periodo) {
      toast.error("Selecione o período da venda");
      return;
    }

    if (!vendaSelecionada) return;

    // Simula a atualização da venda
    toast.success("Comissão de venda atualizada com sucesso!");
    setDialogVenda(false);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onVoltar} className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Comissões
          </Button>
          <h1 className="text-3xl">Relatório de Comissões</h1>
          <p className="text-muted-foreground mt-1">
            {dadosRelatorio.vendedorNome} • {formatPeriodo(relatorio.periodo)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(relatorio.status)}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLancamentoManual}>
                <Plus className="h-4 w-4 mr-2" />
                Lançamento Manual
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRegistrarPagamento}>
                <CreditCard className="h-4 w-4 mr-2" />
                Registrar Pagamento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportarPDF}>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEnviarEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Enviar por Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dadosRelatorio.totalVendas)}</div>
            <p className="text-xs text-muted-foreground">
              {dadosRelatorio.quantidadeVendas} {dadosRelatorio.quantidadeVendas === 1 ? 'venda' : 'vendas'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dadosRelatorio.totalComissoes)}
            </div>
            <p className="text-xs text-muted-foreground">
              Gerado pelas vendas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Líquido</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(relatorio.valorLiquido)}
            </div>
            <p className="text-xs text-muted-foreground">
              Com ajustes aplicados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              relatorio.saldoDevedor > 0 
                ? 'text-red-600' 
                : relatorio.saldoDevedor < 0 
                  ? 'text-green-600' 
                  : 'text-foreground'
            }`}>
              {relatorio.saldoDevedor > 0 && '-'}{formatCurrency(Math.abs(relatorio.saldoDevedor))}
            </div>
            <p className="text-xs text-muted-foreground">
              {relatorio.saldoDevedor > 0 ? 'Aguardando pagamento' : relatorio.saldoDevedor < 0 ? 'Saldo a favor' : 'Quitado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Informações do Relatório */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informações do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Vendedor</Label>
              <p className="font-medium flex items-center gap-2 mt-1">
                <User className="h-4 w-4 text-muted-foreground" />
                {dadosRelatorio.vendedorNome}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">ID Vendedor</Label>
              <p className="font-mono font-medium mt-1">{relatorio.vendedorId}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Período</Label>
              <p className="font-medium flex items-center gap-2 mt-1 capitalize">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatPeriodo(relatorio.periodo)}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div className="mt-1">{getStatusBadge(relatorio.status)}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data de Geração</Label>
              <p className="mt-1">{formatDate(relatorio.dataGeracao)}</p>
            </div>
            {relatorio.dataFechamento && (
              <div>
                <Label className="text-xs text-muted-foreground">Data de Fechamento</Label>
                <p className="mt-1">{formatDate(relatorio.dataFechamento)}</p>
              </div>
            )}
            {relatorio.dataPagamento && (
              <div>
                <Label className="text-xs text-muted-foreground">Data de Pagamento</Label>
                <p className="mt-1">{formatDate(relatorio.dataPagamento)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vendas do Período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Vendas do Período ({dadosRelatorio.quantidadeVendas})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Venda</TableHead>
                  <TableHead>OC Cliente</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor Venda</TableHead>
                  <TableHead className="text-right">% Comissão</TableHead>
                  <TableHead className="text-right">Valor Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosRelatorio.vendas.map((venda) => (
                  <TableRow 
                    key={venda.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleVisualizarVenda(venda)}
                  >
                    <TableCell className="font-mono text-sm">{venda.vendaId}</TableCell>
                    <TableCell className="font-mono text-sm">{venda.ocCliente}</TableCell>
                    <TableCell>{venda.clienteNome}</TableCell>
                    <TableCell>{formatDate(venda.dataVenda)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(venda.valorTotalVenda)}</TableCell>
                    <TableCell className="text-right">{venda.percentualComissao.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(venda.valorComissao)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={4}>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(dadosRelatorio.totalVendas)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">{formatCurrency(dadosRelatorio.totalComissoes)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Lançamentos Manuais */}
      {(dadosRelatorio.lancamentosCredito.length > 0 || dadosRelatorio.lancamentosDebito.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Lançamentos Manuais ({dadosRelatorio.lancamentosCredito.length + dadosRelatorio.lancamentosDebito.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Lançado Por</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosRelatorio.lancamentosCredito.map((lanc) => (
                    <TableRow 
                      key={lanc.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleVisualizarLancamento(lanc)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <ArrowUpCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="text-green-700 font-medium">Crédito</span>
                        </div>
                      </TableCell>
                      <TableCell>{lanc.descricao}</TableCell>
                      <TableCell>{formatDate(lanc.data)}</TableCell>
                      <TableCell>{lanc.criadoPor}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        +{formatCurrency(lanc.valor)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {dadosRelatorio.lancamentosDebito.map((lanc) => (
                    <TableRow 
                      key={lanc.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleVisualizarLancamento(lanc)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                            <ArrowDownCircle className="h-4 w-4 text-red-600" />
                          </div>
                          <span className="text-red-700 font-medium">Débito</span>
                        </div>
                      </TableCell>
                      <TableCell>{lanc.descricao}</TableCell>
                      <TableCell>{formatDate(lanc.data)}</TableCell>
                      <TableCell>{lanc.criadoPor}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        -{formatCurrency(lanc.valor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Pagamentos */}
      {dadosRelatorio.pagamentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Histórico de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma de Pagamento</TableHead>
                    <TableHead>Comprovante</TableHead>
                    <TableHead>Realizado Por</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosRelatorio.pagamentos.map((pag) => (
                    <TableRow 
                      key={pag.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleVisualizarPagamento(pag)}
                    >
                      <TableCell>{formatDate(pag.data)}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(pag.valor)}
                      </TableCell>
                      <TableCell>{pag.formaPagamento}</TableCell>
                      <TableCell className="font-mono text-xs">{pag.comprovante || "-"}</TableCell>
                      <TableCell>{pag.realizadoPor}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {pag.observacoes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Total de Comissões</span>
              <span className="font-medium">{formatCurrency(dadosRelatorio.totalComissoes)}</span>
            </div>
            <div className={`flex justify-between items-center py-2 ${
              relatorio.saldoAnterior > 0 ? 'text-red-600' : relatorio.saldoAnterior < 0 ? 'text-green-600' : 'text-muted-foreground'
            }`}>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Saldo Anterior
              </span>
              <span className="font-medium">
                {relatorio.saldoAnterior > 0 ? '+' : ''}{formatCurrency(relatorio.saldoAnterior)}
              </span>
            </div>
            {dadosRelatorio.totalCreditos > 0 && (
              <div className="flex justify-between items-center py-2 text-green-600">
                <span className="flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4" />
                  Créditos
                </span>
                <span className="font-medium">+{formatCurrency(dadosRelatorio.totalCreditos)}</span>
              </div>
            )}
            {dadosRelatorio.totalDebitos > 0 && (
              <div className="flex justify-between items-center py-2 text-red-600">
                <span className="flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4" />
                  Débitos
                </span>
                <span className="font-medium">-{formatCurrency(dadosRelatorio.totalDebitos)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 border-t font-semibold">
              <span>Valor Líquido</span>
              <span className="text-blue-600">{formatCurrency(relatorio.valorLiquido)}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-green-600">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Total Pago
              </span>
              <span className="font-medium">{formatCurrency(relatorio.totalPago)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-t font-semibold">
              <span className={
                relatorio.saldoDevedor > 0 
                  ? 'text-red-600' 
                  : relatorio.saldoDevedor < 0 
                    ? 'text-green-600' 
                    : ''
              }>
                Saldo
              </span>
              <span className={
                relatorio.saldoDevedor > 0 
                  ? 'text-red-600' 
                  : relatorio.saldoDevedor < 0 
                    ? 'text-green-600' 
                    : ''
              }>
                {relatorio.saldoDevedor > 0 && '-'}{formatCurrency(Math.abs(relatorio.saldoDevedor))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Lançamento Manual */}
      <Dialog open={dialogLancamento} onOpenChange={setDialogLancamento}>
        <DialogContent className="max-h-[90vh] flex flex-col" aria-describedby={undefined}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {modoLancamento === 'visualizar' ? (
                <Eye className="h-5 w-5" />
              ) : (
                <Wallet className="h-5 w-5" />
              )}
              {modoLancamento === 'novo' ? 'Novo Lançamento Manual' : 
               modoLancamento === 'visualizar' ? 'Detalhes do Lançamento' : 
               'Editar Lançamento'}
            </DialogTitle>
            <DialogDescription>
              {modoLancamento === 'novo' 
                ? `Adicione créditos ou débitos ao relatório de ${dadosRelatorio.vendedorNome}`
                : modoLancamento === 'visualizar'
                ? 'Visualize os detalhes do lançamento. Clique em "Editar" para fazer alterações.'
                : `Edite o lançamento de ${dadosRelatorio.vendedorNome}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {modoLancamento === 'visualizar' && lancamentoSelecionado && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 font-medium">ID do Lançamento</span>
                  <span className="text-sm font-mono text-blue-700">{lancamentoSelecionado.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 font-medium">Criado por</span>
                  <span className="text-sm text-blue-700">{lancamentoSelecionado.criadoPor}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 font-medium">Criado em</span>
                  <span className="text-sm text-blue-700">{formatDate(lancamentoSelecionado.criadoEm)}</span>
                </div>
                {lancamentoSelecionado.editadoPor && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-900 font-medium">Editado por</span>
                      <span className="text-sm text-blue-700">{lancamentoSelecionado.editadoPor}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-900 font-medium">Editado em</span>
                      <span className="text-sm text-blue-700">{lancamentoSelecionado.editadoEm ? formatDate(lancamentoSelecionado.editadoEm) : '-'}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Tipo de Lançamento</Label>
              <Select 
                value={formLancamento.tipo} 
                onValueChange={(value: "credito" | "debito") => setFormLancamento({...formLancamento, tipo: value})}
                disabled={modoLancamento === 'visualizar'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="tipo-credito" value="credito">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-green-600" />
                      <span>Crédito (Adicionar)</span>
                    </div>
                  </SelectItem>
                  <SelectItem key="tipo-debito" value="debito">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-red-600" />
                      <span>Débito (Subtrair)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período *</Label>
              <Input
                placeholder="Ex: 10/2025"
                value={formatPeriodoInput(formLancamento.periodo)}
                onChange={(e) => {
                  const novoPeriodo = parsePeriodoInput(e.target.value);
                  if (novoPeriodo) {
                    setFormLancamento({...formLancamento, periodo: novoPeriodo});
                  } else {
                    setFormLancamento({...formLancamento, periodo: e.target.value});
                  }
                }}
                disabled={modoLancamento === 'visualizar'}
              />
              <p className="text-xs text-muted-foreground">
                Formato: MM/AAAA (ex: 10/2025)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formLancamento.valor}
                onChange={(e) => setFormLancamento({...formLancamento, valor: e.target.value})}
                disabled={modoLancamento === 'visualizar'}
              />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={formLancamento.data}
                onChange={(e) => setFormLancamento({...formLancamento, data: e.target.value})}
                disabled={modoLancamento === 'visualizar'}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Ex: Bonificação por meta, Desconto de vale transporte..."
                value={formLancamento.descricao}
                onChange={(e) => setFormLancamento({...formLancamento, descricao: e.target.value})}
                rows={3}
                disabled={modoLancamento === 'visualizar'}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
            {modoLancamento === 'visualizar' ? (
              <>
                <Button variant="outline" onClick={() => setDialogLancamento(false)}>
                  Fechar
                </Button>
                <Button onClick={handleEditarLancamento}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDialogLancamento(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSalvarLancamento}>
                  Salvar {modoLancamento === 'editar' ? 'Alterações' : 'Lançamento'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Envio de E-mail */}
      <Dialog open={dialogEmail} onOpenChange={setDialogEmail}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Confirmar Envio de E-mail
            </DialogTitle>
            <DialogDescription>
              O relatório de comissões será enviado por e-mail
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Destinatário</Label>
                <p className="font-medium mt-1">{dadosRelatorio.vendedorNome}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">E-mail</Label>
                <p className="font-mono text-sm mt-1">{emailDestino}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Período</Label>
                <p className="font-medium mt-1 capitalize">{formatPeriodo(relatorio.periodo)}</p>
              </div>
            </div>

            <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
              <div className="flex gap-2">
                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Anexo: Relatório em PDF</p>
                  <p className="text-blue-700 mt-1">
                    Será gerado um PDF completo com todas as vendas, lançamentos e pagamentos do período.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-900">Ambiente de Demonstração</p>
                  <p className="text-orange-700 mt-1">
                    Este é um protótipo com dados mockados. O e-mail não será realmente enviado, mas a funcionalidade está implementada e seria integrada com um serviço de e-mail em produção.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEmail(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarEnvioEmail} className="gap-2">
              <Mail className="h-4 w-4" />
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Venda (Visualização/Edição) */}
      <Dialog open={dialogVenda} onOpenChange={setDialogVenda}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" aria-describedby={undefined}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {modoVenda === 'visualizar' ? (
                <Eye className="h-5 w-5" />
              ) : (
                <DollarSign className="h-5 w-5" />
              )}
              {modoVenda === 'visualizar' ? 'Detalhes da Comissão' : 'Editar Comissão'}
            </DialogTitle>
            <DialogDescription>
              {modoVenda === 'visualizar' 
                ? 'Visualize os detalhes da comissão. Clique em "Editar" para fazer alterações.'
                : 'Edite os dados da comissão de venda'
              }
            </DialogDescription>
          </DialogHeader>

          {vendaSelecionada && (
            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 font-medium">ID da Venda</span>
                  <span className="text-sm font-mono text-blue-700">{vendaSelecionada.vendaId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 font-medium">OC Cliente</span>
                  <span className="text-sm font-mono text-blue-700">{vendaSelecionada.ocCliente}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 font-medium">Regra Aplicada</span>
                  <span className="text-sm text-blue-700">{vendaSelecionada.regraAplicada}</span>
                </div>
                {vendaSelecionada.editadoPor && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-900 font-medium">Editado por</span>
                      <span className="text-sm text-blue-700">{vendaSelecionada.editadoPor}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-900 font-medium">Editado em</span>
                      <span className="text-sm text-blue-700">{vendaSelecionada.editadoEm ? formatDate(vendaSelecionada.editadoEm) : '-'}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input value={vendaSelecionada.clienteNome} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Data da Venda</Label>
                  <Input value={formatDate(vendaSelecionada.dataVenda)} disabled />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Total da Venda</Label>
                  <Input value={formatCurrency(vendaSelecionada.valorTotalVenda)} disabled />
                </div>
                <div className="space-y-2">
                  <Label>% Comissão</Label>
                  <Input value={`${vendaSelecionada.percentualComissao.toFixed(2)}%`} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor da Comissão</Label>
                <Input 
                  value={formatCurrency(vendaSelecionada.valorComissao)} 
                  disabled 
                  className="font-semibold text-green-600"
                />
              </div>

              <div className="space-y-2">
                <Label>Período *</Label>
                <Input
                  placeholder="Ex: 10/2025"
                  value={formatPeriodoInput(formVenda.periodo)}
                  onChange={(e) => {
                    const novoPeriodo = parsePeriodoInput(e.target.value);
                    if (novoPeriodo) {
                      setFormVenda({...formVenda, periodo: novoPeriodo});
                    } else {
                      setFormVenda({...formVenda, periodo: e.target.value});
                    }
                  }}
                  disabled={modoVenda === 'visualizar'}
                />
                <p className="text-xs text-muted-foreground">
                  Formato: MM/AAAA (ex: 10/2025)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações sobre esta comissão..."
                  value={formVenda.observacoes}
                  onChange={(e) => setFormVenda({...formVenda, observacoes: e.target.value})}
                  rows={3}
                  disabled={modoVenda === 'visualizar'}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0">
            {modoVenda === 'visualizar' ? (
              <>
                <Button variant="outline" onClick={() => setDialogVenda(false)}>
                  Fechar
                </Button>
                <Button onClick={handleEditarVenda}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDialogVenda(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSalvarVenda}>
                  Salvar Alterações
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Pagamento */}
      <Dialog open={dialogPagamento} onOpenChange={setDialogPagamento}>
        <DialogContent className="max-h-[90vh] flex flex-col" aria-describedby={undefined}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {modoPagamento === 'visualizar' ? (
                <Eye className="h-5 w-5" />
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
              {modoPagamento === 'novo' ? 'Registrar Pagamento' : 
               modoPagamento === 'visualizar' ? 'Detalhes do Pagamento' : 
               'Editar Pagamento'}
            </DialogTitle>
            <DialogDescription>
              {modoPagamento === 'novo' 
                ? `Registre um pagamento para ${dadosRelatorio.vendedorNome}`
                : modoPagamento === 'visualizar'
                ? 'Visualize os detalhes do pagamento. Clique em "Editar" para fazer alterações.'
                : `Edite o pagamento de ${dadosRelatorio.vendedorNome}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {modoPagamento === 'visualizar' && pagamentoSelecionado && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 font-medium">ID do Pagamento</span>
                  <span className="text-sm font-mono text-blue-700">{pagamentoSelecionado.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 font-medium">Realizado por</span>
                  <span className="text-sm text-blue-700">{pagamentoSelecionado.realizadoPor}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 font-medium">Realizado em</span>
                  <span className="text-sm text-blue-700">{formatDate(pagamentoSelecionado.realizadoEm)}</span>
                </div>
                {pagamentoSelecionado.editadoPor && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-900 font-medium">Editado por</span>
                      <span className="text-sm text-blue-700">{pagamentoSelecionado.editadoPor}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-900 font-medium">Editado em</span>
                      <span className="text-sm text-blue-700">{pagamentoSelecionado.editadoEm ? formatDate(pagamentoSelecionado.editadoEm) : '-'}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {modoPagamento === 'novo' && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saldo Devedor:</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(relatorio.saldoDevedor)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Período *</Label>
              <Input
                placeholder="Ex: 10/2025"
                value={formatPeriodoInput(formPagamento.periodo)}
                onChange={(e) => {
                  const novoPeriodo = parsePeriodoInput(e.target.value);
                  if (novoPeriodo) {
                    setFormPagamento({...formPagamento, periodo: novoPeriodo});
                  } else {
                    setFormPagamento({...formPagamento, periodo: e.target.value});
                  }
                }}
                disabled={modoPagamento === 'visualizar'}
              />
              <p className="text-xs text-muted-foreground">
                Formato: MM/AAAA (ex: 10/2025)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Valor do Pagamento (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formPagamento.valor}
                onChange={(e) => setFormPagamento({...formPagamento, valor: e.target.value})}
                disabled={modoPagamento === 'visualizar'}
              />
            </div>

            <div className="space-y-2">
              <Label>Data do Pagamento</Label>
              <Input
                type="date"
                value={formPagamento.data}
                onChange={(e) => setFormPagamento({...formPagamento, data: e.target.value})}
                disabled={modoPagamento === 'visualizar'}
              />
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select 
                value={formPagamento.formaPagamento} 
                onValueChange={(value) => setFormPagamento({...formPagamento, formaPagamento: value})}
                disabled={modoPagamento === 'visualizar'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="pag-pix" value="PIX">PIX</SelectItem>
                  <SelectItem key="pag-transf" value="Transferência Bancária">Transferência Bancária</SelectItem>
                  <SelectItem key="pag-dinheiro" value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem key="pag-cheque" value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Número do Comprovante (Opcional)</Label>
              <Input
                placeholder="Ex: COMP-2025-001, PIX-123456..."
                value={formPagamento.comprovante}
                onChange={(e) => setFormPagamento({...formPagamento, comprovante: e.target.value})}
                disabled={modoPagamento === 'visualizar'}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações (Opcional)</Label>
              <Textarea
                placeholder="Informações adicionais sobre o pagamento..."
                value={formPagamento.observacoes}
                onChange={(e) => setFormPagamento({...formPagamento, observacoes: e.target.value})}
                rows={2}
                disabled={modoPagamento === 'visualizar'}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
            {modoPagamento === 'visualizar' ? (
              <>
                <Button variant="outline" onClick={() => setDialogPagamento(false)}>
                  Fechar
                </Button>
                <Button onClick={handleEditarPagamento}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDialogPagamento(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSalvarPagamento}>
                  {modoPagamento === 'editar' ? 'Salvar Alterações' : 'Registrar Pagamento'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

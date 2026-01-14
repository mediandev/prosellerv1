import { useState, useRef } from 'react';
import { Cliente } from '../types/customer';
import { useAuth } from '../contexts/AuthContext';
import { historyService } from '../services/historyService';
import { companyService } from '../services/companyService';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CustomerImportExportProps {
  clientes: Cliente[];
  onImportComplete?: (clientesImportados: Partial<Cliente>[]) => void;
}

interface ResultadoImportacao {
  total: number;
  sucesso: number;
  erros: number;
  detalhes: Array<{
    linha: number;
    status: 'sucesso' | 'erro' | 'aviso';
    mensagem: string;
    dados?: Partial<Cliente>;
  }>;
}

export function CustomerImportExport({ clientes, onImportComplete }: CustomerImportExportProps) {
  const { usuario } = useAuth();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exportar clientes para CSV
  const handleExportarCSV = () => {
    try {
      // Cabeçalhos do CSV
      const headers = [
        'Tipo Pessoa',
        'CPF/CNPJ',
        'Razão Social',
        'Nome Fantasia',
        'Inscrição Estadual',
        'Situação',
        'Segmento',
        'Grupo/Rede',
        'CEP',
        'Logradouro',
        'Número',
        'Complemento',
        'Bairro',
        'UF',
        'Município',
        'E-mail',
        'Telefone Fixo',
        'Telefone Celular',
        'Desconto Padrão (%)',
        'Desconto Financeiro (%)',
        'Pedido Mínimo (R$)',
      ];

      // Dados
      const rows = clientes.map((cliente) => [
        cliente.tipoPessoa,
        cliente.cpfCnpj,
        cliente.razaoSocial,
        cliente.nomeFantasia || '',
        cliente.inscricaoEstadual || '',
        cliente.situacao,
        cliente.segmentoMercado,
        cliente.grupoRede || '',
        cliente.cep,
        cliente.logradouro,
        cliente.numero,
        cliente.complemento || '',
        cliente.bairro,
        cliente.uf,
        cliente.municipio,
        cliente.emailPrincipal || '',
        cliente.telefoneFixoPrincipal || '',
        cliente.telefoneCelularPrincipal || '',
        cliente.descontoPadrao,
        cliente.descontoFinanceiro,
        cliente.pedidoMinimo,
      ]);

      // Converter para CSV
      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      // Download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${clientes.length} clientes exportados com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar clientes');
    }
  };

  // Exportar template CSV
  const handleExportarTemplate = () => {
    const headers = [
      'Tipo Pessoa',
      'CPF/CNPJ',
      'Razão Social',
      'Nome Fantasia',
      'Inscrição Estadual',
      'Situação',
      'Segmento',
      'Grupo/Rede',
      'CEP',
      'Logradouro',
      'Número',
      'Complemento',
      'Bairro',
      'UF',
      'Município',
      'E-mail',
      'Telefone Fixo',
      'Telefone Celular',
      'Desconto Padrão (%)',
      'Desconto Financeiro (%)',
      'Pedido Mínimo (R$)',
    ];

    // Linha de exemplo
    const exemplo = [
      'Pessoa Jurídica',
      '11.222.333/0001-44',
      'Empresa Exemplo LTDA',
      'Exemplo',
      '123456789',
      'Ativo',
      'Alimentar',
      'Rede Independente',
      '01310-100',
      'Av. Paulista',
      '1500',
      'Sala 10',
      'Bela Vista',
      'SP',
      'São Paulo',
      'contato@exemplo.com.br',
      '(11) 3000-0000',
      '(11) 90000-0000',
      '5',
      '2',
      '500',
    ];

    const csvContent = [
      headers.join(','),
      exemplo.map((cell) => `"${cell}"`).join(','),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_importacao_clientes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Template baixado com sucesso!');
  };

  // Processar arquivo CSV
  const processarCSV = (texto: string): ResultadoImportacao => {
    const linhas = texto.split('\n').filter((linha) => linha.trim());
    const resultado: ResultadoImportacao = {
      total: linhas.length - 1, // Menos o cabeçalho
      sucesso: 0,
      erros: 0,
      detalhes: [],
    };

    // Processar cada linha (pular cabeçalho)
    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i];
      const colunas = linha.split(',').map((col) => col.replace(/^"|"$/g, '').trim());

      try {
        // Validações básicas
        if (colunas.length < 21) {
          throw new Error('Número insuficiente de colunas');
        }

        const [
          tipoPessoa,
          cpfCnpj,
          razaoSocial,
          nomeFantasia,
          inscricaoEstadual,
          situacao,
          segmento,
          grupoRede,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          uf,
          municipio,
          email,
          telefoneFixo,
          telefoneCelular,
          descontoPadrao,
          descontoFinanceiro,
          pedidoMinimo,
        ] = colunas;

        // Validar campos obrigatórios
        if (!razaoSocial || !cpfCnpj || !cep) {
          throw new Error('Campos obrigatórios não preenchidos');
        }

        // ✅ Buscar primeira empresa disponível
        const empresas = companyService.getAllSync();
        const primeiraEmpresa = empresas.length > 0 ? empresas[0].razaoSocial : undefined;

        // Criar objeto cliente
        const cliente: Partial<Cliente> = {
          id: `cliente-import-${Date.now()}-${i}`,
          tipoPessoa: tipoPessoa as any,
          cpfCnpj,
          razaoSocial,
          nomeFantasia: nomeFantasia || undefined,
          inscricaoEstadual: inscricaoEstadual || undefined,
          situacao: (situacao as any) || 'Ativo',
          segmentoMercado: segmento,
          grupoRede: grupoRede || undefined,
          cep,
          logradouro,
          numero,
          complemento: complemento || undefined,
          bairro,
          uf,
          municipio,
          enderecoEntregaDiferente: false,
          emailPrincipal: email || undefined,
          telefoneFixoPrincipal: telefoneFixo || undefined,
          telefoneCelularPrincipal: telefoneCelular || undefined,
          pessoasContato: [],
          vendedorAtribuido: undefined,
          descontoPadrao: parseFloat(descontoPadrao) || 0,
          descontoFinanceiro: parseFloat(descontoFinanceiro) || 0,
          condicoesPagamentoAssociadas: [],
          pedidoMinimo: parseFloat(pedidoMinimo) || 0,
          empresaFaturamento: primeiraEmpresa, // ✅ Usa primeira empresa disponível
          dataCadastro: new Date().toISOString(),
          dataAtualizacao: new Date().toISOString(),
          criadoPor: usuario?.nome || 'Sistema',
          atualizadoPor: usuario?.nome || 'Sistema',
        };

        resultado.sucesso++;
        resultado.detalhes.push({
          linha: i + 1,
          status: 'sucesso',
          mensagem: `Cliente "${razaoSocial}" importado com sucesso`,
          dados: cliente,
        });
      } catch (error) {
        resultado.erros++;
        resultado.detalhes.push({
          linha: i + 1,
          status: 'erro',
          mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return resultado;
  };

  // Importar arquivo
  const handleImportarArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    setProcessando(true);
    setProgresso(0);
    setDialogAberto(true);

    try {
      // Ler arquivo
      const texto = await file.text();

      // Simular progresso
      for (let i = 0; i <= 100; i += 10) {
        setProgresso(i);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Processar CSV
      const resultadoImportacao = processarCSV(texto);
      setResultado(resultadoImportacao);

      // Registrar no histórico
      if (usuario) {
        historyService.registrarImportacao(
          resultadoImportacao.total,
          resultadoImportacao.sucesso,
          resultadoImportacao.erros,
          usuario.id,
          usuario.nome
        );
      }

      // Callback com clientes importados
      const clientesImportados = resultadoImportacao.detalhes
        .filter((d) => d.status === 'sucesso' && d.dados)
        .map((d) => d.dados!);

      if (onImportComplete && clientesImportados.length > 0) {
        onImportComplete(clientesImportados);
      }

      if (resultadoImportacao.erros === 0) {
        toast.success(
          `${resultadoImportacao.sucesso} cliente(s) importado(s) com sucesso!`
        );
      } else {
        toast.warning(
          `Importação concluída com ${resultadoImportacao.erros} erro(s)`
        );
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao processar arquivo');
    } finally {
      setProcessando(false);
      setProgresso(100);
      
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card de Exportação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Clientes
            </CardTitle>
            <CardDescription>
              Baixe a lista de clientes em formato CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleExportarCSV} className="w-full" variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar {clientes.length} Cliente(s)
            </Button>
            <Button onClick={handleExportarTemplate} className="w-full" variant="ghost">
              <Download className="h-4 w-4 mr-2" />
              Baixar Template de Importação
            </Button>
          </CardContent>
        </Card>

        {/* Card de Importação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Clientes
            </CardTitle>
            <CardDescription>
              Importe clientes em lote a partir de um arquivo CSV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportarArquivo}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild className="w-full">
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Arquivo CSV
                </span>
              </Button>
            </label>
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Antes de importar, baixe o template para garantir que o arquivo está no formato correto.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Progresso/Resultado */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {processando ? 'Importando Clientes...' : 'Resultado da Importação'}
            </DialogTitle>
            <DialogDescription>
              {processando
                ? 'Por favor, aguarde enquanto processamos o arquivo'
                : 'Resumo da importação'}
            </DialogDescription>
          </DialogHeader>

          {processando && (
            <div className="space-y-4 py-4">
              <Progress value={progresso} />
              <p className="text-center text-sm text-muted-foreground">
                {progresso}% concluído
              </p>
            </div>
          )}

          {!processando && resultado && (
            <div className="space-y-4 py-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold">{resultado.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {resultado.sucesso}
                    </div>
                    <div className="text-sm text-muted-foreground">Sucesso</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {resultado.erros}
                    </div>
                    <div className="text-sm text-muted-foreground">Erros</div>
                  </CardContent>
                </Card>
              </div>

              {/* Detalhes */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {resultado.detalhes.map((detalhe, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      detalhe.status === 'sucesso'
                        ? 'bg-green-50 border-green-200'
                        : detalhe.status === 'erro'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    {detalhe.status === 'sucesso' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : detalhe.status === 'erro' ? (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          Linha {detalhe.linha}
                        </Badge>
                      </div>
                      <p className="text-sm">{detalhe.mensagem}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setDialogAberto(false)} disabled={processando}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
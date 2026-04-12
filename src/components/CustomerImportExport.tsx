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
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Mapeamento de variações de nomes de colunas → nome padrão do template
const COLUMN_MAP: Record<string, string> = {
  'tipo pessoa': 'Tipo Pessoa',
  'tipo de pessoa': 'Tipo Pessoa',
  'cpf/cnpj': 'CPF/CNPJ',
  'cpf cnpj': 'CPF/CNPJ',
  'cnpj': 'CPF/CNPJ',
  'cpf': 'CPF/CNPJ',
  'razão social': 'Razão Social',
  'razao social': 'Razão Social',
  'nome': 'Razão Social',
  'nome fantasia': 'Nome Fantasia',
  'fantasia': 'Nome Fantasia',
  'inscrição estadual': 'Inscrição Estadual',
  'inscricao estadual': 'Inscrição Estadual',
  'ie': 'Inscrição Estadual',
  'situação': 'Situação',
  'situacao': 'Situação',
  'status': 'Situação',
  'segmento': 'Segmento',
  'segmento mercado': 'Segmento',
  'segmento de mercado': 'Segmento',
  'grupo/rede': 'Grupo/Rede',
  'grupo rede': 'Grupo/Rede',
  'grupo': 'Grupo/Rede',
  'rede': 'Grupo/Rede',
  'cep': 'CEP',
  'logradouro': 'Logradouro',
  'rua': 'Logradouro',
  'endereço': 'Logradouro',
  'endereco': 'Logradouro',
  'número': 'Número',
  'numero': 'Número',
  'nº': 'Número',
  'complemento': 'Complemento',
  'bairro': 'Bairro',
  'uf': 'UF',
  'estado': 'UF',
  'município': 'Município',
  'municipio': 'Município',
  'cidade': 'Município',
  'e-mail': 'E-mail',
  'email': 'E-mail',
  'email principal': 'E-mail',
  'telefone fixo': 'Telefone Fixo',
  'fone fixo': 'Telefone Fixo',
  'telefone': 'Telefone Fixo',
  'telefone celular': 'Telefone Celular',
  'celular': 'Telefone Celular',
  'desconto padrão (%)': 'Desconto Padrão (%)',
  'desconto padrao (%)': 'Desconto Padrão (%)',
  'desconto padrão': 'Desconto Padrão (%)',
  'desconto padrao': 'Desconto Padrão (%)',
  'desconto financeiro (%)': 'Desconto Financeiro (%)',
  'desconto financeiro': 'Desconto Financeiro (%)',
  'pedido mínimo (r$)': 'Pedido Mínimo (R$)',
  'pedido minimo (r$)': 'Pedido Mínimo (R$)',
  'pedido mínimo': 'Pedido Mínimo (R$)',
  'pedido minimo': 'Pedido Mínimo (R$)',
};

const TEMPLATE_COLUMNS = [
  'Tipo Pessoa', 'CPF/CNPJ', 'Razão Social', 'Nome Fantasia', 'Inscrição Estadual',
  'Situação', 'Segmento', 'Grupo/Rede', 'CEP', 'Logradouro', 'Número',
  'Complemento', 'Bairro', 'UF', 'Município', 'E-mail', 'Telefone Fixo',
  'Telefone Celular', 'Desconto Padrão (%)', 'Desconto Financeiro (%)', 'Pedido Mínimo (R$)',
];

const REQUIRED_FIELDS = ['Razão Social', 'CPF/CNPJ', 'CEP'];

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

interface PreviewData {
  rows: Record<string, string>[];
  mappedCols: string[];
  unmappedCols: string[];
  columnMapping: Record<string, string>;
  validationErrors: Array<{ row: number; message: string }>;
  fileName: string;
}

function parseFile(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const firstLine = text.split('\n')[0];
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const separator = semicolons > commas ? ';' : ',';

  const lines = text.split('\n').filter(l => l.trim());
  const headers = lines[0].split(separator).map(h => h.replace(/^"|"$/g, '').replace(/^\uFEFF/, '').trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map(v => v.replace(/^"|"$/g, '').trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return { headers, rows };
}

function buildColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const normalized = header.trim().toLowerCase().replace(/\s+/g, ' ');
    if (COLUMN_MAP[normalized]) {
      mapping[header] = COLUMN_MAP[normalized];
    }
  }
  return mapping;
}

function getMappedValue(row: Record<string, string>, targetCol: string, columnMapping: Record<string, string>): string {
  for (const [origCol, mappedCol] of Object.entries(columnMapping)) {
    if (mappedCol === targetCol && row[origCol]) return row[origCol];
  }
  return '';
}

export function CustomerImportExport({ clientes, onImportComplete }: CustomerImportExportProps) {
  const { usuario } = useAuth();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exportar clientes para CSV
  const handleExportarCSV = () => {
    try {
      const headers = TEMPLATE_COLUMNS;
      const rows = clientes.map((cliente) => [
        cliente.tipoPessoa, cliente.cpfCnpj, cliente.razaoSocial,
        cliente.nomeFantasia || '', cliente.inscricaoEstadual || '',
        cliente.situacao, cliente.segmentoMercado, cliente.grupoRede || '',
        cliente.cep, cliente.logradouro, cliente.numero, cliente.complemento || '',
        cliente.bairro, cliente.uf, cliente.municipio, cliente.emailPrincipal || '',
        cliente.telefoneFixoPrincipal || '', cliente.telefoneCelularPrincipal || '',
        cliente.descontoPadrao, cliente.descontoFinanceiro, cliente.pedidoMinimo,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success(`${clientes.length} clientes exportados com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar clientes');
    }
  };

  // Exportar template CSV
  const handleExportarTemplate = () => {
    const exemplo = [
      'Pessoa Jurídica', '11.222.333/0001-44', 'Empresa Exemplo LTDA', 'Exemplo',
      '123456789', 'Ativo', 'Alimentar', 'Rede Independente', '01310-100',
      'Av. Paulista', '1500', 'Sala 10', 'Bela Vista', 'SP', 'São Paulo',
      'contato@exemplo.com.br', '(11) 3000-0000', '(11) 90000-0000', '5', '2', '500',
    ];
    const csvContent = [
      TEMPLATE_COLUMNS.join(','),
      exemplo.map((cell) => `"${cell}"`).join(','),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_importacao_clientes.csv';
    link.click();
    toast.success('Template baixado com sucesso!');
  };

  // Step 1: Ler arquivo e mostrar preview
  const handleSelecionarArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const { headers, rows } = parseFile(text);

      if (rows.length === 0) {
        toast.error('Arquivo vazio ou sem dados');
        return;
      }

      const columnMapping = buildColumnMapping(headers);
      const mappedCols = Object.keys(columnMapping);
      const unmappedCols = headers.filter(h => !columnMapping[h]);

      // Validar linhas
      const validationErrors: Array<{ row: number; message: string }> = [];
      rows.forEach((row, idx) => {
        const missing = REQUIRED_FIELDS.filter(f => !getMappedValue(row, f, columnMapping));
        if (missing.length > 0) {
          validationErrors.push({ row: idx + 2, message: `Campos obrigatórios vazios: ${missing.join(', ')}` });
        }
      });

      setPreview({ rows, mappedCols, unmappedCols, columnMapping, validationErrors, fileName: file.name });
      setResultado(null);
      setDialogAberto(true);
    } catch (error) {
      toast.error('Erro ao ler arquivo');
      console.error(error);
    } finally {
      event.target.value = '';
    }
  };

  // Step 2: Confirmar importação
  const handleConfirmarImportacao = async () => {
    if (!preview) return;

    setProcessando(true);
    setProgresso(0);

    try {
      const resultado: ResultadoImportacao = { total: preview.rows.length, sucesso: 0, erros: 0, detalhes: [] };
      const empresas = companyService.getAllSync();
      const primeiraEmpresa = empresas.length > 0 ? empresas[0].razaoSocial : undefined;
      const errorRows = new Set(preview.validationErrors.map(e => e.row));

      for (let i = 0; i < preview.rows.length; i++) {
        const rowNum = i + 2;
        setProgresso(Math.round(((i + 1) / preview.rows.length) * 100));

        if (errorRows.has(rowNum)) {
          resultado.erros++;
          const errMsg = preview.validationErrors.find(e => e.row === rowNum)?.message || 'Erro de validação';
          resultado.detalhes.push({ linha: rowNum, status: 'erro', mensagem: errMsg });
          continue;
        }

        try {
          const row = preview.rows[i];
          const get = (col: string) => getMappedValue(row, col, preview.columnMapping);

          const cliente: Partial<Cliente> = {
            id: `cliente-import-${Date.now()}-${i}`,
            tipoPessoa: (get('Tipo Pessoa') as any) || 'Pessoa Jurídica',
            cpfCnpj: get('CPF/CNPJ'),
            razaoSocial: get('Razão Social'),
            nomeFantasia: get('Nome Fantasia') || undefined,
            inscricaoEstadual: get('Inscrição Estadual') || undefined,
            situacao: (get('Situação') as any) || 'Ativo',
            segmentoMercado: get('Segmento'),
            grupoRede: get('Grupo/Rede') || undefined,
            cep: get('CEP'),
            logradouro: get('Logradouro'),
            numero: get('Número'),
            complemento: get('Complemento') || undefined,
            bairro: get('Bairro'),
            uf: get('UF'),
            municipio: get('Município'),
            enderecoEntregaDiferente: false,
            emailPrincipal: get('E-mail') || undefined,
            telefoneFixoPrincipal: get('Telefone Fixo') || undefined,
            telefoneCelularPrincipal: get('Telefone Celular') || undefined,
            pessoasContato: [],
            vendedorAtribuido: undefined,
            descontoPadrao: parseFloat(get('Desconto Padrão (%)')) || 0,
            descontoFinanceiro: parseFloat(get('Desconto Financeiro (%)')) || 0,
            condicoesPagamentoAssociadas: [],
            pedidoMinimo: parseFloat(get('Pedido Mínimo (R$)')) || 0,
            empresaFaturamento: primeiraEmpresa,
            dataCadastro: new Date().toISOString(),
            dataAtualizacao: new Date().toISOString(),
            criadoPor: usuario?.nome || 'Sistema',
            atualizadoPor: usuario?.nome || 'Sistema',
          };

          resultado.sucesso++;
          resultado.detalhes.push({ linha: rowNum, status: 'sucesso', mensagem: `Cliente "${get('Razão Social')}" importado`, dados: cliente });
        } catch (error) {
          resultado.erros++;
          resultado.detalhes.push({ linha: rowNum, status: 'erro', mensagem: error instanceof Error ? error.message : 'Erro' });
        }
      }

      setResultado(resultado);
      setPreview(null);

      if (usuario) {
        historyService.registrarImportacao(resultado.total, resultado.sucesso, resultado.erros, usuario.id, usuario.nome);
      }

      const clientesImportados = resultado.detalhes.filter(d => d.status === 'sucesso' && d.dados).map(d => d.dados!);
      if (onImportComplete && clientesImportados.length > 0) {
        onImportComplete(clientesImportados);
      }

      if (resultado.erros === 0) {
        toast.success(`${resultado.sucesso} cliente(s) importado(s) com sucesso!`);
      } else {
        toast.warning(`Importação concluída com ${resultado.erros} erro(s)`);
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao processar importação');
    } finally {
      setProcessando(false);
      setProgresso(100);
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
              Importe clientes em lote a partir de qualquer arquivo CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleSelecionarArquivo}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild className="w-full">
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Arquivo
                </span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground text-center">
              Aceita qualquer CSV — o sistema adapta colunas e separadores automaticamente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Preview / Progresso / Resultado */}
      <Dialog open={dialogAberto} onOpenChange={(open) => { if (!processando) { setDialogAberto(open); if (!open) { setPreview(null); setResultado(null); } } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          {/* PREVIEW */}
          {preview && !processando && !resultado && (
            <>
              <DialogHeader>
                <DialogTitle>Preview da Importação</DialogTitle>
                <DialogDescription>
                  Arquivo: <span className="font-mono">{preview.fileName}</span> — {preview.rows.length} {preview.rows.length === 1 ? 'registro' : 'registros'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Resumo de mapeamento */}
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{preview.rows.length}</div>
                      <div className="text-xs text-muted-foreground">Registros</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{preview.mappedCols.length}</div>
                      <div className="text-xs text-muted-foreground">Colunas mapeadas</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-orange-500">{preview.unmappedCols.length}</div>
                      <div className="text-xs text-muted-foreground">Colunas ignoradas</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Colunas mapeadas */}
                <div>
                  <p className="text-sm font-medium mb-2">Colunas reconhecidas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.mappedCols.map((col) => (
                      <Badge key={col} variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        {col} → {preview.columnMapping[col]}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Colunas ignoradas */}
                {preview.unmappedCols.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Colunas ignoradas (não serão importadas):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {preview.unmappedCols.map((col) => (
                        <Badge key={col} variant="outline" className="text-orange-600 border-orange-300 text-xs">
                          {col}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Erros de validação */}
                {preview.validationErrors.length > 0 && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800 text-sm">
                      <p className="font-medium">{preview.validationErrors.length} registro(s) com erro (não serão importados):</p>
                      <div className="mt-1 max-h-24 overflow-y-auto space-y-0.5">
                        {preview.validationErrors.slice(0, 5).map((e, idx) => (
                          <p key={idx} className="text-xs">Linha {e.row}: {e.message}</p>
                        ))}
                        {preview.validationErrors.length > 5 && (
                          <p className="text-xs opacity-75">... e mais {preview.validationErrors.length - 5}</p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Preview dos dados */}
                <div>
                  <p className="text-sm font-medium mb-2">Preview (primeiras 5 linhas):</p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium">#</th>
                          {['Razão Social', 'CPF/CNPJ', 'Município', 'UF', 'Situação'].map(col => (
                            <th key={col} className="px-2 py-1.5 text-left font-medium">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 5).map((row, idx) => {
                          const hasError = preview.validationErrors.some(e => e.row === idx + 2);
                          return (
                            <tr key={idx} className={hasError ? 'bg-red-50' : idx % 2 ? 'bg-muted/30' : ''}>
                              <td className="px-2 py-1.5 font-mono text-muted-foreground">{idx + 2}</td>
                              {['Razão Social', 'CPF/CNPJ', 'Município', 'UF', 'Situação'].map(col => (
                                <td key={col} className="px-2 py-1.5">{getMappedValue(row, col, preview.columnMapping) || '-'}</td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {preview.rows.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                      ... e mais {preview.rows.length - 5} registros
                    </p>
                  )}
                </div>
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  A importação em lote não verifica CPF/CNPJ duplicado. Confira manualmente antes de importar.
                </AlertDescription>
              </Alert>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setDialogAberto(false); setPreview(null); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmarImportacao}
                  disabled={preview.rows.length === preview.validationErrors.length}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Confirmar Importação ({preview.rows.length - preview.validationErrors.length} registros)
                </Button>
              </DialogFooter>
            </>
          )}

          {/* PROGRESSO */}
          {processando && (
            <>
              <DialogHeader>
                <DialogTitle>Importando Clientes...</DialogTitle>
                <DialogDescription>Por favor, aguarde enquanto processamos o arquivo</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Progress value={progresso} />
                <p className="text-center text-sm text-muted-foreground">{progresso}% concluído</p>
              </div>
            </>
          )}

          {/* RESULTADO */}
          {!processando && resultado && (
            <>
              <DialogHeader>
                <DialogTitle>Resultado da Importação</DialogTitle>
                <DialogDescription>Resumo da importação</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold">{resultado.total}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold text-green-600">{resultado.sucesso}</div>
                      <div className="text-sm text-muted-foreground">Sucesso</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold text-red-600">{resultado.erros}</div>
                      <div className="text-sm text-muted-foreground">Erros</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {resultado.detalhes.map((detalhe, index) => (
                    <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${
                      detalhe.status === 'sucesso' ? 'bg-green-50 border-green-200'
                        : detalhe.status === 'erro' ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      {detalhe.status === 'sucesso' ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : detalhe.status === 'erro' ? (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="text-xs mb-1">Linha {detalhe.linha}</Badge>
                        <p className="text-sm">{detalhe.mensagem}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setDialogAberto(false)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

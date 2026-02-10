import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Eye, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: number;
  errors: Array<{ row: number; message: string }>;
}

interface PreviewData {
  data: any[];
  fileName: string;
  validationErrors: Array<{ row: number; message: string }>;
}

export function ImportSalesData() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const generateTemplate = () => {
    const template = [
      {
        'Número Pedido': 'PED-2024-001',
        'Data Pedido (DD/MM/AAAA)': '01/01/2024',
        'CNPJ Cliente': '12.345.678/0001-90',
        'Nome Cliente': 'Empresa Exemplo Ltda',
        'Vendedor (Email)': 'vendedor@empresa.com',
        'Empresa Faturamento': 'Empresa Principal',
        'Natureza Operação': 'Venda',
        'Lista de Preço': 'Tabela Padrão',
        'Condição Pagamento': '30 dias',
        'Status': 'Aprovado',
        'SKU Produto 1': 'PROD-001',
        'Descrição Produto 1': 'Produto Exemplo',
        'Quantidade 1': 10,
        'Valor Unitário 1': 100.00,
        'SKU Produto 2': '',
        'Quantidade 2': '',
        'Valor Unitário 2': '',
        'SKU Produto 3': '',
        'Quantidade 3': '',
        'Valor Unitário 3': '',
        'Desconto Extra (%)': 0,
        'Ordem Compra Cliente': 'OC-12345',
        'Observações Internas': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas');

    const colWidths = [
      { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 25 },
      { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 18 }, { wch: 30 },
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'modelo_importacao_vendas.xlsx');
  };

  const validateRow = (row: any, rowNumber: number): string | null => {
    if (!row['Número Pedido']) return 'Número do pedido é obrigatório';
    if (!row['Data Pedido (DD/MM/AAAA)']) return 'Data do pedido é obrigatória';
    if (!row['CNPJ Cliente']) return 'CNPJ do cliente é obrigatório';
    if (!row['Nome Cliente']) return 'Nome do cliente é obrigatório';
    if (!row['Vendedor (Email)']) return 'Email do vendedor é obrigatório';
    if (!row['SKU Produto 1'] || !row['Quantidade 1'] || !row['Valor Unitário 1']) {
      return 'É necessário pelo menos 1 produto com SKU, quantidade e valor';
    }
    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const errors: Array<{ row: number; message: string }> = [];

      jsonData.forEach((row: any, index: number) => {
        const rowNumber = index + 2;
        const error = validateRow(row, rowNumber);
        if (error) {
          errors.push({ row: rowNumber, message: error });
        }
      });

      setPreview({
        data: jsonData,
        fileName: file.name,
        validationErrors: errors,
      });
      setShowPreview(true);
      setResult(null);

    } catch (error) {
      setResult({ 
        success: 0, 
        errors: [{ row: 0, message: 'Erro ao ler arquivo: ' + (error as Error).message }] 
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;

    setImporting(true);

    try {
      // Simular importação
      await new Promise(resolve => setTimeout(resolve, 1500));

      const successCount = preview.data.length - preview.validationErrors.length;

      setResult({ 
        success: successCount, 
        errors: preview.validationErrors 
      });
      setShowPreview(false);
      setPreview(null);

    } catch (error) {
      setResult({ 
        success: 0, 
        errors: [{ row: 0, message: 'Erro ao importar: ' + (error as Error).message }] 
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreview(null);
  };

  if (showPreview && preview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview da Importação - Vendas
          </CardTitle>
          <CardDescription>
            Arquivo: <span className="font-mono">{preview.fileName}</span> • {preview.data.length} {preview.data.length === 1 ? 'registro' : 'registros'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alertas de Validação */}
          {preview.validationErrors.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <p className="font-medium mb-2">
                  {preview.validationErrors.length} {preview.validationErrors.length === 1 ? 'erro encontrado' : 'erros encontrados'}
                </p>
                <p className="text-sm">
                  Os registros com erro não serão importados. Corrija o arquivo e tente novamente, ou prossiga com a importação dos registros válidos.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{preview.data.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{preview.data.length - preview.validationErrors.length}</p>
              <p className="text-sm text-muted-foreground">Válidos</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{preview.validationErrors.length}</p>
              <p className="text-sm text-muted-foreground">Com Erro</p>
            </div>
          </div>

          {/* Preview dos Dados */}
          <div>
            <h4 className="font-medium mb-2">Preview dos Dados (primeiras 10 linhas)</h4>
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Validação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.data.slice(0, 10).map((row: any, idx: number) => {
                    const rowNumber = idx + 2;
                    const hasError = preview.validationErrors.some(e => e.row === rowNumber);
                    const error = preview.validationErrors.find(e => e.row === rowNumber);
                    
                    return (
                      <TableRow key={idx} className={hasError ? 'bg-red-50' : ''}>
                        <TableCell className="font-mono text-sm">{rowNumber}</TableCell>
                        <TableCell className="font-mono text-sm">{row['Número Pedido']}</TableCell>
                        <TableCell>{row['Data Pedido (DD/MM/AAAA)']}</TableCell>
                        <TableCell>{row['Nome Cliente']}</TableCell>
                        <TableCell>{row['Vendedor (Email)']}</TableCell>
                        <TableCell>
                          {row['Status'] && <Badge variant="outline">{row['Status']}</Badge>}
                        </TableCell>
                        <TableCell>
                          {hasError ? (
                            <Badge variant="destructive" className="text-xs">
                              Erro
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              OK
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
            {preview.data.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                ... e mais {preview.data.length - 10} {preview.data.length - 10 === 1 ? 'registro' : 'registros'}
              </p>
            )}
          </div>

          {/* Erros Detalhados */}
          {preview.validationErrors.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Erros Encontrados</h4>
              <ScrollArea className="h-[200px] border rounded-lg p-4">
                <div className="space-y-2">
                  {preview.validationErrors.map((error, idx) => (
                    <div key={idx} className="flex gap-2 text-sm">
                      <span className="font-mono text-red-600 font-medium">Linha {error.row}:</span>
                      <span>{error.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancelPreview}
              disabled={importing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={importing || preview.data.length === preview.validationErrors.length}
              className="flex items-center gap-2"
            >
              {importing ? (
                'Importando...'
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Confirmar Importação
                  {preview.validationErrors.length === 0 && ` (${preview.data.length})`}
                  {preview.validationErrors.length > 0 && ` (${preview.data.length - preview.validationErrors.length} de ${preview.data.length})`}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Vendas
        </CardTitle>
        <CardDescription>
          Importe vendas anteriores em massa via planilha Excel para compor seus dados e estatísticas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={generateTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar Planilha Modelo
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={importing}
            />
            <Button
              disabled={importing}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Selecionar Arquivo para Preview
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-3">
            {result.success > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {result.success} {result.success === 1 ? 'venda importada' : 'vendas importadas'} com sucesso!
                </AlertDescription>
              </Alert>
            )}

            {result.errors.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="space-y-1">
                    <p className="font-medium mb-2">
                      {result.errors.length} {result.errors.length === 1 ? 'erro encontrado' : 'erros encontrados'}:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                      {result.errors.slice(0, 10).map((error, idx) => (
                        <div key={idx}>
                          <strong>Linha {error.row}:</strong> {error.message}
                        </div>
                      ))}
                      {result.errors.length > 10 && (
                        <div className="text-xs opacity-75 mt-2">
                          ... e mais {result.errors.length - 10} erros
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          <p className="font-medium mb-2">Instruções:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Baixe a planilha modelo</li>
            <li>Preencha os dados das vendas conforme o exemplo</li>
            <li>Selecione o arquivo para visualizar um preview dos dados</li>
            <li>Revise os dados e confirme a importação</li>
            <li>Você pode adicionar até 3 produtos por venda na planilha</li>
            <li>Status disponíveis: Rascunho, Em Análise, Em aberto, Aprovado, Preparando envio, Faturado, Pronto para envio, Enviado, Entregue, Não Entregue, Cancelado</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

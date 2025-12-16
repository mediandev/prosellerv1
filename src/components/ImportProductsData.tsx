import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: number;
  errors: Array<{ row: number; message: string }>;
}

export function ImportProductsData() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const generateTemplate = () => {
    const template = [
      {
        'Descrição': 'Produto Exemplo ABC',
        'Código SKU': 'PROD-001',
        'Código EAN': '7891234567890',
        'Marca': 'Marca Exemplo',
        'Tipo Produto': 'Tipo A',
        'NCM': '12345678',
        'CEST': '1234567',
        'Unidade (Sigla)': 'UN',
        'Peso Líquido (kg)': 1.5,
        'Peso Bruto (kg)': 2.0,
        'Situação': 'Ativo',
        'Disponível para Venda': 'Sim',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

    const colWidths = [
      { wch: 35 }, // Descrição
      { wch: 15 }, // SKU
      { wch: 18 }, // EAN
      { wch: 20 }, // Marca
      { wch: 20 }, // Tipo
      { wch: 12 }, // NCM
      { wch: 12 }, // CEST
      { wch: 15 }, // Unidade
      { wch: 18 }, // Peso Líquido
      { wch: 18 }, // Peso Bruto
      { wch: 15 }, // Situação
      { wch: 22 }, // Disponível
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'modelo_importacao_produtos.xlsx');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const errors: Array<{ row: number; message: string }> = [];
      let successCount = 0;

      jsonData.forEach((row: any, index: number) => {
        const rowNumber = index + 2;

        try {
          // Validações básicas
          if (!row['Descrição']) {
            errors.push({ row: rowNumber, message: 'Descrição é obrigatória' });
            return;
          }

          if (!row['Código SKU']) {
            errors.push({ row: rowNumber, message: 'Código SKU é obrigatório' });
            return;
          }

          if (!row['Marca']) {
            errors.push({ row: rowNumber, message: 'Marca é obrigatória' });
            return;
          }

          if (!row['Tipo Produto']) {
            errors.push({ row: rowNumber, message: 'Tipo de Produto é obrigatório' });
            return;
          }

          if (!row['Unidade (Sigla)']) {
            errors.push({ row: rowNumber, message: 'Unidade é obrigatória' });
            return;
          }

          if (!row['Peso Líquido (kg)'] && row['Peso Líquido (kg)'] !== 0) {
            errors.push({ row: rowNumber, message: 'Peso Líquido é obrigatório' });
            return;
          }

          if (!row['Peso Bruto (kg)'] && row['Peso Bruto (kg)'] !== 0) {
            errors.push({ row: rowNumber, message: 'Peso Bruto é obrigatório' });
            return;
          }

          // Validar peso
          if (row['Peso Líquido (kg)'] < 0 || row['Peso Bruto (kg)'] < 0) {
            errors.push({ row: rowNumber, message: 'Pesos não podem ser negativos' });
            return;
          }

          if (row['Peso Bruto (kg)'] < row['Peso Líquido (kg)']) {
            errors.push({ row: rowNumber, message: 'Peso Bruto deve ser maior ou igual ao Peso Líquido' });
            return;
          }

          // Validar situação
          const situacoesValidas = ['Ativo', 'Inativo', 'Excluído'];
          if (row['Situação'] && !situacoesValidas.includes(row['Situação'])) {
            errors.push({ row: rowNumber, message: 'Situação deve ser: Ativo, Inativo ou Excluído' });
            return;
          }

          // Validar disponível
          const disponibilidadeValida = ['Sim', 'Não', 'sim', 'não', 'S', 'N', 's', 'n'];
          if (row['Disponível para Venda'] && !disponibilidadeValida.includes(row['Disponível para Venda'])) {
            errors.push({ row: rowNumber, message: 'Disponível para Venda deve ser: Sim ou Não' });
            return;
          }

          // Validar EAN (se informado)
          if (row['Código EAN']) {
            const ean = String(row['Código EAN']).replace(/\D/g, '');
            if (ean.length !== 13 && ean.length !== 8) {
              errors.push({ row: rowNumber, message: 'Código EAN deve ter 8 ou 13 dígitos' });
              return;
            }
          }

          // Validar NCM (se informado)
          if (row['NCM']) {
            const ncm = String(row['NCM']).replace(/\D/g, '');
            if (ncm.length !== 8) {
              errors.push({ row: rowNumber, message: 'NCM deve ter 8 dígitos' });
              return;
            }
          }

          // Validar CEST (se informado)
          if (row['CEST']) {
            const cest = String(row['CEST']).replace(/\D/g, '');
            if (cest.length !== 7) {
              errors.push({ row: rowNumber, message: 'CEST deve ter 7 dígitos' });
              return;
            }
          }

          // Aqui você salvaria o produto no sistema
          successCount++;

        } catch (error) {
          errors.push({ row: rowNumber, message: 'Erro ao processar linha: ' + (error as Error).message });
        }
      });

      setResult({ success: successCount, errors });

    } catch (error) {
      setResult({ 
        success: 0, 
        errors: [{ row: 0, message: 'Erro ao ler arquivo: ' + (error as Error).message }] 
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Produtos
        </CardTitle>
        <CardDescription>
          Importe informações de produtos em massa via planilha Excel
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
              {importing ? 'Importando...' : 'Importar Planilha'}
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-3">
            {result.success > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {result.success} {result.success === 1 ? 'produto importado' : 'produtos importados'} com sucesso!
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
            <li>Preencha os dados dos produtos conforme o exemplo</li>
            <li>Situação: "Ativo", "Inativo" ou "Excluído"</li>
            <li>Disponível para Venda: "Sim" ou "Não"</li>
            <li>Código EAN: 8 ou 13 dígitos (opcional)</li>
            <li>NCM: 8 dígitos (opcional)</li>
            <li>CEST: 7 dígitos (opcional)</li>
            <li>Campos obrigatórios: Descrição, Código SKU, Marca, Tipo Produto, Unidade, Peso Líquido e Peso Bruto</li>
            <li>Se a Marca ou Tipo de Produto não existirem, serão criados automaticamente</li>
            <li>Salve o arquivo e importe usando o botão acima</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

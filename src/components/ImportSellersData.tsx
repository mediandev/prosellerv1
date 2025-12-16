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

export function ImportSellersData() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const generateTemplate = () => {
    const template = [
      {
        'Nome': 'João da Silva',
        'Iniciais': 'JS',
        'CPF': '123.456.789-00',
        'Email': 'joao.silva@empresa.com',
        'Telefone': '(11) 99999-9999',
        'Data Admissão (DD/MM/AAAA)': '01/01/2024',
        'Status': 'ativo',
        'CNPJ': '12.345.678/0001-90',
        'Razão Social': 'João da Silva ME',
        'Nome Fantasia': 'JS Representações',
        'Inscrição Estadual': '123.456.789.012',
        'CEP': '01310-100',
        'Logradouro': 'Avenida Paulista',
        'Número': '1000',
        'Complemento': 'Sala 10',
        'Bairro': 'Bela Vista',
        'UF': 'SP',
        'Município': 'São Paulo',
        'Banco': '001 - Banco do Brasil',
        'Agência': '1234',
        'Dígito Agência': '5',
        'Tipo Conta': 'corrente',
        'Número Conta': '12345',
        'Dígito Conta': '6',
        'Nome Titular': 'João da Silva',
        'CPF/CNPJ Titular': '123.456.789-00',
        'Tipo Chave PIX': 'cpf_cnpj',
        'Chave PIX': '12345678900',
        'Regra Comissão': 'aliquota_fixa',
        'Alíquota Fixa (%)': 5,
        'Criar Usuário': 'Sim',
        'Observações Internas': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendedores');

    const colWidths = [
      { wch: 25 }, // Nome
      { wch: 10 }, // Iniciais
      { wch: 18 }, // CPF
      { wch: 30 }, // Email
      { wch: 18 }, // Telefone
      { wch: 22 }, // Data Admissão
      { wch: 12 }, // Status
      { wch: 20 }, // CNPJ
      { wch: 35 }, // Razão Social
      { wch: 25 }, // Nome Fantasia
      { wch: 20 }, // IE
      { wch: 12 }, // CEP
      { wch: 30 }, // Logradouro
      { wch: 10 }, // Número
      { wch: 20 }, // Complemento
      { wch: 20 }, // Bairro
      { wch: 5 }, // UF
      { wch: 25 }, // Município
      { wch: 25 }, // Banco
      { wch: 10 }, // Agência
      { wch: 12 }, // Dígito Agência
      { wch: 15 }, // Tipo Conta
      { wch: 12 }, // Número Conta
      { wch: 12 }, // Dígito Conta
      { wch: 25 }, // Nome Titular
      { wch: 20 }, // CPF/CNPJ Titular
      { wch: 15 }, // Tipo Chave PIX
      { wch: 25 }, // Chave PIX
      { wch: 18 }, // Regra Comissão
      { wch: 15 }, // Alíquota Fixa
      { wch: 15 }, // Criar Usuário
      { wch: 30 }, // Observações
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'modelo_importacao_vendedores.xlsx');
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
          if (!row['Nome']) {
            errors.push({ row: rowNumber, message: 'Nome é obrigatório' });
            return;
          }

          if (!row['CPF']) {
            errors.push({ row: rowNumber, message: 'CPF é obrigatório' });
            return;
          }

          if (!row['Email']) {
            errors.push({ row: rowNumber, message: 'Email é obrigatório' });
            return;
          }

          // Validar formato de email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row['Email'])) {
            errors.push({ row: rowNumber, message: 'Email inválido' });
            return;
          }

          if (!row['Telefone']) {
            errors.push({ row: rowNumber, message: 'Telefone é obrigatório' });
            return;
          }

          if (!row['Data Admissão (DD/MM/AAAA)']) {
            errors.push({ row: rowNumber, message: 'Data de Admissão é obrigatória' });
            return;
          }

          // Validar status
          const statusValidos = ['ativo', 'inativo', 'excluido'];
          if (row['Status'] && !statusValidos.includes(row['Status'])) {
            errors.push({ row: rowNumber, message: 'Status deve ser: ativo, inativo ou excluido' });
            return;
          }

          // Validar tipo de conta
          const tiposContaValidos = ['corrente', 'poupanca', 'salario', 'pagamento'];
          if (row['Tipo Conta'] && !tiposContaValidos.includes(row['Tipo Conta'])) {
            errors.push({ row: rowNumber, message: 'Tipo Conta deve ser: corrente, poupanca, salario ou pagamento' });
            return;
          }

          // Validar tipo de chave PIX
          const tiposChavePixValidos = ['cpf_cnpj', 'email', 'telefone', 'aleatoria'];
          if (row['Tipo Chave PIX'] && !tiposChavePixValidos.includes(row['Tipo Chave PIX'])) {
            errors.push({ row: rowNumber, message: 'Tipo Chave PIX deve ser: cpf_cnpj, email, telefone ou aleatoria' });
            return;
          }

          // Validar regra de comissão
          const regrasComissaoValidas = ['aliquota_fixa', 'lista_preco'];
          if (row['Regra Comissão'] && !regrasComissaoValidas.includes(row['Regra Comissão'])) {
            errors.push({ row: rowNumber, message: 'Regra Comissão deve ser: aliquota_fixa ou lista_preco' });
            return;
          }

          // Validar alíquota fixa se regra for alíquota fixa
          if (row['Regra Comissão'] === 'aliquota_fixa') {
            if (!row['Alíquota Fixa (%)'] && row['Alíquota Fixa (%)'] !== 0) {
              errors.push({ row: rowNumber, message: 'Alíquota Fixa é obrigatória quando a regra é aliquota_fixa' });
              return;
            }
            if (row['Alíquota Fixa (%)'] < 0 || row['Alíquota Fixa (%)'] > 100) {
              errors.push({ row: rowNumber, message: 'Alíquota Fixa deve estar entre 0 e 100' });
              return;
            }
          }

          // Aqui você salvaria o vendedor no sistema
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
          Importar Vendedores
        </CardTitle>
        <CardDescription>
          Importe informações de vendedores em massa via planilha Excel
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
                  {result.success} {result.success === 1 ? 'vendedor importado' : 'vendedores importados'} com sucesso!
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
            <li>Preencha os dados dos vendedores conforme o exemplo</li>
            <li>Status: "ativo", "inativo" ou "excluido"</li>
            <li>Tipo Conta: "corrente", "poupanca", "salario" ou "pagamento"</li>
            <li>Tipo Chave PIX: "cpf_cnpj", "email", "telefone" ou "aleatoria"</li>
            <li>Regra Comissão: "aliquota_fixa" ou "lista_preco"</li>
            <li>Se Regra Comissão for "aliquota_fixa", preencher Alíquota Fixa (0-100%)</li>
            <li>Criar Usuário: "Sim" ou "Não" (se Sim, será enviado convite por email)</li>
            <li>Campos obrigatórios: Nome, CPF, Email, Telefone e Data Admissão</li>
            <li>Salve o arquivo e importe usando o botão acima</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

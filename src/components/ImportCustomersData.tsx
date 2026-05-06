import React, { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Eye, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import * as XLSX from 'xlsx';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Mapeamento de colunas: variações de nomes que o cliente pode usar → nome padrão do template
const COLUMN_MAP: Record<string, string> = {
  'código': 'Código',
  'codigo': 'Código',
  'tipo pessoa': 'Tipo Pessoa',
  'tipo de pessoa': 'Tipo Pessoa',
  'cpf/cnpj': 'CPF/CNPJ',
  'cpf cnpj': 'CPF/CNPJ',
  'cnpj / cpf': 'CPF/CNPJ',
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
  'ie / rg': 'Inscrição Estadual',
  'situação': 'Situação',
  'situacao': 'Situação',
  'status': 'Situação',
  'situação proseller': 'Situação',
  'situacao proseller': 'Situação',
  'segmento': 'Segmento Mercado',
  'segmento mercado': 'Segmento Mercado',
  'segmento de mercado': 'Segmento Mercado',
  'grupo/rede': 'Grupo/Rede',
  'grupo rede': 'Grupo/Rede',
  'grupo': 'Grupo/Rede',
  'rede': 'Grupo/Rede',
  'nome rede': 'Grupo/Rede',
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
  'site': 'Site',
  'website': 'Site',
  'web site': 'Site',
  'e-mail': 'Email Principal',
  'email': 'Email Principal',
  'email principal': 'Email Principal',
  'email nf-e': 'Email NF-e',
  'email nfe': 'Email NF-e',
  'e-mail nf': 'Email NF-e',
  'e-mail para envio de notas fiscais': 'Email NF-e',
  'email para envio de notas fiscais': 'Email NF-e',
  'telefone fixo': 'Telefone Fixo',
  'fone fixo': 'Telefone Fixo',
  'telefone': 'Telefone Fixo',
  'fone': 'Telefone Fixo',
  'telefone celular': 'Telefone Celular',
  'celular': 'Telefone Celular',
  'empresa faturamento': 'Empresa Faturamento',
  'empresa de faturamento': 'Empresa Faturamento',
  'vendedor (email)': 'Vendedor (Email)',
  'vendedor': 'Vendedor (Email)',
  'lista de preços': 'Lista de Preços',
  'lista de precos': 'Lista de Preços',
  'lista preços': 'Lista de Preços',
  'lista de preço': 'Lista de Preços',
  'lista de preco': 'Lista de Preços',
  'desconto padrão (%)': 'Desconto Padrão (%)',
  'desconto padrao (%)': 'Desconto Padrão (%)',
  'desconto padrão': 'Desconto Padrão (%)',
  'desconto padrao': 'Desconto Padrão (%)',
  'desconto (%)': 'Desconto Padrão (%)',
  'desconto financeiro (%)': 'Desconto Financeiro (%)',
  'desconto financeiro': 'Desconto Financeiro (%)',
  'desc fin': 'Desconto Financeiro (%)',
  'pedido mínimo (r$)': 'Pedido Mínimo (R$)',
  'pedido minimo (r$)': 'Pedido Mínimo (R$)',
  'pedido mínimo': 'Pedido Mínimo (R$)',
  'pedido minimo': 'Pedido Mínimo (R$)',
  'status aprovação': 'Status Aprovação',
  'status aprovacao': 'Status Aprovação',
  'observações internas': 'Observações Internas',
  'observacoes internas': 'Observações Internas',
  'observações': 'Observações Internas',
  'observacoes': 'Observações Internas',
  'observações nf': 'Observações Internas',
  'observacoes nf': 'Observações Internas',
};

// Colunas do template na ordem correta
const TEMPLATE_COLUMNS = [
  'Código', 'Tipo Pessoa', 'CPF/CNPJ', 'Razão Social', 'Nome Fantasia', 'Inscrição Estadual',
  'Situação', 'Segmento Mercado', 'Grupo/Rede', 'CEP', 'Logradouro', 'Número',
  'Complemento', 'Bairro', 'UF', 'Município', 'Site', 'Email Principal', 'Email NF-e',
  'Telefone Fixo', 'Telefone Celular', 'Empresa Faturamento', 'Vendedor (Email)',
  'Lista de Preços', 'Desconto Padrão (%)', 'Desconto Financeiro (%)', 'Pedido Mínimo (R$)',
  'Status Aprovação', 'Observações Internas',
];

// Normalização para comparações case/accent-insensitive
function deburr(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// "SERGIO GLEZER  (5984)" → { name: "SERGIO GLEZER", code: "5984" }
function splitVendedorValue(raw: string): { value: string; code: string | null } {
  const trimmed = String(raw ?? '').trim();
  const m = trimmed.match(/^(.*?)\s*\((\d+)\)\s*$/);
  if (m) return { value: m[1].trim(), code: m[2] };
  return { value: trimmed, code: null };
}

function toNumberOrNull(raw: any): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeColumnName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mapColumns(originalHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of originalHeaders) {
    const normalized = normalizeColumnName(header);
    if (COLUMN_MAP[normalized]) {
      mapping[header] = COLUMN_MAP[normalized];
    }
  }
  return mapping;
}

function convertFileData(rows: Record<string, any>[], columnMapping: Record<string, string>): Record<string, any>[] {
  return rows.map(row => {
    const newRow: Record<string, any> = {};
    for (const col of TEMPLATE_COLUMNS) {
      newRow[col] = '';
    }
    for (const [originalCol, templateCol] of Object.entries(columnMapping)) {
      if (row[originalCol] !== undefined && row[originalCol] !== null) {
        newRow[templateCol] = row[originalCol];
      }
    }
    return newRow;
  });
}

interface ImportResult {
  success: number;
  errors: Array<{ row: number; message: string }>;
}

interface PreviewData {
  data: any[];
  fileName: string;
  validationErrors: Array<{ row: number; message: string }>;
}

export function ImportCustomersData() {
  const { usuario } = useAuth();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [convertResult, setConvertResult] = useState<{ total: number; mapped: string[]; unmapped: string[] } | null>(null);
  const convertInputRef = useRef<HTMLInputElement>(null);

  const handleConvertFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let rows: Record<string, any>[] = [];

      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        // Detectar separador: se tem mais ; que , na primeira linha, usar ;
        const firstLine = text.split('\n')[0];
        const semicolons = (firstLine.match(/;/g) || []).length;
        const commas = (firstLine.match(/,/g) || []).length;
        const separator = semicolons > commas ? ';' : ',';

        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(separator).map(h => h.replace(/^"|"$/g, '').trim());

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(separator).map(v => v.replace(/^"|"$/g, '').trim());
          const row: Record<string, any> = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
          });
          rows.push(row);
        }
      } else {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      }

      if (rows.length === 0) {
        setConvertResult({ total: 0, mapped: [], unmapped: [] });
        return;
      }

      const originalHeaders = Object.keys(rows[0]);
      const columnMapping = mapColumns(originalHeaders);

      const mappedCols = Object.keys(columnMapping);
      const unmappedCols = originalHeaders.filter(h => !columnMapping[h]);

      const converted = convertFileData(rows, columnMapping);

      // Gerar e baixar o arquivo Excel convertido
      const ws = XLSX.utils.json_to_sheet(converted, { header: TEMPLATE_COLUMNS });
      const colWidths = TEMPLATE_COLUMNS.map(col => ({ wch: Math.max(col.length + 2, 15) }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

      const baseName = file.name.replace(/\.[^.]+$/, '');
      XLSX.writeFile(wb, `${baseName}_CONVERTIDO.xlsx`);

      setConvertResult({
        total: converted.length,
        mapped: mappedCols,
        unmapped: unmappedCols,
      });
    } catch (error) {
      setConvertResult({ total: 0, mapped: [], unmapped: ['Erro: ' + (error as Error).message] });
    } finally {
      event.target.value = '';
    }
  };

  const generateTemplate = () => {
    const template = [
      {
        'Código': '',
        'Tipo Pessoa': 'Pessoa Jurídica',
        'CPF/CNPJ': '12.345.678/0001-90',
        'Razão Social': 'Empresa Exemplo Ltda',
        'Nome Fantasia': 'Exemplo',
        'Inscrição Estadual': '123.456.789.012',
        'Situação': 'Ativo',
        'Segmento Mercado': 'Varejo',
        'Grupo/Rede': '',
        'CEP': '01310-100',
        'Logradouro': 'Avenida Paulista',
        'Número': '1000',
        'Complemento': 'Sala 100',
        'Bairro': 'Bela Vista',
        'UF': 'SP',
        'Município': 'São Paulo',
        'Site': 'www.exemplo.com.br',
        'Email Principal': 'contato@exemplo.com.br',
        'Email NF-e': 'nfe@exemplo.com.br',
        'Telefone Fixo': '(11) 3000-0000',
        'Telefone Celular': '(11) 99000-0000',
        'Empresa Faturamento': 'Empresa Principal',
        'Vendedor (Email)': 'vendedor@empresa.com',
        'Lista de Preços': 'Tabela Padrão',
        'Desconto Padrão (%)': 5,
        'Desconto Financeiro (%)': 2,
        'Pedido Mínimo (R$)': 500,
        'Status Aprovação': 'aprovado',
        'Observações Internas': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template, { header: TEMPLATE_COLUMNS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

    const colWidths = [
      { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 35 }, { wch: 25 }, { wch: 20 },
      { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 30 },
      { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 5 }, { wch: 25 },
      { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 18 },
      { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 18 },
      { wch: 18 }, { wch: 15 }, { wch: 30 },
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'modelo_importacao_clientes.xlsx');
  };

  const validateRow = (row: any, rowNumber: number): string | null => {
    if (!row['Tipo Pessoa']) return 'Tipo de pessoa é obrigatório';
    const tipoNorm = deburr(row['Tipo Pessoa']);
    if (tipoNorm !== 'pessoa fisica' && tipoNorm !== 'pessoa juridica') {
      return 'Tipo de pessoa deve ser "Pessoa Física" ou "Pessoa Jurídica"';
    }
    if (!row['CPF/CNPJ']) return 'CPF/CNPJ é obrigatório';
    if (!row['Razão Social']) return 'Razão Social é obrigatória';
    if (!row['CEP']) return 'CEP é obrigatório';
    if (!row['Logradouro']) return 'Logradouro é obrigatório';
    if (!row['Número']) return 'Número é obrigatório';
    if (!row['Bairro']) return 'Bairro é obrigatório';
    if (!row['UF']) return 'UF é obrigatória';
    if (!row['Município']) return 'Município é obrigatório';

    const situacoesValidas = ['ativo', 'inativo', 'excluido', 'analise', 'reprovado'];
    if (row['Situação'] && !situacoesValidas.includes(deburr(row['Situação']))) {
      return 'Situação deve ser: Ativo, Inativo, Excluído, Análise ou Reprovado';
    }

    const statusValidos = ['aprovado', 'pendente', 'rejeitado'];
    if (row['Status Aprovação'] && !statusValidos.includes(String(row['Status Aprovação']).toLowerCase())) {
      return 'Status de aprovação deve ser: aprovado, pendente ou rejeitado';
    }

    return null;
  };

  // Normaliza Tipo Pessoa: aceita variações de caixa/acentos → forma canônica
  const normalizeTipoPessoa = (raw: any): 'Pessoa Física' | 'Pessoa Jurídica' => {
    return deburr(raw) === 'pessoa fisica' ? 'Pessoa Física' : 'Pessoa Jurídica';
  };

  // Normaliza Situação: aceita 'ATIVO' | 'ativo' | 'Ativo' → 'Ativo'
  const normalizeSituacao = (raw: any): 'Ativo' | 'Inativo' | 'Excluído' | 'Análise' | 'Reprovado' => {
    const m: Record<string, 'Ativo' | 'Inativo' | 'Excluído' | 'Análise' | 'Reprovado'> = {
      'ativo': 'Ativo',
      'inativo': 'Inativo',
      'excluido': 'Excluído',
      'analise': 'Análise',
      'reprovado': 'Reprovado',
    };
    return m[deburr(raw)] || 'Ativo';
  };

  // Lookup helpers (case/accent-insensitive). Retornam o item ou undefined.
  const findVendedor = (vendedores: any[], rawValue: string) => {
    if (!rawValue) return undefined;
    const { value } = splitVendedorValue(rawValue);
    const target = deburr(value);
    if (!target) return undefined;
    // 1) match por email exato
    const byEmail = vendedores.find((v: any) => deburr(v.email) === target);
    if (byEmail) return byEmail;
    // 2) match por nome exato
    const byName = vendedores.find((v: any) => deburr(v.nome) === target);
    if (byName) return byName;
    // 3) fallback: nome contém alvo (ou alvo contém nome)
    return vendedores.find((v: any) => deburr(v.nome).includes(target) || target.includes(deburr(v.nome)));
  };

  const findEmpresa = (empresas: any[], rawValue: string) => {
    if (!rawValue) return undefined;
    const target = deburr(rawValue);
    if (!target) return undefined;
    return empresas.find((e: any) => {
      const rs = deburr(e.razaoSocial ?? e.razao_social ?? '');
      const nf = deburr(e.nomeFantasia ?? e.nome_fantasia ?? '');
      const nm = deburr(e.nome ?? '');
      return rs === target || nf === target || nm === target ||
        (rs && rs.includes(target)) || (nf && nf.includes(target)) || (nm && nm.includes(target));
    });
  };

  const findLista = (listas: any[], rawValue: string) => {
    if (!rawValue) return undefined;
    const target = deburr(rawValue);
    if (!target) return undefined;
    return listas.find((l: any) => {
      const nm = deburr(l.nome ?? '');
      const cd = deburr(l.codigo ?? '');
      return nm === target || cd === target || (nm && nm.includes(target)) || (cd && cd.includes(target));
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let rawRows: Record<string, any>[] = [];

      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        const firstLine = text.split('\n')[0];
        const semicolons = (firstLine.match(/;/g) || []).length;
        const commas = (firstLine.match(/,/g) || []).length;
        const separator = semicolons > commas ? ';' : ',';
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(separator).map(h => h.replace(/^"|"$/g, '').replace(/^﻿/, '').trim());
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(separator).map(v => v.replace(/^"|"$/g, '').trim());
          const row: Record<string, any> = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
          rawRows.push(row);
        }
      } else {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      }

      // Aplica COLUMN_MAP automaticamente: aceita planilhas com nomes de coluna divergentes
      // (ex.: "Tipo pessoa", "CNPJ / CPF", "Endereço", "Vendedor", "Lista de Preço") e
      // converte para os nomes canônicos do template antes da validação.
      const originalHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
      const columnMapping = mapColumns(originalHeaders);
      const mappedRows = convertFileData(rawRows, columnMapping);

      const errors: Array<{ row: number; message: string }> = [];
      mappedRows.forEach((row: any, index: number) => {
        const rowNumber = index + 2;
        const error = validateRow(row, rowNumber);
        if (error) {
          errors.push({ row: rowNumber, message: error });
        }
      });

      setPreview({
        data: mappedRows,
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
    setProgress(0);

    const validRows = preview.data
      .map((row: any, idx: number) => ({ row, rowNumber: idx + 2 }))
      .filter(({ rowNumber }) => !preview.validationErrors.some((e) => e.row === rowNumber));

    const errors: Array<{ row: number; message: string }> = [...preview.validationErrors];
    let success = 0;

    try {
      // Pré-resolução de lookups (1 fetch por entidade, reusada em todas as linhas)
      const [vendedoresRaw, empresasRaw, listasRaw] = await Promise.all([
        api.get('vendedores').catch(() => []),
        api.get('empresas').catch(() => []),
        api.get('listas-preco').catch(() => []),
      ]);
      const vendedores = Array.isArray(vendedoresRaw) ? vendedoresRaw : [];
      const empresas = Array.isArray(empresasRaw) ? empresasRaw : [];
      const listas = Array.isArray(listasRaw) ? listasRaw : [];

      for (let i = 0; i < validRows.length; i++) {
        const { row, rowNumber } = validRows[i];
        setProgress(Math.round(((i + 1) / Math.max(validRows.length, 1)) * 100));

        try {
          // Lookups para a linha
          const vendedor = findVendedor(vendedores, row['Vendedor (Email)']);
          const empresa = findEmpresa(empresas, row['Empresa Faturamento']);
          const lista = findLista(listas, row['Lista de Preços']);

          // Aviso (não-bloqueante) quando referência não casa
          const warns: string[] = [];
          if (row['Vendedor (Email)'] && !vendedor) warns.push(`vendedor "${row['Vendedor (Email)']}" não encontrado`);
          if (row['Empresa Faturamento'] && !empresa) warns.push(`empresa "${row['Empresa Faturamento']}" não encontrada`);
          if (row['Lista de Preços'] && !lista) warns.push(`lista "${row['Lista de Preços']}" não encontrada`);

          const tipoPessoa = normalizeTipoPessoa(row['Tipo Pessoa']);
          const situacao = normalizeSituacao(row['Situação']);

          const cliente: any = {
            tipoPessoa,
            cpfCnpj: String(row['CPF/CNPJ'] ?? '').trim(),
            razaoSocial: String(row['Razão Social'] ?? '').trim(),
            nomeFantasia: row['Nome Fantasia'] ? String(row['Nome Fantasia']).trim() : undefined,
            inscricaoEstadual: row['Inscrição Estadual'] ? String(row['Inscrição Estadual']).trim() : undefined,
            situacao,
            segmentoMercado: row['Segmento Mercado'] ? String(row['Segmento Mercado']).trim() : '',
            grupoRede: row['Grupo/Rede'] ? String(row['Grupo/Rede']).trim() : undefined,
            cep: String(row['CEP'] ?? '').trim(),
            logradouro: String(row['Logradouro'] ?? '').trim(),
            numero: String(row['Número'] ?? '').trim(),
            complemento: row['Complemento'] ? String(row['Complemento']).trim() : undefined,
            bairro: String(row['Bairro'] ?? '').trim(),
            uf: String(row['UF'] ?? '').trim().toUpperCase(),
            municipio: String(row['Município'] ?? '').trim(),
            enderecoEntregaDiferente: false,
            site: row['Site'] ? String(row['Site']).trim() : undefined,
            emailPrincipal: row['Email Principal'] ? String(row['Email Principal']).trim() : undefined,
            emailNFe: row['Email NF-e'] ? String(row['Email NF-e']).trim() : undefined,
            telefoneFixoPrincipal: row['Telefone Fixo'] ? String(row['Telefone Fixo']).trim() : undefined,
            telefoneCelularPrincipal: row['Telefone Celular'] ? String(row['Telefone Celular']).trim() : undefined,
            pessoasContato: [],
            dadosBancarios: [],
            descontoPadrao: toNumberOrNull(row['Desconto Padrão (%)']) ?? 0,
            descontoFinanceiro: toNumberOrNull(row['Desconto Financeiro (%)']) ?? 0,
            condicoesPagamentoAssociadas: [],
            pedidoMinimo: toNumberOrNull(row['Pedido Mínimo (R$)']) ?? 0,
            statusAprovacao: 'aprovado',
            observacoesInternas: row['Observações Internas'] ? String(row['Observações Internas']).trim() : undefined,
            codigo: row['Código'] ? String(row['Código']).trim() : undefined,
            dataCadastro: new Date().toISOString(),
            dataAtualizacao: new Date().toISOString(),
            criadoPor: usuario?.nome || 'Importação',
            atualizadoPor: usuario?.nome || 'Importação',
          };

          if (vendedor) {
            cliente.vendedorAtribuido = { id: vendedor.id, nome: vendedor.nome ?? '', email: vendedor.email ?? '' };
            cliente.vendedoresAtribuidos = [{ id: vendedor.id, nome: vendedor.nome ?? '', email: vendedor.email ?? '' }];
          }
          if (lista?.id) {
            cliente.listaPrecos = String(lista.id);
            cliente.lista_de_preco = Number(lista.id);
          }

          const created: any = await api.create('clientes', cliente);
          const novoId = created?.id ?? created?.cliente?.cliente_id ?? created?.cliente_id;

          // Empresa de Faturamento: POST não aceita; aplicar via PUT após create
          if (novoId && empresa?.id != null) {
            try {
              await api.update('clientes', String(novoId), {
                empresaFaturamentoId: Number(empresa.id),
              });
            } catch (e: any) {
              warns.push(`empresa não vinculada: ${e?.message ?? 'erro no update'}`);
            }
          }

          success++;
          if (warns.length > 0) {
            errors.push({ row: rowNumber, message: `Importado com avisos: ${warns.join('; ')}` });
          }
        } catch (e: any) {
          errors.push({ row: rowNumber, message: e?.message || 'Erro ao salvar cliente' });
        }
      }

      setResult({ success, errors });
      setShowPreview(false);
      setPreview(null);
    } catch (error: any) {
      setResult({
        success,
        errors: [...errors, { row: 0, message: 'Erro ao importar: ' + (error?.message ?? String(error)) }],
      });
    } finally {
      setImporting(false);
      setProgress(100);
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
            Preview da Importação - Clientes
          </CardTitle>
          <CardDescription>
            Arquivo: <span className="font-mono">{preview.fileName}</span> • {preview.data.length} {preview.data.length === 1 ? 'registro' : 'registros'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div>
            <h4 className="font-medium mb-2">Preview dos Dados (primeiras 10 linhas)</h4>
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Município</TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-24">Validação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.data.slice(0, 10).map((row: any, idx: number) => {
                    const rowNumber = idx + 2;
                    const hasError = preview.validationErrors.some(e => e.row === rowNumber);
                    
                    return (
                      <TableRow key={idx} className={hasError ? 'bg-red-50' : ''}>
                        <TableCell className="font-mono text-sm">{rowNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {row['Tipo Pessoa'] === 'Pessoa Física' ? 'PF' : 'PJ'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row['CPF/CNPJ']}</TableCell>
                        <TableCell>{row['Razão Social']}</TableCell>
                        <TableCell>{row['Município']}</TableCell>
                        <TableCell>{row['UF']}</TableCell>
                        <TableCell>
                          {row['Situação'] && <Badge variant="outline">{row['Situação']}</Badge>}
                        </TableCell>
                        <TableCell>
                          {hasError ? (
                            <Badge variant="destructive" className="text-xs">Erro</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">OK</Badge>
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

          {importing && (
            <div className="space-y-2 pt-4 border-t">
              <Progress value={progress} />
              <p className="text-center text-sm text-muted-foreground">
                Importando registros no Supabase... {progress}%
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={handleCancelPreview} disabled={importing}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={importing || preview.data.length === preview.validationErrors.length}
              className="flex items-center gap-2"
            >
              {importing ? 'Importando...' : (
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
          Importar Clientes
        </CardTitle>
        <CardDescription>
          Importe cadastros de clientes em massa via planilha Excel
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
              accept=".xlsx,.xls,.csv"
              ref={convertInputRef}
              onChange={handleConvertFile}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ display: 'none' }}
            />
            <Button
              variant="outline"
              onClick={() => convertInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Converter Arquivo
            </Button>
          </div>

          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={importing}
            />
            <Button disabled={importing} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Selecionar Arquivo para Preview
            </Button>
          </div>
        </div>

        {convertResult && (
          <Alert className={convertResult.total > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <RefreshCw className={`h-4 w-4 ${convertResult.total > 0 ? 'text-green-600' : 'text-red-600'}`} />
            <AlertDescription className={convertResult.total > 0 ? 'text-green-800' : 'text-red-800'}>
              {convertResult.total > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium">
                    Arquivo convertido com sucesso! {convertResult.total} {convertResult.total === 1 ? 'registro' : 'registros'} exportados.
                  </p>
                  {convertResult.mapped.length > 0 && (
                    <p className="text-sm">
                      <strong>Colunas mapeadas ({convertResult.mapped.length}):</strong> {convertResult.mapped.join(', ')}
                    </p>
                  )}
                  {convertResult.unmapped.length > 0 && (
                    <p className="text-sm">
                      <strong>Colunas ignoradas ({convertResult.unmapped.length}):</strong> {convertResult.unmapped.join(', ')}
                    </p>
                  )}
                </div>
              ) : (
                <p>Não foi possível converter o arquivo. Verifique se o formato está correto.</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-3">
            {result.success > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {result.success} {result.success === 1 ? 'cliente importado' : 'clientes importados'} com sucesso!
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
            <li>Preencha os dados dos clientes conforme o exemplo</li>
            <li><strong>Já tem uma planilha pronta?</strong> Use "Converter Arquivo" para adaptar automaticamente ao formato do sistema (aceita CSV e Excel, qualquer separador)</li>
            <li>Selecione o arquivo para visualizar um preview dos dados</li>
            <li>Revise os dados e confirme a importação</li>
            <li>Campos obrigatórios: Tipo Pessoa, CPF/CNPJ, Razão Social, CEP, Logradouro, Número, Bairro, UF e Município</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

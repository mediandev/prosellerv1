// romaneioToPdf.ts — gera o PDF do Romaneio de Expedição via jsPDF + autoTable.
// Chamado do componente RomaneioPage após criação ou ao re-baixar um romaneio.
// Não usa servidor — tudo no browser.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RomaneioDetalhe } from '../../services/romaneioService';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function fmtBRL(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPeso(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function fmtNum(n: number | null | undefined): string {
  return n != null ? String(n) : '—';
}

function fmtNro(n: number): string {
  return String(n).padStart(3, '0');
}

function fmtCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function enderecoEmpresa(endereco: Record<string, string> | null | undefined): string {
  if (!endereco) return '';
  const parts: string[] = [];
  if (endereco.logradouro) parts.push(endereco.logradouro + (endereco.numero ? `, ${endereco.numero}` : ''));
  if (endereco.bairro) parts.push(endereco.bairro);
  if (endereco.municipio && endereco.uf) parts.push(`${endereco.municipio} - ${endereco.uf}`);
  if (endereco.cep) parts.push(`CEP ${endereco.cep}`);
  return parts.join(' — ');
}

export function romaneioToPdf(rom: RomaneioDetalhe): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`ROMANEIO DE EXPEDIÇÃO Nº ${fmtNro(rom.numero)}`, margin, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${fmtDate(rom.dataRomaneio)}`, pageW - margin, 16, { align: 'right' });

  // linha separadora
  doc.setDrawColor(180);
  doc.line(margin, 19, pageW - margin, 19);

  // Remetente + Transportador (2 colunas)
  const col1x = margin;
  const col2x = pageW / 2 + 4;
  let y = 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('REMETENTE', col1x, y);
  doc.text('TRANSPORTADOR', col2x, y);

  doc.setFont('helvetica', 'normal');
  y += 4;
  doc.text(rom.empresaRazaoSocial ?? rom.empresaNome ?? '—', col1x, y);
  doc.text(rom.transportadorNome ?? '—', col2x, y);

  y += 4;
  if (rom.empresaCnpj) doc.text(`CNPJ: ${fmtCnpj(rom.empresaCnpj)}`, col1x, y);
  if (rom.transportadorCnpj) doc.text(`CNPJ: ${fmtCnpj(rom.transportadorCnpj)}`, col2x, y);

  y += 4;
  const endEmp = enderecoEmpresa(rom.empresaEndereco);
  if (endEmp) {
    const lines = doc.splitTextToSize(endEmp, pageW / 2 - margin - 8);
    doc.text(lines, col1x, y);
    y += lines.length * 4;
  }

  if (rom.observacoes) {
    doc.setFont('helvetica', 'italic');
    doc.text(`Obs: ${rom.observacoes}`, col1x, y + 2);
    y += 6;
  }

  y += 2;
  doc.setDrawColor(180);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  // ── Tabela de fretes ───────────────────────────────────────────────────────
  const rows = rom.fretes.map((f, i) => [
    String(i + 1),
    fmtNum(f.pedidoVendaId),
    fmtNum(f.nfeNumero),
    f.clienteNome ?? '—',
    f.clienteCidade && f.clienteUf ? `${f.clienteCidade} / ${f.clienteUf}` : f.clienteCidade ?? '—',
    f.clienteCep ?? '—',
    fmtNum(f.volumes),
    fmtPeso(f.pesoBruto),
    fmtBRL(f.valorProdutos),
    fmtBRL(f.valorCotacao ?? f.valorProdutos),
  ]);

  // linha de totais
  rows.push([
    '',
    '',
    '',
    '',
    '',
    'TOTAL',
    fmtNum(rom.totais.volumes),
    fmtPeso(rom.totais.pesoBruto),
    fmtBRL(rom.totais.valorProdutos),
    '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Pedido', 'NF', 'Destinatário', 'Cidade / UF', 'CEP', 'Vols.', 'Peso (kg)', 'Vlr. Prod.', 'Vlr. Total']],
    body: rows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 7 },
      1: { cellWidth: 18 },
      2: { cellWidth: 18 },
      3: { cellWidth: 55 },
      4: { cellWidth: 30 },
      5: { cellWidth: 22 },
      6: { cellWidth: 12 },
      7: { cellWidth: 20 },
      8: { cellWidth: 26 },
      9: { cellWidth: 26 },
    },
    didParseCell: (data) => {
      // destacar linha de totais
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY: number = (doc as any).lastAutoTable?.finalY ?? pageH - 50;

  // ── Assinaturas ────────────────────────────────────────────────────────────
  const sigY = Math.min(finalY + 10, pageH - 28);
  const sigW = (pageW - margin * 2 - 20) / 3;

  [
    { label: 'Motorista', x: margin },
    { label: 'Ajudante', x: margin + sigW + 10 },
    { label: 'Conferente', x: margin + (sigW + 10) * 2 },
  ].forEach(({ label, x }) => {
    doc.setDrawColor(100);
    doc.line(x, sigY + 10, x + sigW, sigY + 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + sigW / 2, sigY + 14, { align: 'center' });
  });

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text(
    `Documento gerado pelo ProSeller.com.br — ${new Date().toLocaleString('pt-BR')}`,
    pageW / 2,
    pageH - 5,
    { align: 'center' },
  );

  doc.save(`romaneio-${fmtNro(rom.numero)}-${rom.dataRomaneio ?? 'sem-data'}.pdf`);
}

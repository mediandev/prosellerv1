import './PedidoPrintView.css';
import { Venda } from '../types/venda';
import { Cliente } from '../types/customer';
import { Company } from '../types/company';
import { formatCurrency, formatCNPJ, formatCPF, maskCEP, maskTelefoneFixo, maskTelefoneCelular } from '../lib/masks';

interface PedidoPrintViewProps {
  venda: Partial<Venda>;
  cliente?: Cliente;
  empresa?: Company;
}

const formatDocumento = (cpfCnpj: string | undefined, tipo?: string): string => {
  if (!cpfCnpj) return '';
  const limpo = cpfCnpj.replace(/\D/g, '');
  if (tipo === 'Pessoa Física' || limpo.length === 11) return formatCPF(cpfCnpj);
  return formatCNPJ(cpfCnpj);
};

const formatTelefone = (tel: string | undefined): string => {
  if (!tel) return '';
  const limpo = tel.replace(/\D/g, '');
  if (limpo.length === 11) return maskTelefoneCelular(tel);
  return maskTelefoneFixo(tel);
};

const formatData = (data: Date | string | undefined): string => {
  if (!data) return '';
  if (typeof data === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      const [y, m, d] = data.split('-');
      return `${d}/${m}/${y}`;
    }
    const dt = new Date(data);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('pt-BR');
    }
    return data;
  }
  return data.toLocaleDateString('pt-BR');
};

const formatNumeroBR = (n: number | undefined, casas = 2): string => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
};

export function PedidoPrintView({ venda, cliente, empresa }: PedidoPrintViewProps) {
  const enderecoEmpresa = empresa?.endereco;
  const enderecoEmpresaLinha1 = enderecoEmpresa
    ? `${enderecoEmpresa.logradouro || ''}${enderecoEmpresa.numero ? ', ' + enderecoEmpresa.numero : ''}${enderecoEmpresa.complemento ? ' - ' + enderecoEmpresa.complemento : ''}`.trim()
    : '';
  const enderecoEmpresaLinha2 = enderecoEmpresa
    ? `${enderecoEmpresa.bairro || ''}${enderecoEmpresa.bairro && (enderecoEmpresa.municipio || enderecoEmpresa.uf) ? ', ' : ''}${enderecoEmpresa.municipio || ''}${enderecoEmpresa.uf ? ' - ' + enderecoEmpresa.uf : ''}`.trim()
    : '';

  const enderecoClienteLinha1 = cliente
    ? `${cliente.logradouro || ''}${cliente.numero ? ', Nº ' + cliente.numero : ''}${cliente.complemento ? ' - ' + cliente.complemento : ''}${cliente.bairro ? '. Bairro: ' + cliente.bairro + '.' : ''}`.trim()
    : '';
  const enderecoClienteLinha2 = cliente
    ? `${cliente.cep ? maskCEP(cliente.cep) + ' - ' : ''}${cliente.municipio || ''}${cliente.uf ? ', ' + cliente.uf : ''}`.trim()
    : '';

  const telefoneCliente = cliente
    ? cliente.telefoneFixoPrincipal || cliente.telefoneCelularPrincipal || ''
    : '';

  const itens = venda.itens || [];
  const condicoes = (venda.condicoesCliente as Array<Record<string, unknown>> | undefined) || [];

  return (
    <div className="pedido-print-view" aria-hidden="true">
      <header className="pp-header">
        <div className="pp-empresa">
          <div className="pp-empresa-nome">{empresa?.razaoSocial || empresa?.nomeFantasia || venda.nomeEmpresaFaturamento || ''}</div>
          {empresa?.cnpj && <div>{formatCNPJ(empresa.cnpj)}</div>}
          {enderecoEmpresaLinha1 && <div>{enderecoEmpresaLinha1}</div>}
          {enderecoEmpresaLinha2 && <div>{enderecoEmpresaLinha2}</div>}
          {enderecoEmpresa?.cep && <div>{maskCEP(enderecoEmpresa.cep)}</div>}
          {empresa?.inscricaoEstadual && <div>IE: {empresa.inscricaoEstadual}</div>}
        </div>
      </header>

      <h1 className="pp-titulo">Pedido de Venda Nº {venda.numero || '—'}</h1>

      <table className="pp-info-cliente">
        <tbody>
          <tr>
            <th>Cliente</th>
            <td>
              <div>{venda.nomeCliente || cliente?.razaoSocial || ''}{cliente?.codigo ? ` (${cliente.codigo})` : ''}</div>
              {cliente?.nomeFantasia && <div>{cliente.nomeFantasia}</div>}
              <div>
                {formatDocumento(venda.cnpjCliente || cliente?.cpfCnpj, cliente?.tipoPessoa)}
                {(venda.inscricaoEstadualCliente || cliente?.inscricaoEstadual)
                  ? `, IE: ${venda.inscricaoEstadualCliente || cliente?.inscricaoEstadual}`
                  : ''}
              </div>
            </td>
            <th className="pp-info-cliente-right">Ordem de compra</th>
            <td>{venda.ordemCompraCliente || ''}</td>
          </tr>
          <tr>
            <th>Endereço</th>
            <td>
              {enderecoClienteLinha1 && <div>{enderecoClienteLinha1}</div>}
              {enderecoClienteLinha2 && <div>{enderecoClienteLinha2}</div>}
            </td>
            <th>Situação</th>
            <td>{venda.status || ''}</td>
          </tr>
          <tr>
            <th>Contato</th>
            <td>{telefoneCliente ? `Fone: ${formatTelefone(telefoneCliente)}` : ''}</td>
            <th>Data</th>
            <td>{formatData(venda.dataPedido)}</td>
          </tr>
          <tr>
            <th>Vendedor(a)</th>
            <td>{venda.nomeVendedor || ''}</td>
            <th>Natureza</th>
            <td>{venda.nomeNaturezaOperacao || ''}</td>
          </tr>
        </tbody>
      </table>

      <table className="pp-itens">
        <thead>
          <tr>
            <th className="pp-col-item">Item</th>
            <th className="pp-col-sku">SKU | GTIN</th>
            <th className="pp-col-num">Qtd</th>
            <th className="pp-col-un">Un</th>
            <th className="pp-col-num">Preço un</th>
            <th className="pp-col-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, idx) => (
            <tr key={item.id || idx}>
              <td>{item.descricaoProduto}</td>
              <td>
                <div>{item.codigoSku}</div>
                {item.codigoEan && <div>{item.codigoEan}</div>}
              </td>
              <td className="pp-col-num">{formatNumeroBR(item.quantidade)}</td>
              <td>{item.unidade || 'UN'}</td>
              <td className="pp-col-num">{formatNumeroBR(item.valorUnitario)}</td>
              <td className="pp-col-num">{formatNumeroBR(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="pp-totais-label">
              <div><strong>Número de itens:</strong> {venda.totalItens ?? itens.length}</div>
              <div><strong>Soma das quantidades:</strong> {formatNumeroBR(venda.totalQuantidades)}</div>
            </td>
            <td className="pp-totais-titulo"><strong>Total de produtos</strong></td>
            <td className="pp-col-num"><strong>{formatCurrency(venda.valorTotalProdutos)}</strong></td>
          </tr>
          {(venda.valorDescontoExtra ?? 0) > 0 && (
            <tr>
              <td colSpan={4}></td>
              <td className="pp-totais-titulo">Desconto extra</td>
              <td className="pp-col-num">- {formatCurrency(venda.valorDescontoExtra)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={4}></td>
            <td className="pp-totais-titulo"><strong>Total do pedido</strong></td>
            <td className="pp-col-num"><strong>{formatCurrency(venda.valorPedido)}</strong></td>
          </tr>
        </tfoot>
      </table>

      {condicoes.length > 0 && (
        <table className="pp-pagamento">
          <thead>
            <tr>
              <th>Dias</th>
              <th>Data vencimento</th>
              <th>Forma de Pagamento</th>
              <th className="pp-col-num">Valor</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            {condicoes.map((c, idx) => {
              const dias = (c.dias as number | string | undefined) ?? '';
              const dataVenc = (c.dataVencimento || c.data_vencimento || c.vencimento) as string | Date | undefined;
              const forma = (c.formaPagamento || c.forma_pagamento || c.forma || venda.nomeCondicaoPagamento) as string | undefined;
              const valor = (c.valor as number | undefined) ?? 0;
              const obs = (c.observacao || c.observacoes || '') as string;
              return (
                <tr key={idx}>
                  <td>{dias}</td>
                  <td>{dataVenc ? formatData(dataVenc) : ''}</td>
                  <td>{forma || ''}</td>
                  <td className="pp-col-num">{formatCurrency(valor)}</td>
                  <td>{obs}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {condicoes.length === 0 && venda.nomeCondicaoPagamento && (
        <table className="pp-pagamento">
          <thead>
            <tr>
              <th>Forma de Pagamento</th>
              <th className="pp-col-num">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{venda.nomeCondicaoPagamento}</td>
              <td className="pp-col-num">{formatCurrency(venda.valorPedido)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {((venda.pesoBrutoTotal ?? 0) > 0 || (venda.pesoLiquidoTotal ?? 0) > 0) && (
        <table className="pp-pesos">
          <tbody>
            <tr>
              <th>Peso Bruto</th>
              <td>{formatNumeroBR(venda.pesoBrutoTotal, 3)}</td>
              <th>Peso Líquido</th>
              <td>{formatNumeroBR(venda.pesoLiquidoTotal, 3)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {(venda.observacoesInternas || venda.observacoesNotaFiscal) && (
        <div className="pp-observacoes">
          <div className="pp-observacoes-titulo"><strong>Observações</strong></div>
          {venda.observacoesNotaFiscal && <div>{venda.observacoesNotaFiscal}</div>}
          {venda.observacoesInternas && <div>{venda.observacoesInternas}</div>}
        </div>
      )}
    </div>
  );
}

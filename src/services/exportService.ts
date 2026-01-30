import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export const exportService = {
  // Exporta vendas para Excel
  exportVendas: (vendas: any[]) => {
    const data = vendas.map(venda => {
      const items = venda.items || venda.itens || [];
      const baseData: any = {
        'Número Pedido': venda.numeroPedido || venda.numero,
        'Data Pedido': format(new Date(venda.dataPedido), 'dd/MM/yyyy'),
        'CNPJ Cliente': venda.clienteCnpj || venda.cnpjCliente,
        'Nome Cliente': venda.clienteNome || venda.nomeCliente,
        'Vendedor (Email)': venda.vendedorEmail || venda.emailVendedor || venda.vendedorNome || venda.nomeVendedor,
        'Empresa Faturamento': venda.empresaFaturamento || venda.nomeEmpresaFaturamento || '',
        'Natureza Operação': venda.naturezaOperacao || venda.nomeNaturezaOperacao || '',
        'Lista de Preço': venda.listaPreco || venda.nomeListaPreco || '',
        'Condição Pagamento': venda.condicaoPagamento || venda.nomeCondicaoPagamento || '',
        'Status': venda.status,
        'Valor Total': venda.valorTotal || venda.valorPedido,
      };

      // Adiciona produtos (até 5 produtos)
      for (let i = 0; i < 5; i++) {
        const item = items[i];
        baseData[`SKU Produto ${i + 1}`] = item?.produtoSku || item?.codigoSku || '';
        baseData[`Descrição Produto ${i + 1}`] = item?.produtoNome || item?.descricaoProduto || '';
        baseData[`Quantidade ${i + 1}`] = item?.quantidade || '';
        baseData[`Valor Unitário ${i + 1}`] = item?.valorUnitario || item?.precoUnitario || '';
      }

      baseData['Desconto Extra (%)'] = venda.descontoExtra || 0;
      baseData['Ordem Compra Cliente'] = venda.ordemCompraCliente || '';
      baseData['Observações Internas'] = venda.observacoesInternas || '';

      return baseData;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas');

    const colWidths = [
      { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 25 },
      { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
      { wch: 15 },
    ];
    ws['!cols'] = colWidths;

    const fileName = `vendas_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    return { success: true, fileName, recordCount: vendas.length };
  },

  // Exporta clientes para Excel
  exportClientes: (clientesList: any[]) => {
    const data = clientesList.map(cliente => ({
      'Código Cliente': cliente.codigoCliente || cliente.codigo || '',
      'Tipo Pessoa': cliente.tipoPessoa,
      'CPF/CNPJ': cliente.cpfCnpj || cliente.cnpj || cliente.cpf,
      'Razão Social': cliente.razaoSocial,
      'Nome Fantasia': cliente.nomeFantasia || '',
      'Inscrição Estadual': cliente.inscricaoEstadual || '',
      'Situação': cliente.situacao,
      'Segmento Mercado': cliente.segmentoMercado || '',
      'Grupo/Rede': cliente.grupoRede || '',
      'CEP': cliente.cep,
      'Logradouro': cliente.logradouro,
      'Número': cliente.numero,
      'Complemento': cliente.complemento || '',
      'Bairro': cliente.bairro,
      'UF': cliente.uf,
      'Município': cliente.municipio,
      'Código IBGE': cliente.codigoIBGE || '',
      'Site': cliente.site || '',
      'Email Principal': cliente.emailPrincipal || cliente.email || '',
      'Email NF-e': cliente.emailNfe || '',
      'Telefone Fixo': cliente.telefoneFixo || '',
      'Telefone Celular': cliente.telefoneCelular || cliente.telefone || '',
      'Empresa Faturamento': cliente.empresaFaturamento || '',
      'Vendedor (Email)': cliente.vendedorEmail || '',
      'Lista de Preços': cliente.listaPrecos || '',
      'Desconto Padrão (%)': cliente.descontoPadrao || 0,
      'Desconto Financeiro (%)': cliente.descontoFinanceiro || 0,
      'Pedido Mínimo (R$)': cliente.pedidoMinimo || 0,
      'Status Aprovação': cliente.statusAprovacao || 'aprovado',
      'Data Cadastro': cliente.dataCadastro ? format(new Date(cliente.dataCadastro), 'dd/MM/yyyy') : '',
      'Observações Internas': cliente.observacoesInternas || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

    const colWidths = [
      { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 35 }, { wch: 25 },
      { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 12 },
      { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 5 },
      { wch: 25 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
      { wch: 18 }, { wch: 18 }, { wch: 25 }, { wch: 25 }, { wch: 20 },
      { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
      { wch: 30 },
    ];
    ws['!cols'] = colWidths;

    const fileName = `clientes_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    return { success: true, fileName, recordCount: clientesList.length };
  },

  // Exporta produtos para Excel (.xlsx)
  // Estrutura compatível com a importação; inclui todos os campos cadastrados.
  // Nome do arquivo: produtos_export_YYYYMMDD_HHmmss.xlsx
  exportProdutos: (produtos: any[]) => {
    const data = (produtos || []).map((p) => {
      const createdAt = p.createdAt ? format(new Date(p.createdAt), 'dd/MM/yyyy HH:mm') : '';
      const updatedAt = p.updatedAt ? format(new Date(p.updatedAt), 'dd/MM/yyyy HH:mm') : '';
      return {
        'Id': p.id || '',
        'Descrição': p.descricao ?? '',
        'Código SKU': p.codigoSku ?? p.sku ?? '',
        'Código EAN': p.codigoEan ?? p.codigoEAN ?? p.ean ?? '',
        'Marca': p.nomeMarca ?? p.marca ?? '',
        'Tipo Produto': p.nomeTipoProduto ?? p.tipo ?? '',
        'NCM': p.ncm ?? '',
        'CEST': p.cest ?? '',
        'Unidade (Sigla)': p.siglaUnidade ?? p.unidade ?? '',
        'Peso Líquido (kg)': p.pesoLiquido ?? 0,
        'Peso Bruto (kg)': p.pesoBruto ?? 0,
        'Situação': p.situacao ?? 'Ativo',
        'Disponível para Venda': p.disponivel === true || p.disponivelVenda === true ? 'Sim' : 'Não',
        'Data Cadastro': createdAt,
        'Data Atualização': updatedAt,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

    const colWidths = [
      { wch: 38 }, { wch: 40 }, { wch: 18 }, { wch: 15 }, { wch: 22 }, { wch: 22 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 18 },
      { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 18 },
    ];
    ws['!cols'] = colWidths;

    const fileName = `produtos_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    return { success: true, fileName, recordCount: data.length };
  },

  // Exporta vendedores para Excel
  exportVendedores: (vendedores: any[]) => {
    const data = vendedores.map(vendedor => ({
      'Nome Completo': vendedor.nome,
      'Email': vendedor.email,
      'CPF': vendedor.cpf || '',
      'Telefone': vendedor.telefone || '',
      'Celular': vendedor.celular || '',
      'Data Admissão': vendedor.dataAdmissao ? format(new Date(vendedor.dataAdmissao), 'dd/MM/yyyy') : '',
      'Situação': vendedor.situacao,
      'Cargo': vendedor.cargo || '',
      'Equipe': vendedor.equipe || '',
      'Meta Mensal (R$)': vendedor.metaMensal || 0,
      'Comissão Padrão (%)': vendedor.comissaoPadrao || 0,
      'CEP': vendedor.cep || '',
      'Logradouro': vendedor.logradouro || '',
      'Número': vendedor.numero || '',
      'Complemento': vendedor.complemento || '',
      'Bairro': vendedor.bairro || '',
      'UF': vendedor.uf || '',
      'Município': vendedor.municipio || '',
      'Observações': vendedor.observacoes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendedores');

    const colWidths = [
      { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 18 },
      { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 20 },
      { wch: 20 }, { wch: 5 }, { wch: 25 }, { wch: 40 },
    ];
    ws['!cols'] = colWidths;

    const fileName = `vendedores_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    return { success: true, fileName, recordCount: vendedores.length };
  },

  // Exporta todos os dados em um único arquivo com múltiplas abas
  exportTodosDados: (vendas: any[], clientes: any[], produtos: any[], vendedores: any[]) => {
    const wb = XLSX.utils.book_new();

    // Aba de Vendas
    const vendasData = vendas.map(venda => ({
      'Número Pedido': venda.numeroPedido || venda.numero,
      'Data Pedido': format(new Date(venda.dataPedido), 'dd/MM/yyyy'),
      'Cliente': venda.clienteNome || venda.nomeCliente,
      'Vendedor': venda.vendedorNome || venda.nomeVendedor,
      'Status': venda.status,
      'Valor Total': venda.valorTotal || venda.valorPedido,
    }));
    const wsVendas = XLSX.utils.json_to_sheet(vendasData);
    XLSX.utils.book_append_sheet(wb, wsVendas, 'Vendas');

    // Aba de Clientes
    const clientesData = clientes.map(c => ({
      'Código': c.codigoCliente || c.codigo || '',
      'CPF/CNPJ': c.cpfCnpj || c.cnpj || c.cpf,
      'Razão Social': c.razaoSocial,
      'Município': c.municipio,
      'UF': c.uf,
      'Status': c.statusAprovacao || c.situacao || 'aprovado',
    }));
    const wsClientes = XLSX.utils.json_to_sheet(clientesData);
    XLSX.utils.book_append_sheet(wb, wsClientes, 'Clientes');

    // Aba de Produtos
    const produtosData = produtos.map(p => ({
      'SKU': p.sku || p.codigoSku,
      'Descrição': p.descricao,
      'Marca': p.marca || p.nomeMarca || '',
      'Preço': p.precoVenda || 0,
      'Estoque': p.estoqueAtual || 0,
      'Situação': p.situacao,
    }));
    const wsProdutos = XLSX.utils.json_to_sheet(produtosData);
    XLSX.utils.book_append_sheet(wb, wsProdutos, 'Produtos');

    // Aba de Vendedores
    const vendedoresData = vendedores.map(v => ({
      'Nome': v.nome,
      'Email': v.email,
      'Cargo': v.cargo || '',
      'Meta Mensal': v.metaMensal || 0,
      'Situação': v.situacao,
    }));
    const wsVendedores = XLSX.utils.json_to_sheet(vendedoresData);
    XLSX.utils.book_append_sheet(wb, wsVendedores, 'Vendedores');

    const fileName = `backup_completo_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    return { 
      success: true, 
      fileName,
      recordCounts: {
        vendas: vendas.length,
        clientes: clientes.length,
        produtos: produtos.length,
        vendedores: vendedores.length,
      }
    };
  },
};

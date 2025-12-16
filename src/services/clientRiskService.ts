// Serviço de análise de clientes em risco
import { 
  InactiveClient, 
  SalesReduction, 
  PromisingClient, 
  ClientRiskMetrics,
  ClientRiskFilters 
} from '../types/clientRisk';
import { Venda } from '../types/venda';
import { Seller } from '../types/seller';

// Função auxiliar para calcular dias entre datas
function calcularDiasEntreDatas(dataInicial: string | Date, dataFinal: Date = new Date()): number {
  const inicio = typeof dataInicial === 'string' ? new Date(dataInicial) : dataInicial;
  const diffTime = Math.abs(dataFinal.getTime() - inicio.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Função para determinar severidade da redução
function calcularSeveridade(percentual: number): 'normal' | 'atencao' | 'alerta' | 'critico' {
  const absPercentual = Math.abs(percentual);
  if (absPercentual <= 5) return 'normal';
  if (absPercentual <= 20) return 'atencao';
  if (absPercentual <= 50) return 'alerta';
  return 'critico';
}

// Obter vendas por cliente em um período
function obterVendasPorClientePeriodo(
  vendas: Venda[],
  clienteId: string,
  dataInicio: Date,
  dataFim: Date
): { valor: number; quantidade: number } {
  const vendasPeriodo = vendas.filter(venda => {
    const dataVenda = new Date(venda.dataEmissao || venda.dataPedido);
    return (
      venda.clienteId === clienteId &&
      dataVenda >= dataInicio &&
      dataVenda <= dataFim &&
      venda.status !== 'cancelado'
    );
  });

  const valor = vendasPeriodo.reduce((sum, v) => sum + (v.valorTotal || v.valorPedido || 0), 0);
  const quantidade = vendasPeriodo.length;

  return { valor, quantidade };
}

// Obter última compra do cliente
function obterUltimaCompraCliente(vendas: Venda[], clienteId: string): { data: string | null; valor: number } {
  const vendasCliente = vendas
    .filter(v => v.clienteId === clienteId && v.status !== 'cancelado')
    .sort((a, b) => {
      const dataA = new Date(a.dataEmissao || a.dataPedido);
      const dataB = new Date(b.dataEmissao || b.dataPedido);
      return dataB.getTime() - dataA.getTime();
    });

  if (vendasCliente.length === 0) {
    return { data: null, valor: 0 };
  }

  const ultimaVenda = vendasCliente[0];
  return {
    data: ultimaVenda.dataEmissao || ultimaVenda.dataPedido.toString(),
    valor: ultimaVenda.valorTotal || ultimaVenda.valorPedido || 0
  };
}

// Obter LTV total do cliente
function obterLTVCliente(vendas: Venda[], clienteId: string): number {
  return vendas
    .filter(v => v.clienteId === clienteId && v.status !== 'cancelado')
    .reduce((sum, v) => sum + (v.valorTotal || v.valorPedido || 0), 0);
}

// Obter nome do vendedor
function obterNomeVendedor(vendedores: Seller[], vendedorId: string): string {
  const vendedor = vendedores.find(v => v.id === vendedorId);
  return vendedor?.nome || 'Sem vendedor';
}

// Analisar clientes inativos
export function analisarClientesInativos(
  clientes: any[],
  vendas: Venda[],
  vendedores: Seller[],
  diasInatividade: number,
  filtros?: {
    vendedores?: string[];
    segmentos?: string[];
    estados?: string[];
    valorMinimo?: number;
  }
): InactiveClient[] {
  const hoje = new Date();
  const resultado: InactiveClient[] = [];

  clientes.forEach(cliente => {
    // Aplicar filtros
    if (filtros?.vendedores && filtros.vendedores.length > 0) {
      if (!filtros.vendedores.includes(cliente.vendedorId)) return;
    }
    if (filtros?.segmentos && filtros.segmentos.length > 0) {
      if (!filtros.segmentos.includes(cliente.segmento)) return;
    }
    if (filtros?.estados && filtros.estados.length > 0) {
      if (!filtros.estados.includes(cliente.estado || cliente.uf)) return;
    }

    const ultimaCompra = obterUltimaCompraCliente(vendas, cliente.id);
    const ltv = obterLTVCliente(vendas, cliente.id);

    // Filtro por valor mínimo (LTV)
    if (filtros?.valorMinimo && ltv < filtros.valorMinimo) {
      return;
    }

    // Cliente nunca comprou
    if (!ultimaCompra.data) {
      resultado.push({
        id: cliente.id,
        codigo: cliente.codigo || cliente.id,
        nome: cliente.nome || cliente.razaoSocial,
        vendedor: obterNomeVendedor(vendedores, cliente.vendedorId),
        vendedorId: cliente.vendedorId,
        dataUltimaCompra: null,
        diasSemComprar: calcularDiasEntreDatas(cliente.dataCadastro || new Date(), hoje),
        valorUltimaCompra: 0,
        ltvTotal: 0,
        status: cliente.status || cliente.situacao || 'Ativo',
        segmento: cliente.segmento || cliente.segmentoMercado || 'N/A',
        categoria: 'nunca_comprou',
        cidade: cliente.cidade || cliente.municipio || '',
        estado: cliente.estado || cliente.uf || '',
        telefone: cliente.telefone || cliente.telefonePrincipal || undefined,
        email: cliente.email || undefined,
      });
      return;
    }

    // Cliente inativo (não compra há X dias)
    const diasSemComprar = calcularDiasEntreDatas(ultimaCompra.data, hoje);
    if (diasSemComprar >= diasInatividade) {
      resultado.push({
        id: cliente.id,
        codigo: cliente.codigo || cliente.id,
        nome: cliente.nome || cliente.razaoSocial,
        vendedor: obterNomeVendedor(vendedores, cliente.vendedorId),
        vendedorId: cliente.vendedorId,
        dataUltimaCompra: ultimaCompra.data,
        diasSemComprar,
        valorUltimaCompra: ultimaCompra.valor,
        ltvTotal: ltv,
        status: cliente.status || cliente.situacao || 'Ativo',
        segmento: cliente.segmento || cliente.segmentoMercado || 'N/A',
        categoria: 'inativo',
        cidade: cliente.cidade || cliente.municipio || '',
        estado: cliente.estado || cliente.uf || '',
        telefone: cliente.telefone || cliente.telefonePrincipal || undefined,
        email: cliente.email || undefined,
      });
    }
  });

  return resultado.sort((a, b) => b.diasSemComprar - a.diasSemComprar);
}

// Analisar redução de compras
export function analisarReducaoCompras(
  clientes: any[],
  vendas: Venda[],
  vendedores: Seller[],
  periodoAtual: { inicio: Date; fim: Date },
  periodoAnterior: { inicio: Date; fim: Date },
  filtros?: {
    percentualMinimo?: number;
    vendedores?: string[];
    segmentos?: string[];
    estados?: string[];
    valorMinimo?: number;
  }
): SalesReduction[] {
  const resultado: SalesReduction[] = [];

  clientes.forEach(cliente => {
    // Aplicar filtros
    if (filtros?.vendedores && filtros.vendedores.length > 0) {
      if (!filtros.vendedores.includes(cliente.vendedorId)) return;
    }
    if (filtros?.segmentos && filtros.segmentos.length > 0) {
      if (!filtros.segmentos.includes(cliente.segmento || cliente.segmentoMercado)) return;
    }
    if (filtros?.estados && filtros.estados.length > 0) {
      if (!filtros.estados.includes(cliente.estado || cliente.uf)) return;
    }

    const vendasAnterior = obterVendasPorClientePeriodo(
      vendas,
      cliente.id,
      periodoAnterior.inicio,
      periodoAnterior.fim
    );

    const vendasAtual = obterVendasPorClientePeriodo(
      vendas,
      cliente.id,
      periodoAtual.inicio,
      periodoAtual.fim
    );

    // Só considerar clientes que compraram no período anterior
    if (vendasAnterior.valor === 0) return;

    // Filtro por valor mínimo
    if (filtros?.valorMinimo && vendasAnterior.valor < filtros.valorMinimo) {
      return;
    }

    const reducaoValor = vendasAnterior.valor - vendasAtual.valor;
    const reducaoPercentual = ((reducaoValor / vendasAnterior.valor) * 100);

    // Aplicar filtro de percentual mínimo
    const percentualMinimo = filtros?.percentualMinimo || 0;
    if (reducaoPercentual < percentualMinimo) return;

    // Só incluir se houver redução
    if (reducaoPercentual > 0) {
      resultado.push({
        id: cliente.id,
        codigo: cliente.codigo || cliente.id,
        nome: cliente.nome || cliente.razaoSocial,
        vendedor: obterNomeVendedor(vendedores, cliente.vendedorId),
        vendedorId: cliente.vendedorId,
        valorPeriodoAnterior: vendasAnterior.valor,
        valorPeriodoAtual: vendasAtual.valor,
        reducaoValor,
        reducaoPercentual,
        qtdVendasAnterior: vendasAnterior.quantidade,
        qtdVendasAtual: vendasAtual.quantidade,
        severidade: calcularSeveridade(reducaoPercentual),
        segmento: cliente.segmento || cliente.segmentoMercado || 'N/A',
        cidade: cliente.cidade || cliente.municipio || '',
        estado: cliente.estado || cliente.uf || '',
        telefone: cliente.telefone || cliente.telefonePrincipal || undefined,
        email: cliente.email || undefined,
      });
    }
  });

  return resultado.sort((a, b) => b.reducaoPercentual - a.reducaoPercentual);
}

// Analisar clientes promissores (com aumento de compras)
export function analisarClientesPromissores(
  clientes: any[],
  vendas: Venda[],
  vendedores: Seller[],
  periodoAtual: { inicio: Date; fim: Date },
  periodoAnterior: { inicio: Date; fim: Date },
  filtros?: {
    vendedores?: string[];
    segmentos?: string[];
    estados?: string[];
  }
): PromisingClient[] {
  const resultado: PromisingClient[] = [];

  clientes.forEach(cliente => {
    // Aplicar filtros
    if (filtros?.vendedores && filtros.vendedores.length > 0) {
      if (!filtros.vendedores.includes(cliente.vendedorId)) return;
    }
    if (filtros?.segmentos && filtros.segmentos.length > 0) {
      if (!filtros.segmentos.includes(cliente.segmento || cliente.segmentoMercado)) return;
    }
    if (filtros?.estados && filtros.estados.length > 0) {
      if (!filtros.estados.includes(cliente.estado || cliente.uf)) return;
    }

    const vendasAnterior = obterVendasPorClientePeriodo(
      vendas,
      cliente.id,
      periodoAnterior.inicio,
      periodoAnterior.fim
    );

    const vendasAtual = obterVendasPorClientePeriodo(
      vendas,
      cliente.id,
      periodoAtual.inicio,
      periodoAtual.fim
    );

    // Só considerar clientes que compraram em ambos os períodos
    if (vendasAnterior.valor === 0 || vendasAtual.valor === 0) return;

    const aumentoValor = vendasAtual.valor - vendasAnterior.valor;
    const aumentoPercentual = ((aumentoValor / vendasAnterior.valor) * 100);

    // Só incluir se houver aumento significativo (>5%)
    if (aumentoPercentual > 5) {
      resultado.push({
        id: cliente.id,
        codigo: cliente.codigo || cliente.id,
        nome: cliente.nome || cliente.razaoSocial,
        vendedor: obterNomeVendedor(vendedores, cliente.vendedorId),
        vendedorId: cliente.vendedorId,
        valorPeriodoAnterior: vendasAnterior.valor,
        valorPeriodoAtual: vendasAtual.valor,
        aumentoValor,
        aumentoPercentual,
        qtdVendasAnterior: vendasAnterior.quantidade,
        qtdVendasAtual: vendasAtual.quantidade,
        segmento: cliente.segmento || cliente.segmentoMercado || 'N/A',
        cidade: cliente.cidade || cliente.municipio || '',
        estado: cliente.estado || cliente.uf || '',
        telefone: cliente.telefone || cliente.telefonePrincipal || undefined,
        email: cliente.email || undefined,
      });
    }
  });

  return resultado.sort((a, b) => b.aumentoPercentual - a.aumentoPercentual);
}

// Calcular métricas gerais de risco
export function calcularMetricasRisco(
  clientesInativos: InactiveClient[],
  clientesReducao: SalesReduction[],
  totalClientes: number,
  faturamentoTotal: number
): ClientRiskMetrics {
  const clientesNuncaCompraram = clientesInativos.filter(c => c.categoria === 'nunca_comprou').length;
  const clientesInativosCount = clientesInativos.filter(c => c.categoria === 'inativo').length;
  
  const valorTotalEmRisco = clientesReducao.reduce((sum, c) => sum + c.reducaoValor, 0);
  const percentualFaturamentoEmRisco = faturamentoTotal > 0 
    ? (valorTotalEmRisco / faturamentoTotal) * 100 
    : 0;

  const reducaoMediaPercentual = clientesReducao.length > 0
    ? clientesReducao.reduce((sum, c) => sum + c.reducaoPercentual, 0) / clientesReducao.length
    : 0;

  // Taxa de recuperação (clientes que voltaram a comprar após inatividade)
  const clientesComLTV = clientesInativos.filter(c => c.ltvTotal > 0).length;
  const taxaRecuperacao = clientesInativosCount > 0 
    ? (clientesComLTV / (clientesInativosCount + clientesComLTV)) * 100 
    : 0;

  return {
    totalClientesEmRisco: clientesInativos.length + clientesReducao.length,
    percentualFaturamentoEmRisco,
    clientesNuncaCompraram,
    clientesInativos: clientesInativosCount,
    taxaRecuperacao,
    valorTotalEmRisco,
    clientesComReducao: clientesReducao.length,
    reducaoMediaPercentual,
  };
}

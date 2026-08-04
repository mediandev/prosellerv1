import { Button } from './ui/button';
import { toast } from 'sonner';
import { Cliente } from '../types/customer';

interface FormDataDebuggerProps {
  formData: Partial<Cliente>;
}

export function FormDataDebugger({ formData }: FormDataDebuggerProps) {
  const handleDebug = () => {
    console.log('🔍 ='.repeat(40));
    console.log('🔍 [DEBUG] FormData Snapshot Completo:');
    console.log(JSON.parse(JSON.stringify(formData)));
    console.log('🔍 ='.repeat(40));
    
    console.table({
      'ID': formData.id || 'N/A',
      'Razão Social': formData.razaoSocial || 'N/A',
      'Pessoas Contato': formData.pessoasContato?.length || 0,
      'Dados Bancários': formData.dadosBancarios?.length || 0,
      'Condições Pagamento': formData.condicoesPagamentoAssociadas?.length || 0,
      'Empresa Faturamento': formData.empresaFaturamento || 'N/A',
      'Lista Preços': formData.listaPrecos || 'N/A',
      'Segmento Mercado': formData.segmentoMercado || 'N/A',
      'Grupo/Rede': formData.grupoRede || 'N/A',
      'Vendedor': formData.vendedorAtribuido?.nome || 'N/A',
      'Desconto Padrão': formData.descontoPadrao || 0,
      'Desconto Financeiro': formData.descontoFinanceiro || 0,
      'Pedido Mínimo': formData.pedidoMinimo || 0,
    });
    
    if (formData.pessoasContato && formData.pessoasContato.length > 0) {
      console.log('📋 Pessoas de Contato:', formData.pessoasContato);
    }
    
    if (formData.dadosBancarios && formData.dadosBancarios.length > 0) {
      console.log('🏦 Dados Bancários:', formData.dadosBancarios);
    }
    
    if (formData.condicoesPagamentoAssociadas && formData.condicoesPagamentoAssociadas.length > 0) {
      console.log('💳 Condições de Pagamento:', formData.condicoesPagamentoAssociadas);
    }
    
    toast.info('✅ Verifique o console para ver o FormData completo');
  };

  return (
    <Button 
      onClick={handleDebug}
      variant="outline"
      type="button"
      className="bg-yellow-50 hover:bg-yellow-100 border-yellow-300"
    >
      🔍 Debug FormData
    </Button>
  );
}

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
// Configuração do Supabase removida - funcionalidade desabilitada

interface ResultadoMigracao {
  sucesso: boolean;
  vendasAtualizadas: number;
  vendasComProblema: number;
  totalVendas: number;
  detalhes: Array<{
    vendaId: string;
    numero: string;
    vendedorIdAntigo: string;
    vendedorIdNovo: string;
    nomeVendedor: string;
  }>;
}

export function MigracaoVendedorId() {
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoMigracao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const executarMigracao = async () => {
    setExecutando(true);
    setErro(null);
    setResultado(null);

    try {
      // Funcionalidade desabilitada - Supabase removido
      throw new Error('Funcionalidade desabilitada. Supabase foi removido do projeto.');

      const data = await response.json();

      if (data.sucesso) {
        setResultado(data);
      } else {
        setErro(data.erro || 'Erro desconhecido');
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao executar migração');
    } finally {
      setExecutando(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Migração de VendedorId</h2>
        <p className="text-sm text-gray-600">
          Esta ferramenta corrige vendas que possuem <code className="bg-gray-100 px-1 rounded">vendedorId</code> desatualizado,
          vinculando-as aos vendedores corretos baseado no <code className="bg-gray-100 px-1 rounded">nomeVendedor</code>.
        </p>
      </div>

      <button
        onClick={executarMigracao}
        disabled={executando}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-4 h-4 ${executando ? 'animate-spin' : ''}`} />
        {executando ? 'Executando migração...' : 'Executar Migração'}
      </button>

      {erro && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Erro ao executar migração</p>
            <p className="text-sm text-red-700 mt-1">{erro}</p>
          </div>
        </div>
      )}

      {resultado && (
        <div className="mt-4 space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">Migração concluída com sucesso!</p>
              <div className="text-sm text-green-700 mt-2 space-y-1">
                <p>✅ <strong>{resultado.vendasAtualizadas}</strong> vendas atualizadas</p>
                <p>📊 <strong>{resultado.totalVendas}</strong> vendas analisadas</p>
                {resultado.vendasComProblema > 0 && (
                  <p>⚠️ <strong>{resultado.vendasComProblema}</strong> vendas com problemas (vendedor não encontrado)</p>
                )}
              </div>
            </div>
          </div>

          {resultado.detalhes.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Detalhes das Atualizações</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Venda</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Vendedor</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">ID Antigo</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">ID Novo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {resultado.detalhes.map((detalhe, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{detalhe.numero}</td>
                        <td className="px-4 py-2">{detalhe.nomeVendedor}</td>
                        <td className="px-4 py-2 font-mono text-xs text-red-600">{detalhe.vendedorIdAntigo.substring(0, 8)}...</td>
                        <td className="px-4 py-2 font-mono text-xs text-green-600">{detalhe.vendedorIdNovo.substring(0, 8)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

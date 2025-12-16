import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { consultarCNPJCompleto } from '../services/integrations';

export function CNPJDebugger() {
  const [cnpj, setCnpj] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTestar = async () => {
    if (!cnpj) return;
    
    setLoading(true);
    try {
      console.clear();
      console.log('🔍 Iniciando teste de CNPJ:', cnpj);
      
      const result = await consultarCNPJCompleto(cnpj.replace(/\D/g, ''));
      
      console.log('📦 Resultado completo:', result);
      console.log('🏢 Dados CNPJ:', result?.cnpj);
      console.log('📍 Município:', result?.cnpj?.municipio);
      console.log('📍 UF:', result?.cnpj?.uf);
      
      setResultado(result);
    } catch (error) {
      console.error('❌ Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-orange-800">🔧 Debug - Teste de CNPJ</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Digite um CNPJ (ex: 00.000.000/0001-91)"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleTestar} disabled={loading}>
            {loading ? 'Testando...' : 'Testar'}
          </Button>
        </div>

        {resultado && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded border">
              <h3 className="font-semibold mb-2">Dados Extraídos:</h3>
              <div className="space-y-1 text-sm font-mono">
                <div>
                  <strong>Razão Social:</strong> {resultado.cnpj?.razao_social || '❌ Vazio'}
                </div>
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <strong className="text-blue-800">UF:</strong>{' '}
                  <span className={resultado.cnpj?.uf ? 'text-green-600 font-bold' : 'text-red-600'}>
                    {resultado.cnpj?.uf || '❌ VAZIO'}
                  </span>
                </div>
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <strong className="text-yellow-800">Município:</strong>{' '}
                  <span className={resultado.cnpj?.municipio ? 'text-green-600 font-bold' : 'text-red-600'}>
                    {resultado.cnpj?.municipio || '❌ VAZIO'}
                  </span>
                </div>
                <div>
                  <strong>Logradouro:</strong> {resultado.cnpj?.logradouro || '❌ Vazio'}
                </div>
                <div>
                  <strong>Bairro:</strong> {resultado.cnpj?.bairro || '❌ Vazio'}
                </div>
                <div>
                  <strong>CEP:</strong> {resultado.cnpj?.cep || '❌ Vazio'}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-100 rounded border">
              <h3 className="font-semibold mb-2">Response Completo (JSON):</h3>
              <pre className="text-xs overflow-auto max-h-96 bg-gray-900 text-green-400 p-4 rounded">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </div>

            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">📋 Instruções:</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Verifique se <strong>UF</strong> e <strong>Município</strong> estão preenchidos acima</li>
                <li>Se estiverem vazios, o problema está na API/mapeamento</li>
                <li>Se estiverem preenchidos aqui mas não no formulário, o problema está no delay</li>
                <li>Abra o Console (F12) para ver logs detalhados de cada API</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

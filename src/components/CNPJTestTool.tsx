import { useState } from 'react';
import { consultarCNPJCompleto, ConsultaCNPJCompleta } from '../services/integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Search, CheckCircle, XCircle, Loader2, Info, Award } from 'lucide-react';

export function CNPJTestTool() {
  const [cnpj, setCnpj] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<ConsultaCNPJCompleta | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleBuscar = async () => {
    setErro(null);
    setResultado(null);
    
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) {
      setErro('CNPJ deve ter 14 dígitos');
      return;
    }

    setBuscando(true);
    try {
      const data = await consultarCNPJCompleto(cnpjLimpo);
      if (data) {
        setResultado(data);
      } else {
        setErro('Não foi possível obter os dados do CNPJ');
      }
    } catch (error) {
      setErro('Erro ao consultar CNPJ: ' + (error as Error).message);
    } finally {
      setBuscando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Teste de Consulta CNPJ
        </CardTitle>
        <CardDescription>
          Ferramenta para testar a consulta de dados de CNPJ via APIs públicas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>APIs utilizadas (com fallback automático):</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>BrasilAPI (brasilapi.com.br) - Mais confiável</li>
              <li>ReceitaWS (receitaws.com.br) - Fallback 1</li>
              <li>CNPJ.WS (cnpj.ws) - Fallback 2</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="cnpj-test">CNPJ</Label>
          <div className="flex gap-2">
            <Input
              id="cnpj-test"
              value={cnpj}
              onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
            <Button onClick={handleBuscar} disabled={buscando}>
              {buscando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* CNPJs de exemplo */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Exemplos:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCnpj(formatCNPJ('00000000000191'))}
          >
            00.000.000/0001-91
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCnpj(formatCNPJ('11222333000144'))}
          >
            11.222.333/0001-44
          </Button>
        </div>

        {erro && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {resultado && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Dados obtidos com sucesso!
                {resultado.sintegra?.ie && ' Inscrição Estadual encontrada automaticamente!'}
              </AlertDescription>
            </Alert>

            <Separator />

            {/* Dados do CNPJ */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Dados da Receita Federal
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">CNPJ</Label>
                    <p className="font-mono">{resultado.cnpj.cnpj}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Razão Social</Label>
                    <p className="font-medium">{resultado.cnpj.razao_social}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome Fantasia</Label>
                    <p>{resultado.cnpj.nome_fantasia || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Situação</Label>
                    <div>
                      <Badge variant={resultado.cnpj.situacao === 'ATIVA' ? 'default' : 'secondary'}>
                        {resultado.cnpj.situacao}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">CEP</Label>
                    <p>{resultado.cnpj.cep || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Endereço</Label>
                    <p>
                      {resultado.cnpj.logradouro}, {resultado.cnpj.numero}
                      {resultado.cnpj.complemento && ` - ${resultado.cnpj.complemento}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bairro</Label>
                    <p>{resultado.cnpj.bairro || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cidade/UF</Label>
                    <p>
                      {resultado.cnpj.municipio}/{resultado.cnpj.uf}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">E-mail</Label>
                    <p>{resultado.cnpj.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p>{resultado.cnpj.telefone || '-'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Atividade Principal</Label>
                    <p className="text-sm">{resultado.cnpj.atividade_principal || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data de Abertura</Label>
                    <p>{resultado.cnpj.data_abertura || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Capital Social</Label>
                    <p>
                      {resultado.cnpj.capital_social > 0
                        ? `R$ ${resultado.cnpj.capital_social.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}`
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dados do SINTEGRA */}
            {resultado.sintegra?.ie ? (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-600" />
                    Inscrição Estadual (SINTEGRA)
                  </h4>
                  <Alert className="bg-blue-50 border-blue-200">
                    <Award className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-blue-600">Inscrição Estadual</Label>
                          <p className="font-mono font-bold text-lg">{resultado.sintegra.ie}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <Label className="text-xs text-blue-600">UF</Label>
                            <p className="font-medium">{resultado.sintegra.uf}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-blue-600">Situação</Label>
                            <Badge variant="outline" className="bg-white">
                              {resultado.sintegra.situacao}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              </>
            ) : (
              <>
                <Separator />
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Inscrição Estadual não encontrada automaticamente.
                    {resultado.cnpj.uf && ` (Consultado em ${resultado.cnpj.uf})`}
                  </AlertDescription>
                </Alert>
              </>
            )}

            <Separator />

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">JSON Completo:</p>
              <pre className="text-xs overflow-auto p-2 bg-background rounded border max-h-[300px]">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

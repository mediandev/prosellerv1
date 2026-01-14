import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Loader2 } from 'lucide-react';
// Configuração do Supabase removida - funcionalidade desabilitada

export function AnaliseCurvaABC() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalise() {
      try {
        setLoading(true);
        // Funcionalidade desabilitada - Supabase removido
        setError('Funcionalidade desabilitada. Supabase foi removido do projeto.');
        setData(null);
      } catch (err) {
        console.error('Erro ao buscar análise:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalise();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Erro: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const getBadgeVariant = (curva: string) => {
    switch (curva) {
      case 'A':
        return 'default'; // Verde
      case 'B':
        return 'secondary'; // Amarelo
      case 'C':
        return 'destructive'; // Vermelho
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Curva ABC - {data.periodo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl font-bold">{data.totalClientes}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Faturamento Total</p>
              <p className="text-2xl font-bold">{data.totalFaturamentoFormatado}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo por Curva */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Curva A</span>
              <Badge variant="default">Alta</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Clientes</p>
              <p className="text-xl font-bold">{data.resumoCurvas.A.clientes}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="text-xl font-bold">{data.resumoCurvas.A.valorFormatado}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">% Faturamento</p>
              <p className="text-xl font-bold text-green-600">{data.resumoCurvas.A.percentual}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Curva B</span>
              <Badge variant="secondary">Média</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Clientes</p>
              <p className="text-xl font-bold">{data.resumoCurvas.B.clientes}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="text-xl font-bold">{data.resumoCurvas.B.valorFormatado}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">% Faturamento</p>
              <p className="text-xl font-bold text-amber-600">{data.resumoCurvas.B.percentual}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Curva C</span>
              <Badge variant="destructive">Baixa</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Clientes</p>
              <p className="text-xl font-bold">{data.resumoCurvas.C.clientes}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="text-xl font-bold">{data.resumoCurvas.C.valorFormatado}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">% Faturamento</p>
              <p className="text-xl font-bold text-red-600">{data.resumoCurvas.C.percentual}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Posição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">% Individual</TableHead>
                  <TableHead className="text-right">% Acumulado</TableHead>
                  <TableHead className="text-center">Curva ABC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.detalhamento.map((item: any) => (
                  <TableRow key={item.posicao}>
                    <TableCell className="font-medium">{item.posicao}º</TableCell>
                    <TableCell>{item.cliente}</TableCell>
                    <TableCell className="text-right">{item.valorFormatado}</TableCell>
                    <TableCell className="text-right font-medium">{item.percentual}</TableCell>
                    <TableCell className="text-right font-medium">{item.percentualAcumulado}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getBadgeVariant(item.curvaABC)}>
                        {item.curvaABC}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card>
        <CardHeader>
          <CardTitle>Critérios de Classificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="default">A</Badge>
            <span className="text-sm">Clientes que acumulam até 80% do faturamento (Alta Prioridade)</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">B</Badge>
            <span className="text-sm">Clientes que acumulam entre 80% e 95% do faturamento (Média Prioridade)</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">C</Badge>
            <span className="text-sm">Clientes que acumulam acima de 95% do faturamento (Baixa Prioridade)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

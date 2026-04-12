import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Target, TrendingUp, Award, Calendar } from "lucide-react";
import { api } from "../services/api";
import { toast } from "sonner@2.0.3";

interface VendedorMeta {
  id: string;
  nome: string;
  iniciais: string;
  cargo: string;
  metaMensal: number;
  vendidoMes: number;
  progresso: number;
  diasRestantes: number;
  previsao: number;
  tendencia: "acima" | "na_meta" | "abaixo";
  metaTrimestral: number;
  vendidoTrimestre: number;
  progressoTrimestral: number;
}

/**
 * IMPORTANTE: As metas mensais aqui devem estar sincronizadas com /services/metasService.ts
 * O sistema de metas dinâmicas usa os valores de metasService.ts para calcular
 * automaticamente as metas semanais e diárias nos gráficos e métricas do dashboard.
 * 
 * Ao atualizar uma meta mensal, atualizar em ambos os arquivos:
 * 1. /components/GoalsTracking.tsx (este arquivo)
 * 2. /services/metasService.ts
 */
const metas: VendedorMeta[] = [
  {
    id: "user-2",
    nome: "João Silva",
    iniciais: "JS",
    cargo: "Vendedor Sênior",
    metaMensal: 35000,
    vendidoMes: 32400,
    progresso: 92,
    diasRestantes: 14,
    previsao: 37200,
    tendencia: "acima",
    metaTrimestral: 105000,
    vendidoTrimestre: 97900,
    progressoTrimestral: 93
  },
  {
    id: "user-3",
    nome: "Maria Santos",
    iniciais: "MS",
    cargo: "Vendedora Pleno",
    metaMensal: 30000,
    vendidoMes: 28900,
    progresso: 96,
    diasRestantes: 14,
    previsao: 31500,
    tendencia: "acima",
    metaTrimestral: 90000,
    vendidoTrimestre: 86400,
    progressoTrimestral: 96
  },
  {
    id: "user-4",
    nome: "Carlos Oliveira",
    iniciais: "CO",
    cargo: "Vendedor Pleno",
    metaMensal: 28000,
    vendidoMes: 26200,
    progresso: 93,
    diasRestantes: 14,
    previsao: 28800,
    tendencia: "acima",
    metaTrimestral: 84000,
    vendidoTrimestre: 78500,
    progressoTrimestral: 93
  },
  {
    id: "user-5",
    nome: "Ana Paula",
    iniciais: "AP",
    cargo: "Vendedora Junior",
    metaMensal: 25000,
    vendidoMes: 24100,
    progresso: 96,
    diasRestantes: 14,
    previsao: 26200,
    tendencia: "acima",
    metaTrimestral: 75000,
    vendidoTrimestre: 71800,
    progressoTrimestral: 95
  },
  {
    id: "user-6",
    nome: "Pedro Costa",
    iniciais: "PC",
    cargo: "Vendedor Junior",
    metaMensal: 23000,
    vendidoMes: 21800,
    progresso: 94,
    diasRestantes: 14,
    previsao: 24100,
    tendencia: "acima",
    metaTrimestral: 69000,
    vendidoTrimestre: 63800,
    progressoTrimestral: 92
  },
  {
    id: "user-7",
    nome: "Fernanda Lima",
    iniciais: "FL",
    cargo: "Vendedora Pleno",
    metaMensal: 28000,
    vendidoMes: 25600,
    progresso: 91,
    diasRestantes: 14,
    previsao: 27800,
    tendencia: "na_meta",
    metaTrimestral: 84000,
    vendidoTrimestre: 77400,
    progressoTrimestral: 92
  }
];

const tendenciaConfig = {
  acima: { label: "Acima da Meta", color: "text-green-500", bgColor: "bg-green-500" },
  na_meta: { label: "Dentro da Meta", color: "text-blue-500", bgColor: "bg-blue-500" },
  abaixo: { label: "Abaixo da Meta", color: "text-red-500", bgColor: "bg-red-500" }
};

const chartDataMock = metas.map(meta => ({
  nome: meta.nome.split(' ')[0],
  realizado: meta.vendidoMes,
  meta: meta.metaMensal,
  previsao: meta.previsao
}));

const evolutionData = [
  { semana: "Sem 1", joao: 7200, maria: 6800, carlos: 6100, ana: 5900, pedro: 5200, fernanda: 6000 },
  { semana: "Sem 2", joao: 15400, maria: 14200, carlos: 13000, ana: 12400, pedro: 10800, fernanda: 12500 },
  { semana: "Sem 3", joao: 24100, maria: 21800, carlos: 19800, ana: 18200, pedro: 16400, fernanda: 19200 },
  { semana: "Sem 4", joao: 32400, maria: 28900, carlos: 26200, ana: 24100, pedro: 21800, fernanda: 25600 }
];

export function GoalsTracking() {
  const [metasState, setMetasState] = useState<VendedorMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarMetas();
  }, []);

  const carregarMetas = async () => {
    try {
      console.log('[METAS] Carregando metas da API...');
      const metasAPI = await api.get('metas');
      
      // ✅ SEMPRE usar dados reais (mesmo se vazio)
      setMetasState(metasAPI || []);
      console.log('[METAS] Metas carregadas:', metasAPI?.length || 0);
    } catch (error) {
      console.error('[METAS] Erro ao carregar metas:', error);
      // ✅ Em caso de erro, usar array vazio (não mock)
      setMetasState([]);
    } finally {
      setLoading(false);
    }
  };

  const metaTotal = metasState.reduce((sum, m) => sum + m.metaMensal, 0);
  const vendidoTotal = metasState.reduce((sum, m) => sum + m.vendidoMes, 0);
  const progressoGeral = metaTotal > 0 ? Math.round((vendidoTotal / metaTotal) * 100) : 0;

  const chartData = metasState.map(meta => ({
    nome: meta.nome.split(' ')[0],
    realizado: meta.vendidoMes,
    meta: meta.metaMensal,
    progresso: meta.progresso
  }));

  // Se não houver metas, exibir mensagem
  if (!loading && metasState.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl">Acompanhamento de Metas</h2>
          <p className="text-sm text-muted-foreground">
            Monitore o desempenho da equipe em relação às metas estabelecidas
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">Nenhuma meta cadastrada</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Cadastre vendedores na aba "Equipe" e defina suas metas para começar o acompanhamento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Meta Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(metaTotal / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">Objetivo mensal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Realizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(vendidoTotal / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {progressoGeral}% da meta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4" />
              Na Meta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6/6</div>
            <p className="text-xs text-muted-foreground mt-1">vendedores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dias Restantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground mt-1">para fechar o mês</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="individual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="individual">Metas Individuais</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          {metasState.map((meta) => (
            <Card key={meta.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{meta.iniciais}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{meta.nome}</h3>
                        <p className="text-sm text-muted-foreground">{meta.cargo}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={tendenciaConfig[meta.tendencia].color}
                      >
                        {tendenciaConfig[meta.tendencia].label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Meta Mensal</p>
                        <p className="text-sm font-medium">
                          R$ {meta.metaMensal.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Vendido</p>
                        <p className="text-sm font-medium">
                          R$ {meta.vendidoMes.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Previsão</p>
                        <p className="text-sm font-medium">
                          R$ {meta.previsao.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Falta</p>
                        <p className="text-sm font-medium">
                          R$ {(meta.metaMensal - meta.vendidoMes).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso Mensal</span>
                        <span className="font-medium">{meta.progresso}%</span>
                      </div>
                      <Progress value={meta.progresso} />
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso Trimestral</span>
                        <span className="font-medium">{meta.progressoTrimestral}%</span>
                      </div>
                      <Progress value={meta.progressoTrimestral} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>R$ {meta.vendidoTrimestre.toLocaleString('pt-BR')}</span>
                        <span>R$ {meta.metaTrimestral.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="comparativo">
          <Card>
            <CardHeader>
              <CardTitle>Comparativo de Performance</CardTitle>
              <CardDescription>
                Vendas realizadas vs meta estabelecida para cada vendedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[400px] h-[400px]">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="nome" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                  />
                  <Legend />
                  <Bar dataKey="meta" fill="hsl(var(--muted))" name="Meta" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realizado" fill="hsl(var(--primary))" name="Realizado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="previsao" fill="hsl(var(--secondary))" name="Previsão" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolucao">
          <Card>
            <CardHeader>
              <CardTitle>Evolução Semanal</CardTitle>
              <CardDescription>
                Acompanhamento do progresso acumulado ao longo do mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[400px] h-[400px]">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="semana" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="joao" stroke="#8884d8" strokeWidth={2} name="João" />
                  <Line type="monotone" dataKey="maria" stroke="#82ca9d" strokeWidth={2} name="Maria" />
                  <Line type="monotone" dataKey="carlos" stroke="#ffc658" strokeWidth={2} name="Carlos" />
                  <Line type="monotone" dataKey="ana" stroke="#ff8042" strokeWidth={2} name="Ana" />
                  <Line type="monotone" dataKey="pedro" stroke="#a4de6c" strokeWidth={2} name="Pedro" />
                  <Line type="monotone" dataKey="fernanda" stroke="#d0ed57" strokeWidth={2} name="Fernanda" />
                </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
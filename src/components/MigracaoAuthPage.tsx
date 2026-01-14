import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertCircle } from "lucide-react";
import { MigracaoAuthAnalise } from "./MigracaoAuthAnalise";
import { MigracaoAuthExecucao } from "./MigracaoAuthExecucao";

export function MigracaoAuthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Migração de Autenticação</h2>
        <p className="text-muted-foreground mt-1">
          Migração completa de autenticação MOCK para REAL com Supabase Auth
        </p>
      </div>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>ATENÇÃO:</strong> Esta é uma operação sensível que irá modificar dados de usuários e vendas.
          Execute primeiro a ANÁLISE para entender o estado atual dos dados antes de executar a migração.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="analise" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analise">1. Análise</TabsTrigger>
          <TabsTrigger value="execucao">2. Execução</TabsTrigger>
        </TabsList>
        
        <TabsContent value="analise" className="mt-6">
          <MigracaoAuthAnalise />
        </TabsContent>
        
        <TabsContent value="execucao" className="mt-6">
          <MigracaoAuthExecucao />
        </TabsContent>
      </Tabs>
    </div>
  );
}

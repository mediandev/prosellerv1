// LogisticaPage — container da feature F-LOG-CRM (R-LOG-1 + R-LOG-2).
// Renderiza placeholder se VITE_FEATURE_LOG_CRM=false.
// R-LOG-2 (2026-05-21): abas Dashboard (default), Busca, Transportadores, Novo Frete.
// Decisão Valentim 2026-05-21 (call): abas "Regiões destino" e "Origens" REMOVIDAS
// da UI (tabelas permanecem no banco). Deep-link Dashboard/Busca → Detalhe via
// estado interno (sem React Router — segue padrão do App.tsx).

import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { isLogisticaEnabled } from "../../services/logisticaService";
import CadastroTransportadorPage from "./CadastroTransportadorPage";
import NovoFretePage from "./NovoFretePage";
import LogisticaDashboardPage from "./LogisticaDashboardPage";
import LogisticaBuscaPage from "./LogisticaBuscaPage";
import LogisticaKanbanPage from "./LogisticaKanbanPage";
import FreteDetalhePage from "./FreteDetalhePage";

type View = "dashboard" | "kanban" | "busca" | "transportadores" | "novo-frete" | "detalhe";

export default function LogisticaPage() {
  const [view, setView] = useState<View>("dashboard");
  const [detalheFreteId, setDetalheFreteId] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<View>("dashboard");

  function openDetalhe(id: string) {
    setDetalheFreteId(id);
    setPreviousView(view === "detalhe" ? previousView : view);
    setView("detalhe");
  }

  function backFromDetalhe() {
    setDetalheFreteId(null);
    setView(previousView);
  }

  if (!isLogisticaEnabled()) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center text-muted-foreground">
          <p className="font-medium">Funcionalidade em preparação.</p>
          <p className="text-sm mt-2">
            O módulo Logística está sendo migrado do LogCRM Bubble para o ProSeller. Estará disponível assim que a próxima onda for ativada.
          </p>
        </Card>
      </div>
    );
  }

  if (view === "detalhe" && detalheFreteId) {
    return (
      <div className="p-4 sm:p-6">
        <FreteDetalhePage freteId={detalheFreteId} onBack={backFromDetalhe} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant={view === "dashboard" ? "default" : "outline"} onClick={() => setView("dashboard")}>
          Dashboard
        </Button>
        <Button variant={view === "kanban" ? "default" : "outline"} onClick={() => setView("kanban")}>
          Kanban
        </Button>
        <Button variant={view === "busca" ? "default" : "outline"} onClick={() => setView("busca")}>
          Busca
        </Button>
        <Button variant={view === "transportadores" ? "default" : "outline"} onClick={() => setView("transportadores")}>
          Transportadores
        </Button>
        <Button variant={view === "novo-frete" ? "default" : "outline"} onClick={() => setView("novo-frete")}>
          Novo Frete
        </Button>
      </div>

      <div>
        {view === "dashboard" && <LogisticaDashboardPage onOpenFrete={openDetalhe} />}
        {view === "kanban" && <LogisticaKanbanPage onOpenFrete={openDetalhe} />}
        {view === "busca" && <LogisticaBuscaPage onOpenFrete={openDetalhe} />}
        {view === "transportadores" && <CadastroTransportadorPage />}
        {view === "novo-frete" && <NovoFretePage />}
      </div>
    </div>
  );
}

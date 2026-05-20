// LogisticaPage — container da feature F-LOG-CRM R-LOG-1.
// Renderiza placeholder se FEATURE_LOG_CRM=false. Caso ON, mostra abas internas
// para as 4 sub-páginas. Não usa React Router (segue o padrão do App.tsx).

import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { isLogisticaEnabled } from "../../services/logisticaService";
import CadastroTransportadorPage from "./CadastroTransportadorPage";
import CadastroRegiaoDestinoPage from "./CadastroRegiaoDestinoPage";
import CadastroOrigemFretePage from "./CadastroOrigemFretePage";
import NovoFretePage from "./NovoFretePage";

type View = "transportadores" | "regioes" | "origens" | "novo-frete";

export default function LogisticaPage() {
  const [view, setView] = useState<View>("transportadores");

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

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant={view === "transportadores" ? "default" : "outline"} onClick={() => setView("transportadores")}>
          Transportadores
        </Button>
        <Button variant={view === "regioes" ? "default" : "outline"} onClick={() => setView("regioes")}>
          Regiões destino
        </Button>
        <Button variant={view === "origens" ? "default" : "outline"} onClick={() => setView("origens")}>
          Origens
        </Button>
        <Button variant={view === "novo-frete" ? "default" : "outline"} onClick={() => setView("novo-frete")}>
          Novo Frete
        </Button>
      </div>

      <div>
        {view === "transportadores" && <CadastroTransportadorPage />}
        {view === "regioes" && <CadastroRegiaoDestinoPage />}
        {view === "origens" && <CadastroOrigemFretePage />}
        {view === "novo-frete" && <NovoFretePage />}
      </div>
    </div>
  );
}

import { AnaliseCurvaABC } from './AnaliseCurvaABC';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

interface AnaliseCurvaABCPageProps {
  onBack: () => void;
}

export function AnaliseCurvaABCPage({ onBack }: AnaliseCurvaABCPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1>Análise Detalhada - Curva ABC Dezembro/2025</h1>
          <p className="text-muted-foreground">
            Análise detalhada da Curva ABC com valores reais do sistema
          </p>
        </div>
      </div>

      <AnaliseCurvaABC />
    </div>
  );
}

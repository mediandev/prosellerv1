import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Database } from 'lucide-react';

export function DataInitializer({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Bem-vindo ao Sistema
          </CardTitle>
          <CardDescription>
            Sistema integrado com Supabase e pronto para uso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Database className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">
              O sistema está configurado e pronto para uso!
            </p>
            <Button onClick={onComplete} size="lg">
              Continuar para o Sistema
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

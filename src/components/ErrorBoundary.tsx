import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ ErrorBoundary capturou erro:', error);
    console.error('📍 Informações do erro:', errorInfo);
    console.error('📚 Stack completo:', error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-6">
          <div className="max-w-2xl w-full space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro na Aplicação</AlertTitle>
              <AlertDescription>
                Ocorreu um erro inesperado. Tente recarregar a página.
              </AlertDescription>
            </Alert>

            {this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-mono text-red-900 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Recarregar Página
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  // Limpar possíveis estados corrompidos
                  localStorage.removeItem('tinyERPMode');
                  window.location.reload();
                }}
                className="flex-1"
              >
                Redefinir e Recarregar
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Se o problema persistir:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Limpe o cache do navegador (Ctrl+Shift+Delete)</li>
                <li>Tente em uma aba anônima</li>
                <li>Abra o console (F12) para mais detalhes</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

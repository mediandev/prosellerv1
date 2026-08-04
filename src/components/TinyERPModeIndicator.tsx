import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { AlertCircle, CheckCircle, Server, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "./ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

/**
 * Indicador visual do modo de integração com Tiny ERP
 * Mostra se está em modo MOCK (simulação) ou REAL (backend)
 */
export function TinyERPModeIndicator() {
  const [modo, setModo] = useState<'MOCK' | 'REAL'>('MOCK');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    try {
      // Verificar localStorage primeiro, depois window
      const modoSalvo = localStorage.getItem('tinyERPMode') as 'MOCK' | 'REAL' | null;
      const modoWindow = (window as any).__TINY_API_MODE__;
      const modoAtual = modoSalvo || modoWindow || 'MOCK';
      
      // Sincronizar window com localStorage
      (window as any).__TINY_API_MODE__ = modoAtual;
      
      setModo(modoAtual);
      
      console.log('🔧 Tiny ERP Mode inicial:', modoAtual);
    } catch (error) {
      console.error('Erro ao carregar modo Tiny ERP:', error);
      setModo('MOCK');
    }

    // Escutar mudanças de modo de outros componentes
    const handleModeChange = (event: CustomEvent) => {
      const novoModo = event.detail.modo;
      console.log('🔄 Modo alterado via evento:', novoModo);
      setModo(novoModo);
    };

    window.addEventListener('tinyModeChanged', handleModeChange as EventListener);
    
    return () => {
      window.removeEventListener('tinyModeChanged', handleModeChange as EventListener);
    };
  }, []);

  const handleToggleMode = () => {
    try {
      // Alternar entre MOCK e REAL
      const novoModo = modo === 'MOCK' ? 'REAL' : 'MOCK';
      
      console.log(`🔄 Alternando de ${modo} para ${novoModo}`);
      
      // Salvar no localStorage para persistir entre reloads
      localStorage.setItem('tinyERPMode', novoModo);
      console.log('✅ Modo salvo no localStorage');
      
      // Definir na window
      (window as any).__TINY_API_MODE__ = novoModo;
      console.log('✅ Modo definido na window');
      
      // Atualizar estado local imediatamente
      setModo(novoModo);
      
      // Fechar o dialog
      setShowDetails(false);
      
      // Disparar evento customizado para outros componentes
      window.dispatchEvent(new CustomEvent('tinyModeChanged', { 
        detail: { modo: novoModo } 
      }));
      
      console.log('✅ Modo alterado com sucesso! Modo atual:', novoModo);
      
      // Notificar usuário
      toast.success(`Modo alterado para ${novoModo}!`, {
        description: novoModo === 'REAL' 
          ? 'Os pedidos serão enviados ao Tiny ERP via backend.'
          : 'Os pedidos serão apenas simulados localmente.',
        duration: 5000,
      });
      
    } catch (error) {
      console.error('❌ Erro ao alternar modo Tiny ERP:', error);
      toast.error('Erro ao alternar modo. Por favor, tente novamente.');
    }
  };

  const isMock = modo === 'MOCK';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`shadow-lg ${
              isMock 
                ? 'bg-yellow-50 hover:bg-yellow-100 border-yellow-300' 
                : 'bg-green-50 hover:bg-green-100 border-green-300'
            }`}
          >
            {isMock ? (
              <TestTube className="h-4 w-4 mr-2 text-yellow-600" />
            ) : (
              <Server className="h-4 w-4 mr-2 text-green-600" />
            )}
            <span className={isMock ? 'text-yellow-700' : 'text-green-700'}>
              Tiny ERP: {modo}
            </span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isMock ? (
                <TestTube className="h-5 w-5 text-yellow-600" />
              ) : (
                <Server className="h-5 w-5 text-green-600" />
              )}
              Modo de Integração: {modo}
            </DialogTitle>
            <DialogDescription>
              Configuração atual de envio de pedidos ao Tiny ERP
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status Atual */}
            {isMock ? (
              <Alert className="border-yellow-300 bg-yellow-50">
                <TestTube className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Modo SIMULAÇÃO Ativo</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  Os pedidos são simulados e NÃO são enviados para o Tiny ERP real.
                  Este modo é ideal para desenvolvimento e testes.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-300 bg-green-50">
                <Server className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Modo REAL Ativo</AlertTitle>
                <AlertDescription className="text-green-700">
                  Os pedidos são enviados para o Tiny ERP via backend.
                  Certifique-se de que a empresa tem token API configurado.
                </AlertDescription>
              </Alert>
            )}

            {/* Detalhes do Modo MOCK */}
            {isMock && (
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold">O que acontece no modo SIMULAÇÃO:</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>XML do pedido é construído e validado</li>
                  <li>Simulação de delay de rede (0.5-1.5s)</li>
                  <li>ID mockado é gerado: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">tiny-mock-{'{timestamp}'}</code></li>
                  <li>5% de chance de erro simulado (para testes)</li>
                  <li>Todos os logs são exibidos no console</li>
                  <li><strong>Pedido NÃO é enviado ao Tiny ERP real</strong></li>
                </ul>
              </div>
            )}

            {/* Detalhes do Modo REAL */}
            {!isMock && (
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold">Requisitos para modo REAL:</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Backend Supabase Edge Functions configurado ✅</li>
                  <li>Token do Tiny ERP configurado na empresa</li>
                  <li>Envio automático habilitado nas configurações da empresa</li>
                  <li>Clientes e produtos devem existir no Tiny ERP</li>
                </ul>
                
                <Alert className="border-blue-300 bg-blue-50 mt-4">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Backend Configurado</AlertTitle>
                  <AlertDescription className="text-blue-700 space-y-2">
                    <p>
                      O backend está pronto através do Supabase Edge Functions.
                      Certifique-se de configurar o token API do Tiny ERP em <strong>Configurações &gt; Empresas</strong>.
                    </p>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Ações */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2 text-sm">Ações:</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {isMock ? (
                  <>
                    Clique em "Ativar Modo REAL" para enviar pedidos reais ao Tiny ERP.
                  </>
                ) : (
                  <>
                    Clique em "Ativar Modo SIMULAÇÃO" para usar apenas simulações locais.
                  </>
                )}
              </p>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowDetails(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Fechar
                </Button>
                
                <Button
                  onClick={handleToggleMode}
                  variant="default"
                  size="sm"
                  className="flex-1"
                >
                  {isMock ? 'Ativar Modo REAL' : 'Ativar Modo SIMULAÇÃO'}
                </Button>
              </div>
            </div>

            {/* Dica do Console */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Dica</AlertTitle>
              <AlertDescription>
                Você também pode alternar via console (F12):
                <code className="block mt-2 text-xs bg-gray-100 p-2 rounded">
                  localStorage.setItem('tinyERPMode', '{isMock ? 'REAL' : 'MOCK'}');{'\n'}
                  location.reload();
                </code>
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CheckCircle, XCircle, RefreshCw, Building2, Key, Trash2 } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { companyService } from "../services/companyService";
import { useCompanies } from "../hooks/useCompanies";
import { Company } from "../types/company";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface ERPConfigByCompany {
  empresaId: string;
  empresaNome: string;
  apiToken: string;
  ativo: boolean;
  testado: boolean;
  statusTeste?: "sucesso" | "erro";
  envioAutomatico: {
    habilitado: boolean;
    tentativasMaximas: number;
    intervaloRetentativa: number;
  };
}

export function ERPConfigMulticompany() {
  const { companies, reload, updateCompany } = useCompanies();
  const [selectedERP, setSelectedERP] = useState<"tiny" | "totvs" | "sap" | "omie" | "bling">(
    "tiny"
  );
  const [erpConfigs, setERPConfigs] = useState<ERPConfigByCompany[]>([]);

  // Função helper para obter nome do ERP
  const getERPName = () => {
    const names: Record<string, string> = {
      tiny: "Tiny ERP",
      totvs: "TOTVS",
      sap: "SAP",
      omie: "Omie",
      bling: "Bling",
    };
    return names[selectedERP];
  };

  // Atualizar configurações quando empresas ou ERP selecionado mudar
  useEffect(() => {
    const erpNome = getERPName();
    
    const configs = companies.map((company) => {
      const erpConfig = company.integracoesERP.find((erp) => erp.erpNome === erpNome);
      
      return {
        empresaId: company.id,
        empresaNome: company.nomeFantasia,
        apiToken: erpConfig?.apiToken || "",
        ativo: erpConfig?.ativo || false,
        testado: false,
        envioAutomatico: erpConfig?.envioAutomatico || {
          habilitado: false,
          tentativasMaximas: 3,
          intervaloRetentativa: 5,
        },
      };
    });
    
    setERPConfigs(configs);
  }, [companies, selectedERP]);

  const [testando, setTestando] = useState<string | null>(null);
  const [transmitirOC, setTransmitirOC] = useState(true);
  const [empresaParaRemover, setEmpresaParaRemover] = useState<string | null>(null);

  const handleUpdateConfig = (empresaId: string, field: keyof ERPConfigByCompany, value: any) => {
    setERPConfigs(
      erpConfigs.map((config) =>
        config.empresaId === empresaId ? { ...config, [field]: value } : config
      )
    );
  };

  const handleTestarConexao = async (empresaId: string) => {
    const config = erpConfigs.find((c) => c.empresaId === empresaId);
    if (!config || !config.apiToken) {
      toast.error("Por favor, informe o token de API");
      return;
    }

    setTestando(empresaId);

    try {
      // Simulação de teste de API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simular sucesso aleatório (na implementação real, chamar a API)
      const sucesso = Math.random() > 0.3;

      if (sucesso) {
        handleUpdateConfig(empresaId, "statusTeste", "sucesso");
        handleUpdateConfig(empresaId, "testado", true);
        toast.success(`Conexão com ${selectedERP.toUpperCase()} estabelecida com sucesso!`);
      } else {
        handleUpdateConfig(empresaId, "statusTeste", "erro");
        handleUpdateConfig(empresaId, "testado", true);
        toast.error(`Falha ao conectar com ${selectedERP.toUpperCase()}`);
      }
    } catch (error) {
      handleUpdateConfig(empresaId, "statusTeste", "erro");
      handleUpdateConfig(empresaId, "testado", true);
      toast.error("Erro ao testar conexão");
    } finally {
      setTestando(null);
    }
  };

  const handleSalvarConfiguracao = () => {
    try {
      // SOLUÇÃO: Atualizar TODAS as empresas de uma só vez para evitar race conditions
      const todasEmpresasAtualizadas = companies.map((empresa) => {
        // Buscar a configuração para esta empresa
        const config = erpConfigs.find((c) => c.empresaId === empresa.id);
        
        if (!config) {
          // Se não há config, retornar empresa sem alterações
          return empresa;
        }

        // Atualizar ou adicionar a integração do ERP selecionado
        const integracoesAtualizadas = [...empresa.integracoesERP];
        const erpNome = getERPName();
        const indexExistente = integracoesAtualizadas.findIndex(
          (erp) => erp.erpNome === erpNome
        );

        const novaIntegracao = {
          erpNome: erpNome,
          ativo: config.ativo,
          apiToken: config.apiToken,
          apiUrl:
            selectedERP === "tiny"
              ? "https://api.tiny.com.br"
              : selectedERP === "totvs"
              ? "https://api.totvs.com.br"
              : selectedERP === "sap"
              ? "https://api.sap.com"
              : selectedERP === "omie"
              ? "https://api.omie.com.br"
              : "https://api.bling.com.br",
          envioAutomatico: config.envioAutomatico,
        };

        if (indexExistente >= 0) {
          integracoesAtualizadas[indexExistente] = novaIntegracao;
        } else {
          integracoesAtualizadas.push(novaIntegracao);
        }

        // Retornar empresa com integrações atualizadas
        return {
          ...empresa,
          integracoesERP: integracoesAtualizadas,
        };
      });
      
      // Salvar TODAS as empresas de uma só vez
      companyService.saveAll(todasEmpresasAtualizadas);
      
      // Recarregar para refletir mudanças
      reload();
      
      toast.success("Configurações do ERP salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações do ERP");
    }
  };

  const handleRemoverIntegracao = (empresaId: string) => {
    try {
      const erpNome = getERPName();
      const empresa = companies.find((c) => c.id === empresaId);
      
      if (!empresa) {
        toast.error("Empresa não encontrada");
        return;
      }

      // Remover a integração do ERP selecionado
      const integracoesAtualizadas = empresa.integracoesERP.filter(
        (erp) => erp.erpNome !== erpNome
      );

      // Persistir a mudança - CORRIGIDO: passar id e updates separadamente
      companyService.update(empresaId, {
        integracoesERP: integracoesAtualizadas,
      });
      
      // Recarregar para refletir mudanças
      reload();
      
      toast.success(`Integração com ${erpNome} removida da empresa ${empresa.nomeFantasia}`);
      setEmpresaParaRemover(null);
    } catch (error) {
      console.error("Erro ao remover integração:", error);
      toast.error("Erro ao remover integração do ERP");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Integração com ERP</h3>
        <p className="text-sm text-muted-foreground">
          Configure a integração com seu sistema de gestão empresarial para cada empresa
        </p>
      </div>

      {/* Seletor de ERP */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sistema ERP</CardTitle>
          <CardDescription>Selecione o sistema ERP que deseja configurar</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedERP} onValueChange={(value: any) => setSelectedERP(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tiny">Tiny ERP (Olist Tiny)</SelectItem>
              <SelectItem value="totvs" disabled>
                TOTVS (Em breve)
              </SelectItem>
              <SelectItem value="sap" disabled>
                SAP (Em breve)
              </SelectItem>
              <SelectItem value="omie" disabled>
                Omie (Em breve)
              </SelectItem>
              <SelectItem value="bling" disabled>
                Bling (Em breve)
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Configurações por Empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração por Empresa</CardTitle>
          <CardDescription>
            Configure as credenciais de API do {getERPName()} para cada empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {erpConfigs.map((config, index) => (\n            <div key={config.empresaId}>
              {index > 0 && <Separator className="my-6" />}
              <div className="space-y-4">
                {/* Header da Empresa */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{config.empresaNome}</p>
                      <p className="text-sm text-muted-foreground">
                        {companies.find((c) => c.id === config.empresaId)?.cnpj}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {config.testado && (
                      <Badge
                        variant={config.statusTeste === "sucesso" ? "default" : "destructive"}
                      >
                        {config.statusTeste === "sucesso" ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Testado
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Falhou
                          </>
                        )}
                      </Badge>
                    )}
                    {config.apiToken && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEmpresaParaRemover(config.empresaId)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Switch
                      checked={config.ativo}
                      onCheckedChange={(checked) =>
                        handleUpdateConfig(config.empresaId, "ativo", checked)
                      }
                    />
                    <Label className="text-sm">
                      {config.ativo ? "Ativo" : "Inativo"}
                    </Label>
                  </div>
                </div>

                {/* Campos de Configuração */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor={`token-${config.empresaId}`}>Token de API</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id={`token-${config.empresaId}`}
                          type="password"
                          value={config.apiToken}
                          onChange={(e) =>
                            handleUpdateConfig(config.empresaId, "apiToken", e.target.value)
                          }
                          placeholder="Cole aqui o token de API do ERP"
                          className="pl-10"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleTestarConexao(config.empresaId)}
                        disabled={testando === config.empresaId || !config.apiToken}
                      >
                        {testando === config.empresaId ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Testando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Testar
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Você pode obter o token de API nas configurações do {getERPName()}
                    </p>
                  </div>
                </div>

                {/* Configurações de Envio Automático */}
                {config.ativo && config.apiToken && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor={`envio-auto-${config.empresaId}`} className="text-base">
                          Envio Automático ao ERP
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Quando ativado, os pedidos serão enviados automaticamente ao ERP após serem criados
                        </p>
                      </div>
                      <Switch
                        id={`envio-auto-${config.empresaId}`}
                        checked={config.envioAutomatico.habilitado}
                        onCheckedChange={(checked) =>
                          handleUpdateConfig(config.empresaId, "envioAutomatico", {
                            ...config.envioAutomatico,
                            habilitado: checked,
                          })
                        }
                      />
                    </div>

                    {config.envioAutomatico.habilitado && (
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor={`tentativas-${config.empresaId}`}>
                            Tentativas Máximas
                          </Label>
                          <Input
                            id={`tentativas-${config.empresaId}`}
                            type="number"
                            min="1"
                            max="10"
                            value={config.envioAutomatico.tentativasMaximas}
                            onChange={(e) =>
                              handleUpdateConfig(config.empresaId, "envioAutomatico", {
                                ...config.envioAutomatico,
                                tentativasMaximas: parseInt(e.target.value) || 3,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Número de tentativas em caso de falha
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`intervalo-${config.empresaId}`}>
                            Intervalo entre Tentativas (min)
                          </Label>
                          <Input
                            id={`intervalo-${config.empresaId}`}
                            type="number"
                            min="1"
                            max="60"
                            value={config.envioAutomatico.intervaloRetentativa}
                            onChange={(e) =>
                              handleUpdateConfig(config.empresaId, "envioAutomatico", {
                                ...config.envioAutomatico,
                                intervaloRetentativa: parseInt(e.target.value) || 5,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Tempo de espera entre tentativas
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preferências de Integração */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferências de Integração</CardTitle>
          <CardDescription>
            Configure como o sistema deve se comportar ao integrar com o ERP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="transmitir-oc">Transmitir Ordens de Compra Automaticamente</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, as ordens de compra serão enviadas automaticamente para o ERP após
                aprovação
              </p>
            </div>
            <Switch
              id="transmitir-oc"
              checked={transmitirOC}
              onCheckedChange={setTransmitirOC}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancelar</Button>
        <Button onClick={handleSalvarConfiguracao}>Salvar Configurações</Button>
      </div>

      {/* Informações sobre o ERP */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como obter o Token de API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedERP === "tiny" && (
            <div className="space-y-2">
              <p className="text-sm">
                Para obter o token de API do Tiny ERP, siga os passos:
              </p>
              <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                <li>Acesse sua conta no Tiny ERP</li>
                <li>Vá em Configurações → API</li>
                <li>Clique em "Gerar novo token"</li>
                <li>Copie o token gerado e cole no campo acima</li>
                <li>Clique em "Testar" para validar a conexão</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Remoção */}
      <AlertDialog open={!!empresaParaRemover} onOpenChange={(open) => !open && setEmpresaParaRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção de Integração</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a integração do {getERPName()} da empresa{" "}
              <strong>
                {companies.find((c) => c.id === empresaParaRemover)?.nomeFantasia}
              </strong>
              ? Esta ação não pode ser desfeita e todas as configurações serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmpresaParaRemover(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => empresaParaRemover && handleRemoverIntegracao(empresaParaRemover)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover Integração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

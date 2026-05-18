import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export interface ChangelogEntry {
  version: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'V 1.32',
    items: [
      'Cadastro de cliente: inclusão rápida de Grupo / Rede pelo botão "+" ao lado do campo — antes de criar, o sistema mostra grupos parecidos para evitar duplicidade; você pode escolher um existente ou criar mesmo assim. Disponível também para vendedores.',
      'Clientes: vendedores passam a visualizar na própria lista os clientes que cadastraram e ainda estão aguardando aprovação do backoffice (antes esses clientes "sumiam" até serem aprovados).',
      'Relatório de Comissões em PDF: o aviso de "Saldo Anterior não calculado" agora aparece legível (antes saía com caracteres embaralhados em PDFs).',
    ],
  },
  {
    version: 'V 1.31',
    items: [
      'Pedidos: envio ao Tiny não exige mais que o "Nome Fantasia" do vendedor bata com o cadastro do Tiny — passa a usar só o ID Tiny',
      'Pedidos: "OC: [Aguardando]" não é mais inserido nas Observações da NF quando o campo OC Cliente está em branco',
      'Clientes: busca ignora acentos, aceita CNPJ com ou sem máscara e procura também por Grupo/Rede',
    ],
  },
  {
    version: 'V 1.30',
    items: [
      'Botão "Imprimir" na visualização de pedidos, com layout próprio em A4 (cabeçalho da empresa, dados do cliente, itens, totais, pagamento e observações)',
    ],
  },
  {
    version: 'V 1.29',
    items: [
      'Pedidos: clientes importados via planilha agora enviam ao Tiny corretamente (CEP/CNPJ/telefone vinham com pontuação que o Tiny rejeitava)',
      'Configurações > Usuários: recriar um usuário com mesmo e-mail após excluir voltou a funcionar (erro de chave duplicada no banco corrigido)',
    ],
  },
  {
    version: 'V 1.28',
    items: [
      'Cliente: campo Desconto Padrão agora salva ao editar (estava sendo ignorado pelo backend)',
      'Cliente: campo Grupo / Rede agora persiste corretamente ao editar — texto e ID são gravados juntos',
    ],
  },
  {
    version: 'V 1.27',
    items: [
      'Cadastro de cliente: erro "invalid input syntax for type uuid" ao salvar um cliente novo com vendedor atribuído foi corrigido',
      'Configurações > Importação de Dados: importação de clientes via planilha agora persiste no banco (antes só simulava). Reconhece automaticamente colunas da planilha de migração (Código, Endereço, Cidade, Estado, Fone, NOME REDE, SITUAÇÃO PROSELLER, Vendedor, Empresa de Faturamento, Lista de Preço, DESC FIN, etc.)',
    ],
  },
  {
    version: 'V 1.26',
    items: [
      'Pedidos: ao reabrir um pedido salvo como rascunho em modo edição, a lista de produtos volta a aparecer no modal "Adicionar Item"',
    ],
  },
  {
    version: 'V 1.25',
    items: [
      'Configurações > Usuários: segundo bug da exclusão (erro de banco) corrigido — exclusão agora conclui com sucesso',
    ],
  },
  {
    version: 'V 1.24',
    items: [
      'Configurações > Usuários: exclusão de usuário volta a funcionar (preflight CORS corrigido)',
    ],
  },
  {
    version: 'V 1.23',
    items: [
      'Simples Nacional: pedidos passam a chegar no Tiny com a natureza correta conforme o regime do cliente',
    ],
  },
  {
    version: 'V 1.22',
    items: [
      'Relatório de comissões: Saldo Anterior antes do Valor Líquido',
      'Linha de totalizadores na tabela de Vendas do Período (PDF)',
      'Acentos e caracteres especiais corrigidos no PDF',
      'Aviso quando o período anterior está em aberto, com instruções para fechar o ciclo',
      'Nova ação "Fechar Período" no menu de cada relatório aberto',
    ],
  },
];

export function ChangelogPage() {
  return (
    <div className="space-y-4">
      {CHANGELOG.map((entry, idx) => (
        <Card key={entry.version}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {idx === 0 && <Sparkles className="h-4 w-4 text-primary" />}
              {entry.version}
              {idx === 0 && (
                <span className="text-xs font-normal text-muted-foreground">(versão atual)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {entry.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

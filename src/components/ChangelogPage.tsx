import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export interface ChangelogEntry {
  version: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'V 1.54',
    items: [
      'Logística > Kanban: nova aba com board de fretes organizado por status — arraste um card de uma coluna para outra para atualizar o status instantaneamente.',
      'Logística > Comprovante de entrega: no detalhe do frete, botão "Tirar foto / Anexar" abre a câmera do celular ou permite anexar arquivo (imagem/PDF). Comprovante fica salvo e disponível para consulta.',
    ],
  },
  {
    version: 'V 1.53',
    items: [
      'Logística > Novo Frete: busca de pedido por nome do cliente, número do pedido ou CNPJ — ao selecionar, empresa, cliente e valor são preenchidos automaticamente.',
      'Logística > Novo Frete: campo de chave de acesso da NF-e (44 dígitos) com validação em tempo real.',
      'Pedido > Detalhe: seção "Entrega" agora exibe a linha do tempo completa de ocorrências do transportador (SSW), não apenas o status resumido.',
      'Comissões: usuários deletados não aparecem mais na listagem da tela de Gestão de Comissões.',
    ],
  },
  {
    version: 'V 1.51',
    items: [
      'Dashboard: os cards (Vendas Totais, Ticket Médio, Produtos Vendidos, Positivação, Vendedores Ativos, Meta) não ficam mais presos em "Carregando..." e a "Carteira de Clientes" voltou a mostrar o total correto. A causa era o status do cliente gravado em maiúsculo ("ATIVO") não bater com a comparação interna ("Ativo"), zerando a carteira (ex.: "164 de 0 clientes") e travando todo o dashboard. Corrigida a comparação (sem diferenciar maiúsculas) e o dashboard agora carrega mesmo se a carteira vier vazia.',
    ],
  },
  {
    version: 'V 1.50',
    items: [
      'Comissões > Relatório do vendedor: as colunas "OC Cliente" e "Cliente" da tabela "Vendas do Período" voltaram a ser preenchidas. Desde 14/04/2026 as comissões geradas vinham sem esses rótulos (o nome do cliente e a OC apareciam em branco), embora os valores estivessem corretos. Corrigida a geração das comissões para gravar novamente esses campos, e preenchidos os relatórios de abril, maio e junho/2026. Nenhum valor de comissão foi alterado.',
    ],
  },
  {
    version: 'V 1.48',
    items: [
      'Equipe > Vendedores: a regra de comissão (Alíquota Fixa / Definido em Lista de Preço) agora é gravada de verdade ao salvar o vendedor. Antes a escolha não era persistida e a comissão saía zerada para vendedores recém-cadastrados.',
    ],
  },
  {
    version: 'V 1.47',
    items: [
      'Pedidos > Ao selecionar uma natureza de operação que não gera receita (ex.: Bonificação), o campo "Condição de Pagamento" agora fica oculto e deixa de ser obrigatório — não trava mais o pedido. Para naturezas que geram receita, o campo continua obrigatório normalmente.',
    ],
  },
  {
    version: 'V 1.46',
    items: [
      'Configurações > Naturezas de Operação: corrigido o problema em que criar, editar ou excluir uma natureza parecia "não salvar" — ao recarregar a página o valor antigo voltava. A alteração já era gravada, mas a lista exibia uma cópia em cache (até 12h). Agora a lista é atualizada na hora.',
      'Mesma correção aplicada em Configurações > Condições de Pagamento, que tinha o mesmo comportamento.',
    ],
  },
  {
    version: 'V 1.45',
    items: [
      'Pedidos > Corrigido: ao trocar ou re-selecionar o cliente em um pedido (inclusive ao duplicar), os campos do cliente — entre eles a Natureza de Operação — sumiam e impediam o envio. Agora os campos continuam visíveis para você selecionar a natureza e concluir o pedido.',
    ],
  },
  {
    version: 'V 1.44',
    items: [
      'Clientes > Código automático: ao cadastrar um cliente, o sistema agora gera o código sozinho (maior código atual + 1), pelo servidor. Não é mais preciso digitar o código manualmente — o campo fica em branco e é preenchido ao salvar.',
      'Geração à prova de duplicidade mesmo com vários usuários cadastrando ao mesmo tempo. Quem preferir ainda pode voltar ao modo manual em Configurações.',
    ],
  },
  {
    version: 'V 1.43',
    items: [
      'Clientes > "Situação" (Ativo / Inativo / Excluído) agora é exibida corretamente na ficha e na lista. Antes, ao mudar a situação de um cliente (ex.: para "Excluído"), a alteração era salva mas a tela voltava a mostrar "Ativo" — agora reflete o valor real.',
      'Como consequência, a lista e os indicadores passam a mostrar os clientes Inativos/Excluídos com a situação verdadeira (antes apareciam todos como "Ativo").',
    ],
  },
  {
    version: 'V 1.42',
    items: [
      'Dashboard > "Vendas Totais" corrigido: o painel passou a considerar TODOS os pedidos do período. Antes carregava apenas os 100 pedidos mais recentes, o que subcontava o total e fazia o valor oscilar ao longo do dia (ex.: cair de 506k para 457k sem cancelamento). Agora o número fica completo e estável.',
      'Dashboard > o valor de "Vendas Totais" passa a usar sempre o valor do pedido (estável). Para ver apenas pedidos já faturados/enviados, use o filtro "Status de Vendas > Vendas concluídas".',
    ],
  },
  {
    version: 'V 1.41',
    items: [
      'Logística > Frete automático: ao enviar um pedido de venda ao Tiny com sucesso, o sistema cria automaticamente um registro de frete vinculado ao pedido (com status "Em Separação"). Funcionalidade controlada por feature flag — peça acesso ao administrador para habilitar.',
    ],
  },
  {
    version: 'V 1.40',
    items: [
      'Usuários > Permissões de backoffice agora são salvas corretamente. Antes, ao editar permissões de outro backoffice (ex.: clientes.todos, usuarios.criar, config.geral), o sistema rejeitava a operação com erro — agora persiste normalmente.',
    ],
  },
  {
    version: 'V 1.39',
    items: [
      'Logística > Rastreio SSW automático: ao abrir o detalhe de um frete com chave NFe, o sistema consulta a API da SSW e atualiza a timeline de ocorrências em tempo real (cache de 30 min).',
      'Logística > Status atualizado automaticamente: o status do frete (Em Trânsito, Agendado, Entregue, Recusado, etc.) agora é resolvido a partir das ocorrências reais do transportador — sem necessidade de edição manual.',
      'Logística > Timeline enriquecida: eventos de entrega mostram o nome e documento do recebedor. Cores diferenciadas por tipo de evento (verde = entrega, âmbar = cliente, azul = informativo).',
    ],
  },
  {
    version: 'V 1.38',
    items: [
      'Logística > Torre de Controle: 5 cards de status (Em Trânsito, Reentrega, Agendados, Devoluções em Trânsito e Recusadas) com clique direto para o detalhe do frete.',
      'Logística > Busca de Fretes: lista paginada com filtros por cliente, transportador, status, período de emissão e número da nota.',
      'Logística > Detalhe do Frete: identificação, status, datas, valores, anexo de DACTE e comprovante (foto pela câmera ou arquivo) e área "Atualizações no Transportador" (timeline ainda vazia — integração SSW chega na próxima entrega).',
      'Pedidos > Visualizar Pedido: bloco "Entrega" no detalhe do pedido mostrando o status atual do frete vinculado à NF, com link para o detalhe completo na Logística.',
      'Logística > simplificação: abas "Regiões destino" e "Origens" foram removidas (estavam em branco por solicitação do Valentim em 21/05 — a origem vem da empresa de faturamento do pedido).',
    ],
  },
  {
    version: 'V 1.37',
    items: [
      'Cadastro de cliente: "Tipo Pessoa" volta a ser salvo corretamente (antes ficava em branco ao reabrir o cliente, mesmo selecionado). Aplique a correção reabrindo cada cliente que apresenta o campo vazio e salvando novamente.',
      'Cadastro de cliente: Desconto Padrão, Desconto Financeiro e Pedido Mínimo deixam de ser zerados automaticamente quando você não toca no campo durante a edição (antes o salvar substituía o valor existente por zero).',
    ],
  },
  {
    version: 'V 1.36',
    items: [
      'Iniciada migração do módulo Logística do LogCRM (transportadores, regiões, origens e cadastro manual de frete). Disponível apenas para usuários backoffice e oculto atrás de feature flag — peça acesso ao administrador para habilitar.',
    ],
  },
  {
    version: 'V 1.35',
    items: [
      'Configurações > Listas de Preço: o dropdown de produtos voltou a carregar a lista real (não mais a versão de exemplo). A consulta interna era estourada por tempo em bases com muitos itens.',
      'Configurações > Listas de Preço: ao editar uma lista existente, agora o preço de cada produto já vinculado pode ser alterado diretamente no próprio campo (antes só era possível remover o item e adicionar de novo).',
    ],
  },
  {
    version: 'V 1.34',
    items: [
      'Configurações > Listas de Preço: salvar/editar uma lista agora persiste os produtos vinculados e as faixas de comissionamento (antes a lista era criada vazia mesmo com itens preenchidos).',
    ],
  },
  {
    version: 'V 1.33',
    items: [
      'Relatório de Comissões em PDF: o aviso "Saldo Anterior não calculado" volta a aparecer legível (antes saía com caracteres embaralhados quando o período anterior estava em aberto).',
    ],
  },
  {
    version: 'V 1.32',
    items: [
      'Cadastro de cliente: inclusão rápida de Grupo / Rede pelo botão "+" ao lado do campo — antes de criar, o sistema mostra grupos parecidos para evitar duplicidade; você pode escolher um existente ou criar mesmo assim. Disponível também para vendedores.',
      'Clientes: vendedores passam a visualizar na própria lista os clientes que cadastraram e ainda estão aguardando aprovação do backoffice (antes esses clientes "sumiam" até serem aprovados).',
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

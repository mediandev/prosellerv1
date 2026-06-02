# Regras de Negócio — ProSeller V1

> **v2 — 2026-06-02.** Validação **exaustiva** das regras extraídas do código que roda
> em produção (RPCs Postgres, Edge Functions, schema/constraints/RLS, front), via
> múltiplos agentes + **passe adversarial de verificação** (cada regra re-conferida na fonte).
> Total: **294 regras** analisadas. Aqui ficam as **confirmadas** e **corrigidas**; as
> **duvidosas** vão para "⚠️ A confirmar" (a fonte não confirmou claramente — revisar
> com o time). Regras alucinadas foram descartadas. Cada regra cita a **origem**.
>
> Fonte de verdade: `supabase/schema_baseline.sql` + funções de prod. Auditoria:
> `docs/wiki/auditoria-backend-prod-git-2026-06-01.md`.

> ⚠️ **Reconciliação Clientes (cadastro):** alguns agentes leram a `migration 007`
> (antiga). O `create_cliente_v2` **atual em prod** (validado nesta sessão) manda nestes pontos:
> - **Código automático:** se vier vazio, servidor gera `MAX(codigo numérico)+1` com
>   `pg_advisory_xact_lock` (considera TODAS as linhas, inclui excluídas → nunca reutiliza).
>   Validado E2E (gerou 957). Modo manual existe (`customerCodeService`).
> - **Ao criar, TODOS nascem `status_aprovacao='aprovado'` e situação `ATIVO` (ref 1)** —
>   vendedor inclusive. A distinção *vendedor→pendente/Análise* da migration 007 **não está
>   em vigor** no prod atual (porém `aprovar/rejeitar-cliente-v2` e a RLS de `pendente`
>   ainda existem — provável fluxo vestigial; revisar com o time). Qualquer regra abaixo
>   que cite o contrário (via migration 007) está superada por este bloco.

---

## Clientes

- Nome do cliente é obrigatório e deve ter mínimo 2 caracteres (após trim).  
  ↳ origem: `supabase/migrations/007_rpc_clientes_v2.sql (linhas 72-74)`
- Código de cliente deve ser único entre clientes não deletados. Validação por trigger enforce_cliente_codigo_unique_v2 antes de INSERT/UPDATE.  
  ↳ origem: `enforce_cliente_codigo_unique_v2.sql, schema_baseline.sql (trigger trg_enforce_cliente_codigo_unique_v2)`
- Status de aprovação é máquina de estados com 3 estados: 'pendente', 'aprovado', 'rejeitado'. Constraint: cliente_status_aprovacao_check.  
  ↳ origem: `schema_baseline.sql (constraint cliente_status_aprovacao_check)`
- Ao criar cliente, status_aprovacao é definido como 'aprovado' e ref_situacao_id = 1 (ativo) independentemente do tipo de usuário (vendedor ou backoffice). *(corrigida na verificação)*  
  ↳ origem: `create_cliente_v2.sql (linhas 17-32)`
- Apenas usuários tipo 'backoffice' podem aprovar cliente. Requer cliente em status 'pendente'. Ao aprovar: status_aprovacao = 'aprovado', ref_situacao_id = (id de 'Ativo' em ref_situacao), data_aprovacao = CURRENT_DATE.  
  ↳ origem: `aprovar_cliente_v2.sql (linhas 27-46)`
- Apenas usuários tipo 'backoffice' podem rejeitar cliente. Requer cliente em status 'pendente'. Motivo de rejeição é obrigatório com mínimo 5 caracteres. Ao rejeitar: status_aprovacao = 'rejeitado', ref_situacao_id = (id de 'Inativo' em ref_situacao).  
  ↳ origem: `rejeitar_cliente_v2.sql (linhas 17-50)`
- Vendedor pode editar apenas clientes que criou (criado_por = user_id). Vendedor só pode editar clientes com status_aprovacao = 'aprovado'.  
  ↳ origem: `update_cliente_v2.sql (linhas 36-52)`
- Apenas usuários tipo 'backoffice' podem deletar (soft delete) cliente. Ao deletar: deleted_at = NOW(), ref_situacao_id = (id de 'EXCLUÍDO' ou 'EXCLUIDO' em ref_situacao).  
  ↳ origem: `delete_cliente_v2.sql (linhas 22-46)`
- Vendedor pode listar apenas clientes que criou (criado_por) ou que está atribuído (p_requesting_user_id = ANY(vendedoresatribuidos)) COM status 'aprovado', OU clientes em status 'pendente' que criou. Backoffice vê todos.  
  ↳ origem: `list_clientes_v2.sql (linhas 57-67)`
- Vendedor pode consultar (GET) apenas cliente que criou OU está atribuído E cliente está em status 'aprovado'.  
  ↳ origem: `get_cliente_completo_v2.sql (linhas 22-35)`
- Desconto financeiro padrão é 0. Pedido mínimo padrão é 0. Ambos são numéricos.  
  ↳ origem: `create_cliente_v2.sql (linhas 83, 84), schema_baseline.sql`
- IE (Inscrição Estadual) é marcado como isento (IE_isento = true/false). Padrão: false.  
  ↳ origem: `schema_baseline.sql, create_cliente_v2.sql (linha 89)`
- Email de contato (cliente_contato.email e cliente_contato.email_nf) é normalizado para LOWER() antes de inserção/atualização.  
  ↳ origem: `create_cliente_v2.sql (linha 103), update_cliente_v2.sql (linha 118)`
- CEP é normalizado: remove hífens e espaços em branco antes de armazenamento.  
  ↳ origem: `create_cliente_v2.sql (linha 117), update_cliente_v2.sql (linha 146)`
- UF (unidade federativa) é normalizado para UPPER() antes de armazenamento.  
  ↳ origem: `create_cliente_v2.sql (linha 123), update_cliente_v2.sql (linha 152)`
- Trigger registrar_log_alteracao_cliente registra TODAS as alterações em cliente (excepto updated_at e atualizado_por) em cliente_historico_alteracoes. Se status_aprovacao muda, tipo_registro = 'mudanca_status', senão = 'edicao'.  
  ↳ origem: `registrar_log_alteracao_cliente.sql (linhas 19-43)`
- Código origem pode ser: 'tiny_dap', 'tiny_cantico', 'sequencial', 'manual' (ou NULL). Constraint: cliente_codigo_origem_chk.  
  ↳ origem: `schema_baseline.sql (constraint cliente_codigo_origem_chk)`
- Código Tiny sistema pode ser: 'dap', 'cantico' (ou NULL). Constraint: cliente_codigo_tiny_sistema_chk.  
  ↳ origem: `schema_baseline.sql (constraint cliente_codigo_tiny_sistema_chk)`
- Segmento de cliente é criado com nome único (case-insensitive), mínimo 2 caracteres. Apenas backoffice pode criar segmento.  
  ↳ origem: `create_segmento_cliente_v2.sql (linhas 11-38)`
- Trim é aplicado automaticamente em: nome, nome_fantasia, inscricao_estadual, inscricao_municipal, codigo, grupo_rede, observacao_interna, telefone, email, website, observacao_contato, rua, numero, complemento, bairro, cidade, uf.  
  ↳ origem: `create_cliente_v2.sql (múltiplas linhas com TRIM), update_cliente_v2.sql (múltiplas linhas com trim)`
- Busca de clientes (list_clientes_v2) normaliza termo de busca com unaccent(LOWER()) para comparação com nome, nome_fantasia, grupo_rede. Para CNPJ/CPF, busca digits ≥3 caracteres após remover não-numéricos.  
  ↳ origem: `list_clientes_v2.sql (linhas 34-56)`
- Cliente armazena optante_simples_nacional (booleano, nullable) e optante_simples_nacional_consultado_em (timestamp). Consultados via API ReceitaWS durante criação ou envio de pedido para Tiny.  
  ↳ origem: `schema_baseline.sql, supabase/functions/create-cliente-v2/index.ts (linhas 344-357)`
- Endereço entrega diferente (endereco_entrega_diferente) é booleano com default false. Indica se cliente tem endereço de entrega diferente do cadastral.  
  ↳ origem: `schema_baseline.sql`

### ⚠️ A confirmar (a fonte não sustentou claramente — revisar)
- CPF/CNPJ deve ser único entre clientes não deletados (deleted_at IS NULL). Constraint: cliente_cpf_cnpj_key UNIQUE.  
  ↳ origem: `schema_baseline.sql (constraint cliente_cpf_cnpj_key)` — Não foi encontrada constraint UNIQUE 'cliente_cpf_cnpj_key' em nenhuma migration. Há índice em cpf_cnpj (migration 003, linha 14), mas índice não é constraint UNIQUE. A unicidade não é enforçada na criação. Validação de formato CPF/CNPJ existe em create-cliente-v2/index.ts (linhas 119-166 validateCPF/validateCNPJ), mas sem constraint de unicidade no banco.
- Cliente pode ter múltiplas condições de pagamento via tabela condições_cliente. Quando condições são atualizadas, deleta todas antigas e insere as novas.  
  ↳ origem: `update_cliente_v2.sql (linhas 166-175)` — Não há manipulação de condições_cliente em nenhuma função RPC encontrada (migration 007 update_cliente_v2 não menciona condições_cliente nos 166-175). A tabela 'condições_cliente' existe no schema mas não há UPDATE logic em update_cliente_v2. Regra possivelmente retroativa ou nunca implementada.
- Tipo de pessoa (ref_tipo_pessoa_id_FK) é validado contra tabela ref_tipo_pessoa se fornecido.  
  ↳ origem: `update_cliente_v2.sql (linhas 60-67)` — Update_cliente_v2 em migration 007 NÃO tem ref_tipo_pessoa_id_FK como parâmetro nem validação. Migration 076 menciona ADD ref_tipo_pessoa_id a update_cliente_v2. Não há validação explícita contra tabela ref_tipo_pessoa na função (apenas passa p_ref_tipo_pessoa_id_FK sem check).
- Requisitos logísticos (requisitos_logisticos) armazenado como JSONB. Pode ser atualizado via p_set_requisitos_logisticos flag (se true, sobrescreve; se false, mantém anterior).  
  ↳ origem: `schema_baseline.sql, update_cliente_v2.sql (linhas 97)` — Migration 105 adiciona requisitos_logisticos JSONB. Não há parâmetro p_set_requisitos_logisticos em update_cliente_v2 (migration 007). UPDATE RPC não manipula esse campo. Edge function criar-cliente não tem suporte. Lógica descrita pode ser aspiração ou implementação parcial não integrada.

---

## Pedidos e Vendas

- Cliente é obrigatório na criação de pedido (validação p_cliente_id IS NULL).  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 416-418`
- Vendedor é obrigatório na criação de pedido (validação p_vendedor_uuid IS NULL).  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 420-422`
- Natureza de operação é obrigatória e não pode ser nula ou vazia (validação p_natureza_operacao IS NULL OR TRIM = '').  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 424-426`
- Pedido sempre começa no status 'Rascunho' por padrão se não fornecido durante criação.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linha 385; pedido-venda-v2 edge function, linha 389`
- Data de venda padrão é CURRENT_DATE se não fornecida na criação.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linha 384`
- Campos numéricos de valor (valor_total, valor_total_produtos, percentual_desconto_extra, valor_desconto_extra, total_quantidades, peso_bruto_total, peso_liquido_total) possuem default 0.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 386-393`
- Snapshot de dados do cliente (nome, CNPJ, inscrição estadual) é persistido no pedido no momento da criação para auditoria histórica.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 447-449, 557`
- Snapshot de dados do vendedor (nome) é persistido no pedido no momento da criação.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 457-459, 558`
- Snapshot de dados de natureza de operação (nome) é persistido no pedido no momento da criação.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 469-473, 559`
- Snapshot de dados de empresa de faturamento (razão social ou nome fantasia) é persistido no pedido no momento da criação.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 480-485, 538`
- Snapshot de dados de lista de preço (nome) é persistido no pedido no momento da criação.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 487-492, 540`
- Snapshot de dados de condição de pagamento (descrição) é persistido no pedido no momento da criação.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 494-499, 543`
- Produto pode vir nulo (JSON sem produtoId) e será aceito; apenas snapshot de dados do item é persistido (descrição, SKU, EAN, pesos, unidade).  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 586, 589`
- Natureza de operação 'Bonificação' NÃO gera comissão (retorna status 'bonificacao_sem_comissao').  
  ↳ origem: `migration 082_commission_logic_update.sql (generate_vendedor_comissao), linhas 48-52`
- Comissão do vendedor é calculada sobre valor_total do pedido em dois cenários: (1) aliquota fixa do vendedor (dados_vendedor.aliquotafixa) ou (2) percentual de comissão da lista de preço conforme faixa de desconto do cliente.  
  ↳ origem: `migration 082_commission_logic_update.sql, linhas 55-98`
- Comissão tipo 1 = por lista de preço (busca em listas_preco_comissionamento), tipo 2 = aliquota fixa do vendedor (dados_vendedor.aliquotafixa).  
  ↳ origem: `migration 082_commission_logic_update.sql, linhas 65-87`
- Faixa de desconto é determinada pelo desconto do cliente (cliente.desconto) e consultado em listas_preco_comissionamento conforme desconto_minimo <= desconto_cliente <= desconto_maximo; retorna comissao (%).  
  ↳ origem: `migration 082_commission_logic_update.sql, linhas 71-87`
- Cálculo de comissão: valor_comissao = round((valor_total_pedido * percentual_comissao / 100), 2) em 2 casas decimais.  
  ↳ origem: `migration 082_commission_logic_update.sql, linha 98`
- Comissão é armazenada/atualizada em vendedor_comissão com campos: vendedor_uuid, pedido_id, valor_total, valor_comissao, percentual_comissao, periodo (YYYY-MM), efetivada=true, debito=false. *(corrigida na verificação)*  
  ↳ origem: `migration 082_commission_logic_update.sql, linhas 119-139`
- Se já existe comissão para um pedido, é atualizada; senão, é inserida nova.  
  ↳ origem: `migration 082_commission_logic_update.sql, linhas 101-143`
- Vendedor deve ter entrada válida em dados_vendedor (user_id FK) para criar pedido, validado em update_pedido_venda_v2.  
  ↳ origem: `pedido-venda-v2 edge function, linhas 314-325`
- Apenas backoffice pode alterar vendedor de um pedido existente; vendedor normal não pode mudar o vendedor_uuid do seu próprio pedido.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql (update_pedido_venda_v2), linhas 701-705`
- Vendedor só pode editar seus próprios pedidos; backoffice pode editar qualquer pedido.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql (update_pedido_venda_v2), linhas 696-698`
- Atualização de produtos em pedido deleta todos os itens anteriores (DELETE) e insere os novos (INSERT), sem preservação de histórico de itens.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql (update_pedido_venda_v2), linhas 791-793`
- Exclusão de pedido é soft-delete: atualiza deleted_at = NOW(), não remove fisicamente.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql (delete_pedido_venda_v2), linha 906`
- Pedidos com deleted_at IS NOT NULL não aparecem em listagens ou buscas (filtrado em RLS e RPCs).  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linha 75; linha 136; get_pedido_venda_v2, linha 313`
- Integração Tiny ERP: campo id_tiny armazena ID retornado pelo Tiny ao enviar pedido; numero_pedido pode ser preenchido pelo Tiny (opcional).  
  ↳ origem: `tiny-enviar-pedido-venda-v1, linhas 704-726`
- Antes de enviar ao Tiny, pedido deve ter empresa_faturamento_id válida e ativa com chave_api (token Tiny) configurada.  
  ↳ origem: `tiny-enviar-pedido-venda-v1, linhas 268-292`
- Natureza de operação enviada ao Tiny é resolvida por ID via tabela tiny_empresa_natureza_operacao (mapeamento empresa × natureza → ID Tiny), com suporte a dual-mapping para Simples Nacional.  
  ↳ origem: `tiny-enviar-pedido-venda-v1, linhas 322-350; resolveNaturezaTiny`
- Pedido com itens vazios não pode ser enviado ao Tiny (validação p_itens.length > 0).  
  ↳ origem: `tiny-enviar-pedido-venda-v1, linhas 506-508`
- Valores numéricos (quantidade, valor_unitario) são convertidos para number; se nulos/inválidos, defaultam para 0.  
  ↳ origem: `tiny-enviar-pedido-venda-v1, função toNumber linhas 25-30, aplicadas em linhas 533-535`
- Desconto extra (valor_desconto_extra) é subtraído do valor_total para calcular valor_final enviado ao Tiny.  
  ↳ origem: `tiny-enviar-pedido-venda-v1, linhas 557-559`
- Parcelamento: se id_condicao é fornecido, busca intervalo_parcela em Condicao_De_Pagamento e divide valor_final igualmente entre parcelas, ajustando última parcela para fechar total.  
  ↳ origem: `tiny-enviar-pedido-venda-v1, linhas 538-590`
- Se sem id_condicao, padrão é 1 parcela (intervalos = [0]).  
  ↳ origem: `tiny-enviar-pedido-venda-v1, linha 579`
- Feature flag FEATURE_SIMPLES_NACIONAL_LOOKUP ativa revalidação de Simples Nacional via ReceitaWS a cada envio de pedido (apenas para cliente PJ); resultado é persistido em cliente.optante_simples_nacional.  
  ↳ origem: `tiny-enviar-pedido-venda-v1, linhas 393-494`
- Natureza Tiny final é resolvida por: (1) se mapeamento empresa tem tiny_valor_simples e cliente é optante Simples Nacional, usa tiny_valor_simples; (2) senão, usa tiny_valor (padrão).  
  ↳ origem: `tiny-enviar-pedido-venda-v1, linhas 644-673`
- Após envio bem-sucedido ao Tiny, pedido_venda é atualizado com id_tiny, numero_pedido (se retornado), tiny_natureza_enviada, tiny_optante_aplicado, tiny_fallback_used para auditoria.  
  ↳ origem: `tiny-enviar-pedido-venda-v1, linhas 712-726`
- Apenas vendedor dono do pedido (vendedor_uuid == user.id) ou backoffice pode enviar pedido ao Tiny.  
  ↳ origem: `tiny-enviar-pedido-venda-v1, linhas 229-231`
- Listagem de pedidos filtra por: vendedor (próprio ou backoffice vê todos), status (exato), cliente (exact id), data_venda (range via data_inicio/data_fim), busca por nome cliente/ordem_cliente/numero_pedido.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql (list_pedido_venda_v2), linhas 42-59, 140-151`
- Stats de pedidos segmentam por gera_receita (natureza de operação) e status; contam vendas concluídas (status IN ('Faturado', 'Pronto para envio', 'Enviado', 'Entregue', ...)), em andamento, canceladas. *(corrigida na verificação)*  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql (list_pedido_venda_v2), linhas 157-173`
- RLS policy pedidos_select_own_or_backoffice: vendedor vê apenas seus pedidos; backoffice vê todos (exceto deleted_at IS NOT NULL).  
  ↳ origem: `schema_baseline.sql — policies referenciadas mas não detalhadas; lógica implementada em RPC`
- RLS policy pedidos_insert_own_or_backoffice: qualquer usuário autenticado pode inserir pedido se for backoffice ou se vendedor_uuid == auth.uid().  
  ↳ origem: `schema_baseline.sql — policy referenciada; lógica em create_pedido_venda_v2 linhas 441-443`
- RLS policy pedidos_update_own_or_backoffice: vendedor pode atualizar apenas seus pedidos; backoffice qualquer um.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql (update_pedido_venda_v2), linhas 696-698`
- Constraint UNIQUE em (pedido_venda_id, produto_id) garante que não há itens duplicados do mesmo produto em um pedido.  
  ↳ origem: `schema_baseline.sql — constraint uq_pedido_produto`
- Campos de observação (observacao, observacao_interna) são opcionais (nulos); observacao = pública (nota fiscal), observacao_interna = privada (apenas backoffice/vendedor).  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql (create_pedido_venda_v2), linhas 382-383, 545-546`
- Campo ordem_cliente (PO number) é opcional e texto livre; usado para rastrear ordem de compra do cliente.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql (create_pedido_venda_v2), linha 381, listagem linha 144`
- Campo numero_pedido (número da NF ou PV) é optional, preenchível manualmente ou pelo Tiny após envio.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql (create_pedido_venda_v2), linha 376; tiny-enviar-pedido-venda-v1 linha 716`
- Percentual desconto extra (percentual_desconto_extra) é taxa aplicada após itens (ex: 5% de desconto a posteriori).  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 388, 521-522`
- Desconto padrão percentual (percentual_desconto_padrao) vem da lista de preço ou é sobrescrito.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linha 379, coluna percentual_desconto_padrao em INSERT`

### ⚠️ A confirmar (a fonte não sustentou claramente — revisar)
- Produtos são inseridos em pedido_venda_produtos com número sequencial (1, 2, 3...) iniciando em 1 e incrementando por item.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 566-601` — Código insere COALESCE((v_produto->>'numero')::INTEGER, 1) para cada produto. Não há lógica de auto-incremento por índice de loop; cada item pode vir com 'numero' arbitrário do payload
- Trigger fill_pedido_venda_lookup_ids resolve campos ID para lista de preço, natureza de operação e empresa de faturamento a partir de nomes (match case-insensitive com trim).  
  ↳ origem: `schema_baseline.sql, linha 1289 (referência ao trigger) — função não localizada em migrations` — Trigger existe (CREATE TRIGGER trg_fill_pedido_venda_lookup_ids BEFORE INSERT ON public.pedido_venda FOR EACH ROW EXECUTE FUNCTION fill_pedido_venda_lookup_ids) mas implementação da função não encontrada em arquivos migrados. Regra pode estar desatualizada ou função em schema anterior não revisado.
- Trigger fill_pedido_venda_produtos_snapshot_fields preenche SKU, EAN, pesos e unidade do produto (catalogue) quando não fornecidos no item do pedido.  
  ↳ origem: `schema_baseline.sql, linha 1290 (referência ao trigger) — função não localizada em migrations` — Trigger existe (CREATE TRIGGER trg_fill_pedido_venda_produtos_snapshot_fields BEFORE INSERT ON public.pedido_venda_produtos) mas implementação da função não encontrada. Lógica de preenchimento de defaults pode estar ausente do código visível ou foi removida.
- Comissão é gerada automaticamente quando pedido é criado/atualizado (trigger tg_pedido_venda_generate_comissao) ou quando status muda para 'Faturado' (trigger trg_comissao_on_faturado).  
  ↳ origem: `schema_baseline.sql, linhas 1286-1287` — Triggers existem mas trigger de create_pedido_venda NÃO mencionado. Schema mostra 2 triggers: (1) pedido_venda_au_generate_comissao AFTER UPDATE OF valor_total (não ON INSERT), (2) trg_comissao_on_faturado AFTER UPDATE OF status='Faturado'. Regra diz 'criado/atualizado' mas code só mostra UPDATE triggers, não INSERT.
- Peso bruto_total e liquido_total são soma dos pesos dos itens; se não calculados via trigger, devem ser preenchidos manualmente no payload.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linhas 392-393; edge function linha 396-397` — Parâmetros p_peso_bruto_total e p_peso_liquido_total com DEFAULT 0. Nenhum trigger ou função calcula soma automática. Responsabilidade do frontend enviar soma pre-calculada. Sem validação de coerência.
- Total de itens (total_itens) é contagem de linhas em pedido_venda_produtos; deve ser preenchido no payload.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linha 391; edge function linha 395` — Parâmetro p_total_itens INTEGER DEFAULT 0. Nenhum trigger calcula COUNT. Responsabilidade do frontend. Sem validação de que total_itens == COUNT(SELECT pedido_venda_produtos).
- Total de quantidades (total_quantidades) é soma de quantidade de todos os itens; deve ser preenchido no payload.  
  ↳ origem: `migration 044_rpc_pedido_venda_v2.sql, linha 390; edge function linha 394` — Parâmetro p_total_quantidades NUMERIC DEFAULT 0. Nenhum trigger calcula SUM(quantidade). Responsabilidade do frontend. Sem validação de coerência.

---

## Comissões

- Pedidos com natureza_operacao = 'Bonificação' NÃO geram comissão — retorna status 'bonificacao_sem_comissao' sem inserir registro  
  ↳ origem: `generate_vendedor_comissao (linhas 42-46)`
- Comissão pode ser de dois tipos configurados no vendedor (dados_vendedor.Comissão): 1) Alíquota fixa (tipo 2, valor em dados_vendedor.aliquotafixa); 2) Conforme lista de preço do cliente (tipo 1)  
  ↳ origem: `generate_vendedor_comissao (linhas 58-87)`
- Tipo 1 (Conforme lista de preço): percentual de comissão determinado pela faixa de desconto do cliente em listas_preco_comissionamento — se desconto_cliente está entre desconto_minimo e desconto_maximo, aplica aquela comissão  
  ↳ origem: `generate_vendedor_comissao (linhas 61-82), create_lista_preco_v2`
- Tipo 2 (Alíquota fixa): percentual vem do campo aliquotafixa de dados_vendedor, aplicado diretamente sem faixas  
  ↳ origem: `generate_vendedor_comissao (linhas 58-59)`
- Valor da comissão = (valor_total do pedido × percentual_comissao) ÷ 100, arredondado para 2 casas decimais  
  ↳ origem: `generate_vendedor_comissao (linha 90)`
- Comissão é armazenada na tabela vendedor_comissão com campos: vendedor_uuid, pedido_id, valor_total, valor_comissao, percentual_comissao, periodo (YYYY-MM), data_inicio, data_final, efetivada=true ao criar *(corrigida na verificação)*  
  ↳ origem: `generate_vendedor_comissao (linhas 110-135)`
- Se já existe registro de comissão para o pedido, atualiza em vez de inserir novo (UPDATE em vendedor_comissão com mesmo pedido_id)  
  ↳ origem: `generate_vendedor_comissao (linhas 92-108)`
- Pedido DEVE ter vendedor_uuid preenchido, senão gera exceção 'Pedido % sem vendedor_uuid'  
  ↳ origem: `generate_vendedor_comissao (linhas 34-36)`
- Tipo de comissão inválido (diferente de 1 ou 2) gera exceção explícita  
  ↳ origem: `generate_vendedor_comissao (linhas 84-86)`
- Lançamento manual de crédito/débito só pode ser criado em período aberto — período fechado ou pago nega insert e lança exceção  
  ↳ origem: `create_lancamento_comissao_v2 (linhas 10-17)`
- Lançamento manual de comissão é registrado em lancamentos_comissao com tipo='credito' ou 'debito', valor numérico, descricao, periodo (YYYY-MM), criado_por  
  ↳ origem: `create_lancamento_comissao_v2`
- Pagamento de comissão é registrado em pagamentos_comissao com vendedor_uuid, valor, periodo, forma_pagamento, data_pagamento=CURRENT_DATE, realizado_por  
  ↳ origem: `create_pagamento_comissao_v2`
- Período de comissão pode ser fechado via fechar_periodo_comissao_v2 — calcula saldo_final = saldo_anterior + total_comissoes + total_creditos - total_debitos - total_pagos, muda status para 'fechado', cria próximo mês com saldo_anterior=saldo_final  
  ↳ origem: `fechar_periodo_comissao_v2`
- Saldo_final de período fechado é propagado para próximo mês como saldo_anterior — período novo criado automaticamente com status='aberto'  
  ↳ origem: `fechar_periodo_comissao_v2 (linhas 71-95)`
- Relatório de comissões consolida por período — soma vendas, lançamentos (crédito/débito), pagamentos, calcula saldo_final condicional se período fechado ou aberto  
  ↳ origem: `get_relatorio_comissoes_v2`
- RLS: Apenas backoffice pode criar lançamentos_comissao — policy 'Apenas Backoffice pode criar lancamentos' valida is_user_backoffice()  
  ↳ origem: `lancamentos_comissao RLS policy`
- RLS: Apenas backoffice pode registrar pagamentos_comissao — policy 'Apenas Backoffice pode registrar pagamentos'  
  ↳ origem: `pagamentos_comissao RLS policy`
- Editar comissão via API (edge function comissoes-v2 PUT /vendas) restringe a backoffice — falha se user.tipo !== 'backoffice'  
  ↳ origem: `supabase/functions/comissoes-v2/index.ts (linhas 480-517)`
- Deletar comissão via API restringe a backoffice; vendedor não pode deletar  
  ↳ origem: `supabase/functions/comissoes-v2/index.ts (linhas 522-544)`
- Edge function GET /relatorios com periodo obrigatório (YYYY-MM) — vendedor vê apenas seu relatório, backoffice pode filtrar por vendedor ou ver todos  
  ↳ origem: `supabase/functions/comissoes-v2/index.ts (linhas 128-148)`
- Edge function POST /calcular-pendentes busca pedidos_faturados sem comissão e chama generate_vendedor_comissao em lote, retorna contagem gerados/erros  
  ↳ origem: `supabase/functions/comissoes-v2/index.ts (linhas 381-428)`
- Faixa de comissão é selecionada pela PRIMEIRA faixa cuja desconto_cliente está entre [desconto_minimo, desconto_maximo], ordenada por desconto_minimo ASC e id ASC  
  ↳ origem: `generate_vendedor_comissao (linhas 72-78)`
- Se desconto_cliente não enquadra em nenhuma faixa, percentual_comissao fica 0  
  ↳ origem: `generate_vendedor_comissao (linhas 80-82)`
- Campo efetivada sempre é true ao criar comissão — não há estado 'não efetivada' no fluxo automático  
  ↳ origem: `generate_vendedor_comissao (linha 127)`
- Edge function POST /fechar-periodo restringe a backoffice; cria entrada em controle_comissao_periodo com dados do fechamento  
  ↳ origem: `supabase/functions/comissoes-v2/index.ts (linhas 356-376)`

### ⚠️ A confirmar (a fonte não sustentou claramente — revisar)
- Período é calculado automaticamente usando to_char(data_faturamento, 'YYYY-MM') — se data_faturamento não fornecida, usa CURRENT_DATE  
  ↳ origem: `generate_vendedor_comissao (linhas 38-40)` — Função generate_vendedor_comissao(p_pedido_id bigint) não tem parâmetro p_data_faturamento. Edge function tenta passar em linhas 408-411 mas função SQL (linha 10 de 082) só aceita p_pedido_id. Período não é calculado.
- Débito (comissão negativa) é marcado com campo debito=true em vendedor_comissão — ao somar, subtrai em vez de somar  
  ↳ origem: `get_comissoes_vendedor (linhas 18-20, 35-36)` — Campo debito existe mas generate_vendedor_comissao insere sempre debito=false (linha 137). Não há mecanismo visível para criar débitos em vendedor_comissão. Débitos manuais vão para lancamentos_comissao (083).
- RLS: Vendedor pode visualizar apenas suas próprias comissões (filtro vendedor_uuid = auth.uid()); backoffice pode ver tudo — policy comissoes_select_own_or_backoffice  
  ↳ origem: `vendedor_comissão RLS policies` — RLS policies para vendedor_comissão não são definidas em migrations. Segurança é application-level em edge function (linhas 468-470), não RLS database-level.
- Campo periodo em vendedor_comissão pode ser NULL em registros legados; queries fazem fallback para to_char(data_inicio, 'YYYY-MM') se periodo é NULL  
  ↳ origem: `get_relatorio_comissoes_v2 (linhas 15-16), comissoes-v2 GET /vendas (linhas 444-464)` — Campo periodo pode ser NULL pois generate_vendedor_comissao NÃO o popula. get_relatorio_comissoes_v2 usa WHERE periodo = p_periodo sem fallback. GET /vendas (linhas 462-464) faz OR com data_inicio fallback apenas se periodo IS NULL, implementação parcial.

---

## Conta Corrente

- Um compromisso em conta corrente é identificado por um lançamento que possui cliente_id obrigatório, data obrigatória, valor obrigatório (>0), titulo obrigatório (mínimo 2 caracteres) e tipo_compromisso obrigatório limitado a 'investimento' ou 'ressarcimento'.  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (create_conta_corrente_v2, linhas 425-443)`
- O tipo_compromisso aceita apenas dois valores: 'investimento' (quando há desembolso/aporte) ou 'ressarcimento' (quando há cobrança de retorno). A validação é case-insensitive e convertida para lowercase no armazenamento.  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (create_conta_corrente_v2 linha 499, update_conta_corrente_v2 linha 643)`
- O status de um compromisso é calculado dinamicamente baseado na soma dos pagamentos realizados: 'Pendente' (zero pago), 'Pago Parcialmente' (parcial), ou 'Pago Integralmente' (total pago = valor do compromisso). Status não é campo armazenado, é derivado.  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (list_conta_corrente_v2 linhas 113-117, get_conta_corrente_v2 linhas 309-313)`
- Um pagamento em conta corrente é registrado na tabela pagamento_acordo_cliente com referência ao compromisso (conta_corrente_id obrigatório), data_pagamento obrigatória, forma_pagamento obrigatória (mínimo 2 caracteres), e valor_pago obrigatório (>0).  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (create_pagamento_conta_corrente_v2, linhas 828-842)`
- A soma de todos os pagamentos realizados em um compromisso (conta_corrente_id) nunca pode exceder o valor original do compromisso. Se tentado, lança exceção 'Valor total pago não pode exceder o valor do compromisso'.  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (create_pagamento_conta_corrente_v2 linhas 878-886, update_pagamento_conta_corrente_v2 linhas 1022-1031)`
- Apenas usuários com tipo='backoffice' podem criar categorias de conta corrente. Vendedores não têm permissão.  
  ↳ origem: `supabase/migrations/022_rpc_categorias_conta_corrente_v2.sql (create_categorias_conta_corrente_v2, linhas 45-56)`
- Uma categoria de conta corrente requer nome obrigatório (mínimo 2 caracteres). Nomes são únicos (case-insensitive, com trim) e identificados por UUID. Uma categoria marcada como deleted_at IS NOT NULL é considerada excluída logicamente.  
  ↳ origem: `supabase/migrations/021_create_categorias_conta_corrente.sql (linhas 8-23), 022_rpc_categorias_conta_corrente_v2.sql (linhas 33-43)`
- Vendedores podem criar/atualizar compromissos apenas para clientes aos quais estão atribuídos (existência em cliente_vendedores com correspondência cliente_id e vendedor_id).  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (create_conta_corrente_v2 linhas 470-477, update_conta_corrente_v2 linhas 609-617)`
- Usuários backoffice têm acesso completo a todos os compromissos de conta corrente. Vendedores visualizam apenas compromissos de clientes atribuídos (via cliente_vendedores).  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (list_conta_corrente_v2 linhas 76-82, get_conta_corrente_v2 linhas 323-329)`
- Toda exclusão de pagamento é física (DELETE real) e requer validação de permissão. Um usuário do tipo 'vendedor' só pode excluir pagamento se estiver atribuído ao cliente do compromisso.  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (delete_pagamento_conta_corrente_v2, linhas 1113-1135)`
- As formas de pagamento podem ser referenciadas por forma_pagamento_id (FK para ref_forma_pagamento) ou como texto livre em forma_pagamento. Se forma_pagamento_id é fornecido, a função valida sua existência e atividade (ativo IS NULL OR ativo = TRUE).  
  ↳ origem: `supabase/migrations/075_add_forma_pagamento_id_to_pagamentos_rpc.sql (linhas 58-81)`
- As estatísticas de conta corrente agrupam totais por tipo_compromisso: total_investimentos, total_ressarcimentos, total_pagamentos (soma de valor_pago), quantidade_compromissos, quantidade_pagamentos, e saldo_geral calculado como (investimentos - ressarcimentos - pagamentos).  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (list_conta_corrente_v2, linhas 169-219)`
- Apenas usuários ativos (ativo=TRUE, deleted_at IS NULL) podem criar, atualizar ou excluir compromissos/pagamentos. A validação ocorre via SELECT ... FROM public.user u WHERE u.user_id = p_created_by AND u.ativo = TRUE AND u.deleted_at IS NULL.  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (create_conta_corrente_v2 linhas 459-463, create_pagamento_conta_corrente_v2 linhas 856-860)`
- Um novo compromisso é criado com valor_pago=0 e valor_pendente=valor (100% pendente). Apenas após inserção de pagamentos o saldo muda.  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (create_conta_corrente_v2, linhas 519-521)`
- Campos opcionais em compromisso: descricao_longa (text), vendedor_uuid (uuid), categoria_id (uuid), arquivos_anexos (text array, default array vazio). Todos têm valor NULL permitido no banco. *(corrigida na verificação)*  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (create_conta_corrente_v2, assinatura linhas 391-393) e 072_add_categoria_id_to_all_conta_corrente_rpc.sql (linhas 150)`
- Campos opcionais em pagamento: arquivo_comprovante (text), categoria_id (uuid). forma_pagamento_id é opcional se forma_pagamento (texto) for fornecido. *(corrigida na verificação)*  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (create_pagamento_conta_corrente_v2, linhas 803-804) e 075_add_forma_pagamento_id_to_pagamentos_rpc.sql (linhas 14-22)`
- RLS (Row Level Security) para categorias_conta_corrente: authenticated usuarios podem SELECT (deleted_at IS NULL), INSERT, UPDATE. service_role tem acesso total (ALL). Categorias excluídas (deleted_at NOT NULL) não aparecem em SELECT para usuários autenticados.  
  ↳ origem: `supabase/migrations/021_create_categorias_conta_corrente.sql (linhas 49-73)`
- RLS para conta_corrente_cliente: há policies para SELECT, INSERT, UPDATE, DELETE para authenticated. Há também uma policy conta_corrente_select_assigned_or_backoffice que restringe SELECT a backoffice ou vendedores atribuídos ao cliente. *(corrigida na verificação)*  
  ↳ origem: `supabase/migrations/068_rls_conta_corrente.sql (linhas 19-50)`
- RLS para pagamento_acordo_cliente: policies permitem INSERT, UPDATE, DELETE, SELECT para authenticated com verificação via função (check conditions). *(corrigida na verificação)*  
  ↳ origem: `supabase/migrations/068_rls_conta_corrente.sql (linhas 66-96)`
- Paginação em list_conta_corrente_v2 usa page (default 1) e limit (default 100, máximo 100). Offset é calculado como (page - 1) * limit. Total de páginas retornado como CEIL(total / limit).  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (list_conta_corrente_v2, linhas 51, 47-49, 229)`
- Busca (p_busca) em list_conta_corrente_v2 é case-insensitive (ILIKE) e procura em: titulo, descricao_longa do compromisso; nome e nome_fantasia do cliente; e nome do grupo de redes.  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (list_conta_corrente_v2, linhas 89-95)`
- Filtro por p_tipo_compromisso em list_conta_corrente_v2 é case-insensitive: LOWER(ccc.tipo_compromisso) = LOWER(p_tipo_compromisso).  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (list_conta_corrente_v2, linha 87)`
- Filtro por data (p_data_inicio, p_data_fim) em list_conta_corrente_v2 usa operadores >= e <= respectivamente.  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (list_conta_corrente_v2, linhas 84-85)`
- Filtro por grupo de redes (p_grupo_rede_id) compara UUID: c.grupo_id = p_grupo_rede_id.  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (list_conta_corrente_v2, linha 88)`

### ⚠️ A confirmar (a fonte não sustentou claramente — revisar)
- Um compromisso de tipo 'investimento' aumenta o saldo a favor (débito do cliente). Um compromisso de tipo 'ressarcimento' diminui o saldo (crédito para o cliente). O saldo geral é a soma algébrica: SUM(investimento) - SUM(ressarcimento) - SUM(pagamentos_recebidos).  
  ↳ origem: `supabase/functions/conta-corrente-v2/index.ts, edge function (não encontrada RPC específica de estatísticas de saldo)` — Código consultado não mostra cálculo explícito de saldo com CASE WHEN investimento/ressarcimento. Regra mencionada em gaps do JSON original refere-se a 'get_estatisticas_conta_corrente.sql' não consultada.
- Toda condição de pagamento (tabela Condicao_De_Pagamento) é única por descrição (case-insensitive, com trim). Suporta parcelamento booleano, condição de crédito booleano, quantidade de parcelas, desconto, prazo em dias, forma_pagamento_id, meio_pagamento, e intervalo de parcelas (array de inteiros).  
  ↳ origem: `Não consultado diretamente - referido em gaps` — Nenhuma migração com 'rpc_insert_condicao_pagamento' ou tabela 'Condicao_De_Pagamento' encontrada nas migrações. Pode estar em arquivo não consultado.
- Um cliente pode ter múltiplas condições de pagamento disponíveis, armazenadas em array (condicoesdisponiveis bigint[]) na tabela cliente. A função get_condicoes_pagamento_por_cliente desempacota esse array com LATERAL UNNEST.  
  ↳ origem: `Mencionado em gaps - não consultado` — Campo 'condicoesdisponiveis' não encontrado nas migrações consultadas. Referência em gap original.
- A tabela conta_corrente_cliente NÃO possui campo deleted_at, portanto exclusão lógica não é suportada. DELETE físico é a única opção (recomenda-se evitar). A edge function conta-corrente-v2 retorna erro para DELETE de compromisso.  
  ↳ origem: `supabase/migrations/067_rpc_conta_corrente_v2.sql (linhas 691-697 comentário), supabase/functions/conta-corrente-v2/index.ts (não encontrado DELETE handler de compromisso)` — Migração 067 menciona em comentário que tabela não possui deleted_at e soft delete não é implementado. Edge function não consultada para DELETE de compromisso (apenas de pagamento em linhas 431-457).

---

## Usuários e Permissões

- Tipos de usuários permitidos: 'backoffice' ou 'vendedor'. Nenhum outro tipo é aceito.  
  ↳ origem: `migrations/005_rpc_usuarios_v2.sql (linhas 51-53), migrations/001_fix_campos_obrigatorios.sql (linha 16)`
- Email é obrigatório, único (case-insensitive) e deve validar contra regex ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ Não pode haver dois usuários ativos (deleted_at IS NULL) com o mesmo email em lowercase.  
  ↳ origem: `migrations/005_rpc_usuarios_v2.sql (linhas 43-69), migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql (linhas 51-77)`
- Nome é obrigatório e deve ter mínimo 2 caracteres (após trim).  
  ↳ origem: `migrations/005_rpc_usuarios_v2.sql (linhas 47-49), migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql (linhas 55-57)`
- Apenas usuários com tipo='backoffice', ativo=true e deleted_at IS NULL podem criar novos usuários. Esta verificação é feita via parâmetro p_created_by.  
  ↳ origem: `migrations/005_rpc_usuarios_v2.sql (linhas 71-82), migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql (linhas 79-90)`
- Email é armazenado em lowercase (LOWER() no INSERT). user_login tem default LOWER(TRIM(email)) se não fornecido.  
  ↳ origem: `migrations/005_rpc_usuarios_v2.sql (linhas 94, 98), migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql (linhas 107, 111)`
- Novo usuário nasce com ativo=true, data_cadastro=NOW(), deleted_at=NULL, deleted_by=NULL, permissoes='[]'::jsonb (array JSON vazio). *(corrigida na verificação)*  
  ↳ origem: `migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql (linhas 100-116)`
- CREATE OR REPLACE com ON CONFLICT ON CONSTRAINT user_pkey permite reativação (upsert): se auth_user_id já existe, atualiza o registro marcando ativo=true, data_cadastro=NOW(), deleted_at=NULL, deleted_by=NULL.  
  ↳ origem: `migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql (linhas 92-132)`
- Vendedor (tipo='vendedor') SÓ pode atualizar seu próprio perfil (validação p_updated_by = p_user_id). Vendedor NÃO pode alterar p_tipo ou p_ativo.  
  ↳ origem: `migrations/005_rpc_usuarios_v2.sql (linhas 197-204)`
- DELETE é implementado como SOFT DELETE: apenas ativo e deleted_at são alterados. Marca ativo=FALSE, deleted_at=NOW(). Usuário não é removido fisicamente.  
  ↳ origem: `migrations/005_rpc_usuarios_v2.sql (linhas 332-336)`
- Apenas usuários com tipo='backoffice', ativo=true e deleted_at IS NULL podem deletar (soft delete) outros usuários.  
  ↳ origem: `migrations/005_rpc_usuarios_v2.sql (linhas 313-328)`
- Vendedor (tipo='vendedor') só pode VER seu próprio perfil de usuário via GET. Se vendedor tenta ver outro perfil, exceção 'Vendedores só podem ver seu próprio perfil'.  
  ↳ origem: `migrations/005_rpc_usuarios_v2.sql (linhas 402-405)`
- RLS Policy users_select_own_or_backoffice: usuario SELECT seu próprio registro (user_id = auth.uid()) OU é backoffice (is_user_backoffice(auth.uid())). Vendedores veem apenas a si mesmos. *(corrigida na verificação)*  
  ↳ origem: `migrations/004_fix_rls_policies.sql (linhas 62-75)`
- RLS Policy users_update_own: usuario SÓ pode UPDATE seu próprio registro (user_id = auth.uid()). Não há exceção para backoffice — backoffice não pode atualizar outro usuário via RLS direto (deve usar a função update_user_v2). *(corrigida na verificação)*  
  ↳ origem: `migrations/004_fix_rls_policies.sql (linhas 78-84)`
- Permissões são armazenadas como JSONB array na coluna permissoes da tabela user. Exemplos: 'clientes.visualizar', 'usuarios.criar', 'comissoes.visualizar'.  
  ↳ origem: `migrations/089_user_permissions.sql (linhas 35-36), supabase/functions/_shared/permission-ids.ts, create-user-v2/index.ts (linhas 27-48)`
- Permissões para tipo='vendedor' são restritas a: clientes.*, vendas.*, relatorios.visualizar, contacorrente.*, produtos.*, comissoes.visualizar/lancamentos.*. Backoffice tem acesso a todas as permissões mais: usuarios.*, config.*, configuracoes.* *(corrigida na verificação)*  
  ↳ origem: `supabase/functions/_shared/permission-ids.ts (linhas 1-39), migrations/089_user_permissions.sql (linhas 10-31)`
- Apenas backoffice (tipo='backoffice') pode atualizar permissoes de um usuário. Tentativa de vendedor alterar permissoes gera ValidationError 'Apenas backoffice pode alterar permissoes'.  
  ↳ origem: `supabase/functions/update-user-v2/index.ts (linhas 271-274)`
- Ao criar usuário sem fornecimento de auth_user_id, sistema envia convite por email automaticamente usando supabaseAdmin.auth.admin.inviteUserByEmail() com redirectTo. Email de convite é enviado, e o user_id retornado é armazenado.  
  ↳ origem: `supabase/functions/create-user-v2/index.ts (linhas 429-460)`
- Dados de vendedor são armazenados em tabela separada dados_vendedor com user_id como FK para public.user. Campo status em dados_vendedor tem valores: 'ativo', 'inativo', 'excluido' (CHECK constraint).  
  ↳ origem: `migrations/001_fix_campos_obrigatorios.sql (linhas 33-43)`
- RLS Policy vendedores_select_own_or_backoffice: usuario acessa dados_vendedor se user_id = auth.uid() OU é backoffice, E deleted_at IS NULL.  
  ↳ origem: `migrations/004_fix_rls_policies.sql (linhas 112-126)`
- RLS Policy vendedores_update_own_or_backoffice: usuario pode UPDATE dados_vendedor se é o dono (user_id = auth.uid()) OU é backoffice. Update é permitido somente sob essas condições.  
  ↳ origem: `migrations/004_fix_rls_policies.sql (linhas 129-149)`
- Metas de vendedor: ano deve estar entre 2000 e 2100 (inclusive), mês deve estar entre 1 e 12, meta_valor >= 0.  
  ↳ origem: `migrations/041_rpc_metas_vendedor_v2.sql (linhas 51-61), migrations/042_rls_metas_vendedor.sql`
- Metas de vendedor: há unicidade em (vendedor_id, ano, mês). Não é possível ter duas metas para o mesmo vendedor no mesmo período.  
  ↳ origem: `migrations/041_rpc_metas_vendedor_v2.sql (linhas 93-101, 697-698)`
- Apenas usuários com tipo='backoffice' podem criar ou atualizar metas de vendedor. Validação via p_created_by ou p_updated_by.  
  ↳ origem: `migrations/041_rpc_metas_vendedor_v2.sql (linhas 77-91, 367-381)`
- RLS Policy metas_select_own_or_backoffice: usuario pode SELECT metas_vendedor se é backoffice OU vendedor_id = auth.uid().  
  ↳ origem: `migrations/042_rls_metas_vendedor.sql (linhas 20-47)`
- Função default_user_permissions_v2(p_tipo text) retorna permissões padrão em JSONB baseado no tipo: backoffice recebe conjunto completo, vendedor recebe conjunto restrito.  
  ↳ origem: `migrations/089_user_permissions.sql (linhas 4-32)`
- List users endpoint (list_users_v2) retorna paginado. Vendedor só recebe seu próprio registro (total=1, limit=1). Backoffice recebe lista paginada de todos os usuários não deletados.  
  ↳ origem: `migrations/005_rpc_usuarios_v2.sql (linhas 486-510)`
- Sanificação em update-user-v2 edge: permissões são validadas contra SUPPORTED_BACKOFFICE_PERMISSION_IDS se alvo é backoffice, ou SUPPORTED_SELLER_PERMISSION_IDS se alvo é vendedor.  
  ↳ origem: `update-user-v2/index.ts (linhas 137-159)`

### ⚠️ A confirmar (a fonte não sustentou claramente — revisar)
- RLS Policy users_insert_backoffice: somente autenticados com is_user_backoffice(auth.uid())=true podem INSERT em public.user.  
  ↳ origem: `migrations/004_fix_rls_policies.sql (linhas 87-98)` — A policy usa EXISTS (SELECT 1 FROM public.user WHERE id=auth.uid() AND tipo='backoffice'), não uma função is_user_backoffice(). A função is_user_backoffice é mencionada em 101_fix_cliente_endereco_select_policy_vendedoresatribuidos.sql (linha 12) mas NUNCA é criada em nenhuma migration lida. Regra é suportada mas com sintaxe diferentes.
- Vendedor só pode atualizar seu próprio perfil em dados_vendedor. Se p_updated_by != p_user_id e tipo='vendedor', exceção 'Vendedores só podem atualizar seu próprio perfil'.  
  ↳ origem: `migrations que contêm update_dados_vendedor_v2` — Não encontrei a migration específica com update_dados_vendedor_v2, mas a edge function update-user-v2/index.ts (linha 343) chama supabase.rpc('update_dados_vendedor_v2', dadosVendedorParams) sem validação visual de tipo no edge. A validação deve estar na RPC SQL, que não foi lida.
- Metas de vendedor (tabela metas_vendedor) requerem vendedor_id válido (tipo='vendedor' na tabela user). Tentativa de criar meta para tipo='backoffice' ou usuário inativo gera exceção.  
  ↳ origem: `migrations/041_rpc_metas_vendedor_v2.sql (linhas 63-74)` — A função busca SELECT dv.nome, u.tipo... WHERE dv.user_id=p_vendedor_id AND u.ativo=TRUE... mas NÃO valida u.tipo='vendedor' explicitamente. Se tipo='backoffice', a query ainda retornará o nome/tipo, e a função prossegue. NÃO há RAISE se tipo != 'vendedor'. Regra pode ser incorreta.
- RLS Policy metas_modify_backoffice: somente backoffice (is_user_backoffice(auth.uid())=true) pode INSERT/UPDATE/DELETE em metas_vendedor.  
  ↳ origem: `migrations/042_rls_metas_vendedor.sql (linhas 49-101)` — A policy usa EXISTS (SELECT 1 FROM public.user u WHERE u.user_id=auth.uid() AND u.tipo='backoffice'...), não uma função is_user_backoffice(). Descrição menciona is_user_backoffice mas implementação usa EXISTS inline. Confirmado funcionalmente, mas denominação em regra é imprecisa.
- Tabela cliente tem coluna vendedoresatribuidos (uuid[]). Funções adicionar_vendedor_atribuido e remover_vendedor_atribuido manipulam este array (concatenação e EXCEPT respectivamente).  
  ↳ origem: `mencionado em regras, não lido` — As funções adicionar_vendedor_atribuido e remover_vendedor_atribuido são mencionadas mas não foram lidas. Coluna vendedoresatribuidos é referenciada em migrations/101_fix_cliente_endereco_select_policy_vendedoresatribuidos.sql linha 19 (auth.uid() = ANY(c.vendedoresatribuidos)), confirmando existência.
- Existe tabela cliente_vendedores (relacionamento many-to-many) com campos: id (PK), cliente_id (FK cliente), vendedor_id (FK dados_vendedor.user_id). Há RLS policy allow_all que permite leitura por todos autenticados.  
  ↳ origem: `mencionado em migrations/004_fix_rls_policies.sql e 101, não lido` — cliente_vendedores é referenciado em RLS policies (migrations/004, 101) mas a tabela e suas policies não foram completamente lidas. RLS policy allow_all é mencionada na regra extraída, mas não foi visualizada.
- Sanificação em create-user-v2 edge: permissões de vendedor são validadas contra SUPPORTED_SELLER_PERMISSION_IDS. Backoffice não valida permissões em criação (apenas filtra duplicatas).  
  ↳ origem: `create-user-v2/index.ts (linhas 272-288, 411-415)` — Linhas 411-415 mostram que para backoffice, permissoes são apenas filtradas (removidas duplicatas), sem validação contra SUPPORTED_BACKOFFICE_PERMISSION_IDS. Para vendedor, linhas 272-288 validam contra SUPPORTED_SELLER_PERMISSION_IDS. Regra está correta, mas implementação pode permitir permissoes inválidas para backoffice em criação.
- Campo first_login na tabela user (boolean DEFAULT false) marca se usuário entrou pela primeira vez. Retornado em get_user_by_id_v2 e list_users_v2.  
  ↳ origem: `migrations/005_rpc_usuarios_v2.sql (linhas 379, 420, 549)` — first_login é retornado nas queries de get_user_by_id_v2 (linha 420) e list_users_v2 (linha 549), mas NÃO é encontrado um CREATE TABLE ou ADD COLUMN que defina first_login na tabela user. Pode estar em uma migration não lida ou em uma estrutura de tabela inicial não consultada. Campo é USADO mas sua origem não foi confirmada.

---

## Produtos, Listas de Preço e Condições de Pagamento

- Lista de preço deve ter nome com mínimo 3 caracteres e ser único (case-insensitive, após trim)  
  ↳ origem: `create_lista_preco_v2.sql, linhas 14-38`
- Tipo de comissão em lista de preço aceita apenas dois valores: 'fixa' ou 'conforme_desconto'  
  ↳ origem: `create_lista_preco_v2.sql, linha 18`
- Quando tipo de comissão é 'fixa', percentual fixo é obrigatório e deve estar entre 0 e 100  
  ↳ origem: `create_lista_preco_v2.sql, linhas 23-29`
- Lista de preço padrão começa com desconto=0 e ativo=true se não informados  
  ↳ origem: `create_lista_preco_v2.sql, linhas 48-49`
- Produtos podem ser inseridos em lista de preço como array JSON com campos produtoId e preco  
  ↳ origem: `create_lista_preco_v2.sql, linhas 55-68`
- Faixas de comissão 'conforme_desconto' mapeiam intervalo de desconto_minimo até desconto_maximo para percentual_comissao  
  ↳ origem: `create_lista_preco_v2.sql, linhas 72-89; listas_preco_comissionamento table`
- Tabela listas_preco_comissionamento tem constraint CHECK(desconto_minimo <= desconto_maximo)  
  ↳ origem: `schema_baseline.sql, linha 861`
- Produto tem situacao padrão='Ativo' e valores aceitos são: 'Ativo', 'Inativo', 'Excluído' *(corrigida na verificação)*  
  ↳ origem: `get_produto_v2.sql, linha 30; schema_baseline.sql linha 865`
- Produto tem flags ativo (default true) e disponivel (default true); soft-delete via deleted_at  
  ↳ origem: `list_produtos_v2.sql, linhas 34-35; schema_baseline.sql linhas 513-517`
- Cliente tem campo lista_de_preco (FK para listas_preco.id) que define sua lista de preço padrão  
  ↳ origem: `schema_baseline.sql, linhas 53, 875`
- Cliente tem array condicoesdisponiveis (bigint[]) que lista as condições de pagamento ativas para ele  
  ↳ origem: `schema_baseline.sql, linha 58; add_condicao_disponivel.sql, remove_condicao_disponivel.sql`
- Cliente tem condicao_padrao (bigint) indicando qual condição de pagamento é padrão  
  ↳ origem: `schema_baseline.sql, linha 63`
- Cliente tem desconto (numeric) que é usado no cálculo de comissão conforme_desconto ao buscar faixa em listas_preco_comissionamento  
  ↳ origem: `generate_vendedor_comissao.sql, linhas 62-76`
- Condição de pagamento pode ter parcelamento (boolean), quantidade_parcelas, prazo_pagamento (dias), desconto e valor_minimo  
  ↳ origem: `schema_baseline.sql, linhas 20-31`
- Condição de pagamento tem referências a forma_pagamento_id e meio_pagamento com FKs para ref_forma_pagamento e ref_meio_pagamento  
  ↳ origem: `schema_baseline.sql, linhas 28-29, 872-873`
- função rpc_insert_condicao_pagamento valida descrição obrigatória e rejeita duplicatas (case-insensitive, trimmed) *(corrigida na verificação)*  
  ↳ origem: `rpc_insert_condicao_pagamento.sql, linhas 10-30`
- Acesso a condições de pagamento por cliente via função get_condicoes_pagamento_por_cliente que desempacota array condicoesdisponiveis  
  ↳ origem: `get_condicoes_pagamento_por_cliente.sql, linhas 17-19`
- Acesso a condições de pagamento por vendedor via função get_condicoes_pagamento_por_vendedor filtrando por clientes atribuídos  
  ↳ origem: `get_condicoes_pagamento_por_vendedor.sql, linhas 21-22`
- Produto filtra acesso conforme permissão do usuário: backoffice vê tudo, vendedor vê conforme ref_permissao_id e produto_vendedor.Condição_associada  
  ↳ origem: `filtrar_produtos.sql, linhas 27-37`
- Comissão de vendedor é calculada por trigger ao pedido virar 'Faturado', chamando generate_vendedor_comissao com data current_date  
  ↳ origem: `trigger_comissao_faturado.sql, linhas 7-8`
- Comissão é atualizada também em trigger AFTER UPDATE OF valor_total em pedido_venda  
  ↳ origem: `schema_baseline.sql, linha 1286`
- Cálculo de comissão tipo 1: busca percentual em listas_preco_comissionamento matching cliente.desconto between desconto_minimo e desconto_maximo, senão 0%  
  ↳ origem: `generate_vendedor_comissao.sql, linhas 61-82`
- Cálculo de comissão tipo 2: usa aliquotafixa do dados_vendedor fixo para todo pedido  
  ↳ origem: `generate_vendedor_comissao.sql, linhas 58-59`
- Comissão é NULL (sem geração) para pedidos com natureza_operacao='Bonificação'  
  ↳ origem: `generate_vendedor_comissao.sql, linhas 42-46`
- Fórmula comissão: valor_comissao = round((valor_total_pedido * percentual / 100), 2)  
  ↳ origem: `generate_vendedor_comissao.sql, linha 90`
- Comissão é criada ou atualizada em tabela vendedor_comissão com status efetivada=true, incluindo período YYYY-MM  
  ↳ origem: `generate_vendedor_comissao.sql, linhas 92-136`
- Faixa de comissão com desconto_minimo=0 e desconto_maximo=0 e comissao=0 é auto-deletada por trigger delete_zero_discount_rows  
  ↳ origem: `delete_zero_discount_rows.sql, linhas 6-8`
- Produto tem peso_bruto, peso_liquido (numeric), numero_volumes e dimensões (altura, comprimento, largura) opcionais  
  ↳ origem: `schema_baseline.sql, linhas 494-501`
- RLS em listas_preco e listas_preco_comissionamento: allow_all para authenticated (sem restrição por usuário) *(corrigida na verificação)*  
  ↳ origem: `schema_baseline.sql, linhas 1075-1076, 1099-1100`
- RLS em produtos_listas_precos: allow_all para authenticated (sem restrição) *(corrigida na verificação)*  
  ↳ origem: `schema_baseline.sql, linha 1104`
- RLS em produto: backoffice pode criar/editar/deletar; vendedor só vê produtos com disponivel=true (ou é backoffice)  
  ↳ origem: `schema_baseline.sql, linhas 1105-1109`
- Produto tem descricao, codigo_sku, gtin (EAN), ncm (fiscal), cest (fiscal) para integração NF-e  
  ↳ origem: `schema_baseline.sql, linhas 486-490`
- Produto referencia marca (tabela marcas.id), tipo_id (ref_tipo_produto.id) e unidade_id (ref_unidade_medida.id) *(corrigida na verificação)*  
  ↳ origem: `schema_baseline.sql, linhas 510, 509, 493`
- Atualização de lista de preço via update_lista_preco_v2 valida nome (minimo 3 chars), duplicidade e deleta/reinsere produtos/faixas  
  ↳ origem: `update_lista_preco_v2.sql, linhas 17-60`
- Função get_lista_preco_v2 retorna lista com tipo_comissao='conforme_desconto' se houver faixas, senão 'fixa'  
  ↳ origem: `get_lista_preco_v2.sql, linhas 64-70`
- Busca de produtos em lista de preço suporta search_text com ILIKE em descricao, gtin e codigo_sku  
  ↳ origem: `fn_buscar_produtos_lista_preco.sql, linhas 11-26`

### ⚠️ A confirmar (a fonte não sustentou claramente — revisar)
- Condição de pagamento pode ter intervalo_parcela como array de bigint (dias entre parcelas)  
  ↳ origem: `schema_baseline.sql, linha 30` — Linha 30: intervalo_parcela bigint[]. Existe o campo, mas não há documentação de semântica (dias? índices? formato?). Nenhuma função de validação usa esse array — apenas retorna-o. Regra é especulativa.
- Produto tem código_sku único implícito via índice (verificar); busca permite SKU exato se digitado com espaço ou LIKE parcial  
  ↳ origem: `fn_buscar_produtos_lista_preco.sql, linhas 17-24; filtrar_produtos.sql, linhas 59-60` — fn_buscar_produtos_lista_preco linhas 16-18 fazem busca condicionada: se p_search_text ~ '^\d+\s+$' (número+espaço), busca SKU exato; senão ILIKE parcial. Mas não há evidência de UNIQUE constraint na coluna codigo_sku no schema (grep não encontrou CREATE UNIQUE INDEX codigo_sku). Regra sobre 'único via índice' é não-confirmada; busca LIKE está confirmada.

---

## Logística

- Feature flag FEATURE_LOG_CRM deve estar setada para 'true' (case-sensitive, exatamente a string 'true' minúscula) para que as Edge Functions de Logística (frete-logistica-v1, transportador-logistica-v1, origem-frete-v1, regiao-destino-v1) retornem respostas normais; caso contrário retornam 503 Service Unavailable.  
  ↳ origem: `supabase/functions/_shared/log-crm-feature-flag.ts linhas 8-17, supabase/functions/frete-logistica-v1/index.ts linhas 287-289, transportador-logistica-v1/index.ts linhas 107-109`
- Frete logístico (frete_logistica) possui status_entrega ENUM com 9 valores possíveis: 'Em Separação', 'Aguardando Coleta', 'Em Trânsito', 'Em Trânsito - Reentrega', 'Entregue', 'Agendado', 'Recusado', 'Devolvido - Trânsito', 'Devolvido - Entregue'. O valor default na criação é 'Em Separação'.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 22-32, /tmp/schema_baseline.sql linha 14, frete-logistica-v1/index.ts linha 145`
- Frete logístico é criado com pedido_venda_id NULLABLE — criação manual (R-LOG-1) permite NULL, mas R-LOG-3 (auto-create via hook) preenchará automaticamente este campo quando o pedido é enviado ao Tiny. A unicidade de pedido_venda_id é garantida por índice UNIQUE parcial (pedido_venda_id IS NOT NULL AND deleted_at IS NULL), garantindo idempotência na retry.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 135-136, migration 121_frete_logistica_uq_pedido_venda.sql, frete-auto-create.ts linhas 26-27`
- Frete logístico possui duas unicidades na chave NFe: (1) UNIQUE INDEX por (empresa_id, nfe_numero) onde nfe_numero IS NOT NULL; (2) UNIQUE INDEX por nfe_chave_acesso onde nfe_chave_acesso IS NOT NULL; ambas excluem soft-deleted (deleted_at IS NULL). Desta forma NFe duplicada é bloqueada no DB, E chave de acesso NFe é imutável por empresa.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 269-276`
- Chave de acesso NFe (nfe_chave_acesso) é validada por constraint CHECK que exige exatamente 44 dígitos (regex ^[0-9]{44}$) quando não NULL. Frontend também valida Zod.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linha 168, frete-logistica-v1/index.ts linhas 381`
- Valor de produtos (valor_produtos) é decimal(14,2) com DEFAULT 0, NOT NULL, e validado por constraint CHECK para >= 0. Quando criado automaticamente (R-LOG-3), recebe o valor_produtos do pedido_venda.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 149, 165, frete-auto-create.ts linhas 33`
- Valor cotação (valor_cotacao) é decimal(14,2) NULLABLE com validação CHECK para >= 0 (quando presente). Origem ainda indefinida em ADR-009 (manual no MVP vs. integração Tiny no futuro).  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 150, 166`
- Volumes (volumes) é integer NULLABLE com validação CHECK para >= 0 (quando presente). Serve para cálculo de capacidade de transportador ou relatórios, ainda não utilizado em regras de negócio.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linha 151, 167`
- Transportador logístico obrigatoriamente tem CNPJ em formato digits-only (14 dígitos, sem separadores), validado por constraint CHECK (regex ^[0-9]{14}$). CNPJ é UNIQUE globalmente (pode existir apenas um registro por CNPJ).  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 84-85, transportador-logistica-v1/index.ts linhas 161-162`
- Transportador possui grupo ENUM obrigatório com 5 valores: 'ATIVA', 'BRASSPRESS', 'TA_AMERICANA', 'CAMILO', 'OUTROS'. O DEFAULT é 'OUTROS' se não informado na criação.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 44-51, 76, transportador-logistica-v1/index.ts linha 174`
- Transportador tem campo ssw_dominio (varchar 8, NULLABLE) que identifica a transportadora na API SSW (ex.: FAV, ATV, TEC, BRA, TNT). NULL se transportador não usa SSW. Decisão definitiva em ADR-006.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 77, 91-92`
- Transportador-logistica-v1 POST/PUT/DELETE: apenas backoffice pode escrever (read é para authenticated). Deleção é soft-delete (deleted_at + ativo=false).  
  ↳ origem: `transportador-logistica-v1/index.ts linhas 153-156, 225-234`
- Origem frete obrigatoriamente referencia empresa_id (FK com ON DELETE RESTRICT), garantindo que cada subsidiária manage suas próprias origens. Unicidade por (nome, empresa_id) — não pode haver duas origens com mesmo nome na mesma empresa.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 119, 123, origem-frete-v1/index.ts linhas 103, 111`
- Região destino (regiao_destino) é GLOBAL (sem empresa_id), com nome UNIQUE globalmente. Exemplos: 'MG-MATA', 'RJ-SUL', 'PARANA', 'BAHIA' (originário do form Bubble). Deleção é soft-delete via ativo=false.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 98-106, regiao-destino-v1/index.ts linhas 126-131`
- Auto-create de frete (R-LOG-3): quando pedido é enviado ao Tiny via tiny-enviar-pedido-venda-v1, hook FEATURE_LOG_CRM_AUTO_FRETE chama autoCreateFreteLogistica (best-effort). Se já existe frete para este pedido_venda_id (code 23505 UNIQUE violation), retorna skipped=true e não trata como erro. Qualquer falha do hook NUNCA bloqueia o envio do pedido.  
  ↳ origem: `supabase/functions/_shared/frete-auto-create.ts linhas 1-3, 21-72, tests/edge/frete-auto-create-on-tiny-send.test.ts linhas 75-81`
- Ocorrência SSW (frete_logistica_ocorrencia) referencia frete via FK (ON DELETE CASCADE), portanto quando frete é deletado (soft-delete via deleted_at), a ocorrência permanece no DB mas órfã. Raw payload completo é armazenado em jsonb (raw_payload) para auditoria.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 178-191, ssw-client.ts linhas 98-120`
- Status derivado de ocorrências SSW: resolvido via mapeamento (tipo + descricao_ocorrencia → status_entrega). Terminal status são 'Entregue' e 'Devolvido - Entregue' — polling SSW só ocorre se status atual é NÃO-terminal. Cache de polling é 30 minutos (TTL baseado em frete_logistica_ocorrencia.created_at).  
  ↳ origem: `supabase/functions/_shared/frete-logistica-helpers.ts linhas 65-106, ssw-client.ts linhas 122-132, frete-logistica-v1/index.ts linhas 207-261`
- Polling SSW (R-LOG-4, FEATURE_LOG_CRM_SSW) ocorre on-demand apenas quando: (1) flag FEATURE_LOG_CRM_SSW=true, (2) nfe_chave_acesso existe e tem 44 dígitos válidos, (3) status atual é não-terminal, (4) cache de 30 min está stale (última ocorrência criada > 30 min atrás). Ocorrências no DB são deletadas antes de reinserir.  
  ↳ origem: `frete-logistica-v1/index.ts linhas 205-261, ssw-client.ts linhas 59-77, 122-132`
- Dashboard (Torre de Controle) agrupa fretes em 5 buckets via action=list_by_status: 'Em Trânsito' (inclui 'Em Trânsito - Reentrega'), 'Reentrega' (apenas 'Em Trânsito - Reentrega'), 'Agendados', 'Devoluções em Trânsito', 'Recusadas'. Cada bucket retorna até 20 registros ordenados por data_emissao DESC, id DESC.  
  ↳ origem: `supabase/functions/_shared/frete-logistica-helpers.ts linhas 44-50, frete-logistica-v1/index.ts linhas 175-189, 307-310`
- Lista de fretes com paginação: limit default 20, máximo 100 (hard cap introduzido em lição INC-016 para evitar timeout em produção). Offset default 0. Filtros opcionais: empresa_id, cliente_id, transportador_id, status_entrega (CSV), data_emissao (intervalo), nfe_numero (LIKE substring).  
  ↳ origem: `supabase/functions/_shared/frete-logistica-helpers.ts linhas 22-35, frete-logistica-v1/index.ts linhas 337-370`
- Dias em trânsito (diasEmTransito) é calculado como: NULL se data_saida é NULL OU data_entrega já existe (frete já entregue). Caso contrário, (agora - data_saida) / 86400000 ms = número inteiro de dias.  
  ↳ origem: `supabase/functions/_shared/frete-logistica-helpers.ts linhas 112-121, frete-logistica-v1/index.ts linhas 117`
- Frete enriquecido retorna além dos campos base: clienteNome (JOIN cliente.nome), transportadorRazaoSocial (JOIN transportador_logistica.razao_social), empresaNome (JOIN ref_empresas_subsidiarias.nome_fantasia || razao_social), diasEmTransito (calculado).  
  ↳ origem: `frete-logistica-v1/index.ts linhas 95-119, packages/shared/types/frete-logistica.ts linhas 154-159`
- Mapeamento de ocorrência SSW para status: tipo='Entrega' + ocorrencia contém '(01)' → 'Entregue'; padrões regex para 'DEVOLUÇÃO ENTREGUE'/'DEVOLVIDO - ENTREGUE' → 'Devolvido - Entregue'; 'DEVOLVIDO'/'DEVOLUÇÃO' → 'Devolvido - Trânsito'; 'RECUSADO' → 'Recusado'; tipo='Cliente' + '(02)' ou 'AGENDADO (08)' → 'Agendado'; 'REENTREGA' → 'Em Trânsito - Reentrega'; default → 'Em Trânsito'.  
  ↳ origem: `supabase/functions/_shared/frete-logistica-helpers.ts linhas 74-97`
- Tipo de ocorrência SSW pode ser 'Cliente', 'Informativo', 'Entrega', 'Sistema', 'Operacional'. Se tipo desconhecido chega da API SSW, é mapeado para 'Informativo' como fallback seguro. *(corrigida na verificação)*  
  ↳ origem: `ssw-client.ts linhas 92-96, supabase/migrations/119_frete_logistica_base.sql linhas 35-42`
- Fatura transportadora (estrutura apenas em R-LOG-1, CRUD em R-LOG-6) obrigatoriamente referencia (transportador_id, empresa_id) com ON DELETE RESTRICT, garantindo que fatura não fica órfã. Unicidade por (transportador_id, numero_fatura) — não pode haver duplicação.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 202-203, 217`
- Fatura transportadora possui status ENUM com 3 valores: 'Aberta', 'Paga', 'Em_Analise'. Default na criação é 'Aberta'.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 54-60, 208`
- Auditoria: todas as 7 tabelas (transportador_logistica, regiao_destino, origem_frete, frete_logistica, frete_logistica_ocorrencia, fatura_transportadora, fatura_transportadora_item) possuem (criado_por uuid, atualizado_por uuid) que referenciam user(user_id), e (created_at, updated_at) timestamps automáticos. DELETE opera via deleted_at soft-delete (exceto regiao_destino e origem_frete que usam ativo=false). *(corrigida na verificação)*  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql passim, frete-logistica-v1/index.ts linhas 151-152, 390`
- RLS habilitada em todas 7 tabelas: policy SELECT para role 'authenticated' (defesa em profundidade); escritas apenas por service_role via Edge Function validação JWT (não direto por cliente). No futuro (R-LOG-3+) granularidade fina (vendedor vê só sua empresa) será adicionada.  
  ↳ origem: `supabase/migrations/119_frete_logistica_base.sql linhas 294-333`

### ⚠️ A confirmar (a fonte não sustentou claramente — revisar)
- Criação manual de frete via frete-logistica-v1 POST: apenas backoffice e vendedor podem criar (com tenant scoping); DELETE é backoffice-only. Deleção é soft-delete via deleted_at timestamp.  
  ↳ origem: `frete-logistica-v1/index.ts linhas 7-8, 373-385, 426-435` — Linha 7-8 afirma 'Backoffice + vendedor podem criar'. PORÉM linha 373 comentário diz 'POST + PUT: backoffice ou vendedor (com tenant scoping no payload)' MAS não há validação de tenant scoping no código (linhas 374-384 apenas verificam body.empresaId OBRIGATÓRIO sem validar se user.id tem permissão em essa empresa). LINE 427 confirma DELETE é backoffice-only: 'if (user.tipo !== 'backoffice') return jsonResponse(403...)'. DELEÇÃO é soft-delete via linha 431: 'deleted_at: new Date().toISOString()'. INCONSISTÊNCIA: comentário promete tenant scoping mas código não valida.

---

## Tiny, Multi-empresa, Naturezas de Operação e Simples Nacional

- Cliente PJ (CNPJ de 14 dígitos) com flag feature_simples_nacional_lookup ativa: consulta ReceitaWS na criação (best-effort, timeout 5s, não bloqueia), persiste optante_simples_nacional e data de consulta.  
  ↳ origem: `docs/specs/SPEC.md §1 (RF-001, RF-002), supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 402-494, create-cliente-v2/index.ts linhas 344-357`
- Cliente PF (CPF de 11 dígitos) ou sem cpf_cnpj: optante_simples_nacional fica permanentemente null, ReceitaWS NÃO é chamado.  
  ↳ origem: `docs/specs/SPEC.md §1 (RF-001, RF-002)`
- Revalidação de Simples Nacional a cada envio de pedido ao Tiny: sem janela de tempo, sempre reconsulta ReceitaWS se cliente PJ e feature flag ligada (DP-006). Motivo: cliente pode sair do Simples fora das janelas anuais (decisão ADR-004).  
  ↳ origem: `docs/specs/SPEC.md §1 (RF-003), supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 393-494, docs/decisions/adr/ADR-004-revalidacao-simples-por-pedido.md`
- Short-circuit DP-006 (otimização empresa-level): antes de chamar ReceitaWS no envio, verifica com COUNT se empresa tem algum mapeamento ativo com tiny_valor_simples preenchido. Se não, pula ReceitaWS inteiramente (não atualiza consultado_em), usa tiny_valor direto, registra fallback='no_dual_company'.  
  ↳ origem: `docs/specs/SPEC.md §1 (RF-003, CA-007 sub-caso E), supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 408-431`
- Mapeamento dual natureza Tiny: tabela tiny_empresa_natureza_operacao com colunas tiny_valor (obrigatório) e tiny_valor_simples (nullable). Se tiny_valor_simples null/vazio, sistema usa tiny_valor para todos os clientes (comportamento pré-F-001 preservado).  
  ↳ origem: `docs/specs/SPEC.md §1 (RF-004), /tmp/schema_baseline.sql (tabela tiny_empresa_natureza_operacao)`
- Invariante mapeamento dual: tiny_valor_simples preenchido exige tiny_valor também preenchido (validação defesa em profundidade). UI bloqueia estado inválido via toggle: switch off (default) = 1 campo; switch on = ambos obrigatórios.  
  ↳ origem: `docs/specs/SPEC.md §1 (RF-004, CB-003), supabase/functions/tiny-empresa-natureza-operacao-v2/index.ts linhas 145-154`
- Escolha natureza Tiny ao enviar pedido (CA-007): se optante_simples_nacional=true e tiny_valor_simples preenchido → usa tiny_valor_simples; caso contrário (false, null, ou sem dual) → usa tiny_valor. Fallback sempre para tiny_valor em erro.  
  ↳ origem: `docs/specs/SPEC.md §1 (RF-005, CA-007), supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 644-673, supabase/functions/_shared/natureza-resolver.ts`
- ReceitaWS rate-limit recovery (INC-004): se HTTP 429 ou body com 'too many requests'/'muitas requisi'/'limite excedido', aguarda 3s e tenta UMA vez mais (retry interno). Sem retry se falhar novamente.  
  ↳ origem: `supabase/functions/_shared/receitaws-client.ts linhas 55-85, 180-209`
- CNPJ em logs sempre mascarado: preserva 3 primeiros + '*****' + 2 últimos (ex: '123****89'). Resposta bruta ReceitaWS NUNCA persistida - apenas simples.optante e data consulta. *(corrigida na verificação)*  
  ↳ origem: `docs/specs/SPEC.md §2 (RNF-003), supabase/functions/_shared/receitaws-client.ts linhas 40-44`
- Pedido enviado ao Tiny: registra em pedido_venda os campos de auditoria F-001: tiny_natureza_enviada (string do ID Tiny), tiny_optante_aplicado (boolean da decisão), tiny_fallback_used (enum: 'none'|'no_dual'|'no_dual_company'|'null_optante'|'revalidation_failed').  
  ↳ origem: `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 710-721, /tmp/schema_baseline.sql (pedido_venda.tiny_natureza_enviada, etc.)`
- Feature flag feature_simples_nacional_lookup: env var booleana (FEATURE_SIMPLES_NACIONAL_LOOKUP='true'|'false'|ausente). Ausente = false. Com flag desligada, ReceitaWS NÃO é chamado; sistema trata optante_simples_nacional=null como 'não-simples' no resolver.  
  ↳ origem: `docs/specs/SPEC.md §1 (RF-006, CA-008), supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linha 402`
- Pedido de venda: natureza_operacao pode vir por nome (string) ou natureza_id (bigint). Se natureza_id null, resolve por nome na tabela. Validação: natureza deve existir, estar ativa, não deletada.  
  ↳ origem: `/tmp/fns/create_pedido_venda_v2.sql linhas 55-63, supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 294-320`
- Permissão backoffice: apenas usuários com tipo='backoffice' podem criar/editar/deletar empresas, naturezas, mapeamentos Tiny, listas de preço. Verificação explícita em cada RPC/edge function.  
  ↳ origem: `supabase/functions/natureza-operacao-v2/index.ts linhas 243-245, supabase/functions/empresas-v2/index.ts linhas 192-227, supabase/functions/tiny-empresa-natureza-operacao-v2/index.ts linhas 135-137`
- Permissão vendedor: vendedor só acessa clientes atribuídos a ele (via RLS clientes_select_assigned_or_backoffice). Pode criar pedidos para cliente atribuído; pode enviar próprios pedidos (verificação vendedor_uuid = user.id).  
  ↳ origem: `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 228-231, /tmp/schema_baseline.sql (RLS policies)`
- Re-leitura de optante_simples_nacional antes de fallback (INC-004 + INC-005): se lookup falha no envio, re-busca cliente.optante_simples_nacional do banco antes de usar valor em memória, para evitar descartar estado true já conhecido.  
  ↳ origem: `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 453-490`
- Upsert mapeamento Tiny: empresa_id + natureza_operacao_id = chave única. Se tinyValor vazio, soft-delete (deleted_at, ativo=false). Se tinyValor preenchido, upsert atualiza/insere com deleted_at=null.  
  ↳ origem: `supabase/functions/tiny-empresa-natureza-operacao-v2/index.ts linhas 160-195`
- Campo IE_isento em cliente: booleano default false. Ao enviar pedido ao Tiny, se IE_isento=true usa 'ISENTO'; caso contrário usa inscricao_estadual (ou '' se vazio).  
  ↳ origem: `/tmp/fns/create_cliente_v2.sql linha 89, supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 389-392`
- Payload Tiny: usa id_natureza_operacao (string do ID mapeado). Campos de cliente normalizados: CPF/CNPJ sem formatação, CEP sem ponto/hífen (digitsOnly), tipo_pessoa='F'|'J'.  
  ↳ origem: `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 615-641, 670-673`
- Parcelas de pedido: se id_condicao fornecido, busca intervalo_parcela em Condicao_De_Pagamento. Distribuição: valor_total / num_parcelas (arredondado), última parcela ajustada para fechar total.  
  ↳ origem: `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 538-590`
- Data pedido Tiny: formatada em timezone America/Sao_Paulo (BUG-001 fix). Usa formatDateBR(), não toISOString() que flipava dia UTC.  
  ↳ origem: `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 593-595, supabase/functions/_shared/date-br.ts`
- Vendedor identificação Tiny: usa dados_vendedor.idtiny (obrigatório). Nome_vendedor NÃO é enviado mais (Tiny rejeitava divergências de nome vs cadastro local). Identificação única por idtiny.  
  ↳ origem: `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 238-266 (comentário linha 239-241)`
- Soft-delete padrão: tabelas com deleted_at + check (deleted_at IS NULL). Queries filtram IS NULL. Permite auditoria (MAX(codigo) inclui deletados para nunca reutilizar).  
  ↳ origem: `/tmp/fns/create_cliente_v2.sql linhas 40-44, /tmp/schema_baseline.sql (padrão em todas as create_*_v2)`
- Timeout ReceitaWS: 5 segundos (DP-002 resolvida). AbortController com setTimeout. Falha de timeout cai em fallback, não bloqueia operação.  
  ↳ origem: `docs/specs/SPEC.md §2 (RNF-001), supabase/functions/_shared/receitaws-client.ts linhas 124-126`
- Logging estruturado: console.log(JSON.stringify({...})) padrão nas edge functions. Eventos rastreáveis: receitaws.lookup, natureza.resolvida, optante_simples.refresh, etc. Inclui traceId para correlação.  
  ↳ origem: `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 651-659, 481-488, supabase/functions/_shared/receitaws-client.ts linhas 50-53`
- Dry-run pedido Tiny: parâmetro body.dry_run=true retorna payload pronto sem enviar ao Tiny (útil para debug/teste).  
  ↳ origem: `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 187, 675-698`
- Feature auto-create frete_logistica (FEATURE_LOG_CRM_AUTO_FRETE): best-effort após envio Tiny sucesso, never blocks response. Cria registro em frete_logistica com dados do pedido.  
  ↳ origem: `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 729-739`
- Validação CNPJ: 14 dígitos para PJ, 11 dígitos para PF. Normalizado sem formatação em operações internas (remove não-dígitos).  
  ↳ origem: `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts linhas 365-368, supabase/functions/_shared/receitaws-client.ts linhas 99-103`

### ⚠️ A confirmar (a fonte não sustentou claramente — revisar)
- Código de cliente gerado automaticamente se não fornecido: o sistema incrementa o maior código numérico existente (inclui deletados) + 1, com lock serial para evitar duplicação em criações simultâneas.  
  ↳ origem: `create-cliente-v2/index.ts` — Pesquisei em supabase/migrations/007_rpc_clientes_v2.sql (linhas 108-109): o comentário diz '(Implementar lógica de geração automática se necessário)' mas não há implementação. O código em create-cliente-v2/index.ts não gera código automaticamente — aceita body.codigo ou deixa null. Nenhuma evidência de lock serial ou MAX(codigo)+1. Falta confirmação se essa regra está implementada ou é aspiracional.
- Natureza de operação: campos gera_comissao (booleano default true) e gera_receita (booleano default true). Validação: nome obrigatório (≥2 caracteres), código único se fornecido, nome case-insensitive único, apenas backoffice pode criar.  
  ↳ origem: `/tmp/fns/create_natureza_operacao_v2.sql, supabase/functions/natureza-operacao-v2/index.ts linhas 242-250` — natureza-operacao-v2/index.ts linhas 242-245 verifica user.tipo='backoffice'. Linhas 248-249 validam nome ≥2 caracteres. migration 008_add_natureza_operacao_fields.sql linhas 13-14 adicionam gera_comissao, gera_receita com default TRUE. Mas NÃO há evidência de validação de UNIQUE em nome (case-insensitive) ou código único. Impossível confirmar sem ver RPC create_natureza_operacao_v2.
- Empresa (ref_empresas_subsidiarias): validações - CNPJ obrigatório e único (normalized, sem dígitos não-numéricos); razão social ≥2 caracteres; apenas backoffice pode criar/editar/deletar. Soft-delete via deleted_at.  
  ↳ origem: `/tmp/fns/create_empresas_v2.sql linhas 9-17, supabase/functions/empresas-v2/index.ts linhas 192-228` — empresas-v2/index.ts linhas 192-227 verificam user.tipo='backoffice'. Mas o arquivo lido foi truncado (limit=150 linhas). Não há acesso a /tmp/fns/create_empresas_v2.sql. Não posso confirmar validação de CNPJ único, normalização, ou razão social ≥2.
- Status pedido deve ser encontrado em check constraint cliente_status_aprovacao_check: 'aprovado'|'pendente'|'rejeitado'. Status default: 'Rascunho' ao criar, muda para 'Faturado' via trigger comissão.  
  ↳ origem: `/tmp/schema_baseline.sql, /tmp/fns/create_pedido_venda_v2.sql linhas 135` — A regra menciona 3 valores de check constraint (aprovado/pendente/rejeitado) mas depois fala de status pedido (Rascunho/Faturado). Isso parece confundir status_aprovacao (cliente) com status (pedido). Sem acesso a schema_baseline.sql ou create_pedido_venda_v2.sql, não posso confirmar.
- Comissão gera-se ao pedido virar 'Faturado' (trigger trg_comissao_on_faturado): se natureza='Bonificação', NÃO gera comissão; caso contrário, calcula conforme tipo_comissao do vendedor (1=conforme_desconto via lista_preco, 2=aliquota_fixa).  
  ↳ origem: `/tmp/fns/trigger_comissao_faturado.sql, /tmp/fns/generate_vendedor_comissao.sql linhas 42-87` — Não tenho acesso aos arquivos /tmp/fns/trigger_comissao_faturado.sql nem generate_vendedor_comissao.sql. Impossível verificar se existe checagem literal de natureza='Bonificação' ou se usa gera_comissao boolean.
- Comissão tipo 1 (conforme_desconto): lookup em listas_preco_comissionamento com WHERE desconto_cliente BETWEEN desconto_minimo E desconto_maximo (ORDER BY desconto_minimo ASC, id ASC LIMIT 1). Se not found, comissão=0.  
  ↳ origem: `/tmp/fns/generate_vendedor_comissao.sql linhas 72-82` — Sem acesso a /tmp/fns/generate_vendedor_comissao.sql. Não posso verificar.
- Comissão tipo 2 (aliquota_fixa): usa v_aliquota_fixa do vendedor em dados_vendedor.aliquotafixa.  
  ↳ origem: `/tmp/fns/generate_vendedor_comissao.sql linhas 58-59` — Sem acesso ao arquivo source. Impossível confirmar.
- Cálculo valor comissão: round((valor_total_pedido * percentual_comissao / 100), 2). Período de referência = YYYY-MM da data_faturamento (ou current_date se não fornecida).  
  ↳ origem: `/tmp/fns/generate_vendedor_comissao.sql linhas 89-90, 40` — Sem acesso ao source. Não confirmo.
- Comissão duplicada por pedido: se já existe vendedor_comissão com pedido_id, ATUALIZA (valor_total, valor_comissao, percentual_comissao, periodo); senão INSERE. Status retornado: 'updated'|'created'|'bonificacao_sem_comissao'.  
  ↳ origem: `/tmp/fns/generate_vendedor_comissao.sql linhas 93-136` — Sem access. Não confirmo.
- Conta corrente cliente: tipo_compromisso enum (investimento|ressarcimento), obrigatório. Validações: valor > 0, titulo ≥2 caracteres. Permissão: vendedor só pode criar para cliente atribuído a ele.  
  ↳ origem: `/tmp/fns/create_conta_corrente_v2.sql, /tmp/schema_baseline.sql (check constraint conta_corrente_cliente_tipo_compromisso_check)` — Sem acesso aos sources.
- Lançamento comissão: não pode ser adicionado em período com status='fechado' ou 'pago'. Tipo lançamento (credito|debito) definido via check constraint lancamentos_comissao_tipo_check.  
  ↳ origem: `/tmp/fns/create_lancamento_comissao_v2.sql linhas 10-17, /tmp/schema_baseline.sql` — Sem acesso.
- Lista de preço: tipo_comissao (fixa|conforme_desconto). Se tipo='fixa', percentual_fixo obrigatório e ∈ [0,100]. Se tipo='conforme_desconto', faixas_comissao array de {descontoMin, descontoMax?, percentualComissao}.  
  ↳ origem: `/tmp/fns/create_lista_preco_v2.sql linhas 18-31` — Sem acesso.

---

## Como manter este documento
- Ao mexer numa regra (RPC/edge/front), **atualize a seção correspondente**.
- Resolver os itens **⚠️ A confirmar** quando o domínio for tocado (ler a fonte citada).
- Não inventar: se não está no código, não está aqui. Fonte de verdade = `main` (espelha prod).


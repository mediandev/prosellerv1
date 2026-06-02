# Regras de Negócio — ProSeller V1

> **v1 — 2026-06-02.** Levantamento extraído do **código que roda em produção** (RPCs
> Postgres, Edge Functions, schema/constraints/RLS e o front). Onde uma regra foi
> verificada nesta auditoria, há a **origem**. Onde o cálculo/fluxo ainda não foi
> destrinchado, está marcado **(a detalhar)** com o ponteiro — para evitar inventar regra.
> Documento **vivo**: refinar com o time (Valentim/Lucas) e manter junto do código.

Fonte de verdade do schema/funções: `supabase/schema_baseline.sql` + migração de baseline.
Contexto da auditoria: `docs/wiki/auditoria-backend-prod-git-2026-06-01.md`.

---

## 1. Clientes

### 1.1 Identificação
- **Tipo de pessoa** (PJ/PF) via `ref_tipo_pessoa` (FK `ref_tipo_pessoa_id_FK`). PJ usa CNPJ, PF usa CPF. *(origem: `create_cliente_v2`, `CustomerFormPage`)*
- **CNPJ/CPF**: aceitos com 14 ou 11 dígitos (após remover máscara). **Não há validação de dígito verificador** no backend — apenas o tamanho. *(origem: migração `096_remove_cpf_cnpj_validation_create_cliente_v2`)*
- **Razão social** obrigatória, mínimo **2 caracteres**. *(origem: `create_cliente_v2` — `RAISE EXCEPTION` se `< 2`)*
- O CNPJ é gravado **com máscara** (ex.: `72.714.637/0001-50`) — a RPC não normaliza. *(origem: auditoria 2026-06-01)*

### 1.2 Código do cliente (automático)
- O código é **gerado pelo servidor** quando vier vazio: `MAX(codigo numérico) + 1`, serializado por `pg_advisory_xact_lock` (sem duplicar em cadastros simultâneos). *(origem: `create_cliente_v2`, migração de baseline; validado E2E em 2026-06-01)*
- O `MAX` considera **todas as linhas, inclusive excluídas** → códigos **nunca são reutilizados** (excluir um cliente deixa um "buraco" no número).
- Modo manual existe (config por usuário), mas o default é **automático**; no automático o campo fica em branco e o servidor preenche. *(origem: `customerCodeService`, `SettingsPage`)*

### 1.3 Situação (comercial) × Status de aprovação — **dois conceitos distintos**
- **Situação** = `ref_situacao` (FK `ref_situacao_id`): `1=ATIVO`, `2=INATIVO`, `3=EXCLUÍDO`, `4=PROSPECÇÃO`, `5=Análise`. É o que aparece como "Situação" na ficha e na lista. *(origem: tabela `ref_situacao`)*
- **Status de aprovação** = `status_aprovacao`: `aprovado` / `pendente` / `rejeitado` (fluxo de aprovação, separado da situação). *(origem: `create/update_cliente_v2`)*
- ⚠️ Eram confundidos: o read derivava a situação do status (forçava "Ativo"). **Corrigido (V1.43):** a situação exibida vem do `ref_situacao_id` real; o status só é fallback quando não há situação. *(origem: fix sessão 2026-06-01)*
- **Cliente novo nasce ATIVO** (situação 1). *(origem: fix `create_cliente_v2` 2026-06-01; antes nascia INATIVO indevidamente)*
- **Exclusão é soft-delete** (`deleted_at`), não remove a linha. Situação "Excluído" (ref 3) é diferente de `deleted_at` — são mecanismos distintos. *(origem: `delete_cliente_v2`, auditoria)*

### 1.4 Condição comercial
- **Empresa de faturamento** (`empresaFaturamento` / `empresa_faturamento_id`) — obrigatória no pedido; subsidiária Tiny. *(origem: form + `create_cliente_v2`)*
- **Vendedor atribuído**: armazenado como **`uuid[]`** (`vendedoresatribuidos`). O front envia objeto `{id,nome,email}`; a edge normaliza para o `id`. *(origem: fix `clientes-v2` POST 2026-06-01)*
- **Lista de preço**, **desconto padrão (%)**, **desconto financeiro (%)**, **pedido mínimo (R$)**, **condições de pagamento associadas**, **grupo/rede**, **segmento de mercado**. *(origem: `create/update_cliente_v2`, `condições_cliente`)*

### 1.5 Simples Nacional (F-001) — speccado
- `optante_simples_nacional` (+ data da consulta) por cliente **PJ**; PF fica sempre `null` (tratado como não-simples). Consulta **ReceitaWS** best-effort (não bloqueia cadastro) e **revalida a cada envio de pedido ao Tiny**. Atrás de feature flag. *(origem: `docs/specs/SPEC.md` F-001)*
- A natureza de operação no Tiny pode variar por **empresa + optante/não-optante**. *(origem: SPEC F-001, `tiny-empresa-natureza-operacao-v2`)*

### 1.6 Visibilidade (RLS)
- **Backoffice** vê todos os clientes. **Vendedor** vê só: aprovados onde é `criado_por` OU está em `vendedoresatribuidos`; e os `pendente` que ele mesmo criou. *(origem: `list_clientes_v2`, `get_cliente_completo_v2`)*

---

## 2. Usuários & Permissões

- **Tipos:** `backoffice` e `vendedor`. *(origem: `create_user_v2`)*
- **Convite:** criar usuário dispara `inviteUserByEmail` (Supabase Auth) — cria o usuário no Auth e envia o convite. *(origem: `create-user-v2`)*
- **Email é único no Supabase Auth.** Exclusão de usuário é **soft-delete** na tabela `user` (`deleted_at`) e **NÃO remove do Auth**. *(origem: `delete-user-v2`, `delete_user_v2`)*
- **Recriar um email soft-deletado → REATIVA** o cadastro (limpa `deleted_at`, reaproveita o usuário do Auth, preserva vínculos) e reenvia acesso, em vez de barrar com "email já cadastrado". *(origem: FIX B `create-user-v2` 2026-06-01, validado E2E)*
- **Permissões:** backoffice usa permissões por string (ex.: `clientes.todos`, `usuarios.criar`); vendedor usa IDs de permissão validados. *(origem: `create-user-v2`, `_shared/permission-ids`)*
- Cliente criado por **vendedor** nasce `pendente` + situação **Análise** (aguarda aprovação do backoffice); criado por **backoffice** nasce `aprovado`. *(origem: `create_cliente_v2`)*

---

## 3. Pedidos / Vendas

- **Status do pedido:** Rascunho · Em aberto · Aprovado · Preparando envio · Faturado · Pronto para envio · Enviado · Entregue · Não Entregue · Cancelado. *(origem: `SalesPage` tabs)*
- **Obrigatórios para enviar:** cliente, **empresa de faturamento**, **natureza de operação**, condição de pagamento, itens. *(origem: `SaleFormPage` validação)*
- **Duplicar pedido** cria um novo **Rascunho** (sem enviar ao ERP), zerando id/numero/integração e copiando itens. *(origem: `SalesPage.handleDuplicarPedido`)*
- Ao trocar/re-selecionar o cliente, condição de pagamento e natureza são **limpas** (forçar nova seleção) — mas os campos permanecem **visíveis** (fix V1.45). *(origem: fix `SaleFormPage` 2026-06-01)*
- **O.C. do cliente** (ordem de compra) é campo do pedido; há fallback para número do pedido. *(origem: migrações `*_oc_cliente_*`)*
- **Envio ao Tiny ERP:** `tiny-enviar-pedido-venda-v1` (deploy/payload = classe D, sensível). *(origem: AGENTS.md §4)*
- Cálculo de totais (peso, subtotal, desconto extra) no front. **(a detalhar)** *(ver `SaleFormPage`)*

---

## 4. Comissões  **(a detalhar — estrutura mapeada, cálculo a destrinchar)**

- Edge: `comissoes-v2` (relatórios, preview, vendas, lançamentos, pagamentos, fechar-período, calcular-pendentes). *(origem: `api.ts`)*
- Funções/triggers: `get_comissoes_vendedor`, `get_preview_comissoes`, `filtrar_comissoes_vendedor`, `tg_pedido_venda_generate_comissao` (trigger), `trigger_comissao_faturado` (trigger), `update_generate_vendedor_comissao_with_cliente_fields`.
- Regra conhecida: comissão é **gerada por trigger ao faturar o pedido**. *(origem: `trigger_comissao_faturado`)*
- **A detalhar:** percentuais (fixo vs faixa por lista de preço), período de fechamento, regras de pagamento. Extrair de `comissoes-v2` + funções acima.

---

## 5. Conta Corrente do Cliente  **(a detalhar)**

- Edge: `conta-corrente-v2` (lançamentos, pagamentos, categorias). Funções: `get_conta_corrente_cliente`, `get_estatisticas_conta_corrente`, `get_vendedores_conta_corrente`, RPCs de pagamento/acordo.
- Entidades: `conta_corrente_cliente`, `pagamento_acordo_cliente`, categorias (`categorias-conta-corrente-v2`).
- **A detalhar:** regras de saldo, acordo, categorização. Extrair das funções acima.

---

## 6. Logística (feature flag `FEATURE_LOG_CRM`)  **(parcial — ver wiki F-LOG-CRM)**

- Frete manual + Torre de Controle + rastreio SSW on-demand. Edges `*-v1`: `frete-logistica-v1`, `ssw-tracking-v1`, `transportador-logistica-v1`, `origem-frete-v1`, `regiao-destino-v1`.
- Frete pode ser criado automaticamente ao enviar pedido ao Tiny (flag). Status do frete derivado das ocorrências SSW. *(origem: `docs/wiki/features/F-LOG-CRM-*`, wiki/log)*
- Abas "Regiões destino"/"Origens" removidas do menu (decisão Valentim 2026-05-21), tabelas mantidas.

---

## 7. Multi-empresa / Integração Tiny

- O sistema opera com **múltiplas empresas de faturamento** (subsidiárias Tiny: ex. DAP, CANTICO, FLOWCODE). Cada pedido tem uma empresa de faturamento. *(origem: `empresas-v2`, form de pedido)*
- **Natureza de operação** mapeada por empresa (e por optante Simples — F-001) via `tiny-empresa-natureza-operacao-v2`. Alterar payload Tiny = classe **D**. *(origem: AGENTS.md §4, SPEC F-001)*
- Webhook de atualização do Tiny: `webhook-tiny-atualizacao`. *(origem: edge)*

---

## 8. Cadastros de apoio (CRUD `-v2`)

Cada entidade de apoio tem sua edge `-v2`: produtos, marcas, tipos de produto, tipos de
pessoa, tipos de veículo, unidades de medida, segmentos de cliente, grupos/redes, naturezas
de operação, situações (`ref-situacao`), formas/condições de pagamento, listas de preço,
empresas, metas de vendedor, categorias de conta corrente. Regras de cada um **(a detalhar)**
nas respectivas funções/edges.

---

## Como manter este documento
- Ao mexer numa regra (RPC/edge/front), **atualize a seção correspondente** aqui.
- Itens **(a detalhar)** são dívida de documentação — preencher quando a feature daquele
  domínio for tocada (extrair da função citada, que é a fonte de verdade).
- Não inventar regra: se não está no código, não está aqui.

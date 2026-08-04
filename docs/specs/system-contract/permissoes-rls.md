# Contrato — Permissões, Usuários & RLS

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

---

## Business Rules

### Apenas backoffice cria/atualiza/deleta usuários

Apenas usuários com `tipo='backoffice'` podem criar, atualizar ou deletar outros usuários. Tentar criar/atualizar/deletar como vendedor retorna 403 "Insufficient permissions". A regra é imposta em três camadas: (1) Edge Functions checam `user.tipo !== 'backoffice'` antes da operação; (2) RPCs revalidam `p_created_by/p_updated_by/p_deleted_by` = backoffice com `RAISE EXCEPTION`; (3) RLS policies restringem INSERT a `is_user_backoffice(auth.uid())`.

- **Tipo:** business-rule
- **Evidência:**
  - `supabase/functions/create-user-v2/index.ts:290-298` — `if (user.tipo !== 'backoffice')` → `createPermissionErrorResponse` 403
  - `supabase/functions/update-user-v2/index.ts:219-220` — check de tipo aplicado via RPC (linha 249)
  - `supabase/functions/delete-user-v2/index.ts:120-124` — `if (user.tipo !== 'backoffice')` → 403 "Apenas usuários backoffice podem excluir usuários"
  - `supabase/migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql:80-90` — RPC `create_user_v2` valida `p_created_by` backoffice
- **Regressão se:** um vendedor conseguir chamar os endpoints create/update/delete e atingir a RPC sem erro — quebra integridade de dados e o modelo de autorização.

### Apenas backoffice altera permissões

Em `update-user-v2`, apenas usuários backoffice (`user.tipo === 'backoffice'`) podem modificar o campo `permissoes`. Vendedor tentando alterar permissões dispara 403 "Apenas backoffice pode alterar permissoes". A validação é incondicional: se `sanitizedData.permissoes` está definido, o check de backoffice é obrigatório e bloqueante antes de qualquer modificação no banco. A RPC `update_user_v2` sequer aceita parâmetro `permissoes`.

- **Tipo:** business-rule
- **Evidência:**
  - `supabase/functions/update-user-v2/index.ts:271-277` — `if (sanitizedData.permissoes !== undefined) { if (user.tipo !== 'backoffice') throw ValidationError('Apenas backoffice...') }`
- **Regressão se:** o check de tipo for removido — vendedores poderiam escalar as próprias permissões ou conceder permissões a outros usuários.

### Recriar usuário com mesmo email reativa linha soft-deleted (dois caminhos)

`create-user-v2` reativa soft-deleted users por dois caminhos: (1) Se `auth_user_id` é fornecido, a RPC usa `INSERT ... ON CONFLICT (user_pkey) DO UPDATE` para reativar (`ativo=true`, `deleted_at=NULL`, preservando `user_id`); (2) Se `auth_user_id` NÃO é fornecido, a Edge Function detecta o soft-deleted user e chama `supabaseAdmin.from('user').update(...)` com `deleted_at=NULL` e `ativo=true`, retornando sem invocar a RPC. Ambos os mecanismos existem e funcionam, mas só o primeiro passa pela RPC.

- **Tipo:** business-rule
- **Evidência:**
  - `supabase/migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql:4-22` — INC-012: `ON CONFLICT` reativa a linha, preservando `user_id` → FKs
  - `supabase/migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql:121-131` — `ON CONFLICT ON CONSTRAINT user_pkey DO UPDATE` seta `ativo=TRUE`, `deleted_at=NULL`
  - `supabase/functions/create-user-v2/index.ts:362-410` — caminho da Edge Function: detecta `usuarioSoftDeletado` e chama `.update()` direto, retornando na linha 410 sem invocar a RPC
- **Regressão se:** a cláusula `ON CONFLICT` for removida e um INSERT direto for usado — recriar soft-deleted user falharia com "duplicate key" e a reativação seria impossível.

### Convite por email quando não há auth_user_id

Se `create-user-v2` recebe um usuário NOVO sem `auth_user_id`, envia convite via `inviteUserByEmail`, popula `auth_user_id` da resposta (linha 429) e chama a RPC (linha 441). Porém, ao reativar um soft-deleted user (mesmo email já existe com `deleted_at` não-nulo), chama `resetPasswordForEmail` no caminho de reativação, atualiza a tabela `user` diretamente SEM invocar a RPC, e NÃO popula `auth_user_id` — retorna cedo na linha 410 após o UPDATE, nunca chegando à RPC da linha 441.

- **Tipo:** business-rule
- **Evidência:**
  - `supabase/functions/create-user-v2/index.ts:359-431` — Step 4.5: `if (!sanitizedData.auth_user_id)` chama `inviteUserByEmail`/`resetPasswordForEmail`, popula `auth_user_id`
  - `supabase/functions/create-user-v2/index.ts:393-410` — caminho de reativação: chama `resetPasswordForEmail(email)` com `redirectTo` e retorna na linha 410 sem chamar a RPC (linha 441)
- **Regressão se:** o convite não for enviado ou `auth_user_id` não for extraído da resposta — a criação completaria mas o usuário não teria como se autenticar.

---

## Invariants

### tipo restrito a backoffice ou vendedor

O campo `tipo` na tabela `user` deve ser `'backoffice'` ou `'vendedor'`. Todas as operações create/update validam: `p_tipo NOT IN ('backoffice', 'vendedor')` → erro. Nenhum outro tipo é permitido. Imposto em múltiplas camadas: CHECK constraint na tabela, validação nas RPCs (`RAISE EXCEPTION`) e validação nas Edge Functions.

- **Tipo:** invariant
- **Evidência:**
  - `supabase/migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql:59-61` — RPC: `IF p_tipo IS NULL OR p_tipo NOT IN ('backoffice', 'vendedor') THEN RAISE EXCEPTION`
  - `supabase/functions/create-user-v2/index.ts:321-327` — `if (!body.tipo || ![...].includes(body.tipo)) throw ValidationError`
  - `supabase/functions/update-user-v2/index.ts:219-220` — check de tipo garante apenas backoffice/vendedor
- **Regressão se:** a constraint de tipo for removida — novos tipos poderiam ser inseridos, quebrando lógica de negócio que depende de `tipo='backoffice'` vs `tipo='vendedor'`.

### permissoes é array JSONB

A coluna `permissoes` na tabela `user` tem CHECK constraint `jsonb_typeof(permissoes) = 'array'`. `permissoes` deve sempre ser armazenado como array JSON de strings, nunca objeto ou null (default `'[]'::jsonb`). A constraint no banco é a última linha de defesa; a validação na aplicação é defensiva.

- **Tipo:** invariant
- **Evidência:**
  - `supabase/migrations/089_user_permissions.sql:35-49` — `ADD COLUMN permissoes JSONB NOT NULL DEFAULT '[]'`; `ADD CONSTRAINT user_permissoes_array_chk CHECK (jsonb_typeof(permissoes) = 'array')`
  - `supabase/functions/create-user-v2/index.ts:332-335` — `if (!Array.isArray(body.permissoes)) throw ValidationError('permissoes deve ser um array de strings')`
- **Regressão se:** a constraint de array for removida e `permissoes` for armazenado como objeto ou null — RPCs e código cliente que esperam iterar sobre array falhariam.

### nome com mínimo de 2 caracteres

O campo `nome` tem validação de comprimento mínimo (>= 2 após trim) em: RPC `create_user_v2` (SQL), RPC `update_user_v2` (SQL), Edge Function `create-user-v2` (linha 317) e Edge Function `update-user-v2` (linha 216). ENTRETANTO, há um caminho alternativo no código de reativação (`create-user-v2`, linhas 374-389) que faz UPDATE direto na tabela sem passar pela RPC — nesse caso a validação SQL nunca é aplicada pelo banco (não há CHECK constraint), e a segurança depende apenas da validação da Edge Function, que pode ser contornada via acesso direto (há policy `allow_all` permitindo UPDATE autenticado).

- **Tipo:** invariant
- **Evidência:**
  - `supabase/migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql:55-57` — RPC: `IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN RAISE EXCEPTION`
  - `supabase/functions/create-user-v2/index.ts:317-320` — `if (!validateMinLength(body.nome, 2)) throw ValidationError('Nome deve ter pelo menos 2 caracteres')`
  - `supabase/functions/update-user-v2/index.ts:216-218` — mesmo check `validateMinLength`
  - Contraexemplo: `supabase/functions/create-user-v2/index.ts:384-389` (reativação bypassa RPC); `supabase/schema_baseline.sql:1266` (policy `allow_all` permite UPDATE direto sem constraints)
- **Regressão se:** a constraint de comprimento mínimo for removida — nomes de um caractere poderiam ser armazenados, quebrando lógica que assume `nome` significativo.

### Validação de JWT obrigatória nas Edge Functions

Todas as edge functions de usuário (create/update/list/delete/get-user-v2) devem validar tokens JWT via `validateJWT()` antes de processar qualquer request. O usuário deve estar ativo (`ativo=true`) e não soft-deleted (`deleted_at IS NULL`).

- **Tipo:** invariant
- **Evidência:**
  - `supabase/functions/_shared/auth.ts:25-145` — `validateJWT()` verifica `auth.getUser(token)`, depois consulta a tabela user com `.eq('ativo', true).is('deleted_at', null)`
  - `supabase/functions/create-user-v2/index.ts:268-284` — Step 1: AUTENTICAÇÃO — valida JWT antes de prosseguir
  - `supabase/functions/list-users-v2/index.ts:92-101` — validação de JWT; retorna 401 se `authError` ou nenhum user
- **Regressão se:** uma edge function pular `validateJWT()` ou remover o filtro `.eq('ativo', true)` — usuários inativos contornariam a autenticação.
  > Nota: verdict registrado como `partial` ("verificação falhou"); tratar esta regra como não plenamente confirmada até nova verificação.

### Email único entre usuários ativos

Email deve ser único entre usuários ativos (`deleted_at IS NULL`). Múltiplos soft-deleted users com o mesmo email são permitidos, mas apenas um usuário ativo por email. `create-user-v2` checa isso antes do INSERT.

- **Tipo:** invariant
- **Evidência:**
  - `supabase/migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql:67-77` — `SELECT EXISTS(...WHERE LOWER(u2.email) = LOWER(p_email) AND u2.deleted_at IS NULL)` — só usuários ativos bloqueiam criação
  - `supabase/functions/create-user-v2/index.ts:365-373` — distingue `usuarioAtivo` vs `usuarioSoftDeletado`, lança erro se ativo existe
- **Regressão se:** o filtro `deleted_at` for removido do check de unicidade — recriar um usuário com email soft-deleted falharia mesmo sendo intencionado permitir o reuso.
  > Nota: verdict registrado como `partial` ("verificação falhou"); tratar esta regra como não plenamente confirmada até nova verificação.

---

## Arch Decisions

### Deleção de usuário é soft delete, não hard delete (não garantido por constraints)

`delete_user_v2` faz soft delete em `public.user` (UPDATE `ativo=false`, `deleted_at=NOW()`), mas isso NÃO é garantido por constraints do banco. As Foreign Keys em `dados_vendedor(user_id)` e `notificacao(usuario_id)` usam `ON DELETE CASCADE`, o que deletaria fisicamente as linhas dependentes caso um DELETE direto fosse executado em `public.user`, violando a preservação do audit trail. A promessa de soft-delete depende inteiramente do código de aplicação nunca usar DELETE — o schema em si não a impõe.

- **Tipo:** arch-decision
- **Evidência:**
  - `supabase/migrations/114_create_user_v2_upsert_reactivate_soft_deletes.sql:1-22` — BUG-006/007: `delete_user_v2` faz só soft-delete (`UPDATE ... SET ativo=false, deleted_at=NOW()`), NÃO toca em `auth.users`
  - `supabase/functions/delete-user-v2/index.ts:137-161` — edge function chama RPC `delete_user_v2`, retorna `deleted_at` (indicador de soft delete)
  - Contraexemplo: `supabase/migrations/002_fix_relacoes_fks.sql:22` — `fk_dados_vendedor_user_id` com `ON DELETE CASCADE`; `supabase/migrations/090_notificacoes_v2.sql:11` — `notificacao.usuario_id` com `ON DELETE CASCADE`
- **Regressão se:** a RPC `delete_user_v2` fizer hard delete em vez de soft update — constraints FK quebrariam e o audit trail seria perdido.

### RLS de conta corrente usa allow-all para autenticados (antipadrão)

As tabelas `conta_corrente_cliente` e `pagamento_acordo_cliente` usam policies RLS que permitem acesso indiscriminado com `USING (true)`, `WITH CHECK (true)` para usuários autenticados. A filtragem DEVERIA estar implementada em RLS policies (ex.: `USING (auth.uid() = vendedor_id OR is_backoffice())`), não delegada a RPCs. O padrão atual viola segurança de banco de dados: qualquer autenticado pode ler todas as linhas via acesso direto, ignorando as RPCs que implementam controle de acesso na application layer. Agravante: a Edge Function usa `SERVICE_ROLE_KEY`, que combinado com policies permissivas permite bypass total se acessar as tabelas base em vez das RPCs.

- **Tipo:** arch-decision
- **Evidência:**
  - `supabase/migrations/068_rls_conta_corrente.sql:13-56` — `conta_corrente_cliente`: SELECT/INSERT/UPDATE/DELETE todos usam `USING (true)` para authenticated; lógica delegada à RPC
  - `supabase/migrations/068_rls_conta_corrente.sql:15-23` — comentário: "A lógica de permissão é implementada nas funções RPC, então aqui permitimos acesso geral for authenticated"
  - Contraexemplo: `supabase/migrations/068_rls_conta_corrente.sql:19-23` (SELECT policy `USING (true)` permite qualquer autenticado ler qualquer linha); `supabase/functions/conta-corrente-v2/index.ts:169-171` (Edge Function usa `SERVICE_ROLE_KEY`, contornando RLS se acessar tabelas base diretamente)
- **Regressão se:** a RLS for endurecida para negar acesso autenticado e a filtragem nas RPCs não for atualizada — usuários perdem acesso aos dados de `conta_corrente`.

### Sanitização de input previne XSS/injection (aplicada de forma inconsistente)

Inputs de string SÃO sanitizados via `sanitizeInput()` em `create-user-v2` (email, nome, user_login, permissoes): remove `<>`, `javascript:`, padrões `on*=`; emails são lowercased e trimmed. PORÉM, em `update-user-v2`, campos de objeto complexos (`dadosBancarios`, `contatosAdicionais`) são armazenados como JSONB sem sanitização, permitindo persistir conteúdo potencialmente malicioso se os objetos contiverem strings com scripts. A regra de sanitização é imposta de forma inconsistente entre os caminhos de update da mesma entidade.

- **Tipo:** arch-decision
- **Evidência:**
  - `supabase/functions/create-user-v2/index.ts:225-229` — `sanitizeInput(input)`: `replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '')`
  - `supabase/functions/create-user-v2/index.ts:338-348` — email lowercased+trimmed, nome trimmed, permissoes filtrado para itens não-string
  - Contraexemplo: `supabase/functions/update-user-v2/index.ts:340-341` — `dadosBancarios` e `contatosAdicionais` atribuídos direto sem sanitização, ao contrário de `observacoesInternas` (linha 339) e campos `endereco.*` (linhas 329-337)
- **Regressão se:** a sanitização for removida — usuários poderiam injetar tags `<script>` ou event handlers, causando XSS na UI do backoffice.

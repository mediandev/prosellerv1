# Contrato — Catálogo de Edge Functions

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

Documento gerado a partir de regras verificadas contra o código-fonte das Edge Functions em `supabase/functions/`. Para regras com verdict `partial`, o enunciado abaixo já incorpora o `corrected_statement` (a forma precisa e fiel ao código real).

---

## business-rule

### JWT validation via Bearer token
**Enunciado (corrigido):** All protected Edge Functions (mutações de dados e leitura de dados sensíveis) must validate incoming Authorization header as `Bearer {token}`, extract the token, call `supabase.auth.getUser(token)`, and verify user exists in `user` table with `ativo=true` and `deleted_at IS NULL`. Public/webhook Edge Functions (`entrega-publica-v1`, `TinyEmitirAPI`, `webhook-tiny-atualizacao`) que não requerem JWT devem ter (a) um mecanismo alternativo de validação explícito (ex.: chave de acesso de 44 dígitos) ou (b) um comentário explícito documentando que são intencionalmente públicas e sem autenticação. Data-reading functions (`ref-situacao-v2`, `export-csv`) sem autenticação devem incluir comentário explícito declarando que são públicas.

**Tipo:** business-rule

**Evidência:**
- `supabase/functions/create-user-v2/index.ts:18-58` — validateJWT pattern: checks Authorization header, extracts Bearer token, calls supabase.auth.getUser(token), queries user table com filtros ativo=true e deleted_at IS NULL.
- `supabase/functions/list-users-v2/index.ts:17-51` — padrão idêntico de validação JWT: Bearer extraction, getUser(), user table query com checks active/deleted_at.
- `supabase/functions/pedido-venda-v2/index.ts:18-55` — mesmo padrão nas funções v2, com campo permissoes também carregado.

**Contraexemplo:** `supabase/functions/ref-situacao-v2/index.ts:19-21` — seleciona de `ref_situacao` sem validação JWT nem comentário de endpoint público. Violações similares em `export-csv` (linhas 20-22, usa ANON_KEY e acessa `cliente` sem auth), `ObterListas` (linhas 51-69) e `Criar_Vendedor`.

**Regressão se:** uma função protegida aceita requisições sem Authorization header, pula os checks active/deleted_at, ou aceita tokens inválidos/expirados sem a verificação via `supabase.auth.getUser`.

---

### Public webhook functions accept requests without JWT
**Enunciado (corrigido):** Apenas `webhook-tiny-atualizacao` e `entrega-publica-v1` implementam o padrão no-Authorization com respostas always-200. Porém: (1) `webhook-tiny-atualizacao` NÃO valida webhook timestamp (não existe parsing/validação de timestamp), validando apenas a estrutura do payload; (2) `entrega-publica-v1` GET valida `nfe_chave_acesso`, mas POST aceita qualquer `freteId` sem revalidar contra a `chave_acesso` (lacuna de segurança); (3) outras funções Tiny (`tiny-verificar-pedido-v1`) e de logística (`frete-logistica-v1`) EXIGEM Authorization e retornam status 4xx, provando que o padrão NÃO é universal entre funções webhook/public-driver.

**Tipo:** business-rule

**Evidência:**
- `supabase/functions/webhook-tiny-atualizacao/index.ts:327-390` — sem validação JWT; handler Deno.serve aceita POST/GET direto; sempre retorna status 200 (linhas 376-390) para evitar retry do Tiny.
- `supabase/functions/entrega-publica-v1/index.ts:1-15,44-49` — função pública para motoristas; sem checks de Authorization; usa `chave_acesso` (chave NFe de 44 dígitos) como controle de acesso via query param.

**Contraexemplo:** `supabase/functions/tiny-verificar-pedido-v1/index.ts:26-51` — retorna 405 para não-POST e 401 para Authorization ausente, violando o padrão "always-200, no-auth". `supabase/functions/frete-logistica-v1/index.ts:36-52` — EXIGE Authorization header (linha 39 retorna erro se ausente).

**Regressão se:** a função webhook passa a exigir Authorization header/JWT, ou retorna status não-200 em erro (causando retry loops do Tiny/sistema externo), ou a validação de `chave_acesso` é removida dos endpoints públicos.

---

### Webhook functions validate payload structure, not cryptographic signature
**Enunciado:** O webhook Tiny (`webhook-tiny-atualizacao`) valida a estrutura JSON (`payload.tipo`, `payload.dados`) e as respostas da API Tiny (`retorno.status === 'OK'`), mas NÃO valida assinatura criptográfica do webhook. Depende da unicidade da URL (o Tiny não consegue adivinhar a URL do endpoint) e de ACL/rate limiting.

**Tipo:** business-rule

**Evidência:**
- `supabase/functions/webhook-tiny-atualizacao/index.ts:46-100,370-376` — handlePedido/handleNfe checam estrutura JSON: `dados.id` ou `idVendaTiny` requerido (linha 47), campo `tipo` checado (linha 364), resposta da API Tiny validada `retorno.status === 'OK'` (linha 93), mas sem validação HMAC/signature.

**Regressão se:** o webhook passa a exigir validação de assinatura criptográfica sem documentar como obter o segredo do webhook Tiny, ou a validação de estrutura é removida.

---

### User deletion is soft-delete with deleted_at timestamp
**Enunciado (corrigido):** A regra soft-delete é parcialmente imposta: `delete-user-v2` e a reativação em `create-user-v2` funcionam conforme descrito (soft-delete setando `deleted_at`; reativação setando `deleted_at=null`), MAS a validação de JWT não é consistentemente aplicada. Funções críticas como `get-user-v2` e um padrão base compartilhado (`_shared_helpers.ts`) NÃO filtram soft-deleted users, permitindo acesso a usuários deletados. A proteção depende de qual edge function é invocada — não é uma garantia arquitetural uniforme.

**Tipo:** business-rule

**Evidência:**
- `supabase/functions/create-user-v2/index.ts:365-411` — linhas 365-370: identifica `usuarioSoftDeletado` via `!!u.deleted_at`; linhas 374-410: reativação seta `deleted_at: null` em vez de criar novo usuário.
- `supabase/functions/list-users-v2/index.ts:36` — validação JWT inclui filtro `is('deleted_at', null)` para excluir soft-deleted users.

**Contraexemplo:** `supabase/functions/get-user-v2/index.ts:48-53` — validateJWT não inclui `.is('deleted_at', null)`, permitindo soft-deleted user autenticar. `supabase/functions/_shared_helpers.ts:36-41` — helper base também sem filtro, replicado em 52+ funções.

**Regressão se:** `delete-user-v2` remove linhas em vez de soft-delete, ou a validação JWT pula o filtro `is('deleted_at', null)`, ou `create-user-v2` lança erro em vez de reativar soft-deleted users.

---

### User reactivation sends password reset email, not duplicate auth records
**Enunciado:** Quando `create-user-v2` encontra um soft-deleted user com email correspondente, ele reativa setando `deleted_at=NULL` e `ativo=TRUE`, então chama `supabaseAdmin.auth.resetPasswordForEmail()` para enviar link de acesso. NÃO deve chamar `inviteUserByEmail()` novamente (falharia com 'email already exists'), e deve tratar erros de `resetPasswordForEmail` de forma graciosa.

**Tipo:** business-rule

**Evidência:**
- `supabase/functions/create-user-v2/index.ts:374-411` — linhas 384-390: update seta `deleted_at=NULL` (reativa); linhas 395-400: chama `resetPasswordForEmail`, não `inviteUserByEmail`; linhas 398-399 tratam o erro graciosamente.

**Regressão se:** a reativação chama `inviteUserByEmail` em vez de `resetPasswordForEmail`, ou deleta o registro soft-deleted em vez de limpar `deleted_at`, ou lança em erro de `resetPasswordForEmail` em vez de tratamento gracioso.

---

### Vendor permissions are enumerated whitelist
**Enunciado:** Usuários vendedores só podem receber permissões do conjunto `SUPPORTED_SELLER_PERMISSION_IDS` (`clientes.*`, `vendas.*`, `relatorios.*`, `contacorrente.*`, `produtos.*`, `comissoes.*`). `create-user-v2` deve rejeitar quaisquer permission IDs fora desse whitelist. Usuários backoffice ignoram essa restrição e podem ter quaisquer permissoes.

**Tipo:** business-rule

**Evidência:**
- `supabase/functions/create-user-v2/index.ts:7-28` — `SUPPORTED_SELLER_PERMISSION_IDS` Set com ~27 strings de permissão; linhas 230-238 `sanitizeAndValidatePermissionIds` checa permissões de vendedor contra o whitelist.
- `supabase/functions/create-user-v2/index.ts:346` — permissões de vendedor validadas; backoffice pula validação de whitelist.

**Regressão se:** o whitelist `SUPPORTED_SELLER_PERMISSION_IDS` é removido ou modificado sem migration, vendedores podem receber permission IDs arbitrários, ou usuários backoffice ficam sujeitos à restrição de whitelist.

---

### Webhook functions protected by x-sweep-secret header
**Enunciado (corrigido):** A regra é implementada corretamente para a ÚNICA função chamada por pg_cron (`ssw-sweep-v1`): valida `x-sweep-secret` contra `SSW_SWEEP_SECRET` e retorna 401 conforme especificado, deployada com `--no-verify-jwt` conforme documentado. A regra NÃO é enforçada por CI/RLS/linter. Não há contraexemplos por haver única função pg_cron no repo. Nota de escopo: a documentação menciona `--no-verify-jwt` para o webhook externo `webhook-tiny-atualizacao`, que NÃO é pg_cron e não valida esse secret.

**Tipo:** business-rule

**Evidência:**
- `supabase/functions/ssw-sweep-v1/index.ts:1-27` — comentário indica 'deploy with --no-verify-jwt'; linhas 23-26 checam header `x-sweep-secret` contra env var `SSW_SWEEP_SECRET`, retornam 401 se mismatch.

**Regressão se:** a função é deployada sem `--no-verify-jwt`, ou o check do header secret é removido, ou o valor do header não é comparado ao valor exato da env var, ou 401 não é retornado em mismatch.

---

### Feature flags use strictly 'true' string value convention
**Enunciado (corrigido):** Feature flags `FEATURE_LOG_CRM`, `FEATURE_LOG_CRM_SSW` e `FEATURE_LOG_CRM_AUTO_FRETE` SÃO checadas pelos helpers em `log-crm-feature-flag.ts` usando `=== 'true'` exato. Porém, `FEATURE_SIMPLES_NACIONAL_LOOKUP` em `create-cliente-v2` e `tiny-enviar-pedido-venda-v1` usa `.toLowerCase() === 'true'`. Webhooks/cron jobs (`ssw-sweep-v1`) retornam 200 quando flags OFF (não 503), o que é intencional para idempotência. Operações best-effort (`FEATURE_SIMPLES_NACIONAL_LOOKUP`) não bloqueiam com 503 quando desligadas, apenas pulam a operação. A regra de "MUST return 503" não é aplicada universalmente — apenas em APIs de leitura/escrita críticas (`ssw-tracking-v1`, `frete-logistica-v1`, `origem-frete-v1`, `transportador-logistica-v1`, `regiao-destino-v1`).

**Tipo:** business-rule

**Evidência:**
- `supabase/functions/_shared/log-crm-feature-flag.ts:8-18,20-26` — `isLogCrmFeatureEnabled`, `isLogCrmSswFeatureEnabled`: funções puras checando `value === 'true'` exato, convenção documentada em comentários.
- `supabase/functions/ssw-sweep-v1/index.ts:29-34` — retorna status 200 com mensagem skipped quando flags OFF, não 503 (webhook deve retornar 200).

**Contraexemplo:** `supabase/functions/ssw-sweep-v1/index.ts:29-34` (retorna 200 em vez de 503); `supabase/functions/create-cliente-v2/index.ts:331` (usa `.toLowerCase()`, não `=== 'true'`); `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:403` (usa `.toLowerCase()`, não `=== 'true'`).

**Regressão se:** o check de feature flag usa comparação frouxa (truthy), trata ausência como true, checa a string 'false' como flag ON, ou retorna status HTTP errado (503 para user-facing, 200 para webhooks).

---

## arch-decision

### Business logic via RPC functions, not inline
**Enunciado (corrigido):** ALGUMAS Edge Functions delegam operações a RPC functions (`create_user_v2`, `delete_user_v2`, `list_users_v2`), mas muitas outras realizam modificações diretas de tabela (`.insert`, `.update`, `.delete`) sem delegação a RPC. O padrão é aplicado de forma inconsistente ao longo do codebase.

**Tipo:** arch-decision

**Evidência:**
- `supabase/functions/create-user-v2/index.ts:434-463` — chama `supabase.rpc('create_user_v2', {...})` na linha 441, depois trata permissões separadamente na linha 472.
- `supabase/functions/delete-user-v2/index.ts:137-150` — chama `supabase.rpc('delete_user_v2', {p_user_id, p_deleted_by})` na linha 142.

**Contraexemplo:** `supabase/functions/condicoes-pagamento-v2/index.ts:325-340` (INSERT direto), 442-447 (UPDATE direto), 498-501 (DELETE direto) — todas as operações CRUD contornam o RPC.

**Regressão se:** a camada RPC é contornada e a lógica de negócio é codificada diretamente na Edge Function (updates diretos de tabela), ou a assinatura de uma RPC function muda sem atualizar todos os callers.

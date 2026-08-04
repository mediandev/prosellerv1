# Permissões & Acesso

> Regras de negócio do domínio de usuários, autenticação e autorização.
> Enforcement de CRUD de usuários acontece nas Edge Functions `*-user-v2` e nas
> RPCs (`005_rpc_usuarios_v2.sql`). O gating por *permission IDs*
> (`clientes.visualizar`, `vendas.criar`, etc.) é usado para features/UI — **não**
> para o enforcement do CRUD de usuários, que depende exclusivamente do campo `tipo`.

## Regras de negócio

1. **Apenas backoffice cria, atualiza e deleta usuários.**
   As Edge Functions `create-user-v2`, `update-user-v2` e `delete-user-v2`
   retornam 403 se `user.tipo !== 'backoffice'`.
   *Por quê:* Gerenciamento de usuários determina quem acessa o sistema; permitir
   vendedores quebra a integridade da autenticação/autorização.
   *Regressão:* Um vendedor recebe 200 (em vez de 403) ao chamar create/update/delete-user-v2.

2. **Apenas backoffice altera o campo `permissoes` de qualquer usuário.**
   *Por quê:* Permissões controlam acesso a funcionalidades; permitir vendedores
   escalarem as próprias permissões ou concederem a outros quebra o modelo de autorização.
   *Regressão:* Um vendedor chama update-user-v2 com `permissoes` no body e a mudança é aplicada.

3. **O campo `tipo` só pode ser `'backoffice'` ou `'vendedor'`.**
   Validado nas Edge Functions (whitelist de dois valores) e na RPC.
   *Por quê:* Toda a lógica de autorização depende de apenas dois tipos; novos tipos
   contornariam checagens de permissão.
   *Regressão:* Um usuário é criado/atualizado com `tipo = 'admin'`, `'manager'` ou outro valor.

4. **Email é único entre usuários ativos, mas múltiplos soft-deleted podem compartilhá-lo.**
   *Por quê:* Evita colisão de identidades ativas; soft-deleted com mesmo email
   suportam reativação preservando histórico.
   *Regressão:* Dois usuários ativos com o mesmo email, ou impossibilidade de reativar
   soft-deleted cujo email foi copiado de um ativo.

5. **O campo `nome` deve ter no mínimo 2 caracteres.**
   *Por quê:* Previne nomes incompletos que prejudicam identificação e auditoria.
   *Regressão:* Usuário criado/atualizado com `nome = 'a'` ou vazio.

6. **`permissoes` é sempre armazenado como array JSON (nunca null, nunca objeto).**
   *Por quê:* Simplifica iteração sobre permissões no back e no front; garante tipo consistente.
   *Regressão:* `permissoes` gravado como `{}`, `null` ou string.

7. **Vendedor só visualiza o próprio perfil.**
   `get-user-v2` só retorna dados se o ID solicitado for o do próprio vendedor;
   `list-users-v2` (RPC `list_users_v2`) retorna apenas o próprio perfil quando `tipo='vendedor'`.
   *Por quê:* Dados pessoais (email, admissão, dados bancários) de outros não devem ser
   expostos a vendedores; isolamento aumenta segurança.
   *Regressão:* Vendedor chama get-user-v2 com ID de outro e recebe dados, ou list-users-v2
   retorna mais que o próprio perfil.

8. **Vendedor só atualiza o próprio perfil e nunca muda `tipo` ou `ativo`.**
   *Por quê:* Impede que vendedores se promovam a backoffice ou se desativem; protege o RBAC.
   *Regressão:* Vendedor atualiza outro usuário, ou muda `tipo`/`ativo` no próprio perfil e a mudança persiste.

9. **Exclusão é soft delete (`UPDATE ativo=false, deleted_at=NOW()`), nunca hard delete.**
   *Por quê:* Preserva histórico, auditoria e integridade referencial de clientes e
   comissões atribuídos ao usuário; hard delete quebraria FK e perderia dados.
   *Regressão:* Usuário deletado e registros relacionados desaparecem, ou impossibilidade
   de reativar usuário com soft delete.

10. **Criar usuário sem `auth_user_id` fornecido dispara convite por email (`inviteUserByEmail`), e o `auth_user_id` retornado é salvo.**
    *Por quê:* O usuário precisa da convocação para se autenticar no Supabase Auth.
    *Regressão:* Usuário criado sem `auth_user_id` não recebe convite, ou o `auth_user_id`
    não é registrado no banco.

11. **Criar usuário com email de um soft-deleted existente reativa aquela linha (`UPDATE deleted_at=NULL`) em vez de falhar.**
    Se `permissoes` não for fornecido no request, o valor antigo é preservado (o UPDATE
    de reativação só toca `permissoes` quando o campo vem no body — ver create-user-v2 l.383).
    *Por quê:* Permite reutilizar emails de deletados preservando `user_id` e FKs (ponte
    entre criação e reativação).
    *Regressão:* Criar com email de soft-deleted resulta em 400 "email já cadastrado", ou
    reativar perde o `user_id` original.

12. **Todas as Edge Functions (create/update/delete/list/get-user-v2) exigem JWT válido e usuário ativo (`ativo=true` e `deleted_at IS NULL`) antes de processar.**
    *Por quê:* Só autenticados, ativos e não deletados devem acessar os endpoints; caso
    contrário, um token expirado ou usuário inativo executaria ações.
    *Regressão:* Usuário inativo/deletado chama um endpoint e a requisição é processada (200 em vez de 401/403).

13. **Novos usuários backoffice recebem todas as permissões por padrão** (`clientes.*`, `vendas.*`, `relatorios.*`, `config.*`, `usuarios.*`, `contacorrente.*`, `produtos.*`, `comissoes.*`, `configuracoes.*`).
    *Por quê:* Backoffice é papel administrativo que precisa de acesso total; reduz fricção operacional.
    *Regressão:* Novo backoffice criado com `permissoes = []` sem acesso a nada.

14. **Novos usuários vendedor recebem um subconjunto padrão** (`clientes.visualizar/criar/editar`, `vendas.visualizar/criar/editar`, `produtos.visualizar`, `comissoes.visualizar`, `relatorios.visualizar`, `contacorrente.visualizar/criar`).
    *Por quê:* Vendedores trabalham com clientes, vendas e comissões, mas não devem ter
    acesso por padrão a configurações globais ou dados de todos os vendedores.
    *Regressão:* Novo vendedor recebe todas as permissões de backoffice, ou nenhuma.

15. **Permission IDs de string inválida são deduplicados e (para vendedor) validados contra whitelist.**
    Duplicatas são removidas via `Array.from(new Set(...))`.
    ⚠️ **VIOLAÇÃO CONHECIDA (verificação):** a whitelist só é aplicada a **vendedor**
    (`sanitizeAndValidatePermissionIds` → `SUPPORTED_SELLER_PERMISSION_IDS`). Para
    **backoffice** (create-user-v2 l.346) as permissões passam apenas por
    `filter(typeof === 'string') + sanitizeInput`, **sem** checagem contra whitelist —
    um backoffice consegue salvar IDs inventados (`['fake.id', 'admin.totalpower']`).
    *Por quê (regra desejada):* Prevenir que o cliente injete IDs inexistentes, mantendo
    consistência entre banco e código; a whitelist deveria valer para **ambos** os tipos.
    *Regressão:* `permissoes = ['fake.permission']` (especialmente com `tipo='backoffice'`)
    é salvo no banco.

16. **Permission IDs são sanitizados antes de comparar contra a whitelist** (trim, remove `<>`, `javascript:`, `on*=`).
    *Por quê:* Evita que `'<clientes.visualizar>'` passe na whitelist (já que difere de
    `'clientes.visualizar'`).
    *Regressão:* ID com caracteres especiais (`'<clientes.visualizar>'`) passa na validação e é salvo.

17. **Inputs de string (email, nome, user_login) são sanitizados** (remove `<>`, `javascript:`, `on*=`) antes de salvar.
    *Por quê:* Defesa em profundidade contra XSS/injection, além da constraint de JSONB.
    *Regressão:* Usuário criado com `nome = '<script>alert(1)</script>'` e a tag armazenada literalmente.

18. **A permissão de criar/atualizar/deletar é validada (deve ser backoffice), mas a autoria da auditoria NÃO é persistida no banco.**
    As RPCs `create_user_v2(p_created_by)`, `update_user_v2(p_updated_by)` e
    `delete_user_v2(p_deleted_by)` **aceitam e validam** o parâmetro (verificam que o
    ator é backoffice ativo / tipo correto), mas **não gravam** `created_by`/`updated_by`/`deleted_by`
    em coluna alguma — o parâmetro é usado só para validação e depois descartado.
    ⚠️ **Correção da verificação:** a versão anterior desta regra afirmava que a autoria
    era registrada; isso é **falso**. Não existem colunas de autoria na tabela `user`.
    *Por quê (o que de fato existe):* Garantir que só backoffice execute a operação.
    *Regressão:* Um vendedor consegue criar/atualizar/deletar (falha de validação).
    Ver também Dúvida 4 (existe tabela de auditoria separada?).

19. **⚠️ (VIOLAÇÃO / regra ausente) Reativação de soft-deleted pode mudar o `tipo` sem checagem específica.**
    Em create-user-v2 (l.380) o UPDATE de reativação faz `tipo: sanitizedData.tipo`,
    aplicando o `tipo` vindo do body sem preservar o original nem revalidar. Como só
    backoffice chega a esse caminho, o impacto é limitado, mas permite reativar um
    vendedor soft-deletado **como backoffice** — escalação de privilégio via reativação.
    *Por quê (regra desejada):* Reativação deveria preservar o `tipo` original, ou a
    mudança de tipo deveria exigir validação explícita de backoffice.
    *Regressão:* Reativar soft-deleted vendedor passando `tipo='backoffice'` e a promoção ser aplicada.

## Dúvidas em aberto

1. **`auth_user_id` na reativação.** Na reativação (soft-deleted com mesmo email),
   `resetPasswordForEmail(email)` é chamado por **email**, não por `user_id`. Se a conta
   do Supabase Auth foi hard-deletada, o reset falha (erro capturado) e o `user_id` antigo
   no DB não é sincronizado. O comportamento depende da configuração soft/hard delete do
   Supabase Auth. → **Resolver via cliente:** confirmar a expectativa de reativação quando
   a conta Auth original não existe mais.

2. **`ultimo_acesso` só é atualizado no `get-user-v2`.** Apenas `get-user-v2` (l.60-63)
   faz um UPDATE best-effort em `ultimo_acesso` quando o usuário lê o próprio perfil;
   `update-user-v2` e `list-users-v2` não. É intencional (tracking leve de atividade) ou
   deveria viver em outro lugar? → **Resolver via cliente:** confirmar semântica esperada de `ultimo_acesso`.

3. **Backoffice sem `usuarios.criar` mesmo assim cria usuários.** [RESPONDIDA] Sim, é o
   comportamento atual e intencional: o enforcement de CRUD de usuários usa **apenas**
   `tipo === 'backoffice'`, nunca permission IDs. As permissões `usuarios.*` servem só
   para gating de UI/features. Um backoffice com `usuarios.criar` revogado ainda cria
   usuários. → **Resolvida via código** (create/update/delete-user-v2 checam só `tipo`).

4. **Existe tabela de auditoria separada?** A autoria (`p_created_by`/`p_updated_by`/`p_deleted_by`)
   é validada mas não gravada em colunas na tabela `user` (ver Regra 18). É preciso confirmar
   se há uma tabela de audit log separada que capture quem fez cada operação, ou se a autoria
   é de fato perdida. → **Resolver via cliente/código:** verificar existência de `audit_log`
   ou tabela equivalente.

5. **`update_dados_vendedor_v2` sem validação prévia na Edge Function.** `update-user-v2`
   (l.357) chama a RPC `update_dados_vendedor_v2` sem check de `tipo`/permissão na própria
   Edge Function; a RPC não está em `005_rpc_usuarios_v2.sql`. Se um vendedor conseguir
   chamá-la para **outro** vendedor, é bug. → **Resolver via código:** localizar a migration
   da RPC e confirmar se ela valida `p_user_id = p_updated_by` quando o ator é vendedor.

6. **`first_login` é retornado mas nunca inicializado no CRUD.** [PARCIAL] As RPCs
   retornam `u.first_login`, mas nenhuma função create/update/delete o seta ou reseta;
   fica com valor padrão (NULL/false). Presume-se gerenciado em outro lugar (trigger ou
   cliente/Auth hook). → **Resolver via código:** localizar onde `first_login` é setado
   (trigger no banco ou lógica de login no frontend).

7. **Enforcement de visibilidade de dados (clientes/vendas/comissões) por vendedor.**
   Fora do domínio de usuários. `list_users_v2` só aplica a regra "vendedor → próprio perfil".
   A regra de "vendedor só vê seus próprios clientes/vendas" (se existir) vive nas RPCs de
   clientes/vendas. → **Resolver via código:** analisar as RPCs de clientes/vendas (outro domínio).

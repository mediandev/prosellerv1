# Cliente

## Regras de negócio

1. **Nome (razão social) obrigatório com no mínimo 2 caracteres úteis.** O nome não pode ser vazio, ter menos de 2 caracteres nem conter apenas espaços em branco (a validação desconsidera espaços). A RPC deve rejeitar antes de persistir.
   - *Por quê:* O nome é o identificador principal do cliente; nomes vazios ou irrisórios causam confusão e violam integridade básica de dados.
   - *Regressão:* Aceitar nome vazio, com menos de 2 caracteres ou só espaços; salvar no banco sem validação na RPC.

2. **Exclusão de cliente é soft delete e restrita a backoffice.** Excluir marca `deleted_at` e define `situação = 'Excluído'`; não há hard delete. Vendedores não podem excluir; apenas usuários backoffice executam a exclusão.
   - *Por quê:* Preserva auditoria e histórico; impede que vendedor apague dados de clientes de terceiros; operações críticas ficam com o backoffice.
   - *Regressão:* Vendedor consegue excluir; uso de hard delete; exclusão sem atualizar `situação`; backoffice sem conseguir excluir.

3. **Optante Simples Nacional é cacheado com timestamp; NULL significa "desconhecido".** O valor é buscado na ReceitaWS (CONSOPT) e armazenado em `optante_simples_nacional` junto de `optante_simples_nacional_consultado_em`. `NULL` NÃO é `false` — indica nunca consultado / pessoa física / resultado inconclusivo. Na revalidação ao enviar para o Tiny, se a consulta falhar em empresa dual-mapped, a emissão é bloqueada. O lookup é best-effort e ocorre FORA do `create_cliente_v2` (a RPC de criação não popula esses campos).
   - *Por quê:* Garante regime fiscal correto antes da emissão de nota; `NULL` desconhecido não pode ser tratado como negativo.
   - *Regressão:* Valor não cacheado ou timestamp perdido; lookup nunca disparado; `NULL` tratado como `false`; emissão prossegue com regime desconhecido em empresa dual-mapped.

4. **Condições de pagamento: substituição atômica all-or-nothing.** Quando o array de IDs é enviado, o UPDATE faz `DELETE` de todas as condições existentes e depois `INSERT` das novas. Se o array não é enviado (`NULL`), as condições não são tocadas. Cliente pode existir sem nenhuma condição (array opcional). No INSERT de IDs inexistentes há `ON CONFLICT DO NOTHING` — a linha é ignorada silenciosamente (ver Dúvidas).
   - *Por quê:* Evita estado inconsistente (condições órfãs); o array enviado é a fonte da verdade completa.
   - *Regressão:* Novas condições somadas às existentes em vez de substituir; updates parciais deixando linhas órfãs; ignorar o `DELETE+INSERT` quando o array é enviado.

5. **`ref_tipo_pessoa_id_FK` protegido por FOREIGN KEY e validação explícita; NULL permitido.** `update_cliente_v2` valida explicitamente o ID (`IF EXISTS`) além da constraint FK. `NULL` é aceito (tipo indeterminado).
   - *Por quê:* O tipo de pessoa (Física/Jurídica) define natureza fiscal e validações de documento; a FK garante integridade.
   - *Regressão:* IDs inválidos aceitos; remoção da FK; tipo armazenado como string; remoção da validação no UPDATE.

6. **Empresa de faturamento é nullable e preservada em update parcial.** No UPDATE, `CASE WHEN` preserva o valor atual quando o campo não é enviado. A FK usa `ON DELETE SET NULL`. Diferente de `ref_tipo_pessoa_id`, NÃO há validação explícita `IF EXISTS` — a integridade depende apenas da constraint FK, e um ID inválido gera erro do banco propagado ao frontend (design choice, não bug).
   - *Por quê:* Nem todo cliente tem empresa de faturamento customizada; preservar valor existente é princípio de segurança em updates parciais.
   - *Regressão:* Campo vira NOT NULL; FK removida ou com comportamento alterado; valor sobrescrito para NULL em update parcial.

7. **`desconto_financeiro` e `pedido_minimo`: default 0 no INSERT, preserva no UPDATE.** No INSERT, frontend converte e SQL usa `COALESCE` garantindo 0. No UPDATE, `COALESCE` com o campo atual preserva o valor quando não enviado.
   - *Por quê:* Evita NULL em campos numéricos; INSERT sempre resulta em 0, UPDATE mantém integridade em payload parcial.
   - *Regressão:* NULL armazenado em vez de 0; remoção do `COALESCE` no INSERT; UPDATE usando NULL direto; comparações numéricas quebrando.

8. **`status_aprovacao` limitado por CHECK a 'aprovado' | 'pendente' | 'rejeitado'.** A constraint CHECK está corretamente imposta. **Débito conhecido (bug em produção):** a lógica de atribuição no CREATE deveria ser backoffice→'aprovado' e vendedor→'pendente', mas desde a migration 114/116 ambas as branches atribuem SEMPRE 'aprovado' (migration 007 original estava correta). A regra de workflow está violada no CREATE; a constraint em si continua válida.
   - *Por quê:* Controle de workflow de aprovação — vendedor deveria criar como pendente (requer análise), backoffice como aprovado.
   - *Regressão:* Inserir outros valores; remover a constraint CHECK; transições que não validam o enum. (A correção pendente é fazer o CREATE atribuir 'pendente' para vendedor.)

9. **UPSERT de `cliente_contato` e `cliente_endereço` preserva dados existentes via `COALESCE(NULLIF(novo), tabela.campo)`.** O fallback usa a coluna da tabela, NÃO `EXCLUDED` — updates parciais (campo não reenviado) não apagam dados armazenados.
   - *Por quê:* `EXCLUDED` aponta para o valor vazio proposto, não ao valor armazenado; usar `EXCLUDED` apagaria dados em payload parcial.
   - *Regressão:* Fallback com `EXCLUDED`; campos apagados quando NULL é enviado. (A migration 131 reintroduziu esse bug; corrigido na migration 140.)

10. **Contato e endereço são singleton por cliente (PK = cliente_id), atualizados na mesma RPC.** Cada cliente tem no máximo um `cliente_contato` e um `cliente_endereço`, criados/atualizados por UPSERT na mesma transação. Se nenhum campo desses é fornecido no payload, as tabelas auxiliares não são tocadas (sem DELETE).
    - *Por quê:* Singularidade garantida por PK; transação atômica; enviar payload sem esses campos não deve apagar dados.
    - *Regressão:* Cliente com múltiplos contatos/endereços; `DELETE` chamado quando campos são NULL; tabelas auxiliares fora da transação; endpoints separados.

11. **Empresa de faturamento e grupo: dual mapping `grupo_id` (UUID FK) + `grupo_rede` (TEXT legado).** O UPDATE prioriza `grupo_id` via `CASE WHEN p_grupo_id IS NOT NULL`. A edge function (POST/PUT/CREATE) aplica o padrão de nulificação `p_grupo_rede: grupoId ? null : (body.grupoRede ?? ...)`, então quando o `grupoId` é resolvido para UUID, `grupo_rede` vira NULL. `get_cliente_completo_v2` retorna `grupo_rede_nome` via JOIN. **Ressalva:** a RPC de CREATE (migration 114/116) NÃO aplica `CASE WHEN` para anular `grupo_rede` — se um payload legado enviar ambos os campos, ambos são inseridos (inconsistência com o UPDATE); na prática o frontend sempre resolve `grupoId` e envia `grupo_rede=null`.
    - *Por quê:* Compatibilidade com sistema legado; UUID é a fonte da verdade, texto é fallback de display.
    - *Regressão:* `grupo_id` removido ou nunca populado; `grupo_rede` tratado como primário; `CASE WHEN` virar `COALESCE` (apagaria `grupo_id`); GET sem o JOIN deixando o campo vazio.

12. **`segmento_id` é BIGINT FK nullable para `segmento_cliente.id`; coexiste com `tipo_segmento` (TEXT legado).** Cliente pode não ter segmento (NULL). `get_cliente_completo_v2` inclui `segmento_nome` via LEFT JOIN. São campos DISTINTOS: `tipo_segmento` é legado TEXT (derivado do id como string na edge function), `segmento_id` é a FK moderna; ambos podem estar preenchidos simultaneamente e não há mutex entre eles.
    - *Por quê:* Segmento é atributo opcional; LEFT JOIN permite cliente sem segmento aparecer normalmente (`segmento_nome=NULL`).
    - *Regressão:* `segmento_id` vira NOT NULL; FK torna segmento obrigatório; `segmento_nome` fora do GET; segmento armazenado só como texto.

13. **Mappers usam cadeias de nullish coalescing (`??`) para tolerar variações de schema.** `mapClienteCompleto` e `mapClienteListItem` encadeiam campo legado + novo + variações snake/camelCase (ex.: `grupo_rede_nome ?? grupo_rede ?? grupoRede`).
    - *Por quê:* Compatibilidade retrógrada; suporta variações de schema; previne crash/campo vazio quando o nome legado não vem da RPC.
    - *Regressão:* Cadeias removidas; apenas um nome checado; variações não antecipadas (incidente histórico com `grupo_rede_nome`).

14. **Auditoria e controle de acesso por propriedade: `criado_por` e `atualizado_por`.** Clientes rastreiam criador e último atualizador. `update_cliente_v2` valida autorização: vendedor só edita clientes que criou E apenas enquanto `status_aprovacao = 'aprovado'`; se rejeitado, fica bloqueado. Backoffice edita qualquer cliente.
    - *Por quê:* Auditoria de mudanças; controle de acesso baseado em propriedade para vendedor; backoffice é administrador.
    - *Regressão:* Vendedor editando clientes de terceiros; UPDATE sem validar `criado_por`; `atualizado_por` não registrado.

15. **`requisitos_logisticos` (JSONB) é substituído all-or-nothing via flag `p_set_requisitos_logisticos`.** Se a flag é `false`, o campo não é tocado (`c.requisitos_logisticos`); se `true`, é REPLACE completo (não há merge parcial). A edge function passa `hasValue`, então campo ausente no body é preservado.
    - *Por quê:* Preservação de dados em payload parcial + fonte-da-verdade completa quando o campo é enviado.
    - *Regressão:* Merge parcial silencioso; campo apagado quando não enviado; flag ignorada.

## Dúvidas em aberto

1. **Cliente pode ser criado sem nenhuma condição de pagamento — o negócio quer exigir ao menos uma?** [RESPONDIDA — código] Sim, é permitido criar sem condições: o INSERT só ocorre `IF p_condicoes_pagamento_ids IS NOT NULL AND array_length > 0`. Falta confirmar com o **cliente** se a regra de negócio deveria exigir pelo menos uma condição.

2. **Vendedor fica bloqueado de editar o próprio cliente quando backoffice o rejeita (`status='rejeitado'`) — isso é intencional?** [RESPONDIDA — código] Sim, o bloqueio é por design: `update_cliente_v2` barra vendedor quando `status_aprovacao != 'aprovado'`. Confirmar com o **cliente** se esse é o fluxo desejado.

3. **`requisitos_logisticos` deveria permitir merge parcial de chaves internas em vez de replace total?** [RESPONDIDA — código] Hoje é replace all-or-nothing (sem merge). Confirmar com o **cliente** se o negócio espera edição parcial de subcampos do JSONB.

4. **Bug do `status_aprovacao` no CREATE (sempre 'aprovado') — corrigir para atribuir 'pendente' a vendedor?** [RESPONDIDA — código] Confirmado como bug em produção (migration 114/116; a 007 era correta). Continua sem correção nas migrations posteriores. Ação pendente: reintroduzir `vendedor → 'pendente'` no CREATE.

5. **Referências órfãs em `criado_por`/`atualizado_por` e `vendedoresatribuidos`.** [RESPONDIDA — código, sem FK] Não há constraint FK validando esses UUIDs contra a tabela de usuários; `vendedoresatribuidos` é array simples de UUIDs (`COALESCE(p_vendedoresatribuidos, c.vendedoresatribuidos)`), sem `IF EXISTS`. Se um usuário é deletado depois, a referência fica órfã. Abrir com **cliente/equipe** se é necessário mecanismo de validação/cleanup.

6. **IDs inválidos em `condicoes_pagamento_ids` são engolidos silenciosamente (`ON CONFLICT DO NOTHING`).** [RESPONDIDA — código] O cliente é criado sem as condições pretendidas, sem erro nem alerta. Decidir com **cliente/equipe** se deve validar os IDs antes do INSERT e reportar falha.

7. **Fallback para `tipo_segmento` (legado) quando `segmento_id` é NULL.** [RESPONDIDA — código] Se `tipo_segmento` está preenchido e `segmento_id` é NULL, o GET (que retorna `segmento_nome` via JOIN em `segmento_id`) ignora o campo legado. Confirmar com **cliente/equipe** se é preciso fallback de display para `tipo_segmento`.

8. **UPDATE não anula `grupo_id` quando só `grupo_rede` é enviado.** [RESPONDIDA — código] `update_cliente_v2` usa `CASE WHEN p_grupo_id IS NOT NULL` e não trata `p_grupo_rede`; se o frontend enviar `grupoRede` sem `grupoId` resolvido, o `grupo_id` anterior é mantido. Verificar com **equipe** se o comportamento esperado é anular `grupo_id` nesse caso.

9. **Isolamento de dados / RLS.** [RESPONDIDA — código] Não há RLS de isolamento por empresa/região no nível de tabela; a autorização é funcional dentro das RPCs (via `p_requesting_user_id`). Backoffice enxerga e edita TODOS os clientes; a mesma política vale em dev/staging/prod. Consta como débito de segurança conhecido (políticas `allow_all` ainda neutralizam RLS em prod) — acompanhar com **equipe de segurança**.

10. **[⚠️ PARA O CLIENTE DECIDIR] Qual formato o CEP deve ter?** Descoberto em 2026-07-28 (teste na tela): ao salvar um cliente, o CEP perde o hífen mas mantém o ponto (`13.345-400` → `13.345400`), gerando um formato que não é máscara nem dígito puro. **Bug pré-existente** (a função remove só o hífen), independente da migration 140. **81 registros já corrompidos**; a base tem 4 formatos convivendo: `12.345-678` (533), `12345678` só dígitos (216), `12345-678` (105), `12.345678` corrompido (81).
   - *Decisão necessária:* (a) padronizar em **só dígitos** (`13345400`, mais correto — a tela formata na exibição) ou (b) **manter a máscara** como digitada (`13.345-400`).
   - *Depois da decisão:* corrigir a função + normalizar os 81 (e opcionalmente unificar os demais formatos).
   - *Status:* não bloqueia nada; o CEP segue utilizável. Registrado para não travar a investigação.

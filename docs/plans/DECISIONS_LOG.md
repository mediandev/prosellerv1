# Decisions Log — ProSeller V1

> **Decisões operacionais pequenas** que podem voltar ao debate. ADRs (`docs/decisions/adr/`) são para decisões arquiteturais grandes que devem ser preservadas com argumentação completa.
>
> Use este log quando:
> - A decisão é pequena (regra de validação, escolha de nome, ordem de execução).
> - Provavelmente vai voltar ao debate ("será que ainda faz sentido?").
> - Não precisa de prós/contras nem alternativas detalhadas — uma linha basta.

Para decisões grandes (mudança de stack, modelagem de banco, fluxo de auth, etc.) → ADR.

---

## Formato

| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| `YYYY-MM-DD` | O quê foi decidido (1 frase) | Por quê (1 frase) | Onde afeta (arquivo / módulo / processo) |

---

## Entradas

| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| 2026-05-20 | F-LOG-CRM R-LOG-1 nasce atrás de `FEATURE_LOG_CRM`/`VITE_FEATURE_LOG_CRM` (default OFF) e não toca pedido/Tiny/SSW | Migração gradual do LogCRM Bubble exige isolar tabelas/UI novas até smoke staging verde | 7 tabelas novas, 4 Edge Functions, 5 componentes UI, Page `'logistica'` em App.tsx; commits 1–9 da branch `feat/log-crm-R-LOG-1` |
| 2026-05-20 | Edge Functions novas (`*-v1` da Logística) fazem CRUD direto via supabase-js (`.from(table).insert/update/delete`), sem passar por RPCs `SECURITY DEFINER` como os demais `*-v2` da base | Tabelas são novas e isoladas, sem consumers legados; criar 12+ RPCs (`create/update/delete/list × 4 entidades`) na migration 119 inflaria o SQL em ~3x sem ganho de segurança (auth/tenant scoping já fica no Edge Function via `validateJWT`). Decisão revisitada por R-LOG-3 quando schema for compartilhado com `tiny-enviar-pedido-venda-v1` | `transportador-logistica-v1`, `regiao-destino-v1`, `origem-frete-v1`, `frete-logistica-v1`; documentado no FC F-LOG-1; bloqueia tentação de quebrar o padrão para os `*-v2` legados |
| 2026-05-20 | Item de menu "Logística" entra como Page raiz `'logistica'` gated por `backofficeOnly` + flag, não como sub-aba de Configurações | Configurações é renderizado inline em App.tsx (45 KB de débito); novo Page reduz blast radius e segue padrão de `'tiny-erp'` | `src/App.tsx` (tipo Page, menuItems, pageConfig, switch) |
| 2026-05-20 | **ADR-006 CANCELADA** — integração SSW é pública por chave NFe, sem credenciais por transportadora | Validação direta: doc oficial `ssw.inf.br/ajuda/trackingdanfe.html` + curl real + print do API Connector do Bubble enviado pelo Valentim (campo "Authentication: None or self-handled"); rate limit oficial 20 req/s | Destrava R-LOG-4. Coluna `transportador_logistica.ssw_dominio` da migration 119 permanece apenas como informativa (filtro de dashboard), sem uso técnico |
| 2026-05-27 | F-LOG-CRM R-LOG-3: frete auto-criado nasce com `nfe_numero: null` e `nfe_chave_acesso: null` — preenchimento é etapa futura | `pedido.incluir.php` do Tiny cria pedido de venda, **NÃO emite NFe**; NFe é emitida em passo separado (faturamento) dentro do Tiny; dados de chave/número da NFe não existem neste ponto da API | `tiny-enviar-pedido-venda-v1/index.ts` (hook R-LOG-3); `frete_logistica.nfe_numero`/`nfe_chave_acesso` permanecem nullable |
| 2026-05-27 | F-LOG-CRM R-LOG-3 pode ir direto em prod sem staging Supabase free — risco mitigado por migration DDL aditiva pura + hook behind feature flag `FEATURE_LOG_CRM_AUTO_FRETE` (nasce OFF) | Migration 121 é CREATE UNIQUE INDEX (zero ALTER em tabela existente); hook só dispara com flag ON; smoke em janela controlada (fora do expediente, 1 pedido de teste) | `cursor-brief.md` Tarefa 11; revisitar decisão de staging para R-LOG-5+ se base crescer |
| 2026-05-20 | **ADR-007 pendente** — parser PDF/EDI: próprio (`pdf-parse`) vs. serviço externo (Documind / Mindee) | Custo recorrente + precisão variável por transportadora; precisa amostras (≥ 3 PDFs por grupo) | Bloqueia R-LOG-7 |
| 2026-05-20 | **ADR-008 pendente** — polling SSW: cron Supabase vs. on-demand quando usuário abre detalhe | Bubble parece on-demand (1 chamada por NFe); quota e rate-limit SSW pesam | Bloqueia R-LOG-4 |
| 2026-05-20 | **ADR-009 pendente** — fonte de `valor_cotacao` no MVP: manual (como Bubble) | Integração com tabela de fretes Tiny é overkill no MVP; cliente já preenche manual hoje | Mantido manual em R-LOG-1; revisitar se Valentim pedir |
| 2026-05-20 | F-LOG-CRM R-LOG-1 (migration 119 + 4 Edge Functions) será aplicada **direto em produção** sem passar por staging dedicado, com rede reforçada (pg_dump pré-apply, janela fora do expediente, smoke ampliado, 7 dias de observação com flag OFF antes de cogitar ligar) | Org Median está no plano **Free** do Supabase, sem Branching/staging disponível. Migration 119 é DDL puramente aditivo isolado (zero ALTER em tabela existente, zero DROP); as 7 tabelas novas não têm consumidores em prod; feature flags `FEATURE_LOG_CRM`/`VITE_FEATURE_LOG_CRM` nascem `false`/ausentes (503 + sem menu); rollback trivial (7 DROP TABLE + 4 DROP TYPE + `supabase functions delete`). Histórico: migrations 001..115 já foram aplicadas direto em prod com brief + rollback + smoke. | `docs/plans/cursor-brief.md` Tarefa 8 PROD ONLY (Etapas A migration + B deploy unificadas); revisitar plano Supabase quando R-LOG-3+ (hook em `tiny-enviar-pedido-venda-v1`, classe C) exigir staging real — a partir daí o risco já não cabe mais nessa rede e o upgrade vira pré-requisito |
| 2026-05-21 | `pg_dump` pré-migration 119 **skipado** (desvio do brief Tarefa 8) — execução em horário comercial autorizada com risco aceito | Conexão `pg_dump` via Session Pooler exigia variável `PGPASSWORD` + redes IPv4 e adicionava ~10 min de fricção; rollback de DDL aditivo puro é `DROP TABLE/DROP TYPE` em ordem inversa (não depende do dump pra restaurar nada existente, pois 119 não altera tabela alguma já em uso). MVP urgente — janela operacional comercial autorizada pelo dono do produto após mitigação técnica (lock metadata-only ≤ 1s + flags OFF). | `docs/plans/cursor-brief.md` Tarefa 8 Pré-condição 1 não cumprida — registrado para futura sessão (R-LOG-3+ exige staging + dump completo) |

<!-- Exemplo (comentado): -->
<!-- | 2026-05-19 | Bullet "Novidades em V x.y" sempre no topo do tooltip, anteriores descem | Cliente cobra ver versão mudar a cada entrega | `src/App.tsx` SidebarUserInfo + CLAUDE.md "Toda PR que dispara deploy..." | -->

---

## Quando promover uma linha daqui para ADR

- Quando a decisão começa a guiar 3+ features diferentes.
- Quando a equipe (Cursor / Codex / Claude) precisa explicar o "porquê" repetidamente.
- Quando uma feature nova bate de frente com a regra e exige re-discussão profunda.

Movimentar uma linha para ADR: criar `ADR-NNN-<slug>.md` em `docs/decisions/adr/` e remover a linha desta tabela com nota: "promovido para ADR-NNN".

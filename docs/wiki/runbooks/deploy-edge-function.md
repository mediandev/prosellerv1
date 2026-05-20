# Runbook — Deploy de Edge Function em produção

> **Canal único permitido:** Supabase CLI local (ADR-005). MCP Cursor `deploy_edge_function` está **proibido**.

## Quando usar

Toda vez que código de uma Edge Function muda e precisa subir para produção. Para fluxo normal de feature, o deploy acontece **após o merge da PR em `main`**.

## Pré-condições

- [ ] Código mergeado em `main` (não fazer deploy direto de branch de feature).
- [ ] `git pull` para sincronizar `main` local com remote.
- [ ] Supabase CLI instalado (`npx supabase --version` ou global).
- [ ] Variável `SUPABASE_ACCESS_TOKEN` configurada (`supabase login` se primeira vez).
- [ ] Confirmar visualmente o conteúdo da função a deployar (`cat supabase/functions/<nome>/index.ts | head -40`).
- [ ] Se a função consome env var nova: confirmar que o secret foi cadastrado no painel **antes** do deploy.

## Comando

```bash
git pull
npx supabase functions deploy <nome> --project-ref xxoiqfraeolsqsmsheue
```

Exemplos reais:
- `npx supabase functions deploy clientes-v2 --project-ref xxoiqfraeolsqsmsheue`
- `npx supabase functions deploy tiny-enviar-pedido-venda-v1 --project-ref xxoiqfraeolsqsmsheue`

## Validação pós-deploy

1. **Smoke OPTIONS 200 OK:**
   ```bash
   curl -i -X OPTIONS https://xxoiqfraeolsqsmsheue.supabase.co/functions/v1/<nome> \
     -H "Origin: https://proseller.app.br" \
     -H "Access-Control-Request-Method: POST"
   ```
   Deve retornar `204` ou `200` com headers CORS.
2. **Log no painel Supabase** → Edge Functions → `<nome>` → Logs → versão recém-deployada.
3. **Smoke real do fluxo** se a função for crítica (ex.: `tiny-enviar-pedido-venda-v1` precisa um envio real ou dryRun com vendedor de teste).

## Rollback

- **Plano A — Redeploy da versão anterior** via `git checkout <SHA-anterior> -- supabase/functions/<nome>/` + deploy. Não esquecer de voltar para `main` depois.
- **Plano B — Reverter o merge commit** em `main` (cria commit revert) + deploy do estado revertido.
- **Plano C (apenas para INC tipo INC-001)** — Restaurar versão específica via painel Supabase → Edge Functions → `<nome>` → Versions → "Revert to". Usar só em emergência se Plano A/B não estiverem viáveis.

## Lições registradas

- **INC-001** (2026-04-24) — Cursor MCP publicou stub `// test`. Origem do ADR-005. Nunca mais usar MCP para deploy.
- **INC-002** (2026-04-29) — ReceitaWS client com early-return ficou em produção por dias antes do hotfix. Lição: smoke pós-deploy é obrigatório em mudanças sensíveis.
- **INC-008 / INC-009 / INC-010** — Edge Function só toma efeito após deploy. Bug "corrigido em código" mas sem deploy continua quebrado em prod.

## Referências

- ADR-005 (deploy CLI exclusivo) · TODO §4 ("Automatizar deploy de Edge Functions em GitHub Action ao mergear main" — débito).

# Runbook — Deploy do SPA no Netlify

> Hoje é **manual** (painel Netlify) ou via `netlify` CLI. Sem MCP do Netlify disponível (registrado em `docs/plans/skills-manifest.md §5`).

## Quando usar

Toda vez que o conteúdo de `src/` (frontend React) muda. O bundle precisa subir para o usuário ver a mudança em `proseller.app.br`.

## Pré-condições

- [ ] Código mergeado em `main`.
- [ ] `npm run build` passa localmente (Vite — sem erros).
- [ ] Se a PR é visível ao usuário (mudança em `src/`): **`systemVersion` bumpada** em `src/App.tsx` `SidebarUserInfo` (~linha 142) com bullet novo em "Novidades em V x.y" (ver runbook `bump-system-version.md`).
- [ ] Se a PR também muda backend (Edge Function / migration): **deploy do backend primeiro**, depois Netlify (evita versão visível na UI sem o backend correspondente).

## Caminho A — Painel Netlify

1. Acesse `app.netlify.com` → site `proseller`.
2. "Trigger deploy" → "Deploy site" (rebuild a partir de `main`).
3. Aguarde build verde (Vite + cópia para CDN).
4. URL: `proseller.app.br` (ou `prosaller.netlify.app` como fallback).

## Caminho B — Netlify CLI local

```bash
git pull
npm ci
npm run build
npx netlify deploy --prod --dir=build
```

Pré-requisito: `npx netlify login` (uma vez por máquina).

## Validação pós-deploy

1. Acessar `proseller.app.br` em janela anônima (evitar cache).
2. Login com `lucas.carmo@flowcode.cc` (ver runbook `smoke-pos-deploy-prod.md`).
3. Confirmar **versão no Sidebar** ✨ → tooltip mostra "Novidades em V x.y" com bullet novo.
4. Smoke do fluxo afetado pela PR (cliente, pedido, comissão, etc.).

## Rollback

- **Plano A (painel):** Netlify → Deploys → encontrar deploy anterior verde → "Publish deploy".
- **Plano B (git):** revert do commit em `main` + novo deploy.

## Lições registradas

- **F-004 V 1.27** (2026-05-06) — `clientes-v2` v44 deployado em Supabase, **mas Netlify pendente** — UI da importação não aparecia. Lição: deploy Netlify é parte do ciclo, não opcional.
- **INC-013 V 1.30** (2026-05-07) — fix SQL aplicado em prod via MCP, V 1.30 bumpada, **Netlify pendente** para a UI exibir.
- **INC-014 V 1.31** (2026-05-13) — código mergeado em `main`, deploy da Edge Function pendente.

## Referências

- `docs/plans/skills-manifest.md §5` (gap MCP Netlify).

# Logística & Rastreio SSW

> **Módulo ATIVO em produção.** (A versão anterior deste arquivo marcava tudo como "removido" — foi erro de análise: rodou num checkout local defasado. Os módulos `frete-logistica-helpers.ts`, `ssw-refresh.ts`, `ssw-client.ts`, `ssw-sweep-v1` e `romaneio-logistica-v1` existem em produção e estão no ar.)

## Regras de negócio

1. **Entrega é definitiva ("sticky").** Um frete que chega a `Entregue` (ou `Devolvido - Entregue`) não volta para "Em Trânsito" por causa de evento administrativo posterior (ex.: "Anexado comprovante de entrega complementar").
   - *Por quê:* o comprovante vem depois da entrega; não representa retorno da mercadoria.
   - *Regressão:* frete entregue reaparecendo no card "Em Trânsito".

2. **O status considera o histórico completo de eventos, não só o último.** Se o último evento é administrativo (mapeia para o genérico "Em Trânsito"), o sistema busca o último status definitivo anterior (Entregue/Devolvido/Recusado).
   - *Por quê:* o último lançamento nem sempre é o mais relevante para o status real.
   - *Regressão:* status decidido só pelo último evento.

3. **Frete em status terminal (Entregue, Devolvido - Entregue) não é mais consultado no SSW.**
   - *Por quê:* não há mais evolução a acompanhar; evita chamadas inúteis.
   - *Regressão:* re-consultar frete já finalizado.

4. **O rastreio é atualizado automaticamente a cada 1 hora** por um cron (edge `ssw-sweep-v1`, protegida por secret).
   - *Por quê:* manter Torre de Controle e Kanban atualizados sem ação manual.
   - *Regressão:* rastreio só atualiza quando alguém abre o frete.

5. **O rastreio tem cache de 30 minutos.** Uma nova consulta ao SSW só ocorre se a última for mais antiga que 30 min (salvo botão "Atualizar rastreio", que força).
   - *Por quê:* não martelar a API pública do SSW.
   - *Regressão:* consultar o SSW a cada abertura, sem respeitar o cache.

6. **Cada evento do SSW é mapeado para um status** (ex.: entrega (01) → Entregue; devolução → Devolvido; recusa → Recusado; agendamento → Agendado).
   - *Por quê:* traduzir o rastreio do transportador no status interno do frete.
   - *Regressão:* mudar o mapeamento sem revisar os status resultantes.

7. **Botão "Atualizar" do Kanban varre o rastreio dos fretes visíveis; o botão do detalhe força só aquele frete.**
   - *Por quê:* atualização sob demanda sem sobrecarga (detalhe = 1 chamada; Kanban = os visíveis).
   - *Regressão:* botão do detalhe varrer todos os fretes.

8. **A varredura roda em lotes concorrentes** (até 8 por vez) para não estourar o tempo da função nem o limite do SSW.
   - *Por quê:* varredura sequencial estourava o tempo; lotes respeitam o rate limit (~20 req/s).
   - *Regressão:* voltar a varredura sequencial (risco de timeout).

9. **O rastreio automático só funciona para transportadores na rede SSW** (ex.: Ativa, Favorita). Para os demais, o SSW não retorna dados e nada é alterado.
   - *Por quê:* o SSW só conhece as transportadoras integradas.
   - *Regressão:* marcar frete de transportador fora da rede com base em resposta vazia.

10. **Romaneio mostra as notas em separação (e aguardando coleta) que ainda não estão em nenhum romaneio;** filtro por transportador é opcional. Ao gerar o romaneio, os fretes vão para "Em Trânsito".
    - *Por quê:* romaneio agrupa o que ainda não foi expedido.
    - *Regressão:* mostrar notas já romaneadas, ou não excluir as já usadas.

11. **O módulo de logística é controlado por feature flags** (`FEATURE_LOG_CRM` e `FEATURE_LOG_CRM_SSW`); desligadas, o módulo não opera.
    - *Por quê:* permite ligar/desligar a feature sem remover código.
    - *Regressão:* comportamento de logística fora do controle das flags.

## Dúvidas em aberto

- **Exclusão de ocorrência é soft ou hard?** Hoje o refresh apaga e reinsere as ocorrências do frete — confirmar se é o comportamento desejado.
- **Data de entrega no auto-resolve.** Ao marcar "Entregue" pela varredura, a data usada é a do último evento (pode ser o comprovante), não a do "Mercadoria Entregue" — corrigir para a data real da entrega?
- **Concorrência de 8 na varredura** aguenta o crescimento da base de fretes ou vira gargalo? (observar em produção)

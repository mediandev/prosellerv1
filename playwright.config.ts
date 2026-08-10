import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de tela do ProSeller.
 *
 * ⚠️ RODAM CONTRA PRODUÇÃO. Não existe ambiente de homologação neste projeto.
 * Por isso todos os casos são SOMENTE LEITURA: entram no sistema, abrem telas e
 * conferem o que aparece. Nenhum cria pedido, salva cliente ou emite nota.
 *
 * Isso é decisão de desenho, não limitação temporária. Um teste que salva
 * cliente em produção para verificar se os campos sobrevivem PODE CAUSAR a
 * própria perda de dados que deveria detectar. Essa verificação existe, mas no
 * banco descartável: `npm run test:db`.
 *
 * Credenciais vêm do ambiente. Sem elas, os testes são pulados em vez de falhar
 * — assim o CI de quem não tem acesso não fica vermelho por engano.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,        // sessão única contra produção: sem concorrência
  retries: 1,                  // rede/deploy em andamento merecem uma segunda chance
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.PROSELLER_URL ?? 'https://proseller.app.br',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

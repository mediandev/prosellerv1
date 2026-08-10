import { Page, expect } from '@playwright/test';

export const EMAIL = process.env.PROSELLER_EMAIL ?? '';
export const SENHA = process.env.PROSELLER_SENHA ?? '';

/** Sem credencial, os testes são pulados — não falhados. Ver playwright.config.ts. */
export const TEM_CREDENCIAL = Boolean(EMAIL && SENHA);

/**
 * Entra no sistema e espera o menu aparecer.
 *
 * `rota` abre direto numa tela (ex.: 'clientes'), pelo mesmo link que os e-mails
 * da sentinela usam. Isso exercita o caminho do link junto — ele já quebrou duas
 * vezes (V 1.90 e V 1.91), sempre porque o login sobrescrevia a tela pedida.
 */
export async function entrar(page: Page, rota?: string) {
  await page.goto(rota ? `/#/${rota}` : '/');

  const email = page.getByRole('textbox', { name: 'Email' });
  if (await email.isVisible().catch(() => false)) {
    await email.fill(EMAIL);
    await page.getByRole('textbox', { name: 'Senha' }).fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();
  }

  await expect(page.locator('nav button').first()).toBeVisible({ timeout: 30_000 });
}

/** Abre uma tela pelo menu lateral. */
export async function abrirTela(page: Page, nome: string) {
  await page.locator('nav button', { hasText: new RegExp(`^${nome}`) }).first().click();
  await page.waitForTimeout(1500);
}

/**
 * Falha se a tela estourou. Ignora ruído conhecido que não indica quebra:
 * o app fala com serviços externos e nem todo aviso é defeito nosso.
 */
export async function semErroNaTela(page: Page) {
  await expect(page.getByText(/Something went wrong|Erro ao carregar a aplica/i))
    .toHaveCount(0);
}

/** Texto visível da página inteira — usado nas conferências de conteúdo. */
export const texto = (page: Page) => page.locator('body').innerText();

/**
 * Espera a tabela ter pelo menos uma linha antes de ler.
 *
 * Sem isto os testes leem a tela antes de os dados chegarem, veem zero linhas e
 * falham por engano — passando só no retry. Teste que depende de sorte dá alarme
 * falso e treina o time a reexecutar em vez de investigar.
 */
export async function esperarTabela(page: Page, minimo = 1) {
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => page.locator('table tbody tr').count(), { timeout: 30_000 })
    .toBeGreaterThanOrEqual(minimo);
}

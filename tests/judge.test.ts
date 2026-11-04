// Roda a página de autoteste num navegador de verdade: o corretor depende de iframes, layout e Web Workers.
// Usa o Edge no Windows e o Chrome nos outros sistemas. BROWSER_CHANNEL troca o navegador.
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { expect, it } from 'vitest';

interface SelfTest {
  done: boolean;
  checked: number;
  failures: { slug: string; problem: string }[];
}

const channel = process.env.BROWSER_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : 'chrome');

it('cada solução passa, e cada armadilha e código inicial é reprovado', async () => {
  const server = await createServer({ logLevel: 'error', server: { port: 0 } });
  await server.listen();
  const browser = await chromium.launch({ channel });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error(error));
    // ONLY=slug1,slug2 roda só esses problemas.
    const only = process.env.ONLY ? `?only=${encodeURIComponent(process.env.ONLY)}` : '';
    await page.goto(`${server.resolvedUrls!.local[0]}selftest.html${only}`);
    await page.waitForFunction(() => (window as unknown as { __selftest?: SelfTest }).__selftest?.done, null, {
      timeout: 15 * 60_000,
      polling: 1000,
    });
    const result = await page.evaluate(() => (window as unknown as { __selftest: SelfTest }).__selftest);
    expect(result.failures.map((f) => `${f.slug}: ${f.problem}`)).toEqual([]);
    expect(result.checked).toBeGreaterThan(0);
  } finally {
    await browser.close();
    await server.close();
  }
}, 20 * 60_000);

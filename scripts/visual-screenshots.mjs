import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';

const URL = process.env.FLAG_URL ?? 'http://127.0.0.1:4173/flag-game/';
const OUT = process.argv[2] ?? '/opt/cursor/artifacts/screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, contextOptions, fn) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /vs Hunter/ }).click();
  await page.waitForSelector('.play-shell');
  await page.waitForTimeout(600);
  if (fn) await fn(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  const notes = await page.evaluate(() => ({
    logo: Boolean(document.querySelector('.play-header .home-link-img, .play-header img')),
    youScore: document.querySelector('.hud-you .hud-value')?.textContent,
    oppScore: document.querySelector('.opponent-score')?.textContent,
    drawLabel: document.querySelector('.action-draw')?.textContent?.trim(),
    passBtn: document.querySelector('.action-pass') != null,
    oppCount: document.querySelector('.opponent-count')?.textContent ?? null,
    toasts: [...document.querySelectorAll('.toast')].map(t => t.textContent),
    cornerTokens: document.querySelectorAll('.corner-token').length,
    marketWidth: document.querySelector('.market-row-inner')?.getBoundingClientRect().width,
    boardWidth: document.querySelector('.board')?.getBoundingClientRect().width,
  }));
  console.log(name, JSON.stringify(notes));
  await context.close();
}

await shot('phone-390', {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['iPhone 13'].userAgent,
});

await shot('desktop-1280', {
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
});

await browser.close();

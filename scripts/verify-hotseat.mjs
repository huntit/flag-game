// Hotseat check: the pass-the-phone interstitial must appear between turns, and
// only the active seat's letters may ever be on screen.
import { chromium, devices } from 'playwright';

const URL = process.env.WORDHEIST_URL ?? 'http://localhost:4173/wordheist-game/';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['iPhone 13'].userAgent,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));

const problems = [];

const snapshot = () =>
  page.evaluate(() => ({
    handover: Boolean(document.querySelector('.handover')),
    handoverText: document.querySelector('.handover h1')?.textContent ?? null,
    seatLabel: document.querySelector('.hud-you .hud-key')?.textContent ?? null,
    // The rack has no visible caption; whose it is comes from the seat colour
    // it is painted in, plus the tray's accessible name.
    rackLabel: document.querySelector('.rack-tray')?.getAttribute('aria-label') ?? null,
    myLetters: [...document.querySelectorAll('.rack-row .tray-tile .tile-letter')].map(s => s.textContent),
    opponentLabel: document.querySelector('.opponent-name')?.textContent ?? null,
    opponentCount: document.querySelector('.opponent-count')?.textContent.trim() ?? null,
    opponentLetters: [...document.querySelectorAll('.opponent-inner .tile-letter')].map(s => s.textContent),
    opponentBacks: document.querySelectorAll('.opponent-back').length,
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
  }));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Hotseat/ }).click();
await page.waitForSelector('.play-shell');
await page.waitForTimeout(300);

const p1 = await snapshot();
console.log('first seat turn:', JSON.stringify(p1));
// Seats are named by their colour, never "P1"/"P2" — see moveLog.test.ts.
if (p1.seatLabel !== 'Teal') problems.push(`expected to start on Teal, got ${p1.seatLabel}`);
if (p1.opponentLabel !== 'Terracotta') problems.push(`expected opponent Terracotta, got ${p1.opponentLabel}`);
if (p1.opponentLetters.length > 0) problems.push('P2 letters visible during P1 turn');
if (p1.opponentBacks < 1) problems.push('opponent rack backs missing');

// Take a turn as P1 so the seat changes.
const market = page.locator('.market-row .tray-tile');
await market.nth(0).click();
await market.nth(1).click();
await page.waitForTimeout(120);
if (await page.locator('.action-draw').isDisabled()) {
  // A blank take is a single tile, which is legal on its own.
  await market.nth(1).click();
  await page.waitForTimeout(120);
}
await page.locator('.action-draw').click();
await page.waitForTimeout(400);

const between = await snapshot();
console.log('between turns:', JSON.stringify({ handover: between.handover, text: between.handoverText }));
if (!between.handover) problems.push('no pass-the-phone interstitial between turns');
if (!/Terracotta/.test(between.handoverText ?? '')) {
  problems.push(`interstitial should name Terracotta, got ${between.handoverText}`);
}
if (between.myLetters.length > 0) problems.push('rack letters visible on the handover screen');
if (between.scrollH > between.clientH) problems.push('handover screen overflows');

await page.getByRole('button', { name: /^Ready$/ }).click();
await page.waitForTimeout(300);

const p2 = await snapshot();
console.log('second seat turn:', JSON.stringify(p2));
if (p2.seatLabel !== 'Terracotta') problems.push(`expected Terracotta after handover, got ${p2.seatLabel}`);
if (p2.opponentLabel !== 'Teal') problems.push(`expected opponent Teal, got ${p2.opponentLabel}`);
if (p2.opponentLetters.length > 0) problems.push('Teal letters visible during Terracotta turn');
if (!/Terracotta/.test(p2.rackLabel ?? '')) {
  problems.push(`rack should be announced as Terracotta's, got ${p2.rackLabel}`);
}
if (p2.myLetters.length === 0) problems.push('P2 has no visible letters on their own turn');
if (p2.opponentBacks !== 4) {
  // P1 drew 2 on top of their opening 2.
  problems.push(`expected 4 facedown backs for P1, got ${p2.opponentBacks}`);
}
if (p2.scrollH > p2.clientH) problems.push('play screen overflows on P2 turn');

if (errors.length) problems.push(`console errors: ${errors.join(' | ')}`);

await browser.close();
console.log(problems.length ? `\nFAIL:\n - ${problems.join('\n - ')}` : '\nHotseat verified clean');
process.exit(problems.length ? 1 : 0);

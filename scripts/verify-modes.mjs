// Every menu mode must open and land on a playable, non-scrolling screen.
import { chromium, devices } from 'playwright';

const URL = process.env.WORDHEIST_URL ?? 'http://localhost:4173/wordheist-game/';

const modes = [
  { button: /vs Hunter/, opponent: 'Hunter' },
  { button: /^Hotseat/, opponent: 'Terracotta' },
  { button: /vs Greedy/, opponent: 'Greedy' },
  { button: /vs Sleeper/, opponent: 'Sleeper' },
];

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

for (const mode of modes) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: mode.button }).click();
  await page.waitForSelector('.play-shell');
  await page.waitForTimeout(350);

  const state = await page.evaluate(() => ({
    opponent: document.querySelector('.opponent-name')?.textContent ?? null,
    opponentCount: document.querySelector('.opponent-count')?.textContent.trim() ?? null,
    opponentLetters: [...document.querySelectorAll('.opponent-inner .tile-letter')].length,
    myTiles: document.querySelectorAll('.rack-row .tray-tile').length,
    // Five slots: three face up, two face down.
    marketTiles: document.querySelectorAll('.market-row .tray-tile').length,
    marketFaceUp: document.querySelectorAll('.market-tile:not(.is-facedown)').length,
    marketFaceDown: document.querySelectorAll('.market-tile.is-facedown').length,
    boardCells: document.querySelectorAll('.board-cell').length,
    buttons: [...document.querySelectorAll('.action-draw, .action-play, .action-shuffle')].map(b => ({
      label: (b.getAttribute('aria-label') || b.textContent || '').trim(),
      disabled: b.disabled,
    })),
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
    actionsBottom: Math.max(
      ...[...document.querySelectorAll('.action-draw, .action-play, .action-shuffle')].map(b => b.getBoundingClientRect().bottom)
    ),
    innerH: window.innerHeight,
    centreStar: Boolean(document.querySelector('.board-cell.is-centre .cell-mark')),
    // Who plays first is randomised, so half these runs open on the AI's turn
    // and the whole board is correctly inert.
    yourTurn: Boolean(document.querySelector('.score-card.hud-you.is-active')),
    livePost: document.querySelector('.hud-flag')?.textContent ?? null,
  }));

  console.log(`${mode.opponent}:`, JSON.stringify(state));

  if (state.opponent !== mode.opponent) problems.push(`${mode.opponent}: opponent shown as ${state.opponent}`);
  if (state.opponentLetters !== 0) problems.push(`${mode.opponent}: opponent letters rendered`);
  if (state.myTiles < 2 || state.myTiles > 3) problems.push(`${mode.opponent}: opening rack should be 2–3, got ${state.myTiles}`);
  if (state.marketTiles !== 5) problems.push(`${mode.opponent}: market should be 5, got ${state.marketTiles}`);
  if (state.marketFaceUp !== 3) problems.push(`${mode.opponent}: 3 face-up expected, got ${state.marketFaceUp}`);
  if (state.marketFaceDown !== 2) problems.push(`${mode.opponent}: 2 face-down expected, got ${state.marketFaceDown}`);
  if (state.boardCells !== 81) problems.push(`${mode.opponent}: board should be 9x9=81 cells, got ${state.boardCells}`);
  if (!state.centreStar) problems.push(`${mode.opponent}: centre star not shown on an empty board`);

  const byLabel = Object.fromEntries(state.buttons.map(b => [b.label, b.disabled]));
  if (byLabel['Draw 2'] === false) problems.push(`${mode.opponent}: Draw 2 enabled with no market selection`);
  if (byLabel.Play === false) problems.push(`${mode.opponent}: Play enabled with nothing placed`);
  if ('Pass' in byLabel) problems.push(`${mode.opponent}: Pass button must not exist`);
  // Icon-only button: its purpose lives in the accessible name. Only assert
  // it is live when it is actually your turn.
  if (state.yourTurn && byLabel['Shuffle your tiles'] !== false) {
    problems.push(`${mode.opponent}: Shuffle disabled on your own turn`);
  }
  if (!state.yourTurn && byLabel['Shuffle your tiles'] !== true) {
    problems.push(`${mode.opponent}: Shuffle live during the opponent's turn`);
  }
  if (state.scrollH > state.clientH) problems.push(`${mode.opponent}: document overflows`);
  if (state.actionsBottom > state.innerH) problems.push(`${mode.opponent}: buttons below the fold`);
}

// The remote screen must open without error too.
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Remote 2-player/ }).click();
await page.waitForTimeout(250);
const remote = await page.evaluate(() => ({
  heading: document.querySelector('h1')?.textContent ?? null,
  scrollH: document.documentElement.scrollHeight,
  clientH: document.documentElement.clientHeight,
}));
console.log('remote:', JSON.stringify(remote));
if (!/Remote/.test(remote.heading ?? '')) problems.push('remote screen did not open');
if (remote.scrollH > remote.clientH) problems.push('remote screen overflows the page');

if (errors.length) problems.push(`console errors: ${errors.join(' | ')}`);

await browser.close();
console.log(problems.length ? `\nFAIL:\n - ${problems.join('\n - ')}` : '\nAll modes verified clean');
process.exit(problems.length ? 1 : 0);

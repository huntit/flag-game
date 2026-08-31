// Every menu mode must open and land on a playable, non-scrolling screen.
import { chromium, devices } from 'playwright';

const URL = process.env.FLAG_URL ?? 'http://localhost:4173/flag-game/';

const modes = [
  { button: /vs Hunter/, opponent: 'Hunter' },
  { button: /^Hotseat/, opponent: 'P2' },
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
    marketTiles: document.querySelectorAll('.market-row .tray-tile').length,
    boardCells: document.querySelectorAll('.board-cell').length,
    buttons: [...document.querySelectorAll('.actions .action-button')].map(b => ({
      label: b.textContent.trim(),
      disabled: b.disabled,
    })),
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
    actionsBottom: Math.max(
      ...[...document.querySelectorAll('.actions .action-button')].map(b => b.getBoundingClientRect().bottom)
    ),
    innerH: window.innerHeight,
    centreStar: Boolean(document.querySelector('.board-cell.is-centre .cell-mark')),
    livePost: document.querySelector('.hud-flag')?.textContent ?? null,
  }));

  console.log(`${mode.opponent}:`, JSON.stringify(state));

  if (state.opponent !== mode.opponent) problems.push(`${mode.opponent}: opponent shown as ${state.opponent}`);
  if (state.opponentLetters !== 0) problems.push(`${mode.opponent}: opponent letters rendered`);
  if (!/^2\s*tiles/i.test(state.opponentCount ?? '')) problems.push(`${mode.opponent}: opening count should be 2, got ${state.opponentCount}`);
  if (state.myTiles !== 2) problems.push(`${mode.opponent}: own opening rack should be 2, got ${state.myTiles}`);
  if (state.marketTiles !== 4) problems.push(`${mode.opponent}: market should be 4, got ${state.marketTiles}`);
  if (state.boardCells !== 121) problems.push(`${mode.opponent}: board should be 11x11=121 cells, got ${state.boardCells}`);
  if (!state.centreStar) problems.push(`${mode.opponent}: centre star not shown on an empty board`);
  if (!['NW', 'NE', 'SE', 'SW'].includes(state.livePost ?? '')) problems.push(`${mode.opponent}: live post ${state.livePost}`);
  if (state.scrollH > state.clientH) problems.push(`${mode.opponent}: document overflows`);
  if (state.actionsBottom > state.innerH) problems.push(`${mode.opponent}: buttons below the fold`);

  const byLabel = Object.fromEntries(state.buttons.map(b => [b.label, b.disabled]));
  // Turn one: nothing selected, so only Shuffle has a reason to be pressed.
  if (byLabel.Draw === false) problems.push(`${mode.opponent}: Draw enabled with no market selection`);
  if (byLabel.Play === false) problems.push(`${mode.opponent}: Play enabled with nothing placed`);
  if (byLabel.Pass === false) problems.push(`${mode.opponent}: Pass enabled outside the stuck case`);
  if (byLabel.Shuffle !== false) problems.push(`${mode.opponent}: Shuffle disabled on your own turn`);
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

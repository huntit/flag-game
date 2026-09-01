// Screenshots of the live Pages deployment at an iPhone viewport.
import { chromium, devices } from 'playwright';

const URL = process.env.FLAG_URL ?? 'https://huntit.github.io/flag-game/';
const OUT = process.argv[2] ?? '/opt/cursor/artifacts';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['iPhone 13'].userAgent,
});
const page = await context.newPage();

const cell = (r, c) => page.locator(`.board-cell[data-row="${r}"][data-col="${c}"]`);
const rack = () => page.locator('.rack-row .tray-tile');
const third = () => page.locator('.action-shuffle');

const read = () =>
  page.evaluate(() => ({
    rack: [...document.querySelectorAll('.rack-row .tray-tile .tile-letter')].map(s => s.textContent),
    toast: document.querySelector('.toast')?.textContent,
    playEnabled: !document.querySelector('.action-play')?.disabled,
    tiles: document.querySelectorAll('.board-tile').length,
  }));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT}/screenshot_live_menu.png` });

await page.getByRole('button', { name: /vs Hunter/ }).click();
await page.waitForSelector('.play-shell');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/screenshot_live_fresh_game_no_scroll.png` });

async function clearPending() {
  if ((await third().textContent())?.trim() === 'Clear') await third().click();
  await page.waitForTimeout(60);
}

async function tryWord(cells) {
  const n = await rack().count();
  if (n < cells.length) return null;
  const arrangements = [];
  const build = (chosen, left) => {
    if (chosen.length === cells.length) return void arrangements.push([...chosen]);
    for (let i = 0; i < left.length; i++) build([...chosen, left[i]], [...left.slice(0, i), ...left.slice(i + 1)]);
  };
  build([], [...Array(n).keys()]);
  for (const a of arrangements) {
    await clearPending();
    for (let i = 0; i < cells.length; i++) {
      const remaining = await rack().count();
      if (!remaining) break;
      await rack().nth(Math.min(a[i], remaining - 1)).click();
      await cell(cells[i][0], cells[i][1]).click();
    }
    await page.waitForTimeout(70);
    const s = await read();
    if (s.playEnabled) return s;
  }
  await clearPending();
  return null;
}

let hit = null;
for (let round = 0; round < 10 && !hit; round++) {
  const board = await read();
  if (board.tiles === 0) {
    for (const cells of [[[6, 6], [6, 7]], [[6, 5], [6, 6]], [[6, 6], [7, 6]], [[5, 6], [6, 6]]]) {
      hit = await tryWord(cells);
      if (hit) break;
    }
  } else {
    const occupied = await page.evaluate(() =>
      [...document.querySelectorAll('.board-cell')]
        .filter(c => c.querySelector('.board-tile'))
        .map(c => [Number(c.dataset.row), Number(c.dataset.col)])
    );
    const spots = [];
    for (const [r, c] of occupied) {
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 1 || nr > 11 || nc < 1 || nc > 11) continue;
        if (occupied.some(([or, oc]) => or === nr && oc === nc)) continue;
        if (spots.some(([sr, sc]) => sr === nr && sc === nc)) continue;
        spots.push([nr, nc]);
      }
    }
    for (const s of spots.slice(0, 30)) {
      hit = await tryWord([s]);
      if (hit) break;
    }
  }
  if (!hit) {
    const market = page.locator('.market-row .tray-tile');
    if (await market.count()) {
      await market.nth(0).click();
      if ((await market.count()) > 1) await market.nth(1).click();
      await page.waitForTimeout(90);
      if (!(await page.locator('.action-draw').isDisabled())) {
        await page.locator('.action-draw').click();
        await page.waitForTimeout(1500);
      }
    }
  }
}

if (hit) {
  console.log('valid placement:', hit.toast);
  await page.screenshot({ path: `${OUT}/screenshot_live_valid_word_play_enabled.png` });
  await page.locator('.action-play').click();
  await page.waitForTimeout(2600); // let the AI reply
  const after = await read();
  console.log('after AI reply:', after.toast, `${after.tiles} tiles on board`);
  await page.screenshot({ path: `${OUT}/screenshot_live_after_ai_turn.png` });
} else {
  console.log('no legal play found for the screenshot pass');
}

await browser.close();

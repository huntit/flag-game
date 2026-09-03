// Drives a real game through the UI at an iPhone viewport: tap-to-place a legal
// word, confirm Play only enables when the placement is legal, play it, and let
// the AI respond. Screenshots the result so board tiles can be judged at true
// device pixels.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';

const URL = process.env.WORDHEIST_URL ?? 'http://localhost:4173/wordheist-game/';
const OUT = process.argv[2] ?? '/tmp/shots';
mkdirSync(OUT, { recursive: true });

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

const cell = (row, col) => page.locator(`.board-cell[data-row="${row}"][data-col="${col}"]`);
const rackTiles = () => page.locator('.rack-row .tray-tile');
const actionButton = name => page.locator(`.action-${name}`);
const thirdButton = () => page.locator('.action-shuffle');

const readState = () =>
  page.evaluate(() => ({
    you: document.querySelector('.hud-you .hud-value')?.textContent,
    flag: document.querySelector('.hud-flag')?.textContent,
    oppCount: document.querySelector('.opponent-count')?.textContent.trim(),
    rack: [...document.querySelectorAll('.rack-row .tray-tile .tile-letter')].map(s => s.textContent),
    // Identity, not letters: a rack of I E E can be genuinely reordered and
    // still spell the same thing.
    rackIds: [...document.querySelectorAll('.rack-row .tray-tile')].map(t => t.dataset.tileId),
    toast: document.querySelector('.toast')?.textContent,
    playEnabled: !document.querySelector('.action-play')?.disabled,
    drawEnabled: !document.querySelector('.action-draw')?.disabled,
    passEnabled: document.querySelector('.action-pass') != null,
    boardTiles: [...document.querySelectorAll('.board-cell')]
      .map(c => {
        const letter = c.querySelector('.board-tile .tile-letter')?.textContent;
        if (!letter) return null;
        return {
          row: Number(c.dataset.row),
          col: Number(c.dataset.col),
          letter,
          value: c.querySelector('.board-tile .tile-value')?.textContent ?? null,
        };
      })
      .filter(Boolean),
  }));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /vs Hunter/ }).click();
await page.waitForSelector('.play-shell');
await page.waitForTimeout(400);

const problems = [];
const start = await readState();
console.log('start:', JSON.stringify(start));

if (start.passEnabled) problems.push('Pass button must not exist');
if (start.drawEnabled) problems.push('Draw is enabled before any market tile is picked');
if (start.playEnabled) problems.push('Play is enabled with nothing placed');

// Shuffle must reorder without changing which letters are held.
await rackTiles().first().waitFor();
for (let i = 0; i < 3; i++) {
  const before = await readState();
  await thirdButton().click();
  await page.waitForTimeout(120);
  const after = await readState();
  if ([...before.rack].sort().join('') !== [...after.rack].sort().join('')) {
    problems.push(`shuffle changed the letters: ${before.rack} -> ${after.rack}`);
  }
  if (before.rackIds.length > 1 && before.rackIds.join() === after.rackIds.join()) {
    problems.push(`shuffle did not reorder: ${before.rackIds.join()}`);
  }
}
console.log('shuffle: letters preserved, order changed on every tap');

async function clearPending() {
  // The button is icon-only, so its purpose lives in the accessible name.
  const label = (await thirdButton().getAttribute('aria-label'))?.trim();
  if (label === 'Clear') await thirdButton().click();
  await page.waitForTimeout(70);
}

/** Try every arrangement of rack tiles across `cells`; stop when Play lights up. */
async function tryWord(cells) {
  const count = await rackTiles().count();
  if (count < cells.length) return null;

  const arrangements = [];
  const build = (chosen, remaining) => {
    if (chosen.length === cells.length) {
      arrangements.push([...chosen]);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      build([...chosen, remaining[i]], [...remaining.slice(0, i), ...remaining.slice(i + 1)]);
    }
  };
  build([], [...Array(count).keys()]);

  for (const arrangement of arrangements) {
    await clearPending();
    for (let i = 0; i < cells.length; i++) {
      const remaining = await rackTiles().count();
      if (remaining === 0) break;
      await rackTiles().nth(Math.min(arrangement[i], remaining - 1)).click();
      await cell(cells[i][0], cells[i][1]).click();
    }
    await page.waitForTimeout(80);
    const state = await readState();
    if (state.playEnabled) return state;
  }
  await clearPending();
  return null;
}

async function drawTwo() {
  const market = page.locator('.market-row .tray-tile');
  const n = await market.count();
  if (n === 0) return;
  await market.nth(0).click();
  await page.waitForTimeout(60);
  if (n > 1 && !(await readState()).drawEnabled) await market.nth(1).click();
  else if (n > 1) await market.nth(1).click();
  await page.waitForTimeout(80);
  if (!(await readState()).drawEnabled) return;
  await actionButton('draw').click();
  await page.waitForTimeout(1500); // let the AI take its turn
}

// The board is the variant's, not a constant: the phone game is 9x9 with its
// centre star at (5,5), the large-shell game 11x11 with it at (6,6). An opening
// play has to cover the star, so every opening cell here is placed relative to
// it — hard-coding (6,6) made every opening attempt illegal on the phone.
const boardSize = await page.evaluate(() =>
  Number(getComputedStyle(document.querySelector('.play-shell')).getPropertyValue('--board-cells'))
);
const mid = (boardSize + 1) / 2;
console.log(`board: ${boardSize}x${boardSize}, centre star at ${mid},${mid}`);

// The opening word has to cover the star, so the star has to still be there
// while the player is aiming at it. It used to vanish the moment any pending
// tile landed, taking the target away mid-move.
const starCount = () => page.locator('.cell-mark').count();
if ((await starCount()) !== 1) problems.push('centre star missing on an empty board');
if ((await readState()).boardTiles.length === 0 && (await rackTiles().count()) > 0) {
  await rackTiles().first().click();
  await page.waitForTimeout(120);
  // Deliberately off-centre: same row as the star, two columns over.
  await cell(mid, mid + 2).click();
  await page.waitForTimeout(200);
  const pending = await page.locator('.board-tile.is-pending').count();
  const stillThere = await starCount();
  console.log(`centre star with ${pending} pending tile off-centre: ${stillThere ? 'shown' : 'GONE'}`);
  if (pending > 0 && stillThere !== 1) {
    problems.push('centre star disappeared while a pending tile sat off-centre');
  }
  // Put the board back before the real opening play.
  const clear = page.locator('.action-shuffle');
  if ((await clear.textContent())?.trim() === 'Clear') await clear.click();
  await page.waitForTimeout(150);
}

let played = null;
for (let round = 0; round < 10 && !played; round++) {
  const occupied = (await readState()).boardTiles;

  if (occupied.length === 0) {
    for (const cells of [
      [[mid, mid], [mid, mid + 1]],
      [[mid, mid - 1], [mid, mid]],
      [[mid, mid], [mid + 1, mid]],
      [[mid - 1, mid], [mid, mid]],
      [[mid, mid - 1], [mid, mid], [mid, mid + 1]],
    ]) {
      played = await tryWord(cells);
      if (played) break;
    }
  } else {
    const spots = [];
    for (const t of occupied) {
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const r = t.row + dr;
        const c = t.col + dc;
        if (r < 1 || r > boardSize || c < 1 || c > boardSize) continue;
        if (occupied.some(o => o.row === r && o.col === c)) continue;
        if (spots.some(([sr, sc]) => sr === r && sc === c)) continue;
        spots.push([r, c]);
      }
    }
    for (const [r, c] of spots.slice(0, 30)) {
      played = await tryWord([[r, c]]);
      if (played) break;
    }
  }

  if (!played) await drawTwo();
}

if (!played) {
  problems.push('could not find any legal play through the UI');
} else {
  console.log('valid placement toast:', played.toast);
  if (!/for \d+/.test(played.toast ?? '')) {
    problems.push(`expected a "<word> for <score>" toast, got: ${played.toast}`);
  }
  await page.screenshot({ path: `${OUT}/play_pending_valid.png` });

  const before = Number(played.you);
  await actionButton('play').click();
  await page.waitForTimeout(500);

  const after = await readState();
  console.log('after play:', JSON.stringify({ you: after.you, flag: after.flag, tiles: after.boardTiles.length }));

  if (Number(after.you) <= before) problems.push(`score did not increase: ${before} -> ${after.you}`);
  if (after.boardTiles.length === 0) problems.push('no tiles on the board after Play');
  for (const t of after.boardTiles) {
    if (!/^[A-Z]$/.test(t.letter)) problems.push(`board tile at ${t.row},${t.col} shows "${t.letter}"`);
    if (t.value === null) problems.push(`board tile ${t.letter} at ${t.row},${t.col} has no point value`);
  }

  // Tapping an occupied square must be refused, not stacked on top.
  const taken = after.boardTiles[0];
  if ((await rackTiles().count()) > 0) {
    await rackTiles().first().click();
    await cell(taken.row, taken.col).click();
    await page.waitForTimeout(150);
    const blocked = await readState();
    if (!/taken/i.test(blocked.toast ?? '')) {
      problems.push(`occupied square not refused, toast was: ${blocked.toast}`);
    }
    const same = blocked.boardTiles.filter(t => t.row === taken.row && t.col === taken.col);
    if (same.length !== 1 || same[0].letter !== taken.letter) {
      problems.push('a pending tile covered a tile already on the board');
    }
    console.log('occupied square refused with:', blocked.toast);
    await clearPending();
  }

  await page.waitForTimeout(2200); // let the AI reply
  const final = await readState();
  console.log('mid-game:', JSON.stringify({ you: final.you, opp: final.oppCount, tiles: final.boardTiles.length, flag: final.flag }));
  console.log('board:', final.boardTiles.map(t => `${t.letter}${t.value}@${t.row},${t.col}`).join(' '));
  await page.screenshot({ path: `${OUT}/play_midgame.png` });

  const overflow = await page.evaluate(() => ({
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
    actionsBottom: Math.max(
      ...[...document.querySelectorAll('.action-draw, .action-play, .action-shuffle')].map(b => b.getBoundingClientRect().bottom)
    ),
    innerH: window.innerHeight,
  }));
  console.log('overflow check:', JSON.stringify(overflow));
  if (overflow.scrollH > overflow.clientH) problems.push('document overflows mid-game');
  if (overflow.actionsBottom > overflow.innerH) problems.push('buttons below the fold mid-game');
}

if (errors.length) problems.push(`console errors: ${errors.join(' | ')}`);

await browser.close();
console.log(problems.length ? `\nFAIL:\n - ${problems.join('\n - ')}` : '\nGameplay verified clean');
process.exit(problems.length ? 1 : 0);

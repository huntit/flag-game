// Drag-and-drop verification against the live DOM.
//
// Rack reordering is the part that is easy to get subtly wrong: the drop index
// is read from the DOM but applied to a rack the dragged tile has already left,
// and if those two index spaces disagree every leftward drop lands one slot too
// far right. That is what the reorder cases below pin down.
//
// Runs mouse drags (desktop) and real touch drags via CDP (phone), because
// pointer events are the only input path the game has — HTML5 dragstart never
// fires on touch, so a mouse-only check would prove nothing about a phone.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';

const URL = process.env.WORDHEIST_URL ?? 'http://localhost:4173/wordheist-game/';
const OUT = process.argv[2] ?? '/tmp/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];

const DESKTOP = { viewport: { width: 1280, height: 900 } };
const PHONE = {
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
  userAgent: devices['iPhone 13'].userAgent,
};

/** Open a solo game and draw until the rack holds at least `want` tiles. */
async function openGame(opts, want = 6) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /vs Hunter/ }).click();
  await page.waitForSelector('.play-shell');

  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(400);
    if ((await page.$$eval('.rack-tile', els => els.length)) >= want) break;
    const market = await page.$$('.market-tile:not([disabled])');
    if (market.length >= 2) {
      await market[0].click();
      await page.waitForTimeout(60);
      await market[1].click();
      await page.waitForTimeout(80);
      const draw = await page.$('.action-draw:not([disabled])');
      if (draw) await draw.click();
    }
  }
  await page.waitForTimeout(500);
  return { context, page, errors };
}

const rackIds = page => page.$$eval('.rack-tile', els => els.map(el => el.dataset.tileId));
const centre = box => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

/**
 * An empty, non-goal board square near the middle. The AI opens through the
 * centre star, so a test that always aims there starts failing as soon as the
 * setup draws take long enough for the AI to play.
 */
async function freeCell(page) {
  const handle = await page.evaluateHandle(() => {
    const cells = [...document.querySelectorAll('.board-cell')];
    const free = cells.filter(c => !c.querySelector('.board-tile') && !c.querySelector('.goal-square'));
    // Prefer the middle of the board so the drop is nowhere near an edge.
    free.sort((a, b) => {
      const d = el => {
        const r = el.getBoundingClientRect();
        const board = document.querySelector('.board').getBoundingClientRect();
        return Math.hypot(r.x - (board.x + board.width / 2), r.y - (board.y + board.height / 2));
      };
      return d(a) - d(b);
    });
    return free[0] ?? null;
  });
  const element = handle.asElement();
  return element;
}

async function mouseDrag(page, from, to, steps = 18) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    await page.waitForTimeout(14);
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------- reordering

{
  // Each case drags one tile to a named destination and checks the whole rack
  // order afterwards, not just the tile that moved — an off-by-one shows up as
  // a neighbour in the wrong place, which a "did tile 0 move?" check misses.
  const cases = [
    { label: 'last tile to the very front', from: t => t.length - 1, drop: { edge: 'start' } },
    { label: 'first tile to the very end', from: () => 0, drop: { edge: 'end' } },
    { label: 'tile 1 leftwards into slot 0', from: () => 1, drop: { before: 0 } },
    { label: 'tile 4 leftwards into slot 1', from: () => 4, drop: { before: 1 } },
    { label: 'tile 0 rightwards into slot 2', from: () => 0, drop: { before: 2 } },
  ];

  for (const testCase of cases) {
    const { context, page, errors } = await openGame(DESKTOP, 6);
    const before = await rackIds(page);
    const fromIndex = testCase.from(before);

    if (before.length < 5) {
      problems.push(`${testCase.label}: only drew ${before.length} tiles, need 5`);
      await context.close();
      continue;
    }

    const tiles = await page.$$('.rack-tile');
    const tray = await (await page.$('.rack-tray')).boundingBox();
    const source = centre(await tiles[fromIndex].boundingBox());

    let target;
    let expected;
    const rest = before.filter((_, i) => i !== fromIndex);
    if (testCase.drop.edge === 'start') {
      target = { x: tray.x + 4, y: source.y };
      expected = [before[fromIndex], ...rest];
    } else if (testCase.drop.edge === 'end') {
      target = { x: tray.x + tray.width - 4, y: source.y };
      expected = [...rest, before[fromIndex]];
    } else {
      // Aim at the left quarter of the tile currently in that slot, i.e.
      // "put it in front of this one". The expectation is expressed the same
      // way — in front of that same tile — rather than at a bare index, because
      // pulling the dragged tile out shifts every index to its right by one.
      const anchorId = before[testCase.drop.before];
      const anchor = await tiles[testCase.drop.before].boundingBox();
      target = { x: anchor.x + anchor.width * 0.25, y: anchor.y + anchor.height / 2 };
      const slot = rest.indexOf(anchorId);
      expected = [...rest.slice(0, slot), before[fromIndex], ...rest.slice(slot)];
    }

    await mouseDrag(page, source, target);
    const after = await rackIds(page);

    if (after.join() !== expected.join()) {
      problems.push(
        `${testCase.label}: got ${after.join(' ')}, expected ${expected.join(' ')}`
      );
    }
    if (after.length !== before.length) {
      problems.push(`${testCase.label}: rack changed size ${before.length} -> ${after.length}`);
    }
    if ([...after].sort().join() !== [...before].sort().join()) {
      problems.push(`${testCase.label}: reorder changed which tiles are held`);
    }
    if (errors.length) problems.push(`${testCase.label}: console errors ${errors.join(' | ')}`);
    console.log(`  reorder — ${testCase.label}`);
    await context.close();
  }
}

// ------------------------------------------------------- mid-drag geometry

{
  // The gap that opens for the dragged tile must not push the rack past the
  // board's edge, on the tightest case: a full seven-tile rack.
  for (const [name, opts] of [['desktop', DESKTOP], ['phone', PHONE]]) {
    const { context, page } = await openGame(opts, 7);
    const tiles = await page.$$('.rack-tile');
    if (tiles.length < 2) {
      await context.close();
      continue;
    }
    const source = centre(await tiles[0].boundingBox());
    const lastBox = await tiles[tiles.length - 1].boundingBox();
    const target = { x: lastBox.x + lastBox.width * 0.6, y: lastBox.y + lastBox.height / 2 };

    await page.mouse.move(source.x, source.y);
    await page.mouse.down();
    for (let i = 1; i <= 18; i++) {
      await page.mouse.move(source.x + ((target.x - source.x) * i) / 18, source.y);
      await page.waitForTimeout(14);
    }

    const geometry = await page.evaluate(() => {
      const board = document.querySelector('.board').getBoundingClientRect();
      const slots = [...document.querySelectorAll('.rack-tray > *')];
      return {
        boardRight: board.right,
        rackRight: Math.max(...slots.map(s => s.getBoundingClientRect().right)),
        docWidth: document.documentElement.scrollWidth,
        winWidth: window.innerWidth,
        ghosts: document.querySelectorAll('.drag-ghost').length,
        // The tile under the cursor must be inert, or hit-testing finds it
        // instead of the board underneath.
        ghostPointerEvents: (() => {
          const g = document.querySelector('.drag-ghost');
          return g ? getComputedStyle(g).pointerEvents : null;
        })(),
      };
    });
    await page.screenshot({ path: `${OUT}/drag-gap-${name}.png` });
    await page.mouse.up();
    await page.waitForTimeout(200);

    if (geometry.ghosts !== 1) problems.push(`${name}: expected one drag ghost, got ${geometry.ghosts}`);
    if (geometry.ghostPointerEvents !== 'none') {
      problems.push(`${name}: drag ghost is not inert (${geometry.ghostPointerEvents})`);
    }
    if (geometry.rackRight > geometry.boardRight + 1.5) {
      problems.push(
        `${name}: mid-drag rack runs past the board ${geometry.rackRight.toFixed(1)} > ${geometry.boardRight.toFixed(1)}`
      );
    }
    if (geometry.docWidth > geometry.winWidth) problems.push(`${name}: horizontal document overflow mid-drag`);
    console.log(`  geometry — ${name}: rack right ${geometry.rackRight.toFixed(1)} of board ${geometry.boardRight.toFixed(1)}`);
    await context.close();
  }
}

// ------------------------------------------------------------- touch drags

{
  // Real touch, dispatched through CDP, so this exercises pointerType 'touch'
  // rather than the mouse path Playwright's page.mouse produces.
  const { context, page, errors } = await openGame(PHONE, 4);
  const cdp = await context.newCDPSession(page);
  const touch = (type, x, y) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
    });

  await page.evaluate(() => {
    window.__pointerTypes = [];
    window.addEventListener('pointerdown', e => window.__pointerTypes.push(e.pointerType), true);
  });

  const tiles = await page.$$('.rack-tile');
  const source = centre(await tiles[0].boundingBox());
  // Any empty square adjacent to the middle. Not the centre star specifically:
  // the AI opens through it, so by the time the rack is full it is often taken.
  const emptyCell = await freeCell(page);
  if (!emptyCell) problems.push('touch: no empty board square to drop onto');
  const target = centre(await emptyCell.boundingBox());

  await touch('touchStart', source.x, source.y);
  let sawGhost = false;
  for (let i = 1; i <= 16; i++) {
    await touch('touchMove', source.x + ((target.x - source.x) * i) / 16, source.y + ((target.y - source.y) * i) / 16);
    await page.waitForTimeout(16);
    if (!sawGhost) sawGhost = (await page.$$eval('.drag-ghost', e => e.length)) > 0;
  }
  const litTarget = (await page.$$eval('.board-cell.is-drop-target', e => e.length)) > 0;
  await touch('touchEnd', target.x, target.y);
  await page.waitForTimeout(320);

  const pointerTypes = await page.evaluate(() => window.__pointerTypes);
  const placed = await page.$$eval('.board-tile.is-pending', e => e.length);
  const scrolled = await page.evaluate(() => window.scrollY + document.documentElement.scrollTop);

  if (!pointerTypes.includes('touch')) problems.push(`touch: never saw a touch pointer (${pointerTypes.join()})`);
  if (!sawGhost) problems.push('touch: no drag ghost appeared');
  if (!litTarget) problems.push('touch: the target square never lit up');
  if (placed !== 1) problems.push(`touch: drag to board placed ${placed} tiles, expected 1`);
  if (scrolled !== 0) problems.push(`touch: the page scrolled under the drag (${scrolled})`);
  await page.screenshot({ path: `${OUT}/drag-touch-placed.png` });

  // Dragging it back off the board returns it to the rack.
  if (placed === 1) {
    const boardTile = centre(await (await page.$('.board-tile.is-pending')).boundingBox());
    const tray = await (await page.$('.rack-tray')).boundingBox();
    const home = { x: tray.x + tray.width * 0.75, y: tray.y + tray.height / 2 };
    await touch('touchStart', boardTile.x, boardTile.y);
    for (let i = 1; i <= 16; i++) {
      await touch('touchMove', boardTile.x + ((home.x - boardTile.x) * i) / 16, boardTile.y + ((home.y - boardTile.y) * i) / 16);
      await page.waitForTimeout(16);
    }
    await touch('touchEnd', home.x, home.y);
    await page.waitForTimeout(320);
    const still = await page.$$eval('.board-tile.is-pending', e => e.length);
    if (still !== 0) problems.push(`touch: dragging back to the rack left ${still} tiles on the board`);
  }

  // A press that never moves is still a tap.
  await page.tap('.rack-tile');
  await page.waitForTimeout(160);
  if ((await page.$$eval('.rack-tile.is-selected', e => e.length)) !== 1) {
    problems.push('touch: tapping a rack tile no longer selects it');
  }
  const tapCell = await freeCell(page);
  if (tapCell) {
    await tapCell.tap();
    await page.waitForTimeout(220);
    if ((await page.$$eval('.board-tile.is-pending', e => e.length)) !== 1) {
      problems.push('touch: tap-to-place no longer works');
    }
  } else {
    problems.push('touch: no empty board square left to tap');
  }

  if (errors.length) problems.push(`touch: console errors ${errors.join(' | ')}`);
  console.log(`  touch — pointerTypes ${pointerTypes.join()}, placed ${placed}, no scroll`);
  await context.close();
}

await browser.close();
console.log(problems.length ? `\nFAIL:\n - ${problems.join('\n - ')}` : '\nDrag and drop verified clean');
process.exit(problems.length ? 1 : 0);

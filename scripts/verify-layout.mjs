// Pixel-exact layout verification at real iPhone/iPad viewports.
// Measures the live DOM rather than eyeballing an emulator, and writes
// screenshots of the viewport only (no browser chrome) so nothing can be
// clipped by the test rig.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';

const URL = process.env.FLAG_URL ?? 'http://localhost:4173/flag-game/';
const OUT = process.argv[2] ?? '/tmp/shots';
mkdirSync(OUT, { recursive: true });

const phoneTargets = [
  { name: 'iphone_se', width: 375, height: 667, dpr: 2 },
  { name: 'iphone_15_pro', width: 393, height: 852, dpr: 3 },
  { name: 'iphone_15_pro_max', width: 430, height: 932, dpr: 3 },
  { name: 'ipad_portrait', width: 820, height: 1180, dpr: 2 },
  { name: 'ipad_landscape', width: 1180, height: 820, dpr: 2 },
];

const desktopTargets = [
  { name: 'desktop_wide', width: 1280, height: 800, dpr: 2, desktop: true },
];

const targets = [...phoneTargets, ...desktopTargets];

const browser = await chromium.launch();
let failures = 0;

for (const t of targets) {
  const desktop = Boolean(t.desktop);
  const context = await browser.newContext({
    viewport: { width: t.width, height: t.height },
    deviceScaleFactor: t.dpr,
    isMobile: !desktop,
    hasTouch: !desktop,
    userAgent: desktop
      ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15'
      : devices['iPhone 13'].userAgent,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /vs Hunter/ }).click();
  await page.waitForSelector('.play-shell');
  await page.waitForTimeout(600);

  const m = await page.evaluate(() => {
    const rect = el => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width, h: r.height };
    };
    const buttons = [...document.querySelectorAll('.action-draw, .action-pass, .action-play, .action-shuffle')].map(b => ({
      label: (b.getAttribute('aria-label') || b.textContent || '').trim(),
      disabled: b.disabled,
      ...rect(b),
    }));
    const rackTile = document.querySelector('.rack-row .tray-tile');
    const marketTile = document.querySelector('.market-row .tray-tile');
    const board = document.querySelector('.board');
    const cell = document.querySelector('.board-cell');
    const actionsEl = document.querySelector('.action-play') || document.querySelector('.rack-row');
    const shuffle = document.querySelector('.action-shuffle');
    const play = document.querySelector('.action-play');
    const draw = document.querySelector('.action-draw');
    const rackTiles = [...document.querySelectorAll('.rack-row .tray-tile')];
    const lastRack = rackTiles[rackTiles.length - 1];
    const p1Card = document.querySelector('[data-seat="P1"]');
    const p2Card = document.querySelector('[data-seat="P2"]');
    const youCard = document.querySelector('.hud-you');
    const oppCard = document.querySelector('.opponent-inner');
    const marketLabel = document.querySelector('.market-row .tray-label');
    const marketInner = document.querySelector('.market-row-inner');
    const rackTrayEl = document.querySelector('.rack-tray');
    const actionsRow = document.querySelector('.actions-row');
    const goalSquares = [...document.querySelectorAll('.goal-square')];
    const bagArt = document.querySelector('.market-bag-art');
    const bagCount = document.querySelector('.market-bag-count');
    const avatars = document.querySelectorAll('.player-avatar, [class*="avatar"]');
    const emptyPips = document.querySelectorAll('.score-pip.is-empty');
    const raisedTile = document.querySelector('.board-tile');
    const youName = document.querySelector('.hud-you .score-card-name');
    const youScore = document.querySelector('.hud-you .score-card-score');
    const youBacks = [...document.querySelectorAll('.hud-you .score-back')];
    const rackLabel = document.querySelector('.rack-tray');
    const toasts = [...document.querySelectorAll('.status-row .toast')];
    const overlaps = (a, b) => {
      if (!a || !b) return false;
      return a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
    };
    return {
      innerH: window.innerHeight,
      innerW: window.innerWidth,
      docScrollH: document.documentElement.scrollHeight,
      docClientH: document.documentElement.clientHeight,
      bodyScrollH: document.body.scrollHeight,
      shell: rect(document.querySelector('.play-shell')),
      board: rect(board),
      cell: rect(cell),
      actions: actionsEl ? rect(actionsEl) : { top: 0, bottom: 0, left: 0, right: 0, w: 0, h: 0 },
      rackTile: rackTile ? rect(rackTile) : null,
      marketTile: marketTile ? rect(marketTile) : null,
      finePointer: window.matchMedia('(pointer: fine)').matches,
      wide: window.matchMedia('(min-width: 900px)').matches,
      buttons,
      opponentCount: document.querySelector('.opponent-count')?.textContent.trim(),
      opponentBacks: document.querySelectorAll('.opponent-back').length,
      youBacks: document.querySelectorAll('.hud-you .score-back').length,
      // Seven slots on every card, filled or not, so both cards line up and
      // an empty rack is still legible as "holding nothing".
      pipsPerCard: [...document.querySelectorAll('.score-card')].map(
        card => card.querySelectorAll('.score-pip').length
      ),
      // A mini-rack tile is square and must sit wholly inside its card. A card
      // with less leftover height than width used to clip the bottom off every
      // tile, which reads as "the tiles are tiny" rather than "they are cut".
      miniRack: (() => {
        const row = document.querySelector('.score-backs');
        const pip = document.querySelector('.score-pip');
        const card = document.querySelector('.score-card');
        if (!row || !pip || !card) return null;
        const p = pip.getBoundingClientRect();
        const r = row.getBoundingClientRect();
        const c = card.getBoundingClientRect();
        return {
          w: p.width, h: p.height, rowH: r.height,
          cardBottom: c.bottom, rowBottom: r.bottom,
        };
      })(),
      goalSquares: goalSquares.length,
      goalSeats: goalSquares.map(el => (el.classList.contains('is-p1') ? 'P1' : 'P2')),
      goalSrcs: goalSquares.map(el => {
        const img = el.tagName === 'IMG' ? el : el.querySelector('img');
        return (img?.currentSrc || img?.src || '');
      }),
      goalFills: goalSquares.map(el => getComputedStyle(el).backgroundColor),
      goalCoversCell: goalSquares.every(el => {
        const cellBox = el.closest('.board-cell').getBoundingClientRect();
        const own = el.getBoundingClientRect();
        return Math.abs(own.width - cellBox.width) < 1.5 && Math.abs(own.height - cellBox.height) < 1.5;
      }),
      emptySpareHasBadge: (() => {
        const occupied = new Set(
          [...document.querySelectorAll('.board-cell.has-flag')].map(c => `${c.dataset.row},${c.dataset.col}`)
        );
        return ['1,1', '1,11', '11,11', '11,1'].some(key => {
          if (occupied.has(key)) return false;
          const [r, c] = key.split(',');
          const cell = document.querySelector(`.board-cell[data-row="${r}"][data-col="${c}"]`);
          return Boolean(cell?.querySelector('.goal-square, img[src*="corner"], img[src*="token"]'));
        });
      })(),
      logoSrc: (() => {
        const img = document.querySelector('.play-header .home-link-img');
        return img ? (img.currentSrc || img.src || '') : '';
      })(),
      seatColors: (() => {
        const cs = getComputedStyle(document.documentElement);
        return { p1: cs.getPropertyValue('--color-p1').trim(), p2: cs.getPropertyValue('--color-p2').trim() };
      })(),
      logo: (() => {
        const img = document.querySelector('.play-header .home-link-img');
        return img ? rect(img) : null;
      })(),
      actionsOnOwnRow: Boolean(document.querySelector('.actions-row .action-play')),
      // Every control shares one family: same pill radius, same height.
      controlFamily: [...document.querySelectorAll('.actions-row .control')].map(b => {
        const cs = getComputedStyle(b);
        return { cls: b.className, radius: cs.borderRadius, h: Math.round(b.getBoundingClientRect().height) };
      }),
      opponentLettersRendered: [...document.querySelectorAll('.opponent-inner .tile-letter')].length,
      rackTiles: [...document.querySelectorAll('.rack-row .tray-tile .tile-letter')].map(s => s.textContent),
      // Rows must stay inside the board's left and right edges.
      rowBounds: ['.market-row-inner', '.rack-tray', '.actions-row', '.scores-row']
        .map(sel => {
          const el = document.querySelector(sel);
          return el ? { sel, ...rect(el) } : null;
        })
        .filter(Boolean),
      lastMarketTile: (() => {
        const tiles = [...document.querySelectorAll('.market-tile')];
        return tiles.length ? rect(tiles[tiles.length - 1]) : null;
      })(),
      lastRackSlot: (() => {
        const slots = [...document.querySelectorAll('.rack-tray > *')];
        return slots.length ? rect(slots[slots.length - 1]) : null;
      })(),
      // The rack must be painted in its owner's score-card colour.
      rackTrayBg: rackTrayEl ? getComputedStyle(rackTrayEl).backgroundColor : '',
      viewerCardBg: (() => {
        const card = document.querySelector('.score-card.hud-you');
        return card ? getComputedStyle(card).backgroundColor : '';
      })(),
      // Market tiles lie on the page; only the rack gets a tray behind it.
      marketTrayBg: (() => {
        const el = document.querySelector('.market-tray');
        return el ? getComputedStyle(el).backgroundColor : '';
      })(),
      facedownCount: document.querySelectorAll('.market-tile.is-facedown').length,
      facedownBg: (() => {
        const el = document.querySelector('.market-tile.is-facedown');
        return el ? getComputedStyle(el).backgroundImage : '';
      })(),
      youCard: youCard ? rect(youCard) : null,
      oppCard: oppCard ? rect(oppCard) : null,
      p1Card: p1Card ? rect(p1Card) : null,
      p2Card: p2Card ? rect(p2Card) : null,
      youNameText: youName?.textContent ?? '',
      rackLabelText: rackLabel?.textContent ?? '',
      marketWordLabel: Boolean(marketLabel),
      bagArt: Boolean(bagArt),
      bagCountText: bagCount?.textContent ?? '',
      avatarCount: avatars.length,
      emptyPipCount: emptyPips.length,
      tileBoxShadow: raisedTile ? getComputedStyle(raisedTile).boxShadow : '',
      marketRow: (() => {
        const el = document.querySelector('.market-row');
        return el ? rect(el) : null;
      })(),
      rackRow: (() => {
        const el = document.querySelector('.rack-row');
        return el ? rect(el) : null;
      })(),
      statusRow: (() => {
        const el = document.querySelector('.status-row');
        return el ? rect(el) : null;
      })(),
      toastCount: toasts.length,
      shuffleOverlapsTile: shuffle && lastRack ? overlaps(rect(shuffle), rect(lastRack)) : false,
      playOverlapsTile: play && lastRack ? overlaps(rect(play), rect(lastRack)) : false,
      drawOverlapsMarket: draw && marketTile ? overlaps(rect(draw), rect(marketTile)) : false,
      backsOverlapName: youName && youBacks.some(b => overlaps(rect(b), rect(youName))),
      backsOverlapScore: youScore && youBacks.some(b => overlaps(rect(b), rect(youScore))),
      emptyCornerToken: [...document.querySelectorAll('img')].some(img =>
        /token-corner-empty|token-p[12]|flag-mark|logo-header/.test(img.currentSrc || img.src || '')
      ),
    };
  });

  // Scroll probe: try to scroll and confirm nothing moves.
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(200);
  const scrolled = await page.evaluate(() => ({
    y: window.scrollY,
    docY: document.documentElement.scrollTop,
    bodyY: document.body.scrollTop,
  }));

  const bottomMost = Math.max(...m.buttons.map(b => b.bottom));
  const problems = [];
  if (m.docScrollH > m.docClientH) problems.push(`document overflows: ${m.docScrollH} > ${m.docClientH}`);
  if (scrolled.y !== 0 || scrolled.docY !== 0 || scrolled.bodyY !== 0) problems.push(`page scrolled: ${JSON.stringify(scrolled)}`);
  if (bottomMost > m.innerH) problems.push(`buttons below the fold: ${bottomMost.toFixed(1)} > ${m.innerH}`);
  if (m.board.bottom > m.innerH) problems.push(`board below the fold: ${m.board.bottom.toFixed(1)}`);
  if (m.board.right > m.innerW) problems.push(`board past the right edge: ${m.board.right.toFixed(1)}`);
  if (Math.abs(m.board.w - m.board.h) > 1.5) problems.push(`board not square: ${m.board.w}x${m.board.h}`);
  if (m.buttons.length < 3) problems.push(`expected Draw 2, Play, Shuffle, got ${m.buttons.length}`);
  for (const b of m.buttons) {
    if (b.h < 32) problems.push(`${b.label} button only ${b.h.toFixed(1)}px tall`);
  }
  if (m.opponentLettersRendered !== 0) problems.push('opponent letters rendered');
  // A rack can legitimately be empty mid-game, so assert the slot row rather
  // than the fill: seven slots per card, always.
  for (const count of m.pipsPerCard) {
    if (count !== 7) problems.push(`score card shows ${count} rack slots, expected 7`);
  }
  if (m.miniRack) {
    const { w, h, rowH, cardBottom, rowBottom } = m.miniRack;
    if (Math.abs(w - h) > 1.5) {
      problems.push(`mini-rack tile not square: ${w.toFixed(1)}x${h.toFixed(1)}`);
    }
    if (rowH + 1 < h) {
      problems.push(`mini-rack tiles cropped: ${h.toFixed(1)}px tile in a ${rowH.toFixed(1)}px row`);
    }
    if (rowBottom > cardBottom + 1) {
      problems.push(`mini-rack overflows its card by ${(rowBottom - cardBottom).toFixed(1)}px`);
    }
    if (w < 14) problems.push(`mini-rack tiles too small to read: ${w.toFixed(1)}px`);
  }
  if (m.goalSquares !== 2) problems.push(`expected 2 goal squares, got ${m.goalSquares}`);
  if (new Set(m.goalSeats).size !== 2) problems.push(`goal squares share a seat: ${m.goalSeats.join(',')}`);
  if (!m.goalCoversCell) problems.push('a goal square does not fill its board cell');
  if (new Set(m.goalFills).size !== 2) problems.push(`goal squares share a colour: ${m.goalFills.join(' / ')}`);
  if (!m.goalSrcs.every(s => /corner-a-badge-p[12]-(nw|ne|se|sw)\.svg/i.test(s))) {
    problems.push(`goal badges are not the 05d corner assets: ${m.goalSrcs.join(' / ')}`);
  }
  if (m.goalSrcs.some(s => /token-p[12]|token-corner-empty|flag-mark/.test(s))) {
    problems.push(`old pennant token still on a corner: ${m.goalSrcs.join(' / ')}`);
  }
  const badgeSeats = m.goalSrcs.map(s => (s.match(/badge-p[12]/i) || [''])[0]);
  if (new Set(badgeSeats).size !== 2) {
    problems.push(`corner badges do not cover both seats: ${m.goalSrcs.join(' / ')}`);
  }
  if (m.emptySpareHasBadge) problems.push('empty spare corner shows a badge or pennant');
  if (m.emptyCornerToken) problems.push('old FLAG pennant token still in the DOM');
  if (!/05f-geometric-2x2-lockup-stacked/.test(m.logoSrc)) {
    problems.push(`header is not the 05f stacked lockup: ${m.logoSrc}`);
  }
  if (/05d-geometric-2x2-lockup(?!-)|05e-geometric-2x2-lockup-stacked|logo-header/.test(m.logoSrc)) {
    problems.push(`header still uses a previous lockup: ${m.logoSrc}`);
  }
  if (m.shuffleOverlapsTile) problems.push('shuffle overlaps a rack tile');
  if (m.playOverlapsTile) problems.push('Play overlaps a rack tile');
  if (m.drawOverlapsMarket) problems.push('Draw 2 overlaps a market tile');

  // A row stacked UNDER the board shares its column, so it must stay inside the
  // board's left and right edges. This is what catches a control or the tile
  // bag quietly eating the width the tile maths reserved for it. Rows placed
  // BESIDE the board (tablet landscape, desktop side column) are exempt.
  const underBoard = box => box && box.top >= m.board.bottom - 2;
  const checkWidth = (label, box) => {
    if (!underBoard(box)) return;
    if (box.left < m.board.left - 1.5) {
      problems.push(`${label} starts left of the board: ${box.left.toFixed(1)} < ${m.board.left.toFixed(1)}`);
    }
    if (box.right > m.board.right + 1.5) {
      problems.push(`${label} runs past the board: ${box.right.toFixed(1)} > ${m.board.right.toFixed(1)}`);
    }
  };
  for (const row of m.rowBounds) checkWidth(row.sel, row);
  checkWidth('last market tile', m.lastMarketTile);
  checkWidth('last rack slot', m.lastRackSlot);

  // One tile size everywhere, so a tile reads as the same object in both rows.
  if (m.rackTile && m.marketTile && Math.abs(m.rackTile.w - m.marketTile.w) > 1.5) {
    problems.push(`rack and market tiles differ: ${m.rackTile.w.toFixed(1)} vs ${m.marketTile.w.toFixed(1)}`);
  }

  // The rack is painted in its owner's score-card colour.
  if (m.rackTrayBg && m.viewerCardBg && m.rackTrayBg !== m.viewerCardBg) {
    problems.push(`rack fill does not match the score card: ${m.rackTrayBg} vs ${m.viewerCardBg}`);
  }
  // …and the market has no tray of its own behind it.
  if (m.marketTrayBg && !/rgba\(0, 0, 0, 0\)|transparent/.test(m.marketTrayBg)) {
    problems.push(`market row has its own background: ${m.marketTrayBg}`);
  }
  if (m.facedownCount < 1) problems.push('no face-down market tiles rendered');
  if (m.facedownCount && !/tile-back/.test(m.facedownBg)) {
    problems.push(`face-down tiles are not drawn as tile backs: ${m.facedownBg}`);
  }

  // Every button is the same family: one radius, one height.
  if (m.controlFamily.length >= 2) {
    const radii = new Set(m.controlFamily.map(c => c.radius));
    const heights = new Set(m.controlFamily.map(c => c.h));
    if (radii.size > 1) problems.push(`buttons disagree on radius: ${[...radii].join(' / ')}`);
    if (heights.size > 1) problems.push(`buttons disagree on height: ${[...heights].join(' / ')}`);
  }
  if (m.backsOverlapName) problems.push('score-card backs overlap the name');
  if (m.backsOverlapScore) problems.push('score-card backs overlap the score');
  if (m.toastCount > 1) problems.push(`toasts stacked: ${m.toastCount}`);
  if (m.p1Card && m.p2Card) {
    // Side by side on phone, stacked in the desktop side column — either way
    // the first player comes first in reading order.
    const sideBySide = Math.abs(m.p1Card.top - m.p2Card.top) < 2;
    const firstComesFirst = sideBySide
      ? m.p1Card.left < m.p2Card.left - 2
      : m.p1Card.top < m.p2Card.top - 2;
    if (!firstComesFirst) {
      problems.push(
        `P1 does not come before P2: ${m.p1Card.left.toFixed(1)},${m.p1Card.top.toFixed(1)} ` +
          `vs ${m.p2Card.left.toFixed(1)},${m.p2Card.top.toFixed(1)}`
      );
    }
    if (Math.abs(m.p1Card.w - m.p2Card.w) > 2) {
      problems.push(`score cards unequal width: ${m.p1Card.w.toFixed(1)} vs ${m.p2Card.w.toFixed(1)}`);
    }
    if (Math.abs(m.p1Card.h - m.p2Card.h) > 2) {
      problems.push(`score cards unequal height: ${m.p1Card.h.toFixed(1)} vs ${m.p2Card.h.toFixed(1)}`);
    }
  }
  if (m.youCard && m.oppCard) {
    if (Math.abs(m.youCard.w - m.oppCard.w) > 2) {
      problems.push(`you/opp cards unequal width: ${m.youCard.w.toFixed(1)} vs ${m.oppCard.w.toFixed(1)}`);
    }
  }
  if (m.marketWordLabel) problems.push('MARKET word label is still visible');
  if (!m.bagArt) problems.push('bag art missing');
  if (!/^\d+$/.test(m.bagCountText)) problems.push(`bag count missing: "${m.bagCountText}"`);
  if (m.avatarCount > 0) problems.push(`avatars should be gone, found ${m.avatarCount}`);
  if (m.emptyPipCount < 1) problems.push('empty score-card pips missing');
  if (m.statusRow && m.rackRow && m.statusRow.top + 1 < m.rackRow.bottom) {
    problems.push('toast strip is not below the rack');
  }
  if (m.marketRow && m.marketRow.bottom > m.innerH) problems.push('market below the fold');
  if (m.rackRow && m.rackRow.bottom > m.innerH) problems.push('rack below the fold');
  if (!m.actionsOnOwnRow) problems.push('the action buttons are not on their own row');
  if (m.logo && m.logo.top < -1) problems.push(`logo clipped at top: ${m.logo.top}`);
  if (m.logo && m.logo.h < 24) problems.push(`logo too short: ${m.logo.h}`);
  if (errors.length) problems.push(`console errors: ${errors.join(' | ')}`);

  if (desktop) {
    if (!m.finePointer || !m.wide) problems.push(`desktop media gate missed: fine=${m.finePointer} wide=${m.wide}`);
    if (m.board.w < 440) problems.push(`desktop board too small: ${m.board.w.toFixed(1)}`);
    if (m.board.w > 680) problems.push(`desktop board too large: ${m.board.w.toFixed(1)}`);
    if (!/you/i.test(m.youNameText) && !/hunter/i.test(m.youNameText)) {
      problems.push(`viewer name missing on a score card: "${m.youNameText}"`);
    }
  
    if (m.tileBoxShadow === 'none' || /inset 0 [2-9]px [2-9]px/.test(m.tileBoxShadow)) {
      problems.push(`board tiles are not raised: ${m.tileBoxShadow}`);
    }
    if (m.actions.w > 200) problems.push(`desktop Play stretched: ${m.actions.w.toFixed(1)}`);
    for (const [what, box] of [['rack', m.rackTile], ['market', m.marketTile]]) {
      if (!box) continue;
      if (box.w < 40) problems.push(`desktop ${what} tile too small: ${box.w.toFixed(1)}`);
      if (box.w > 72) problems.push(`desktop ${what} tile huge: ${box.w.toFixed(1)}`);
      if (Math.abs(box.w - box.h) >= 3) {
        problems.push(`desktop ${what} tile not square: ${box.w.toFixed(1)}x${box.h.toFixed(1)}`);
      }
    }
  }

  console.log(`\n${t.name}  ${t.width}x${t.height} @${t.dpr}x`);
  console.log(`  viewport ${m.innerW}x${m.innerH}  doc scrollH ${m.docScrollH} clientH ${m.docClientH}`);
  console.log(`  board ${m.board.w.toFixed(1)}x${m.board.h.toFixed(1)}  cell ${m.cell.w.toFixed(1)}px  bottom ${m.board.bottom.toFixed(1)}`);
  console.log(`  shell ${m.shell.w.toFixed(1)}  actions ${m.actions.w.toFixed(1)}  rackTile ${m.rackTile ? `${m.rackTile.w.toFixed(1)}x${m.rackTile.h.toFixed(1)}` : 'n/a'}  marketTile ${m.marketTile ? `${m.marketTile.w.toFixed(1)}x${m.marketTile.h.toFixed(1)}` : 'n/a'}`);
  console.log(`  buttons bottom ${bottomMost.toFixed(1)} of ${m.innerH}  (${(m.innerH - bottomMost).toFixed(1)}px clear)`);
  console.log(`  ${m.buttons.map(b => `${b.label}${b.disabled ? '(off)' : '(ON)'} h=${b.h.toFixed(0)}`).join('  ')}`);
  console.log(`  opponent: "${m.opponentCount}", ${m.opponentBacks} backs, ${m.opponentLettersRendered} letters shown`);
  console.log(`  goals ${m.goalSeats.join('/')}  facedown ${m.facedownCount}  bag "${m.bagCountText}"`);
  console.log(`  your rack: ${m.rackTiles.join(' ')}`);
  console.log(problems.length ? `  FAIL: ${problems.join('; ')}` : '  OK');
  failures += problems.length;

  await page.screenshot({ path: `${OUT}/${t.name}.png` });
  await context.close();
}

await browser.close();
console.log(failures ? `\n${failures} problem(s)` : '\nAll viewports clean');
process.exit(failures ? 1 : 0);

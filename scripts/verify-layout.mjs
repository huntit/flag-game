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
    const buttons = [...document.querySelectorAll('.action-draw, .action-play, .action-shuffle')].map(b => ({
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
    const bagArt = document.querySelector('.market-bag-art');
    const bagCount = document.querySelector('.market-bag-count');
    const avatars = document.querySelectorAll('.player-avatar');
    const emptyPips = document.querySelectorAll('.score-pip.is-empty');
    const raisedTile = document.querySelector('.board-tile');
    const youName = document.querySelector('.hud-you .score-card-name');
    const youScore = document.querySelector('.hud-you .score-card-score');
    const youBacks = [...document.querySelectorAll('.hud-you .score-back')];
    const rackLabel = document.querySelector('.rack-row .tray-label');
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
      cornerTokens: document.querySelectorAll('.corner-token').length,
      cornerImgs: [...document.querySelectorAll('.corner-token')].map(img => img.currentSrc || img.src),
      logo: (() => {
        const img = document.querySelector('.play-header .home-link-img');
        return img ? rect(img) : null;
      })(),
      drawNextToMarket: Boolean(document.querySelector('.market-row .action-draw')),
      shuffleNextToRack: Boolean(document.querySelector('.rack-row .action-shuffle')),
      opponentLettersRendered: [...document.querySelectorAll('.opponent-inner .tile-letter')].length,
      rackTiles: [...document.querySelectorAll('.rack-row .tray-tile .tile-letter')].map(s => s.textContent),
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
      emptyCornerToken: [...document.querySelectorAll('.corner-token')].some(img =>
        (img.currentSrc || img.src).includes('token-corner-empty')
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
  if (m.opponentBacks < 1) problems.push(`opponent rack backs missing: ${m.opponentBacks}`);
  if (m.youBacks < 1) problems.push(`you rack backs missing: ${m.youBacks}`);
  if (m.cornerTokens !== 2) problems.push(`expected 2 flag tokens, got ${m.cornerTokens}`);
  if (m.emptyCornerToken) problems.push('empty spare corners still show TWS tokens');
  if (m.shuffleOverlapsTile) problems.push('shuffle overlaps a rack tile');
  if (m.playOverlapsTile) problems.push('Play overlaps a rack tile');
  if (m.drawOverlapsMarket) problems.push('Draw 2 overlaps a market tile');
  if (m.backsOverlapName) problems.push('score-card backs overlap the name');
  if (m.backsOverlapScore) problems.push('score-card backs overlap the score');
  if (m.toastCount > 1) problems.push(`toasts stacked: ${m.toastCount}`);
  if (m.p1Card && m.p2Card) {
    if (m.p1Card.left > m.p2Card.left - 2) {
      problems.push(`P1 is not left of P2: ${m.p1Card.left.toFixed(1)} vs ${m.p2Card.left.toFixed(1)}`);
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
  if (m.avatarCount < 3) problems.push(`avatars missing: ${m.avatarCount}`);
  if (m.emptyPipCount < 1) problems.push('empty score-card pips missing');
  if (m.statusRow && m.rackRow && m.statusRow.top + 1 < m.rackRow.bottom) {
    problems.push('toast strip is not below the rack');
  }
  if (m.marketRow && m.marketRow.bottom > m.innerH) problems.push('market below the fold');
  if (m.rackRow && m.rackRow.bottom > m.innerH) problems.push('rack below the fold');
  if (!m.drawNextToMarket) problems.push('Draw 2 is not beside the market');
  if (!m.shuffleNextToRack) problems.push('Shuffle is not beside the rack');
  if (m.logo && m.logo.top < -1) problems.push(`logo clipped at top: ${m.logo.top}`);
  if (m.logo && m.logo.h < 24) problems.push(`logo too short: ${m.logo.h}`);
  if (errors.length) problems.push(`console errors: ${errors.join(' | ')}`);

  if (desktop) {
    if (!m.finePointer || !m.wide) problems.push(`desktop media gate missed: fine=${m.finePointer} wide=${m.wide}`);
    if (m.board.w < 400) problems.push(`desktop board too small: ${m.board.w.toFixed(1)}`);
    if (m.board.w > 480) problems.push(`desktop board too large: ${m.board.w.toFixed(1)}`);
    if (m.shell.w > 1280) problems.push(`desktop shell not capped: ${m.shell.w.toFixed(1)}`);
    if (!/you/i.test(m.youNameText) && !/hunter/i.test(m.youNameText)) {
      problems.push(`viewer name missing on a score card: "${m.youNameText}"`);
    }
    if (!/you/i.test(m.rackLabelText)) problems.push(`rack label truncated: "${m.rackLabelText}"`);
    if (m.tileBoxShadow === 'none' || /inset 0 [2-9]px [2-9]px/.test(m.tileBoxShadow)) {
      problems.push(`board tiles are not raised: ${m.tileBoxShadow}`);
    }
    if (m.actions.w > 200) problems.push(`desktop Play stretched: ${m.actions.w.toFixed(1)}`);
    if (m.rackTile) {
      if (m.rackTile.w > 50) problems.push(`desktop rack tile huge: ${m.rackTile.w.toFixed(1)}`);
      if (m.rackTile.h > 50) problems.push(`desktop rack tile tall: ${m.rackTile.h.toFixed(1)}`);
      if (Math.abs(m.rackTile.w - m.rackTile.h) >= 3) {
        problems.push(`desktop rack tile not square: ${m.rackTile.w.toFixed(1)}x${m.rackTile.h.toFixed(1)}`);
      }
    }
    if (m.marketTile) {
      if (m.marketTile.w > 50) problems.push(`desktop market tile huge: ${m.marketTile.w.toFixed(1)}`);
      if (m.marketTile.h > 50) problems.push(`desktop market tile tall: ${m.marketTile.h.toFixed(1)}`);
      if (Math.abs(m.marketTile.w - m.marketTile.h) >= 3) {
        problems.push(`desktop market tile not square: ${m.marketTile.w.toFixed(1)}x${m.marketTile.h.toFixed(1)}`);
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
  console.log(`  your rack: ${m.rackTiles.join(' ')}`);
  console.log(problems.length ? `  FAIL: ${problems.join('; ')}` : '  OK');
  failures += problems.length;

  await page.screenshot({ path: `${OUT}/${t.name}.png` });
  await context.close();
}

await browser.close();
console.log(failures ? `\n${failures} problem(s)` : '\nAll viewports clean');
process.exit(failures ? 1 : 0);

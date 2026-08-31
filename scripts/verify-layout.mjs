// Pixel-exact layout verification at real iPhone/iPad viewports.
// Measures the live DOM rather than eyeballing an emulator, and writes
// screenshots of the viewport only (no browser chrome) so nothing can be
// clipped by the test rig.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';

const URL = process.env.FLAG_URL ?? 'http://localhost:4173/flag-game/';
const OUT = process.argv[2] ?? '/tmp/shots';
mkdirSync(OUT, { recursive: true });

const targets = [
  { name: 'iphone_se', width: 375, height: 667, dpr: 2 },
  { name: 'iphone_15_pro', width: 393, height: 852, dpr: 3 },
  { name: 'iphone_15_pro_max', width: 430, height: 932, dpr: 3 },
  { name: 'ipad_portrait', width: 820, height: 1180, dpr: 2 },
  { name: 'ipad_landscape', width: 1180, height: 820, dpr: 2 },
];

const browser = await chromium.launch();
let failures = 0;

for (const t of targets) {
  const context = await browser.newContext({
    viewport: { width: t.width, height: t.height },
    deviceScaleFactor: t.dpr,
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPhone 13'].userAgent,
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
    const buttons = [...document.querySelectorAll('.actions .action-button')].map(b => ({
      label: b.textContent.trim(),
      disabled: b.disabled,
      ...rect(b),
    }));
    const board = document.querySelector('.board');
    const cell = document.querySelector('.board-cell');
    return {
      innerH: window.innerHeight,
      innerW: window.innerWidth,
      docScrollH: document.documentElement.scrollHeight,
      docClientH: document.documentElement.clientHeight,
      bodyScrollH: document.body.scrollHeight,
      shell: rect(document.querySelector('.play-shell')),
      board: rect(board),
      cell: rect(cell),
      buttons,
      opponentCount: document.querySelector('.opponent-count')?.textContent.trim(),
      opponentBacks: document.querySelectorAll('.opponent-back').length,
      // No opponent letters may be present anywhere in the DOM.
      opponentLettersRendered: [...document.querySelectorAll('.opponent-inner .tile-letter')].length,
      rackTiles: [...document.querySelectorAll('.rack-row .tray-tile .tile-letter')].map(s => s.textContent),
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
  if (m.buttons.length !== 4) problems.push(`expected 4 action buttons, got ${m.buttons.length}`);
  for (const b of m.buttons) {
    if (b.h < 36) problems.push(`${b.label} button only ${b.h.toFixed(1)}px tall`);
  }
  if (m.opponentLettersRendered !== 0) problems.push('opponent letters rendered');
  if (!/\d+\s*tiles/i.test(m.opponentCount ?? '')) problems.push(`opponent count unreadable: ${m.opponentCount}`);
  if (errors.length) problems.push(`console errors: ${errors.join(' | ')}`);

  console.log(`\n${t.name}  ${t.width}x${t.height} @${t.dpr}x`);
  console.log(`  viewport ${m.innerW}x${m.innerH}  doc scrollH ${m.docScrollH} clientH ${m.docClientH}`);
  console.log(`  board ${m.board.w.toFixed(1)}x${m.board.h.toFixed(1)}  cell ${m.cell.w.toFixed(1)}px  bottom ${m.board.bottom.toFixed(1)}`);
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

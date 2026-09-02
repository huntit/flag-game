// Layout lock: the play screen must fit the visual viewport on iPhone and iPad
// with no vertical scrolling, and the player must never scroll to reach an
// action button. These assertions guard the CSS that guarantees it.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const read = (file: string) => readFileSync(resolve(__dirname, file), 'utf-8');

/**
 * The same file with its comments removed. Locks that ban a construct outright
 * have to read code, not prose: the comment explaining WHY a file must never
 * sniff the user agent contains the words "user-agent", and a naive grep over
 * the raw source fails the very file that documents the rule.
 */
const readCode = (file: string) =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const appCss = read('../App.css');
const gameCss = read('./Game.css');
const boardCss = read('./Board.css');
const rackCss = read('./Rack.css');
const marketCss = read('./Market.css');
const indexHtml = read('../../index.html');

describe('no-scroll phone shell', () => {
  it('derives the app height from the small then dynamic viewport', () => {
    // 100svh is the viewport height with the browser toolbars showing, so the
    // shell fits whether or not iOS Safari has collapsed its chrome.
    expect(appCss).toMatch(/--app-h:\s*100svh/);
    expect(appCss).toMatch(/--app-h:\s*100dvh/);
    expect(appCss).toMatch(/--app-h:\s*100vh/); // fallback for older engines
  });

  it('stops the document itself from scrolling', () => {
    expect(appCss).toMatch(/html,\s*body\s*\{[^}]*overflow:\s*hidden/s);
    expect(appCss).toMatch(/#root\s*\{[^}]*height:\s*var\(--app-h\)/s);
  });

  it('pins the play shell to the viewport height with overflow hidden', () => {
    const shell = gameCss.match(/\.play-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(shell).toMatch(/height:\s*var\(--app-h\)/);
    expect(shell).toMatch(/max-height:\s*var\(--app-h\)/);
    expect(shell).toMatch(/overflow:\s*hidden/);
  });

  it('sizes the board from leftover space so market, rack, and the bottom toast strip stay on screen', () => {
    const shell = gameCss.match(/\.play-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(shell).toMatch(/--board-size:\s*min\(/);
    expect(shell).toMatch(/var\(--app-h\) - var\(--chrome-h\)/);
    expect(shell).toMatch(/--chrome-h:/);
    expect(shell).toMatch(/grid-template-areas:[\s\S]*'rack'[\s\S]*'status'/);
  });

  it('budgets the board against the shell width, not the raw viewport width', () => {
    // The shell is centred and capped, so measuring the board against 100vw
    // makes it taller than its column on a wide-but-tall screen (iPad portrait)
    // and the cells come out rectangular.
    const shell = gameCss.match(/\.play-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(shell).toMatch(/--shell-w:\s*min\(/);
    expect(shell).toMatch(/--board-size:\s*min\(\s*calc\(var\(--shell-w\)/);
    expect(gameCss).toMatch(/max-width:\s*var\(--shell-max-w\)/);
  });

  it('uses the safe area rather than guessing at insets', () => {
    expect(appCss).toMatch(/env\(safe-area-inset-top/);
    expect(appCss).toMatch(/env\(safe-area-inset-bottom/);
    expect(gameCss).toMatch(/var\(--safe-bottom\)/);
    expect(indexHtml).toMatch(/viewport-fit=cover/);
  });

  it('shrinks chrome on short screens instead of the buttons', () => {
    const shell = gameCss.match(/\.play-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    for (const row of ['--header-h', '--scores-h', '--market-h', '--status-h', '--rack-h']) {
      expect(shell, `${row} should clamp against --app-h`).toMatch(
        new RegExp(`${row}:\\s*clamp\\([^)]*var\\(--app-h\\)`)
      );
    }
  });

  it('ranks the one visible toast by urgency, so a live score beats the banner', () => {
    // Only statusToasts[0] renders. What the player is doing right now has to
    // outrank ambient copy, or placing a word on the opening move shows "You
    // play first" instead of what that word scores.
    const game = read('./Game.tsx');
    const body = game.slice(game.indexOf('const statusToasts'), game.indexOf('return items;'));
    const at = (needle: string) => body.indexOf(needle);
    expect(at('toast-error')).toBeGreaterThan(-1);
    expect(at("kind: 'toast-score'")).toBeGreaterThan(at('text: error'));
    expect(at('firstPlayerBannerText')).toBeGreaterThan(at("kind: 'toast-score'"));
    expect(at('EXCHANGE_WARNING')).toBeGreaterThan(at('requiredDiscards > 0'));
    expect(at('is thinking')).toBeGreaterThan(at('EXCHANGE_WARNING'));
  });

  it('keeps toasts in a dedicated bottom status row so they cannot cover the rack', () => {
    expect(gameCss).toMatch(/\.status-row/);
    expect(gameCss).toMatch(/grid-template-areas:[\s\S]*'rack'[\s\S]*'status'/);
    expect(gameCss).toMatch(/\.toast-layer\s*\{[^}]*position:\s*absolute/s);
    expect(gameCss).toMatch(/\.toast-layer\s*\{[^}]*pointer-events:\s*none/s);
    expect(read('./Game.tsx')).toMatch(/status-row/);
    expect(read('./Game.tsx')).toMatch(/statusToasts\[0\]/);
  });

  it('has a landscape layout for the tablet that keeps the controls on screen', () => {
    expect(gameCss).toMatch(/@media \(orientation: landscape\)/);
  });

  it('budgets the market and rack from the variant, never a hard-coded count', () => {
    // The 9×9 game deals 6 rack slots and 5 market slots; the 11×11 game deals
    // 7 and 6. Writing either number into the maths gives one of the two
    // variants tiles that do not fit the row they are in.
    const shell = gameCss.match(/\.play-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(shell).toMatch(/--rack-fit:[\s\S]*var\(--rack-slots/);
    expect(shell).toMatch(/--market-fit:[\s\S]*var\(--market-slots/);
    expect(shell).toMatch(/--cell:\s*calc\(var\(--board-size\) \/ var\(--board-cells/);
    expect(boardCss).toMatch(/grid-template-columns:\s*repeat\(var\(--board-cells/);
    expect(boardCss).toMatch(/grid-template-rows:\s*repeat\(var\(--board-cells/);
    expect(boardCss).not.toMatch(/repeat\(\d+,\s*1fr\)/);

    // …and the three counts come from the game's own rule set, set once.
    const game = read('./Game.tsx');
    expect(game).toMatch(/'--board-cells':\s*rules\.boardSize/);
    expect(game).toMatch(/'--rack-slots':\s*rules\.rackMax/);
    expect(game).toMatch(/'--market-slots':\s*marketSlots\(rules\)/);
  });
});

const largeShellBlock = (css: string) =>
  css.match(
    /@media \(min-width:\s*900px\) and \(pointer:\s*fine\), \(min-width:\s*700px\) and \(min-height:\s*700px\)[\s\S]*/
  )?.[0] ?? '';

const landscapeTabletBlock = (css: string) =>
  css.match(
    /@media \(orientation: landscape\) and \(pointer:\s*coarse\) and \(min-width:\s*700px\) and \(min-height:\s*700px\)\s*\{[\s\S]*/
  )?.[0] ?? '';

describe('the large shell (wide desktop windows and tablets)', () => {
  const large = largeShellBlock(gameCss);

  it('gates the shell on viewport and pointer, never a user-agent', () => {
    expect(large.length).toBeGreaterThan(80);

    for (const source of ['Game.tsx', 'Game.css', 'Rack.css', 'Market.css', 'Board.css', '../App.tsx', './useShell.ts']) {
      expect(readCode(`./${source}`), source).not.toMatch(/navigator\.userAgent|user-agent/i);
    }
  });

  it('claims a tablet in both orientations without ever claiming a phone', () => {
    // A phone in landscape is wide — a 16 Pro Max is 932pt across — so a
    // width-only query hands a phone the tablet layout the moment it is turned
    // sideways, and with it the 11×11 board. min-height is what stops that.
    expect(gameCss).toMatch(
      /@media \(min-width: 900px\) and \(pointer: fine\), \(min-width: 700px\) and \(min-height: 700px\)/
    );
    const hook = read('./useShell.ts');
    expect(hook).toMatch(/LARGE_SHELL_MIN = 700/);
    expect(hook).toMatch(/min-width: \$\{LARGE_SHELL_MIN\}px\) and \(min-height: \$\{LARGE_SHELL_MIN\}px/);
    expect(hook).toMatch(/DESKTOP_QUERY = '\(min-width: 900px\) and \(pointer: fine\)'/);
  });

  it('keeps the CSS shell and the rule set gated on the same queries', () => {
    // Layout and board size are two halves of one decision. If the CSS says
    // "large" while useShell says "phone", the shell lays out an 11×11 column
    // around a 9×9 board.
    const hook = read('./useShell.ts');
    expect(hook).toMatch(/LARGE_SHELL_QUERY = `\$\{DESKTOP_QUERY\}, \$\{TABLET_QUERY\}`/);
    expect(hook).toMatch(/ruleSetForShell/);
    expect(hook).toMatch(/large \? TABLET_11 : PHONE_9/);
    expect(read('./Game.tsx')).toMatch(/initializeGame\(tileData, ruleSetForShell\(isLargeShell\)\)/);
  });

  it('caps board and tile size so they do not grow with the window', () => {
    expect(large).toMatch(/--board-max:\s*\d+px/);
    expect(large).toMatch(/--board-size:\s*min\(/);
    expect(large).toMatch(/var\(--board-max\)/);
    expect(large).toMatch(/--side-w:\s*clamp\(/);
    // A hard pixel ceiling, so tiles stop growing once the window is big.
    expect(large).toMatch(/--tile:\s*\d+px/);
    expect(large).toMatch(/--tile-size:\s*min\([\s\S]*var\(--tile\)/);
  });

  it('leaves the board room for the side column instead of overlapping it', () => {
    // The board is capped by the width the side column does not take, so a
    // narrow tablet shrinks the board rather than pushing the log off-screen.
    expect(large).toMatch(/--board-w-budget:[\s\S]*var\(--side-w\)/);
    expect(large).toMatch(/--board-size:\s*min\([\s\S]*var\(--board-w-budget\)/);
  });

  it('forces tiles square so they cannot stretch with the column', () => {
    const tileRule =
      read('./Rack.css').match(/\.tray-tile,\s*\n\.tray-slot-empty\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(tileRule).toMatch(/aspect-ratio:\s*1/);
    expect(tileRule).toMatch(/width:\s*var\(--tile-size\)/);
    expect(large).toMatch(/grid-template-rows:[\s\S]*var\(--rack-h\)/);
  });

  it('sizes rack and market tiles from one shared --tile-size', () => {
    // A tile is the same object wherever it sits, so both rows read from the
    // same variable rather than each deriving a size of their own.
    const shell = gameCss.match(/\.play-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(shell).toMatch(/--tile-size:\s*min\(/);
    expect(shell).toMatch(/--rack-fit:/);
    expect(shell).toMatch(/--market-fit:/);
    expect(read('./Rack.css')).toMatch(/width:\s*var\(--tile-size\)/);
    // Market tiles inherit .tray-tile's box rather than redeclaring a size.
    const marketTileRule =
      read('./Market.css').match(/\n\.market-tile\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(marketTileRule).not.toMatch(/width:|aspect-ratio:/);
  });

  it('puts the board in one column and the cards, log and market in the other', () => {
    expect(large).toMatch(/grid-template-columns:\s*var\(--board-size\) var\(--side-w\)/);
    expect(large).toMatch(/grid-template-areas:\s*\n\s*'header header'\n\s*'main   side'/);
    expect(large).toMatch(/\.play-main[\s\S]*grid-area:\s*main/);
    expect(large).toMatch(/\.play-side[\s\S]*grid-area:\s*side/);
    // Left column stacks board, rack, actions, status — nothing else.
    expect(large).toMatch(/grid-template-areas:[\s\S]*'stage'[\s\S]*'rack'[\s\S]*'actions'[\s\S]*'status'/);
    expect(read('./Game.tsx')).toMatch(/className="market-row"/);
    expect(read('./Game.tsx')).toMatch(/action-draw/);
    expect(read('./Game.tsx')).toMatch(/action-shuffle/);
  });

  it('orders the side column score cards, then Game Log, then market', () => {
    // The log is between them on purpose: it is the record of what the cards
    // above it are counting.
    const game = read('./Game.tsx');
    const side = game.slice(game.indexOf('<div className="play-side">'), game.indexOf('<div className="play-main">'));
    expect(side.indexOf('scores-row')).toBeGreaterThan(-1);
    expect(side.indexOf('<GameLog')).toBeGreaterThan(side.indexOf('scores-row'));
    expect(side.indexOf('market-panel')).toBeGreaterThan(side.indexOf('<GameLog'));
  });

  it('gives the market its own card so it stops competing with the rack', () => {
    // The market is a shared pool, the rack is your hand. Putting them in
    // different columns is the clearest way to say so.
    expect(large).toMatch(/\.play-shell \.market-panel\s*\{[^}]*display:\s*flex/s);
    expect(large).toMatch(/--market-cols:\s*\d/);
    expect(read('./Market.css')).toMatch(/grid-template-columns:\s*repeat\(var\(--market-cols/);
    // Still one tile size: the card changes where a tile sits, not its size.
    expect(read('./Market.css')).toMatch(/\.market-panel \.market-tray\s*\{[^}]*var\(--tile-size\)/s);
    // The market wrapper collapses on the phone, so the row keeps its place
    // in the single column.
    const phone = gameCss.slice(0, gameCss.indexOf('@media'));
    expect(phone).toMatch(/\.market-panel,\n\.dock \{\n\s*display:\s*contents/);
  });

  it('hangs the market card heading, bag, grid and button on one inner column', () => {
    const marketCss = read('./Market.css');
    expect(marketCss).toMatch(/\.market-panel \.market-head\s*\{[^}]*width:\s*var\(--market-grid-w\)/s);
    expect(marketCss).toMatch(/\.market-panel \.market-head\s*\{[^}]*justify-content:\s*space-between/s);
    expect(marketCss).toMatch(/\.market-panel \.market-tray\s*\{[^}]*width:\s*var\(--market-grid-w\)/s);
    expect(large).toMatch(/\.play-shell \.market-actions\s*\{[^}]*width:\s*var\(--market-grid-w\)/s);
    expect(large).toMatch(/\.play-shell \.market-actions\s*\{[^}]*justify-content:\s*flex-end/s);

    // Heading first, bag second, so the bag sits top-right of the card.
    const market = read('./Market.tsx');
    expect(market.indexOf('market-heading')).toBeLessThan(market.indexOf('market-bag'));
    // Market.css alone owns the heading's visibility — declaring it in both
    // files once let bundle order hide it everywhere.
    expect(marketCss).toMatch(/\.market-heading\s*\{\s*display:\s*none/);
    expect(gameCss).not.toMatch(/\.market-heading\s*\{[^}]*display:/s);
  });

  it('renders Draw once, in the column that holds the market', () => {
    // Two buttons doing the same job would put a duplicate in the a11y tree,
    // so the single node moves rather than being duplicated and hidden.
    const game = read('./Game.tsx');
    expect(game).toMatch(/const drawOrPassButton =/);
    expect(game).toMatch(/\{isLargeShell && <div className="market-actions">\{drawOrPassButton\}<\/div>\}/);
    expect(game).toMatch(/\{!isLargeShell && drawOrPassButton\}/);
    expect((game.match(/action-draw/g) ?? []).length).toBe(1);
    expect((game.match(/action-pass/g) ?? []).length).toBe(1);
  });

  it('gives Draw and Play one width, and puts the buttons on real edges', () => {
    const shell = gameCss.match(/\.play-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(shell).toMatch(/--ctl-w:/);
    expect(gameCss).toMatch(/\.actions-row \.control-solid\s*\{[^}]*width:\s*var\(--ctl-w\)/s);
    expect(large).toMatch(/--ctl-w:\s*\d+px/);
    expect(large).toMatch(/\.market-panel \.control\s*\{[^}]*width:\s*var\(--ctl-w\)/s);
    // No inset here: Shuffle and Play land on the board's own edges.
    expect(large).toMatch(/\.play-shell \.actions-row\s*\{[^}]*padding:\s*0/s);
  });

  it('draws the wordmark bigger than the phone does, from the header row', () => {
    // The lockup is sized from --header-h, so the row is the only place to
    // say it should be larger.
    const phone = gameCss.slice(0, gameCss.indexOf('@media'));
    const phoneMax = Number(phone.match(/--header-h:\s*clamp\([^,]+,[^,]+,\s*(\d+)px\)/)?.[1]);
    const largeMax = Number(large.match(/--header-h:\s*clamp\([^,]+,[^,]+,\s*(\d+)px\)/)?.[1]);
    expect(phoneMax).toBeGreaterThan(0);
    expect(largeMax).toBeGreaterThan(phoneMax);
    expect(read('./HomeLink.css')).toMatch(/\.home-link\.is-play \.home-link-img\s*\{[^}]*var\(--header-h\)/s);
  });

  it('keeps the side padding tight so the board gets the width', () => {
    // Every pixel of side padding is a pixel off the board.
    const pad = Number(large.match(/--shell-pad-x:\s*(\d+)px/)?.[1]);
    expect(pad).toBeGreaterThanOrEqual(0);
    expect(pad).toBeLessThanOrEqual(12);
  });

  it('keeps the phone shell as the un-queried default', () => {
    const phone = gameCss.slice(0, gameCss.indexOf('@media'));
    expect(phone).toMatch(/\.play-shell\s*\{/);
    expect(phone).toMatch(/--shell-max-w:\s*720px/);
    expect(phone).toMatch(/grid-template-areas:[\s\S]*'rack'/);
    expect(phone).not.toMatch(/pointer:\s*fine/);
    expect(phone).not.toMatch(/--board-max:/);
  });
});

describe('landscape tablet: market and rack across the bottom', () => {
  const landscape = landscapeTabletBlock(gameCss);

  it('is gated on a held device, so a landscape desktop window is unaffected', () => {
    expect(landscape.length).toBeGreaterThan(80);
    expect(gameCss).toMatch(
      /@media \(orientation: landscape\) and \(pointer: coarse\) and \(min-width: 700px\) and \(min-height: 700px\)/
    );
  });

  it('drops both tile rows into one band along the bottom of the screen', () => {
    // A landscape tablet is wide and short: the board takes the height and the
    // side column has width to spare, so the rows the player touches come out
    // of the columns and sit where both thumbs already are.
    expect(landscape).toMatch(/grid-template-areas:\s*\n\s*'header header'\n\s*'stage  side'\n\s*'market dock'/);
    expect(landscape).toMatch(/--dock-h:\s*clamp\(/);
    expect(landscape).toMatch(/\.play-shell \.market-panel\s*\{[^}]*grid-area:\s*market/s);
    expect(landscape).toMatch(/\.play-shell \.dock\s*\{[^}]*grid-area:\s*dock/s);
    // Both wrappers collapse so the market can leave the side column and the
    // rack can leave the board column.
    expect(landscape).toMatch(/\.play-shell \.play-main,\n\s*\.play-shell \.play-side \{\n\s*display:\s*contents/);
  });

  it('budgets the rack against the band it is actually in', () => {
    // Sizing it against the board would leave the tiles far too small: the
    // rack is in the other half of the screen now.
    expect(landscape).toMatch(/--dock-w:[\s\S]*var\(--board-size\)/);
    expect(landscape).toMatch(/--rack-fit:[\s\S]*var\(--dock-w\)/);
    expect(landscape).toMatch(/--market-fit:[\s\S]*var\(--ctl-w\)/);
  });

  it('keeps the score cards, log and toast in the column beside the board', () => {
    expect(landscape).toMatch(/\.play-shell \.scores-row\s*\{[^}]*grid-area:\s*side/s);
    expect(landscape).toMatch(/\.play-shell \.game-log-panel\s*\{[^}]*grid-area:\s*side/s);
    expect(landscape).toMatch(/\.play-shell \.status-row\s*\{[^}]*grid-area:\s*side/s);
  });
});

describe('tile score placement', () => {
  it('puts letter values top-right (WWF / Crossplay), never bottom-right (Scrabble)', () => {
    const tileFace = read('./TileFace.tsx');
    expect(tileFace).toMatch(/className="tile-value"/);
    expect(tileFace).toMatch(/textAnchor="end"/);
    expect(tileFace).toMatch(/x="90"/);
    expect(tileFace).toMatch(/y="22"/);
    expect(tileFace).not.toMatch(/y="8[0-9]"/);

    for (const css of [rackCss, boardCss, marketCss, appCss]) {
      expect(css).not.toMatch(/\.tile-value[\s\S]*?\bbottom:\s*[0-9]/);
    }
  });

  it('renders tile faces through the shared TileFace component', () => {
    for (const file of ['Board.tsx', 'Rack.tsx', 'Market.tsx']) {
      expect(read(`./${file}`)).toMatch(/TileFace/);
    }
    expect(read('./TileFace.tsx')).toMatch(/tile-value/);
  });
});

describe('branding', () => {
  it('uses the Word Heist 05f stacked lockup — title-case Word over Heist — not 05e or the one-line lockup', () => {
    for (const file of ['Game.tsx', 'Menu.tsx', 'OnlineMode.tsx']) {
      expect(read(`./${file}`)).toMatch(/HomeLink/);
    }
    const homeLink = read('./HomeLink.tsx');
    expect(homeLink).toMatch(/05f-geometric-2x2-lockup-stacked\.svg/);
    expect(homeLink).toMatch(/05f-geometric-2x2-lockup-stacked\.png/);
    expect(homeLink).toMatch(/05f-geometric-2x2-lockup-stacked@2x\.png/);
    expect(homeLink).toMatch(/Word Heist/);
    expect(homeLink).toMatch(/width=\{?\d+/);
    expect(homeLink).not.toMatch(/logo-header/);
    expect(homeLink).not.toMatch(/05d-geometric-2x2-lockup/);
    expect(homeLink).not.toMatch(/05e-geometric-2x2-lockup-stacked/);
    expect(existsSync(resolve(__dirname, '../../public/05f-geometric-2x2-lockup-stacked.svg'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../public/05f-geometric-2x2-lockup-stacked.png'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../public/05f-geometric-2x2-lockup-stacked@2x.png'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../public/logo-header.svg'))).toBe(false);
    expect(existsSync(resolve(__dirname, '../../public/logo-header.png'))).toBe(false);
    const stacked = read('../../public/05f-geometric-2x2-lockup-stacked.svg');
    expect(stacked).toMatch(/>Word</);
    expect(stacked).toMatch(/>Heist</);
    expect(stacked).toMatch(/font-size="104"/);
    expect(stacked).not.toMatch(/>WORD</);
    expect(stacked).not.toMatch(/>HEIST</);
    expect(stacked).not.toMatch(/Word Heist/);
  });

  it('ships a 2×2-grid favicon without the wordmark', () => {
    expect(indexHtml).toMatch(/05d-geometric-2x2-icon\.svg/);
    expect(indexHtml).toMatch(/05d-geometric-2x2-icon-192\.png/);
    expect(existsSync(resolve(__dirname, '../../public/05d-geometric-2x2-icon.svg'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../public/05d-geometric-2x2-icon.png'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../public/05d-geometric-2x2-icon-192.png'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../public/flag-mark.svg'))).toBe(false);
    expect(existsSync(resolve(__dirname, '../../public/favicon.svg'))).toBe(false);
    // No letters in the app mark — the wordmark is a separate lockup.
    const icon = read('../../public/05d-geometric-2x2-icon.svg');
    expect(icon).not.toMatch(/<text/);
    expect(icon).not.toMatch(/Word Heist/);
    expect(icon).toMatch(/#56867C/);
    expect(icon).toMatch(/#CB6B49/);
  });

  it('draws the 2×2 app mark on a cream ground with both seat colours', () => {
    const icon = read('../../public/05d-geometric-2x2-icon.svg');

    // A solid cream ground, so the mark is a shape on a tab bar rather than
    // loose strokes floating on whatever colour the browser happens to use.
    expect(icon).toMatch(/<rect width="1024" height="1024" fill="#F7F1E8"\/>/);
    expect(icon).toMatch(/fill="#56867C"/);
    expect(icon).toMatch(/fill="#CB6B49"/);
    expect(icon).toMatch(/fill="#E8DFD2"/);
    expect(icon).not.toMatch(/<path /);
  });

  it('ships every icon size index.html promises', () => {
    for (const file of [
      '05d-geometric-2x2-icon.svg',
      'favicon.ico',
      'favicon-16.png',
      'favicon-32.png',
      '05d-geometric-2x2-icon-192.png',
    ]) {
      expect(indexHtml, `${file} is not linked`).toContain(file);
      expect(existsSync(resolve(__dirname, `../../public/${file}`)), file).toBe(true);
    }

    // The .ico must really carry 16, 32 and 48 rather than one size padded out,
    // which is what browsers fall back to when the SVG is not used.
    const ico = readFileSync(resolve(__dirname, '../../public/favicon.ico'));
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => ico[6 + 16 * i] || 256);
    expect(sizes.sort((a, b) => a - b)).toEqual([16, 32, 48]);
  });

  it('wires occupying-player 3× corner badges onto true corners; spares stay empty', () => {
    const board = read('./Board.tsx');
    expect(board).toMatch(/flagOwner &&/);
    expect(board).toMatch(/goal-square is-\$\{flagOwner\.toLowerCase\(\)\}/);
    expect(board).toMatch(/corner-a-badge-\$\{flagOwner\.toLowerCase\(\)\}-\$\{trueCorner\.toLowerCase\(\)\}\.svg/);
    expect(board).not.toMatch(/goal-mult/);
    expect(board).not.toMatch(/goal-word/);
    expect(board).not.toMatch(/TWS/);
    expect(board).not.toMatch(/token-p[12]\.svg/);
    expect(board).not.toMatch(/token-corner-empty/);
    expect(board).not.toMatch(/corner-token/);

    expect(boardCss).toMatch(/\.goal-square\.is-p1\s*\{[^}]*background-color:\s*var\(--color-p1\)/s);
    expect(boardCss).toMatch(/\.goal-square\.is-p2\s*\{[^}]*background-color:\s*var\(--color-p2\)/s);
    expect(boardCss).toMatch(/\.goal-square\s*\{[^}]*inset:\s*0/s);

    for (const player of ['p1', 'p2']) {
      for (const corner of ['nw', 'ne', 'se', 'sw']) {
        const stem = `corner-a-badge-${player}-${corner}`;
        expect(existsSync(resolve(__dirname, `../../public/${stem}.svg`)), `${stem}.svg`).toBe(true);
        expect(existsSync(resolve(__dirname, `../../public/${stem}.png`)), `${stem}.png`).toBe(true);
        const svg = read(`../../public/${stem}.svg`);
        expect(svg).toMatch(/3×/);
        expect(svg).not.toMatch(/TWS/);
        expect(svg).toMatch(player === 'p1' ? /#56867C/ : /#CB6B49/);
      }
    }

    expect(existsSync(resolve(__dirname, '../../public/token-p1.svg'))).toBe(false);
    expect(existsSync(resolve(__dirname, '../../public/token-p2.svg'))).toBe(false);
    expect(existsSync(resolve(__dirname, '../../public/token-corner-empty.svg'))).toBe(false);
  });

  it('draws the opening centre square large enough to find at a glance', () => {
    const mark = boardCss.match(/\.cell-mark\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    const size = Number(mark.match(/font-size:\s*calc\(var\(--cell\)\s*\*\s*([0-9.]+)\)/)?.[1]);
    expect(size).toBeGreaterThanOrEqual(0.55);
  });
});

describe('opponent rack tiles', () => {
  it('uses square aspect-ratio for facedown opponent backs on all viewports', () => {
    expect(rackCss).toMatch(/\.opponent-back[\s\S]*aspect-ratio:\s*1/);
    expect(read('./GameInfo.css')).toMatch(/\.score-back[\s\S]*aspect-ratio:\s*1/);
  });
});

describe('Game Log', () => {
  const large = largeShellBlock(gameCss);
  const gameLogCss = read('./GameLog.css');
  const moveLogCss = read('./MoveLog.css');

  it('is named Game Log and sits between the score cards and the market', () => {
    const panel = read('./GameLog.tsx');
    expect(panel).toMatch(/Game Log/);
    expect(panel).not.toMatch(/Move log/i);
    expect(read('./Game.tsx')).toMatch(/<GameLog entries=\{moveLog\} \/>/);
    // The panel is hidden by default and switched on only by a shell with
    // somewhere to put it, so a narrow phone can never show it.
    expect(gameLogCss).toMatch(/\.game-log-panel\s*\{[^}]*display:\s*none/s);
    expect(large).toMatch(/\.game-log-panel\s*\{[^}]*display:\s*flex/s);
  });

  it('has no disclosure: no toggle, no chevron, nothing to collapse', () => {
    // Its height is fixed by the shell rather than by how many moves have been
    // played, so collapsing it would only ever leave a hole in the column.
    const panel = readCode('./GameLog.tsx');
    expect(panel).not.toMatch(/aria-expanded|aria-controls|disclosure|chevron/i);
    expect(panel).not.toMatch(/useState/);
    expect(readCode('./GameLog.css')).not.toMatch(/chevron|disclosure/i);
    expect(existsSync(resolve(__dirname, './SidePanel.tsx'))).toBe(false);
    expect(existsSync(resolve(__dirname, './SidePanel.css'))).toBe(false);
    expect(read('./Game.tsx')).not.toMatch(/SidePanel/);
  });

  it('is a fixed window that follows the newest line but scrolls back', () => {
    // A stable height keeps the market below it anchored to the same place all
    // game; the list inside is what moves.
    expect(gameLogCss).toMatch(/\.game-log-body\s*\{[^}]*height:\s*var\(--log-h\)/s);
    expect(gameLogCss).toMatch(/\.game-log-body\s*\{[^}]*overflow:\s*hidden/s);
    expect(moveLogCss).toMatch(/\.move-log-list[\s\S]*overflow-y:\s*auto/);
    const log = read('./MoveLog.tsx');
    expect(log).toMatch(/scrollTop = list\.scrollHeight/);
  });
});

describe('market and tile backs', () => {
  it('face-down market backs use neutral tile-back art, not player colours', () => {
    expect(marketCss).toMatch(/tile-back-url|--tile-back-url/);
    expect(appCss).toMatch(/tile-back\.svg/);
    expect(marketCss).not.toMatch(/\.market-tile\.is-facedown[\s\S]*--color-p1/);
    expect(marketCss).not.toMatch(/\.market-tile\.is-facedown[\s\S]*--color-p2/);
    expect(rackCss).toMatch(/\.opponent-back[\s\S]*tile-back-url|--tile-back-url/);
    expect(existsSync(resolve(__dirname, '../../public/tile-back.svg'))).toBe(true);
  });
});

describe('assigned blanks on board', () => {
  it('shows the chosen letter when a blank has been assigned', () => {
    const tileFace = read('./TileFace.tsx');
    expect(tileFace).toMatch(/hasLetter/);
    expect(tileFace).toMatch(/isBlank \? '★'/);
    expect(read('./Board.tsx')).toMatch(/isBlank=\{isBlank && !letter\}/);
  });
});

describe('first-player banner (no menu)', () => {
  it('shows banner copy before first action in Game toast and log, not a first-player menu', () => {
    const game = read('./Game.tsx');
    expect(game).toMatch(/firstPlayerBannerText/);
    expect(game).toMatch(/soloFirstPlayerBanner/);
    expect(game).toMatch(/hotseatFirstPlayerBanner/);
    expect(game).toMatch(/firstPlayerLogEntry/);
    expect(game).not.toMatch(/from '\.\/FirstPlayerBanner'/);
    expect(read('./Menu.tsx')).not.toMatch(/first.?player|who goes first|choose.*player/i);
    expect(read('../App.tsx')).not.toMatch(/first.?player|who goes first/i);
  });
});

describe('stuck-only Pass', () => {
  it('has Draw 2, Play, and Shuffle as the normal actions; Pass only when stuck', () => {
    const game = read('./Game.tsx');
    expect(game).toMatch(/Draw 2/);
    expect(game).toMatch(/action-play/);
    expect(game).toMatch(/action-shuffle/);
    expect(game).toMatch(/canPassNow/);
    expect(game).toMatch(/data-pass-stuck-only/);
    expect(game).toMatch(/handlePass/);
    expect(gameCss).not.toMatch(/grid-template-columns:\s*repeat\(3,/);
  });
});

describe('centred logo header', () => {
  it('puts the vector logo in a dedicated top header row', () => {
    expect(read('./Game.tsx')).toMatch(/play-header/);
    expect(read('./Game.tsx')).toMatch(/variant="play"/);
    expect(gameCss).toMatch(/grid-template-areas:[\s\S]*'header'/);
    expect(gameCss).toMatch(/\.play-header[\s\S]*justify-content:\s*center/);
    expect(gameCss).toMatch(/\.play-header[\s\S]*overflow:\s*visible/);
  });
});

describe('opponent score card', () => {
  it('hides the numeric tile count — backs only', () => {
    expect(read('./Rack.tsx')).not.toMatch(/opponent-count/);
    expect(rackCss).toMatch(/\.opponent-count[\s\S]*display:\s*none/);
  });
});

describe('board rendering', () => {
  it('draws a square grid of the variant\'s own size, sized to the board', () => {
    // The track count follows the rule set the game was dealt with, so one
    // grid serves the 9x9 phone game and the 11x11 large-shell game. Writing
    // either number in here would silently give the other variant a grid with
    // the wrong number of cells.
    expect(boardCss).toMatch(/grid-template-columns:\s*repeat\(var\(--board-cells/);
    expect(boardCss).toMatch(/grid-template-rows:\s*repeat\(var\(--board-cells/);
    expect(boardCss).toMatch(/width:\s*var\(--board-size\)/);
    expect(boardCss).toMatch(/height:\s*var\(--board-size\)/);
    expect(read('./Board.tsx')).toMatch(/'--board-cells':\s*size/);
  });

  it('fills each cell with the tile and draws its edge inside, never clipped', () => {
    // A placed tile fills its square edge to edge and draws its border as an
    // inset ring, so the cell's rounded corners cannot crop it. Cells are held
    // apart by the grid gap rather than by insetting the tile.
    const tile = boardCss.match(/\.board-tile\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(tile).toMatch(/position:\s*absolute/);
    expect(tile).toMatch(/inset:\s*0/);
    expect(tile).toMatch(/box-shadow:\s*\n?\s*inset/);
    expect(tile).not.toMatch(/box-shadow:\s*none/);
    expect(tile).not.toMatch(/\bborder:\s*\d/);

    const pendingRule = boardCss.match(/\.board-tile\.is-pending\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(pendingRule).toMatch(/box-shadow:\s*\n?\s*inset/);

    expect(boardCss).toMatch(/\.board\s*\{[^}]*gap:/s);
    expect(read('./TileFace.tsx')).toMatch(/<svg className="tile-face"/);
    expect(boardCss).toMatch(/\.board-tile \.tile-face/);
    expect(appCss).not.toMatch(/\.tile-letter[\s\S]*transform:\s*translate/);
  });
});

describe('input model', () => {
  it('drags with pointer events only — never the HTML5 drag-and-drop API', () => {
    // Pointer events cover mouse, touch and pen in one path; HTML5 dragstart
    // does not fire on touch at all, which is why it is banned outright.
    const sources = [
      'Board.tsx',
      'Rack.tsx',
      'Market.tsx',
      'Game.tsx',
      'useTileDrag.ts',
    ].map(file => read(`./${file}`));

    for (const source of sources) {
      expect(source).not.toMatch(/draggable/);
      expect(source).not.toMatch(/onDragStart|onDragOver|onDragEnter|onDragLeave|onDragEnd/);
      expect(source).not.toMatch(/dataTransfer/);
    }

    const dragHook = read('./useTileDrag.ts');
    expect(dragHook).toMatch(/pointermove/);
    expect(dragHook).toMatch(/pointerup/);
    expect(dragHook).toMatch(/pointercancel/);
  });

  it('keeps tap-to-place working alongside drag-to-place', () => {
    const game = read('./Game.tsx');
    expect(read('./Board.tsx')).toMatch(/onCellClick/);
    expect(game).toMatch(/handleCellClick/);
    expect(game).toMatch(/selectRackTile/);
    // A press that never became a drag still counts as a tap, and the ghost
    // click a real drag leaves behind is swallowed.
    expect(read('./useTileDrag.ts')).toMatch(/onTap/);
    expect(read('./useTileDrag.ts')).toMatch(/consumeGhostClick/);
    expect(game).toMatch(/drag\.consumeGhostClick/);
  });

  it('lets rack tiles be reordered and dropped onto the board', () => {
    const game = read('./Game.tsx');
    expect(game).toMatch(/useTileDrag/);
    expect(game).toMatch(/onDropOnBoard/);
    expect(game).toMatch(/onDropOnRack/);
    expect(game).toMatch(/reorderRack/);
    expect(read('./Rack.tsx')).toMatch(/data-rack-zone/);
    expect(read('./Rack.tsx')).toMatch(/data-rack-index/);

    // The drop index is read from the DOM but applied to a rack the dragged
    // tile has already left, so the DOM scan has to skip that tile. Counting
    // it lands every leftward drop one slot too far right.
    expect(read('./Rack.tsx')).toMatch(/data-lifted=/);
    expect(read('./useTileDrag.ts')).toMatch(/dataset\.lifted !== 'true'/);
    // …and it collapses out of the layout, so the only gap on the rack is the
    // one the tile would drop into.
    expect(rackCss).toMatch(/\.tray-tile\.is-lifted\s*\{[^}]*width:\s*0/s);
    // Touch drags must not scroll the page out from under the tile.
    expect(rackCss).toMatch(/touch-action:\s*none/);
  });
});

describe('score cards', () => {
  it('shows rack-count tile backs on both the You and opponent cards', () => {
    expect(read('./GameInfo.tsx')).toMatch(/rackCount/);
    expect(read('./GameInfo.tsx')).toMatch(/score-back/);
    expect(read('./GameInfo.tsx')).toMatch(/score-card-name/);
    expect(read('./GameInfo.tsx')).toMatch(/score-card-score/);
    expect(read('./Rack.tsx')).toMatch(/ScoreCard/);
    expect(read('./Game.tsx')).toMatch(/rackCount=\{p1\.rack\.length\}/);
    expect(read('./Game.tsx')).toMatch(/rackCount=\{p2\.rack\.length\}/);
  });

  it('places true P1 on the left and P2 on the right, identified by name and colour', () => {
    const game = read('./Game.tsx');
    expect(game).toMatch(/playerColor="P1"/);
    expect(game).toMatch(/playerColor="P2"/);
    expect(game).toMatch(/seatLabel\(0\)/);
    expect(game).toMatch(/seatLabel\(1\)/);
  });

  it('carries no avatars — a player is their name in their own colour', () => {
    for (const file of ['GameInfo.tsx', 'Rack.tsx', 'Game.tsx', 'Board.tsx']) {
      expect(read(`./${file}`), file).not.toMatch(/PlayerAvatar|avatar-/);
    }
    expect(existsSync(resolve(__dirname, './PlayerAvatar.tsx'))).toBe(false);
    expect(existsSync(resolve(__dirname, '../../public/avatar-human-p1.svg'))).toBe(false);

    const css = read('./GameInfo.css');
    expect(css).not.toMatch(/\.player-avatar/);
    expect(css).toMatch(/\.score-card\.is-p1 \.score-card-name[\s\S]*var\(--color-p1\)/);
    expect(css).toMatch(/\.score-card\.is-p2 \.score-card-name[\s\S]*var\(--color-p2\)/);
  });

  it('keeps name and score in reserved space so tile-backs cannot cover them', () => {
    // The card is a column: the head sits above the mini-rack, so the two can
    // never overlap. It used to rely on clipping the rack instead, which hid
    // the bottom of every tile rather than the name.
    const css = read('./GameInfo.css');
    expect(css).toMatch(/\.score-card-head/);
    expect(css).toMatch(/\.score-card[\s\S]*width:\s*0/);
    expect(css).toMatch(/\.score-card[\s\S]*flex-direction:\s*column/s);
    expect(css).not.toMatch(/\.score-backs\s*\{[^}]*overflow:\s*hidden/s);
    expect(css).toMatch(/score-pip\.is-empty/);
    // A full rack's worth of slots always, so both cards line up and the count
    // reads without being counted. The cap is the variant's, handed down as a
    // prop rather than read out of module scope.
    expect(read('./GameInfo.tsx')).toMatch(/length:\s*rackCapacity/);
  });

  it('bounds a mini-rack tile both ways so a short card cannot crop it', () => {
    // Width alone is not enough: the tile is square, so a card with less
    // leftover height than width silently clips the bottom off every tile.
    const rule =
      read('./GameInfo.css').match(/\.score-pip,\s*\n\.score-back\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(rule).toMatch(/aspect-ratio:\s*1/);
    expect(rule).toMatch(/max-width:\s*calc\(var\(--scores-h\)/);
  });

  it('paints the rack in the same fill as its owner\'s score card', () => {
    // One token per seat, used by both, so the rack reads as an extension of
    // the card rather than an unrelated slab.
    expect(appCss).toMatch(/--seat-card-bg-p1:/);
    expect(appCss).toMatch(/--seat-card-bg-p2:/);
    expect(read('./GameInfo.css')).toMatch(/background-color:\s*var\(--seat-card-bg-p1\)/);
    expect(read('./GameInfo.css')).toMatch(/background-color:\s*var\(--seat-card-bg-p2\)/);
    expect(rackCss).toMatch(/\.rack-row-inner\.is-p1 \.rack-tray[\s\S]*var\(--seat-card-bg-p1\)/);
    expect(rackCss).toMatch(/\.rack-row-inner\.is-p2 \.rack-tray[\s\S]*var\(--seat-card-bg-p2\)/);
  });
});

describe('market bag', () => {
  it('shows bag art with the remaining count as plain text beside it', () => {
    const market = read('./Market.tsx');
    expect(market).toMatch(/market-bag\.svg/);
    expect(market).toMatch(/market-bag-count/);
    expect(market).not.toMatch(/tray-label/);
    expect(market).not.toMatch(/>Bag</);
    expect(existsSync(resolve(__dirname, '../../public/market-bag.svg'))).toBe(true);

    // No white disc stamped on the bag to hold the number.
    const bag = read('../../public/market-bag.svg');
    expect(bag).not.toMatch(/id="count-well"/);
    expect(bag).not.toMatch(/>\d+</);

    // The number is UI text with real contrast against the page.
    const count = marketCss.match(/\.market-bag-count\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(count).toMatch(/color:\s*var\(--color-ink\)/);
    expect(count).not.toMatch(/border-radius:\s*50%/);
    expect(count).not.toMatch(/position:\s*absolute/);
  });

  it('sits the bag next to the row it refills, with no panel behind the tiles', () => {
    // The market lies on the bare page; the rack has the tray. That contrast
    // is what separates "on the table" from "in your hand".
    const tray = marketCss.match(/\.market-tray\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(tray).toMatch(/background:\s*none/);
    expect(marketCss).toMatch(/\.market-row-inner\s*\{[^}]*justify-content:\s*center/s);
    expect(read('./Market.tsx')).toMatch(/market-bag[\s\S]*market-tray/);
  });

  it('puts the two face-down slots on the end and refills them in place', () => {
    const game = read('../engine/game.ts');
    const deal = game.match(/function dealMarket[\s\S]*?\n\}/)?.[0] ?? '';
    expect(deal).toMatch(/for \(let i = 0; i < rules\.marketFaceUp/);
    expect(deal).toMatch(/for \(let i = 0; i < rules\.marketFaceDown/);
    expect(deal).not.toMatch(/random\(\)/);
    // A slot keeps its identity, so a replacement lands in the same position
    // with the same face-up or face-down state.
    const refill = game.match(/export function refillMarketSlot[\s\S]*?\n\}/)?.[0] ?? '';
    expect(refill).toMatch(/slot\.tile = bag\.shift/);
    expect(refill).not.toMatch(/faceUp\s*=/);
  });

  it('draws a face-down tile as the same tile, turned over', () => {
    const facedown = marketCss.match(/\.market-tile\.is-facedown\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(facedown).toMatch(/background-color:\s*var\(--color-tile\)/);
    expect(facedown).toMatch(/tile-back-url/);
    // Same stock and same radius as a face-up tile; only the printing differs.
    expect(facedown).not.toMatch(/border-radius/);
    expect(read('../../public/tile-back.svg')).toMatch(/#FDF9F2/i);
  });
});

describe('chrome colour', () => {
  it('uses a neutral blue for buttons and tile backs, not P1 teal or P2 terracotta', () => {
    expect(appCss).toMatch(/--color-chrome:\s*#5b7a92/i);
    expect(gameCss).toMatch(/background-color:\s*var\(--color-chrome\)/);
    expect(gameCss).not.toMatch(/\.action-draw:not\(:disabled\)[^{]*\{[^}]*--color-p1/s);
    expect(gameCss).not.toMatch(/\.action-play:not\(:disabled\)[^{]*\{[^}]*--color-p2/s);
    expect(read('./GameLog.css')).toMatch(/--color-chrome/);
    expect(read('../../public/tile-back.svg')).not.toMatch(/#56867C/i);
    expect(read('../../public/tile-back.svg')).not.toMatch(/#CB6B49/i);
    expect(read('../../public/tile-back.svg')).not.toMatch(/M50 20 L80 50/);
  });
});

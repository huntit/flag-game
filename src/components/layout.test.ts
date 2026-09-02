// Layout lock: the play screen must fit the visual viewport on iPhone and iPad
// with no vertical scrolling, and the player must never scroll to reach an
// action button. These assertions guard the CSS that guarantees it.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const read = (file: string) => readFileSync(resolve(__dirname, file), 'utf-8');

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

  it('has a landscape layout for iPad that keeps the controls on screen', () => {
    expect(gameCss).toMatch(/@media \(orientation: landscape\)/);
  });
});

const desktopBlock = (css: string) =>
  css.match(/@media \(min-width:\s*900px\) and \(pointer:\s*fine\)[\s\S]*/)?.[0] ?? '';

describe('desktop layout (wide fine-pointer windows only)', () => {
  const desktop = desktopBlock(gameCss);

  it('gates desktop rules on min-width and pointer:fine, never a user-agent', () => {
    expect(desktop.length).toBeGreaterThan(80);
    expect(gameCss).toMatch(/@media \(min-width:\s*900px\) and \(pointer:\s*fine\)/);
    expect(read('./Rack.css')).toMatch(/@media \(min-width:\s*900px\) and \(pointer:\s*fine\)/);
    expect(read('./Market.css')).toMatch(/@media \(min-width:\s*900px\) and \(pointer:\s*fine\)/);
    expect(read('./Board.css')).toMatch(/@media \(min-width:\s*900px\) and \(pointer:\s*fine\)/);

    for (const source of ['Game.tsx', 'Game.css', 'Rack.css', 'Market.css', 'Board.css', '../App.tsx']) {
      expect(read(`./${source}`), source).not.toMatch(/navigator\.userAgent|user-agent/i);
    }
  });

  it('caps board and tile size so they do not grow with the window', () => {
    expect(desktop).toMatch(/--board-max:\s*\d+px/);
    expect(desktop).toMatch(/--board-size:\s*min\(/);
    expect(desktop).toMatch(/var\(--board-max\)/);
    expect(desktop).toMatch(/--log-w:\s*\d+px/);
    // A hard pixel ceiling, so tiles stop growing once the window is big.
    expect(desktop).toMatch(/--tile:\s*\d+px/);
    expect(desktop).toMatch(/--tile-size:\s*min\([\s\S]*var\(--tile\)/);
  });

  it('forces tiles square so they cannot stretch with a 1fr sidebar', () => {
    const tileRule =
      read('./Rack.css').match(/\.tray-tile,\s*\n\.tray-slot-empty\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(tileRule).toMatch(/aspect-ratio:\s*1/);
    expect(tileRule).toMatch(/width:\s*var\(--tile-size\)/);
    expect(desktop).toMatch(/grid-template-rows:[\s\S]*var\(--rack-h\)/);
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

  it('centres a play column with a score-card and log column beside it', () => {
    // Board, market, rack and actions stack in the middle; the score cards and
    // the move log move into their own column so they cost the board no height.
    expect(desktop).toMatch(/grid-template-columns:\s*1fr auto var\(--log-w\) 1fr/);
    expect(desktop).toMatch(/\.play-main/);
    expect(desktop).toMatch(/--board-max:\s*6[0-9]\dpx/);
    expect(desktop).toMatch(/grid-template-areas:[\s\S]*'status'/);
    expect(desktop).toMatch(/grid-template-areas:[\s\S]*'rack'/);
    expect(desktop).toMatch(/grid-template-areas:[\s\S]*'actions'/);
    expect(desktop).toMatch(/\.play-side[\s\S]*grid-column:\s*3/);
    expect(read('./Game.tsx')).toMatch(/className="market-row"/);
    expect(read('./Game.tsx')).toMatch(/action-draw/);
    expect(read('./Game.tsx')).toMatch(/action-shuffle/);
  });

  it('moves the market out of the board column into its own panel', () => {
    // The market is a shared pool, the rack is your hand. Putting them in
    // different columns is the clearest way to say so, and it stops the two
    // tile rows competing for the board's width.
    expect(desktop).toMatch(/\.play-shell \.market-panel\s*\{[^}]*display:\s*flex/s);
    expect(desktop).toMatch(/grid-template-areas:[\s\S]*'rack'/);
    expect(desktop).not.toMatch(/grid-template-areas:[\s\S]*'market'/);
    expect(desktop).toMatch(/--market-cols:\s*3/);
    expect(read('./Market.css')).toMatch(/grid-template-columns:\s*repeat\(var\(--market-cols/);
    // Still one tile size: the panel changes where a tile sits, not its size.
    expect(read('./Market.css')).toMatch(/max-width:\s*var\(--tile-size\)/);
  });

  it('renders Draw once, in the column that holds the market', () => {
    // Two buttons doing the same job would put a duplicate in the a11y tree,
    // so the single node moves rather than being duplicated and hidden.
    const game = read('./Game.tsx');
    expect(game).toMatch(/const drawOrPassButton =/);
    expect(game).toMatch(/\{isDesktop && drawOrPassButton\}/);
    expect(game).toMatch(/\{!isDesktop && drawOrPassButton\}/);
    expect((game.match(/action-draw/g) ?? []).length).toBe(1);
    // The media query is the same one the CSS is gated on — not a UA test.
    const hook = read('./useDesktopLayout.ts');
    expect(hook).toMatch(/\(min-width: 900px\) and \(pointer: fine\)/);
    expect(hook).not.toMatch(/userAgent/i);
  });

  it('gives Draw and Play one width, and puts the buttons on real edges', () => {
    const shell = gameCss.match(/\.play-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(shell).toMatch(/--ctl-w:/);
    expect(gameCss).toMatch(/\.actions-row \.control-solid\s*\{[^}]*width:\s*var\(--ctl-w\)/s);
    expect(desktop).toMatch(/--ctl-w:\s*\d+px/);
    expect(desktop).toMatch(/\.market-panel \.control\s*\{[^}]*width:\s*var\(--ctl-w\)/s);
    // No inset on desktop: Shuffle and Play land on the board's own edges.
    expect(desktop).toMatch(/\.play-shell \.actions-row\s*\{[^}]*padding:\s*0/s);
  });

  it('keeps the move log a fixed window that follows the newest line', () => {
    expect(desktop).toMatch(/\.play-shell \.disclosure-body\s*\{[^}]*height:/s);
    expect(desktop).toMatch(/\.play-shell \.side-panel\s*\{[^}]*flex:\s*0 0 auto/s);
    const log = read('./MoveLog.tsx');
    expect(log).toMatch(/scrollTop = list\.scrollHeight/);
    expect(read('./MoveLog.css')).toMatch(/\.move-log-list[\s\S]*overflow-y:\s*auto/);
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
  it('uses Skye v3 vector wordmark with PNG fallback — not a tiny upscaled bitmap only', () => {
    for (const file of ['Game.tsx', 'Menu.tsx', 'OnlineMode.tsx']) {
      expect(read(`./${file}`)).toMatch(/HomeLink/);
    }
    const homeLink = read('./HomeLink.tsx');
    expect(homeLink).toMatch(/logo-header\.svg/);
    expect(homeLink).toMatch(/logo-header\.png/);
    expect(homeLink).toMatch(/width=\{?\d+/);
    expect(existsSync(resolve(__dirname, '../../public/logo-header.svg'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../public/logo-header.png'))).toBe(true);
  });

  it('ships pennant-only favicon without wordmark', () => {
    expect(indexHtml).toMatch(/favicon\.svg/);
    expect(existsSync(resolve(__dirname, '../../public/favicon.svg'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../public/flag-mark.svg'))).toBe(true);
    // No letters in the app mark — the wordmark is a separate asset.
    expect(read('../../public/favicon.svg')).not.toMatch(/<text/);
  });

  it('draws the app mark to survive a 16px browser tab', () => {
    const favicon = read('../../public/favicon.svg');

    // A solid ground, so the mark is a shape on a tab bar rather than loose
    // strokes floating on whatever colour the browser happens to use.
    expect(favicon).toMatch(/<rect width="100" height="100" rx="\d+" fill="#[0-9A-Fa-f]{6}"\/>/);

    // The pennant runs to the edge of the frame. The old mark stopped at 90
    // with the flag body ending near 70, which left a third of a 16px icon
    // empty and the rest too small to read.
    const pennant = favicon.match(/<path fill="#[0-9A-Fa-f]{6}" d="M(.+?)"/)?.[1] ?? '';
    const xs = [...pennant.matchAll(/(?:^|[ ,C])(\d+(?:\.\d+)?) \d/g)].map(m => Number(m[1]));
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(95);

    // A pole thin enough to fall between pixels disappears at 16px; 14/100 is
    // just over two pixels there.
    const pole = favicon.match(/<rect x="\d+" y="\d+" width="(\d+)"/)?.[1];
    expect(Number(pole)).toBeGreaterThanOrEqual(12);
  });

  it('ships every icon size index.html promises', () => {
    for (const file of [
      'favicon.svg',
      'favicon.ico',
      'favicon-16.png',
      'favicon-32.png',
      'apple-touch-icon.png',
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

  it('marks each goal corner as a triple-word square in its owner\'s colour', () => {
    // The goal is not a decoration on the square, it IS the square: a triple
    // word painted in the same colour as that player's score card, so there is
    // no doubt whose corner it is.
    const board = read('./Board.tsx');
    expect(board).toMatch(/flagOwner &&/);
    expect(board).toMatch(/goal-square is-\$\{flagOwner\.toLowerCase\(\)\}/);
    expect(board).toMatch(/goal-mult/);
    expect(board).toMatch(/3×/);
    expect(board).toMatch(/goal-word/);
    // Rendered, not an image, so it scales with the cell at any board size.
    expect(board).not.toMatch(/token-p[12]\.svg/);
    expect(board).not.toMatch(/corner-token/);

    expect(boardCss).toMatch(/\.goal-square\.is-p1\s*\{[^}]*background-color:\s*var\(--color-p1\)/s);
    expect(boardCss).toMatch(/\.goal-square\.is-p2\s*\{[^}]*background-color:\s*var\(--color-p2\)/s);
    // Fills the whole cell rather than sitting inside it as a token.
    expect(boardCss).toMatch(/\.goal-square\s*\{[^}]*inset:\s*0/s);
  });

  it('keeps the centre star until a word is actually committed', () => {
    // The star answers "where must the opening word cross?". Putting the first
    // tile down somewhere else does not answer it, so the star stays; a tile
    // landing ON the centre covers it through the normal letter branch.
    const board = read('./Board.tsx');
    expect(board).toMatch(/const showCentreStar = isFirstWord\(board\);/);
    expect(board).not.toMatch(/showCentreStar =[^;]*pendingPlacements\.length/);
  });

  it('marks the rack with its owner\'s seat colour, as the score card does', () => {
    expect(read('./Rack.tsx')).toMatch(/rack-seat-dot/);
    expect(rackCss).toMatch(/\.rack-row-inner\.is-p1 \.rack-seat-dot[\s\S]*var\(--color-p1\)/);
    expect(rackCss).toMatch(/\.rack-row-inner\.is-p2 \.rack-seat-dot[\s\S]*var\(--color-p2\)/);
    // The dot has reserved space in the rail rather than sitting on a tile.
    const shell = gameCss.match(/\.play-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(shell).toMatch(/--rack-dot:/);
    expect(shell).toMatch(/--rack-lead:[\s\S]*var\(--rack-dot\)/);
    expect(shell).toMatch(/--rack-fit:[\s\S]*var\(--rack-lead\)/);
  });

  it('sits the rack tiles in the rail, not under a translucent band', () => {
    // The old lip was an overlay drawn on top of the bottom of every tile.
    expect(rackCss).not.toMatch(/\.rack-tray::after/);
    expect(rackCss).toMatch(/\.rack-row-inner\.is-p1 \.rack-tray[\s\S]*inset 0 2px 5px/);
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

describe('desktop move log', () => {
  const desktop = desktopBlock(gameCss);
  const sidePanelCss = read('./SidePanel.css');
  const moveLogCss = read('./MoveLog.css');

  it('renders a collapsible RHS panel at pointer:fine + min-width 900', () => {
    expect(read('./Game.tsx')).toMatch(/SidePanel/);
    expect(desktop).toMatch(/grid-template-columns:\s*1fr auto var\(--log-w\) 1fr/);
    expect(desktop).toMatch(/\.play-side[\s\S]*grid-column:\s*3/);
    // The panel is hidden by default and switched on only by a shell that has
    // somewhere to put it, so a narrow phone can never show it.
    expect(sidePanelCss).toMatch(/\.side-panel\s*\{[^}]*display:\s*none/s);
    expect(desktop).toMatch(/\.side-panel\s*\{[^}]*display:\s*flex/s);
    expect(moveLogCss).toMatch(/\.move-log-list[\s\S]*overflow-y:\s*auto/);
  });

  it('opens and closes with a standard disclosure, not a LOG / HIDE LOG button', () => {
    const panel = read('./SidePanel.tsx');
    expect(panel).toMatch(/aria-expanded=\{expanded\}/);
    expect(panel).toMatch(/aria-controls="side-panel-log"/);
    expect(panel).toMatch(/disclosure-toggle/);
    expect(panel).toMatch(/disclosure-chevron/);
    // The control is titled with what it opens, and stays titled either way.
    expect(panel).toMatch(/Move log/);
    expect(panel).not.toMatch(/Hide log/);
    expect(sidePanelCss).toMatch(/aria-expanded='true'\]\s*\.disclosure-chevron/);
    expect(sidePanelCss).toMatch(/\.disclosure-chevron\s*\{[^}]*transition:\s*transform/s);
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
  it('draws an 11x11 grid sized to the computed board size', () => {
    expect(boardCss).toMatch(/grid-template-columns:\s*repeat\(11, 1fr\)/);
    expect(boardCss).toMatch(/grid-template-rows:\s*repeat\(11, 1fr\)/);
    expect(boardCss).toMatch(/width:\s*var\(--board-size\)/);
    expect(boardCss).toMatch(/height:\s*var\(--board-size\)/);
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
    // Seven slots always, so both cards line up and the count reads without
    // being counted.
    expect(read('./GameInfo.tsx')).toMatch(/length:\s*RACK_MAX/);
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
    expect(deal).toMatch(/for \(let i = 0; i < MARKET_FACE_UP/);
    expect(deal).toMatch(/for \(let i = 0; i < MARKET_FACE_DOWN/);
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
    expect(read('./SidePanel.css')).toMatch(/--color-chrome/);
    expect(read('../../public/tile-back.svg')).not.toMatch(/#56867C/i);
    expect(read('../../public/tile-back.svg')).not.toMatch(/#CB6B49/i);
    expect(read('../../public/tile-back.svg')).not.toMatch(/M50 20 L80 50/);
  });
});

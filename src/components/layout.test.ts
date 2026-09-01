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

  it('sizes the board from the space left over, so buttons are never pushed off', () => {
    const shell = gameCss.match(/\.play-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(shell).toMatch(/--board-size:\s*min\(/);
    expect(shell).toMatch(/var\(--app-h\) - var\(--chrome-h\)/);
    expect(shell).toMatch(/--chrome-h:/);
    // Rack + Play + Shuffle sit in a fixed grid row, never below the fold.
    expect(shell).toMatch(/grid-template-areas:[\s\S]*'rack'/);
    expect(shell).toMatch(/grid-template-areas:[\s\S]*'status'/);
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

  it('keeps toasts in a dedicated status row so they cannot cover the rack', () => {
    expect(gameCss).toMatch(/\.status-row/);
    expect(gameCss).toMatch(/grid-template-areas:[\s\S]*'status'/);
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
  const desktopRack = desktopBlock(read('./Rack.css'));
  const desktopMarket = desktopBlock(read('./Market.css'));

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
    expect(desktop).toMatch(/--shell-max-w:\s*\d+px/);
    expect(desktop).toMatch(/--tile:\s*\d+px/);
    expect(desktopRack).toMatch(/var\(--tile/);
    expect(desktopMarket).toMatch(/var\(--tile/);
  });

  it('forces rack tiles square so they cannot stretch with a 1fr sidebar', () => {
    expect(desktopRack).toMatch(/\.tray-tile,\s*\n\s*\.tray-slot-empty\s*\{[^}]*aspect-ratio:\s*1/s);
    expect(desktopRack).toMatch(/\.tray-tile,\s*\n\s*\.tray-slot-empty\s*\{[^}]*height:\s*var\(--tile/s);
    expect(desktopRack).toMatch(/\.tray-tile,\s*\n\s*\.tray-slot-empty\s*\{[^}]*max-height:\s*48px/s);
    expect(desktop).toMatch(/--dock-h:\s*\d+px/);
    expect(desktop).toMatch(/grid-template-rows:[\s\S]*var\(--board-size\)/);
    expect(desktop).not.toMatch(/grid-template-rows:[^;]*minmax\(0,\s*1fr\)/);
  });

  it('uses leftover viewport for a larger board, with Draw 2 by the market and Shuffle by the rack', () => {
    expect(desktop).toMatch(/grid-template-columns:\s*var\(--board-size\)\s+var\(--dock-min\)\s+var\(--log-w\)/);
    expect(desktop).toMatch(/--dock-min:/);
    expect(desktop).toMatch(/grid-template-areas:[\s\S]*dock/);
    expect(desktop).toMatch(/grid-template-areas:[\s\S]*sidebar/);
    expect(read('./Game.tsx')).toMatch(/className="dock"/);
    expect(read('./Game.tsx')).toMatch(/className="market-row"/);
    expect(read('./Game.tsx')).toMatch(/action-draw/);
    expect(read('./Game.tsx')).toMatch(/icon-button action-shuffle/);
    expect(desktop).toMatch(/\.dock[\s\S]*grid-area:\s*dock/);
    expect(desktop).toMatch(/\.stage[\s\S]*grid-area:\s*stage/);
  });

  it('keeps the phone shell as the un-queried default', () => {
    const phone = gameCss.slice(0, gameCss.indexOf('@media'));
    expect(phone).toMatch(/\.play-shell\s*\{/);
    expect(phone).toMatch(/--shell-max-w:\s*560px/);
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
  });

  it('uses Skye flag tokens only on squares that currently have a flag', () => {
    const board = read('./Board.tsx');
    expect(board).toMatch(/token-p1\.svg/);
    expect(board).toMatch(/token-p2\.svg/);
    expect(board).not.toMatch(/token-corner-empty\.svg/);
    expect(board).toMatch(/flagOwner &&/);
    expect(board).toMatch(/className="corner-token"/);
    expect(existsSync(resolve(__dirname, '../../public/token-p1.svg'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../../public/token-p2.svg'))).toBe(true);
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
    expect(desktop).toMatch(/sidebar/);
    expect(sidePanelCss).toMatch(/grid-area:\s*sidebar/);
    expect(sidePanelCss).toMatch(/@media \(min-width:\s*900px\) and \(pointer:\s*fine\)/);
    expect(moveLogCss).toMatch(/\.move-log-list[\s\S]*overflow-y:\s*auto/);
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

describe('no Pass action', () => {
  it('has Draw 2, Play, and Shuffle only — no Pass button', () => {
    const game = read('./Game.tsx');
    expect(game).toMatch(/Draw 2/);
    expect(game).toMatch(/action-play/);
    expect(game).toMatch(/action-shuffle/);
    expect(game).not.toMatch(/action-pass/);
    expect(game).not.toMatch(/handlePass/);
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

  it('aligns each tile to its cell and renders letters as SVG text', () => {
    const tile = boardCss.match(/\.board-tile\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(tile).toMatch(/position:\s*absolute/);
    expect(tile).toMatch(/inset:/);

    expect(read('./TileFace.tsx')).toMatch(/<svg className="tile-face"/);
    expect(boardCss).toMatch(/\.board-tile \.tile-face/);
    expect(boardCss).toMatch(/\.board-cell\s*\{[^}]*overflow:\s*hidden/s);
    expect(appCss).not.toMatch(/\.tile-letter[\s\S]*transform:\s*translate/);
  });
});

describe('input model', () => {
  it('is tap-to-place, with no HTML5 drag handlers anywhere', () => {
    const sources = [
      'Board.tsx',
      'Rack.tsx',
      'Market.tsx',
      'Game.tsx',
    ].map(file => read(`./${file}`));

    for (const source of sources) {
      expect(source).not.toMatch(/draggable/);
      expect(source).not.toMatch(/onDrag/);
      expect(source).not.toMatch(/onDrop/);
    }
    expect(read('./Board.tsx')).toMatch(/onCellClick/);
  });
});

describe('score cards', () => {
  it('shows rack-count tile backs on both the You and opponent cards', () => {
    expect(read('./GameInfo.tsx')).toMatch(/rackCount/);
    expect(read('./GameInfo.tsx')).toMatch(/score-back/);
    expect(read('./GameInfo.tsx')).toMatch(/score-card-name/);
    expect(read('./GameInfo.tsx')).toMatch(/score-card-score/);
    expect(read('./Rack.tsx')).toMatch(/ScoreCard/);
    expect(read('./Game.tsx')).toMatch(/rackCount=\{viewer\.rack\.length\}/);
  });

  it('keeps name and score in reserved space so tile-backs cannot cover them', () => {
    const css = read('./GameInfo.css');
    expect(css).toMatch(/grid-template-columns:\s*minmax\(6\.25rem/);
    expect(css).toMatch(/\.score-card[\s\S]*width:\s*0/);
    expect(css).toMatch(/\.score-backs[\s\S]*overflow:\s*hidden/s);
    expect(css).toMatch(/repeat\(7,/);
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

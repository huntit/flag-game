// Layout lock: the play screen must fit the visual viewport on iPhone and iPad
// with no vertical scrolling, and the player must never scroll to reach an
// action button. These assertions guard the CSS that guarantees it.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (file: string) => readFileSync(resolve(__dirname, file), 'utf-8');

const appCss = read('../App.css');
const gameCss = read('./Game.css');
const boardCss = read('./Board.css');
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
    // The action bar is a fixed grid row, not content that can overflow.
    expect(shell).toMatch(/grid-template-areas:[\s\S]*'actions'/);
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
    for (const row of ['--hud-h', '--opp-h', '--market-h', '--rack-h', '--actions-h']) {
      expect(shell, `${row} should clamp against --app-h`).toMatch(
        new RegExp(`${row}:\\s*clamp\\([^)]*var\\(--app-h\\)`)
      );
    }
  });

  it('keeps toasts out of the layout so a message cannot cause a scroll', () => {
    expect(gameCss).toMatch(/\.toast-layer\s*\{[^}]*position:\s*absolute/s);
    expect(gameCss).toMatch(/\.toast-layer\s*\{[^}]*pointer-events:\s*none/s);
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
    expect(desktopRack).toMatch(/width:\s*var\(--tile/);
    expect(desktopMarket).toMatch(/width:\s*var\(--tile/);
  });

  it('centers a compact play column with a stable action toolbar', () => {
    expect(desktop).toMatch(/grid-template-areas:[\s\S]*'stage stage'/);
    expect(desktop).toMatch(/grid-template-areas:[\s\S]*'rack actions'/);
    expect(desktop).toMatch(/\.actions[\s\S]*max-width:\s*\d+px/);
    expect(desktop).toMatch(/\.market-row[\s\S]*justify-self:\s*center/);
    expect(desktop).toMatch(/\.play-shell \.stage[\s\S]*grid-row:\s*auto/);
  });

  it('keeps the phone shell as the un-queried default', () => {
    const phone = gameCss.slice(0, gameCss.indexOf('@media'));
    expect(phone).toMatch(/\.play-shell\s*\{/);
    expect(phone).toMatch(/--shell-max-w:\s*560px/);
    expect(phone).toMatch(/grid-template-areas:[\s\S]*'actions'/);
    expect(phone).not.toMatch(/pointer:\s*fine/);
    expect(phone).not.toMatch(/--board-max:/);
  });
});

describe('board rendering', () => {
  it('draws an 11x11 grid sized to the computed board size', () => {
    expect(boardCss).toMatch(/grid-template-columns:\s*repeat\(11, 1fr\)/);
    expect(boardCss).toMatch(/grid-template-rows:\s*repeat\(11, 1fr\)/);
    expect(boardCss).toMatch(/width:\s*var\(--board-size\)/);
    expect(boardCss).toMatch(/height:\s*var\(--board-size\)/);
  });

  it('aligns each tile to its cell and scales text from the cell size', () => {
    const tile = boardCss.match(/\.board-tile\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(tile).toMatch(/position:\s*absolute/);
    expect(tile).toMatch(/inset:/);

    // Letter and value both scale with --cell, so nothing clips or drifts.
    expect(boardCss).toMatch(/\.board-tile \.tile-letter\s*\{[^}]*font-size:\s*calc\(var\(--cell\)/s);
    expect(boardCss).toMatch(/\.board-tile \.tile-value\s*\{[^}]*font-size:\s*calc\(var\(--cell\)/s);
    expect(boardCss).toMatch(/\.board-cell\s*\{[^}]*overflow:\s*hidden/s);
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

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

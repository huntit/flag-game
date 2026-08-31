// Move generator locks: everything it returns must be legal, and it must not
// miss plays that exist. Pass depends on this being right — Pass is only legal
// when the generator finds nothing.

import { describe, it, expect } from 'vitest';
import { Dictionary } from './dictionary';
import { generateLegalPlays, hasLegalPlay } from './moveGenerator';
import { validatePlay } from './validator';
import type { Board, Letter, Position, Tile } from './types';
import { BOARD_SIZE, CENTRE_STAR, FLAG_POSTS } from './types';

const VALUES: Record<string, number> = {
  A: 1, B: 4, C: 4, D: 2, E: 1, F: 4, G: 3, H: 3, I: 1, J: 10, K: 5, L: 2, M: 4,
  N: 2, O: 1, P: 4, Q: 10, R: 1, S: 1, T: 1, U: 2, V: 5, W: 4, X: 8, Y: 3, Z: 10,
};

const dictionary = new Dictionary([
  'AT', 'AD', 'AS', 'CAT', 'CATS', 'DO', 'DOG', 'ID', 'IT', 'OD', 'OS', 'SO',
  'TO', 'TA', 'STAR', 'RAT', 'RATS', 'ARTS', 'TAR', 'TARS', 'SAT', 'AH', 'HA',
]);

let seq = 0;
function tile(letter: Letter): Tile {
  return { id: `t${seq++}`, letter, value: VALUES[letter], isBlank: false };
}
function blank(): Tile {
  return { id: `b${seq++}`, letter: null, value: 0, isBlank: true };
}
function rackOf(letters: string): Tile[] {
  return letters.split('').map(l => tile(l as Letter));
}
function emptyBoard(): Board {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
}
function put(board: Board, word: string, at: Position, direction: 'h' | 'v'): void {
  word.split('').forEach((letter, i) => {
    const row = direction === 'h' ? at.row : at.row + i;
    const col = direction === 'h' ? at.col + i : at.col;
    board[row - 1][col - 1] = tile(letter as Letter);
  });
}

describe('opening plays', () => {
  it('only generates plays that cover the centre star', () => {
    const plays = generateLegalPlays(emptyBoard(), rackOf('CAT'), dictionary, 'NW');
    expect(plays.length).toBeGreaterThan(0);
    for (const play of plays) {
      const coversCentre = play.tiles.some(
        t => t.position.row === CENTRE_STAR.row && t.position.col === CENTRE_STAR.col
      );
      expect(coversCentre).toBe(true);
    }
  });

  it('finds the opening word in both directions', () => {
    const plays = generateLegalPlays(emptyBoard(), rackOf('CAT'), dictionary, 'NW');
    const cats = plays.filter(p => p.words.some(w => w.word === 'CAT'));
    const across = cats.filter(p => p.tiles.every(t => t.position.row === p.tiles[0].position.row));
    const down = cats.filter(p => p.tiles.every(t => t.position.col === p.tiles[0].position.col));
    expect(across.length).toBeGreaterThan(0);
    expect(down.length).toBeGreaterThan(0);
  });

  it('finds nothing when the rack cannot make a word', () => {
    // No two-letter or longer word in this dictionary uses only B and G.
    expect(hasLegalPlay(emptyBoard(), rackOf('BG'), dictionary, 'NW')).toBe(false);
  });
});

describe('every generated play is legal', () => {
  it('revalidates cleanly on an empty board', () => {
    const board = emptyBoard();
    const plays = generateLegalPlays(board, rackOf('CATSO'), dictionary, 'NW');
    expect(plays.length).toBeGreaterThan(0);
    for (const play of plays) {
      const check = validatePlay(board, play.tiles, dictionary, 'NW');
      expect(check.valid, `${play.words.map(w => w.word).join('/')} should be legal`).toBe(true);
      expect(check.totalScore).toBe(play.totalScore);
    }
  });

  it('revalidates cleanly mid-game, including all crosswords', () => {
    const board = emptyBoard();
    put(board, 'STAR', { row: 6, col: 5 }, 'h');

    const plays = generateLegalPlays(board, rackOf('CATOD'), dictionary, 'NE');
    expect(plays.length).toBeGreaterThan(0);
    for (const play of plays) {
      const check = validatePlay(board, play.tiles, dictionary, 'NE');
      expect(check.valid, `${play.words.map(w => w.word).join('/')} should be legal`).toBe(true);
      for (const word of check.words ?? []) {
        expect(dictionary.isValid(word.word)).toBe(true);
      }
    }
  });

  it('never places a tile on an occupied square', () => {
    const board = emptyBoard();
    put(board, 'STAR', { row: 6, col: 5 }, 'h');

    for (const play of generateLegalPlays(board, rackOf('CATO'), dictionary, 'NW')) {
      for (const placed of play.tiles) {
        expect(board[placed.position.row - 1][placed.position.col - 1]).toBeNull();
      }
    }
  });

  it('never uses a rack tile twice in one play', () => {
    const board = emptyBoard();
    put(board, 'STAR', { row: 6, col: 5 }, 'h');

    for (const play of generateLegalPlays(board, rackOf('SATOD'), dictionary, 'NW')) {
      const ids = play.tiles.map(t => t.tile.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('completeness', () => {
  it('finds the single-tile play that extends an existing word', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 6, col: 5 }, 'h');

    const plays = generateLegalPlays(board, rackOf('S'), dictionary, 'NW');
    const cats = plays.find(p => p.words.some(w => w.word === 'CATS'));
    expect(cats).toBeDefined();
    expect(cats!.tiles).toHaveLength(1);
    expect(cats!.tiles[0].position).toEqual({ row: 6, col: 8 });
    expect(cats!.totalScore).toBe(7); // C4 A1 T1 S1
  });

  it('finds a play that hooks perpendicular to an existing word', () => {
    const board = emptyBoard();
    put(board, 'AT', { row: 6, col: 6 }, 'h');

    // DO under AT makes AD and TO as well.
    const plays = generateLegalPlays(board, rackOf('DO'), dictionary, 'NW');
    const hook = plays.find(
      p => p.words.some(w => w.word === 'DO') && p.words.some(w => w.word === 'AD')
    );
    expect(hook).toBeDefined();
    expect(hook!.totalScore).toBe(3 + 3 + 2); // DO + AD + TO
  });

  it('uses a blank when no real tile fits, scoring it zero', () => {
    const board = emptyBoard();
    const plays = generateLegalPlays(board, [tile('A'), blank()], dictionary, 'NW');
    const withBlank = plays.filter(p => p.tiles.some(t => t.tile.isBlank));
    expect(withBlank.length).toBeGreaterThan(0);
    for (const play of withBlank) {
      const blankTile = play.tiles.find(t => t.tile.isBlank)!;
      expect(blankTile.assignedLetter).toBeDefined();
      expect(play.totalScore).toBe(1); // only the A scores
    }
  });

  it('reports a capture when a play covers the live post', () => {
    const board = emptyBoard();
    // T sits directly below the NW post, so playing A onto (2,2) makes AT.
    put(board, 'T', { row: 3, col: 2 }, 'v');
    put(board, 'STAR', { row: 6, col: 5 }, 'h'); // board is not empty

    const plays = generateLegalPlays(board, rackOf('A'), dictionary, 'NW');
    const capture = plays.find(p => p.captures);
    expect(capture).toBeDefined();
    expect(capture!.tiles[0].position).toEqual(FLAG_POSTS.NW);

    // The same play is not a capture when a different post is live.
    const elsewhere = generateLegalPlays(board, rackOf('A'), dictionary, 'SE');
    expect(elsewhere.some(p => p.captures)).toBe(false);
  });
});

describe('early exit', () => {
  it('stops at the requested limit', () => {
    const plays = generateLegalPlays(emptyBoard(), rackOf('CATSO'), dictionary, 'NW', { limit: 3 });
    expect(plays).toHaveLength(3);
  });

  it('hasLegalPlay agrees with the full generator', () => {
    const board = emptyBoard();
    put(board, 'STAR', { row: 6, col: 5 }, 'h');

    expect(hasLegalPlay(board, rackOf('S'), dictionary, 'NW')).toBe(true);
    expect(hasLegalPlay(board, [], dictionary, 'NW')).toBe(false);

    // Only high-value consonants that form nothing in this small dictionary.
    const stuck = generateLegalPlays(board, rackOf('BFJK'), dictionary, 'NW');
    expect(stuck).toHaveLength(0);
    expect(hasLegalPlay(board, rackOf('BFJK'), dictionary, 'NW')).toBe(false);
  });
});

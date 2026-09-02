// Word validity and scoring locks.
//
// Regression tests for crossword scoring and flag multipliers on capture words.

import { describe, it, expect } from 'vitest';
import { Dictionary } from './dictionary';
import { validatePlay, findWordsFormed, readWord, type FlagContext } from './validator';
import type { Placement } from './validator';
import type { Board, Letter, Position, Tile } from './types';
import { PHONE_9, centreStar, flagPosts } from './variants';

// These tests exercise the phone default; the geometry comes from its rule set.
const BOARD_SIZE = PHONE_9.boardSize;
const CENTRE_STAR = centreStar(BOARD_SIZE);
const FLAG_POSTS = flagPosts(BOARD_SIZE);


const VALUES: Record<string, number> = {
  A: 1, B: 4, C: 4, D: 2, E: 1, F: 4, G: 3, H: 3, I: 1, J: 10, K: 5, L: 2, M: 4,
  N: 2, O: 1, P: 4, Q: 10, R: 1, S: 1, T: 1, U: 2, V: 5, W: 4, X: 8, Y: 3, Z: 10,
};

const dictionary = new Dictionary([
  'AD', 'AH', 'AT', 'AX', 'ART', 'RT', 'CAT', 'CATS', 'DO', 'DOG', 'DOGS', 'ID', 'IT', 'JO',
  'OD', 'OX', 'QI', 'TO', 'ZA', 'HAZE', 'MAZE', 'QUARTZ', 'JAZZY', 'STAR',
  'STARE', 'RATE', 'TEA', 'EAT', 'ATE', 'SO', 'OS', 'AS', 'TAD', 'TODS',
]);

let tileSeq = 0;

function tile(letter: Letter): Tile {
  return { id: `t${tileSeq++}`, letter, value: VALUES[letter], isBlank: false };
}

function blank(): Tile {
  return { id: `b${tileSeq++}`, letter: null, value: 0, isBlank: true };
}

function emptyBoard(): Board {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));
}

function put(board: Board, word: string, at: Position, direction: 'h' | 'v'): void {
  word.split('').forEach((letter, i) => {
    const row = direction === 'h' ? at.row : at.row + i;
    const col = direction === 'h' ? at.col + i : at.col;
    board[row - 1][col - 1] = tile(letter as Letter);
  });
}

function lay(word: string, at: Position, direction: 'h' | 'v'): Placement[] {
  return word.split('').map((letter, i) => ({
    tile: tile(letter as Letter),
    position:
      direction === 'h'
        ? { row: at.row, col: at.col + i }
        : { row: at.row + i, col: at.col },
  }));
}

function letterSum(word: string): number {
  return word.split('').reduce((sum, letter) => sum + VALUES[letter], 0);
}

function flagCtx(overrides: Partial<FlagContext> = {}): FlagContext {
  return {
    flags: { P1: 'NW', P2: 'SE' },
    playerId: 'P1',
    flagsLost: { P1: 0, P2: 0 },
    emptySpareCount: 2,
    ...overrides,
  };
}

describe('word formation', () => {
  it('reads a run of tiles as a word with its letter-value score', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 6, col: 5 }, 'h');

    const word = readWord(board, { row: 6, col: 6 }, true);
    expect(word?.word).toBe('CAT');
    expect(word?.score).toBe(letterSum('CAT'));
  });

  it('treats a lone letter as no word', () => {
    const board = emptyBoard();
    put(board, 'A', { row: 6, col: 6 }, 'h');
    expect(readWord(board, { row: 6, col: 6 }, true)).toBeNull();
    expect(readWord(board, { row: 6, col: 6 }, false)).toBeNull();
  });

  it('finds crosswords formed by a horizontal play (regression)', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 6, col: 5 }, 'h');

    const result = findWordsFormed(board, lay('DOG', { row: 7, col: 5 }, 'h'), dictionary);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Not a word/);
  });

  it('finds crosswords formed by a vertical play', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 5, col: 6 }, 'v');

    const result = findWordsFormed(board, lay('DOG', { row: 5, col: 7 }, 'v'), dictionary);
    expect(result.valid).toBe(false);
  });

  it('accepts a play whose crosswords are all real words', () => {
    const board = emptyBoard();
    put(board, 'AT', { row: 6, col: 6 }, 'h');

    const result = findWordsFormed(board, lay('DO', { row: 7, col: 6 }, 'h'), dictionary);
    expect(result.valid).toBe(true);
    const words = result.words.map(w => w.word).sort();
    expect(words).toEqual(['AD', 'DO', 'TO']);
  });

  it('rejects tiles that are not in one straight line', () => {
    const board = emptyBoard();
    put(board, 'A', { row: 6, col: 6 }, 'h');

    const result = findWordsFormed(
      board,
      [
        { tile: tile('C'), position: { row: 6, col: 5 } },
        { tile: tile('T'), position: { row: 7, col: 7 } },
      ],
      dictionary
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/straight line/);
  });

  it('rejects a gap between placed tiles', () => {
    const board = emptyBoard();
    put(board, 'A', { row: 6, col: 6 }, 'h');

    const result = findWordsFormed(
      board,
      [
        { tile: tile('C'), position: { row: 6, col: 4 } },
        { tile: tile('T'), position: { row: 6, col: 8 } },
      ],
      dictionary
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/contiguous/);
  });

  it('reads through an existing tile between placed tiles', () => {
    const board = emptyBoard();
    put(board, 'A', { row: 6, col: 6 }, 'h');

    const result = findWordsFormed(
      board,
      [
        { tile: tile('C'), position: { row: 6, col: 5 } },
        { tile: tile('T'), position: { row: 6, col: 7 } },
      ],
      dictionary
    );
    expect(result.valid).toBe(true);
    expect(result.words.map(w => w.word)).toEqual(['CAT']);
  });
});

describe('scoring', () => {
  it('scores a single word as the sum of its letter values', () => {
    const board = emptyBoard();
    const result = validatePlay(board, lay('CAT', { row: 5, col: 4 }, 'h'), dictionary, flagCtx());

    expect(result.valid).toBe(true);
    expect(result.totalScore).toBe(6);
  });

  it('does not multiply a vertical word by the number of tiles placed (regression)', () => {
    const board = emptyBoard();
    const result = validatePlay(board, lay('CAT', { row: 4, col: 5 }, 'v'), dictionary, flagCtx());

    expect(result.valid).toBe(true);
    expect(result.words?.map(w => w.word)).toEqual(['CAT']);
    expect(result.totalScore).toBe(6);
  });

  it('scores horizontal and vertical openings identically', () => {
    const ctx = flagCtx();
    const across = validatePlay(emptyBoard(), lay('CAT', { row: 5, col: 4 }, 'h'), dictionary, ctx);
    const down = validatePlay(emptyBoard(), lay('CAT', { row: 4, col: 5 }, 'v'), dictionary, ctx);
    expect(down.totalScore).toBe(across.totalScore);
  });

  it('counts existing board tiles inside the word', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 6, col: 5 }, 'h');

    const result = validatePlay(
      board,
      [{ tile: tile('S'), position: { row: 6, col: 8 } }],
      dictionary,
      flagCtx()
    );
    expect(result.valid).toBe(true);
    expect(result.words?.map(w => w.word)).toEqual(['CATS']);
    expect(result.totalScore).toBe(letterSum('CATS'));
  });

  it('scores every word formed when one play makes several', () => {
    const board = emptyBoard();
    put(board, 'AT', { row: 6, col: 6 }, 'h');

    const result = validatePlay(board, lay('DO', { row: 7, col: 6 }, 'h'), dictionary, flagCtx());

    expect(result.valid).toBe(true);
    const expected = letterSum('DO') + letterSum('AD') + letterSum('TO');
    expect(result.totalScore).toBe(expected);
  });

  it('scores high-value letters from the tile set', () => {
    const board = emptyBoard();
    const result = validatePlay(board, lay('JO', { row: 5, col: 5 }, 'h'), dictionary, flagCtx());
    expect(result.valid).toBe(true);
    expect(result.totalScore).toBe(11);
  });

  it('scores a two-letter word', () => {
    const board = emptyBoard();
    const result = validatePlay(board, lay('OX', { row: 5, col: 5 }, 'h'), dictionary, flagCtx());
    expect(result.valid).toBe(true);
    expect(result.totalScore).toBe(9);
  });

  it('scores a blank as zero but validates its assigned letter', () => {
    const board = emptyBoard();
    const placements: Placement[] = [
      { tile: tile('O'), position: { row: 5, col: 5 } },
      { tile: blank(), position: { row: 5, col: 6 }, assignedLetter: 'X' as Letter },
    ];

    const result = validatePlay(board, placements, dictionary, flagCtx());
    expect(result.valid).toBe(true);
    expect(result.words?.[0].word).toBe('OX');
    expect(result.totalScore).toBe(1);
  });

  it('rejects a blank with no assigned letter', () => {
    const board = emptyBoard();
    const result = validatePlay(
      board,
      [
        { tile: tile('O'), position: { row: 5, col: 5 } },
        { tile: blank(), position: { row: 5, col: 6 } },
      ],
      dictionary,
      flagCtx()
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/blank/i);
  });

  it('applies triple-word to own-flag capture word only', () => {
    expect(FLAG_POSTS.NW).toEqual({ row: 1, col: 1 });

    const board = emptyBoard();
    put(board, 'RT', { row: 1, col: 2 }, 'h');

    const result = validatePlay(
      board,
      [{ tile: tile('A'), position: FLAG_POSTS.NW }],
      dictionary,
      flagCtx({ flags: { P1: 'NW', P2: 'SE' }, playerId: 'P1' })
    );
    expect(result.valid).toBe(true);
    expect(result.capturesOwnFlag).toBe(true);
    expect(result.words?.map(w => w.word)).toEqual(['ART']);
    expect(result.totalScore).toBe(letterSum('ART') * 3);
  });

  it('applies no bingo bonus for emptying a six-tile rack', () => {
    const board = emptyBoard();
    const result = validatePlay(
      board,
      lay('QUARTZ', { row: 5, col: 3 }, 'h'),
      dictionary,
      flagCtx()
    );
    expect(result.valid).toBe(true);
    expect(result.totalScore).toBe(letterSum('QUARTZ'));
    expect(result.totalScore).toBe(25);
  });
});

describe('placement rules', () => {
  it('requires the first word to cover the centre star', () => {
    expect(CENTRE_STAR).toEqual({ row: 5, col: 5 });

    const offCentre = validatePlay(
      emptyBoard(),
      lay('CAT', { row: 1, col: 1 }, 'h'),
      dictionary,
      flagCtx()
    );
    expect(offCentre.valid).toBe(false);
    expect(offCentre.reason).toMatch(/centre star/);

    const onCentre = validatePlay(
      emptyBoard(),
      lay('CAT', { row: 5, col: 5 }, 'h'),
      dictionary,
      flagCtx()
    );
    expect(onCentre.valid).toBe(true);
  });

  it('requires later plays to touch the board', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 6, col: 5 }, 'h');

    const detached = validatePlay(board, lay('DOG', { row: 1, col: 1 }, 'h'), dictionary, flagCtx());
    expect(detached.valid).toBe(false);
    expect(detached.reason).toMatch(/touch/);
  });

  it('rejects a single tile that forms no word', () => {
    const board = emptyBoard();
    const result = validatePlay(
      board,
      [{ tile: tile('A'), position: CENTRE_STAR }],
      dictionary,
      flagCtx()
    );
    expect(result.valid).toBe(false);
  });

  it('rejects playing onto an occupied square', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 6, col: 5 }, 'h');

    const result = validatePlay(
      board,
      [{ tile: tile('S'), position: { row: 6, col: 6 } }],
      dictionary,
      flagCtx()
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/taken/);
  });

  it('rejects two tiles on the same square', () => {
    const result = validatePlay(
      emptyBoard(),
      [
        { tile: tile('A'), position: CENTRE_STAR },
        { tile: tile('T'), position: CENTRE_STAR },
      ],
      dictionary,
      flagCtx()
    );
    expect(result.valid).toBe(false);
  });

  it('does not capture when a tile misses both flags', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 3, col: 2 }, 'v');

    const result = validatePlay(
      board,
      [{ tile: tile('S'), position: { row: 6, col: 2 } }],
      dictionary,
      flagCtx()
    );
    expect(result.captures ?? false).toBe(false);
  });
});

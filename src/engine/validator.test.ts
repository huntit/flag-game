// Word validity and scoring locks.
//
// These are regression tests for two bugs found in the feel-test build:
//   1. Crosswords formed by a horizontal play were never checked, so illegal
//      words were accepted and their points were never counted.
//   2. A vertical play scored its main word once per placed tile, so a 3-tile
//      vertical play scored 4x.

import { describe, it, expect } from 'vitest';
import { Dictionary } from './dictionary';
import { validatePlay, findWordsFormed, readWord } from './validator';
import type { Placement } from './validator';
import type { Board, Letter, Position, Tile } from './types';
import { BOARD_SIZE, CENTRE_STAR, FLAG_POSTS } from './types';

// Word Eagle WWF values, matching data/tiles.json.
const VALUES: Record<string, number> = {
  A: 1, B: 4, C: 4, D: 2, E: 1, F: 4, G: 3, H: 3, I: 1, J: 10, K: 5, L: 2, M: 4,
  N: 2, O: 1, P: 4, Q: 10, R: 1, S: 1, T: 1, U: 2, V: 5, W: 4, X: 8, Y: 3, Z: 10,
};

const dictionary = new Dictionary([
  'AD', 'AH', 'AT', 'AX', 'CAT', 'CATS', 'DO', 'DOG', 'DOGS', 'ID', 'IT', 'JO',
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

/** Write existing tiles onto a board: put('CAT', {row:6,col:5}, 'h'). */
function put(board: Board, word: string, at: Position, direction: 'h' | 'v'): void {
  word.split('').forEach((letter, i) => {
    const row = direction === 'h' ? at.row : at.row + i;
    const col = direction === 'h' ? at.col + i : at.col;
    board[row - 1][col - 1] = tile(letter as Letter);
  });
}

/** Build placements for a word laid out from `at`. */
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

describe('word formation', () => {
  it('reads a run of tiles as a word with its letter-value score', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 6, col: 5 }, 'h');

    const word = readWord(board, { row: 6, col: 6 }, true);
    expect(word?.word).toBe('CAT');
    expect(word?.score).toBe(letterSum('CAT')); // C4 + A1 + T1 = 6
  });

  it('treats a lone letter as no word', () => {
    const board = emptyBoard();
    put(board, 'A', { row: 6, col: 6 }, 'h');
    expect(readWord(board, { row: 6, col: 6 }, true)).toBeNull();
    expect(readWord(board, { row: 6, col: 6 }, false)).toBeNull();
  });

  it('finds crosswords formed by a horizontal play (regression)', () => {
    // CAT sits horizontally. Playing DOG directly underneath would form the
    // vertical pairs CD, AO and TG, none of which are words.
    const board = emptyBoard();
    put(board, 'CAT', { row: 6, col: 5 }, 'h');

    const result = findWordsFormed(board, lay('DOG', { row: 7, col: 5 }, 'h'), dictionary);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Not a word/);
  });

  it('finds crosswords formed by a vertical play', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 5, col: 6 }, 'v');

    // Placing DOG in the neighbouring column forms CD, AO, TG vertically...
    const result = findWordsFormed(board, lay('DOG', { row: 5, col: 7 }, 'v'), dictionary);
    expect(result.valid).toBe(false);
  });

  it('accepts a play whose crosswords are all real words', () => {
    // T O   with AT and TO reading down/across.
    const board = emptyBoard();
    put(board, 'AT', { row: 6, col: 6 }, 'h');

    // Place D under A to make AD, and O under T to make TO. Row 7 reads DO.
    const result = findWordsFormed(
      board,
      lay('DO', { row: 7, col: 6 }, 'h'),
      dictionary
    );
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
    const result = validatePlay(board, lay('CAT', { row: 6, col: 5 }, 'h'), dictionary, 'NW');

    expect(result.valid).toBe(true);
    expect(result.totalScore).toBe(6); // C4 + A1 + T1
  });

  it('does not multiply a vertical word by the number of tiles placed (regression)', () => {
    const board = emptyBoard();
    const result = validatePlay(board, lay('CAT', { row: 5, col: 6 }, 'v'), dictionary, 'NW');

    expect(result.valid).toBe(true);
    expect(result.words?.map(w => w.word)).toEqual(['CAT']);
    expect(result.totalScore).toBe(6);
  });

  it('scores horizontal and vertical openings identically', () => {
    const across = validatePlay(emptyBoard(), lay('CAT', { row: 6, col: 5 }, 'h'), dictionary, 'NW');
    const down = validatePlay(emptyBoard(), lay('CAT', { row: 5, col: 6 }, 'v'), dictionary, 'NW');
    expect(down.totalScore).toBe(across.totalScore);
  });

  it('counts existing board tiles inside the word', () => {
    // CAT on the board; add S to make CATS. The whole word scores, not just S.
    const board = emptyBoard();
    put(board, 'CAT', { row: 6, col: 5 }, 'h');

    const result = validatePlay(
      board,
      [{ tile: tile('S'), position: { row: 6, col: 8 } }],
      dictionary,
      'NW'
    );
    expect(result.valid).toBe(true);
    expect(result.words?.map(w => w.word)).toEqual(['CATS']);
    expect(result.totalScore).toBe(letterSum('CATS')); // 4+1+1+1 = 7
  });

  it('scores every word formed when one play makes several', () => {
    const board = emptyBoard();
    put(board, 'AT', { row: 6, col: 6 }, 'h');

    // DO across row 7 also makes AD and TO down.
    const result = validatePlay(board, lay('DO', { row: 7, col: 6 }, 'h'), dictionary, 'NW');

    expect(result.valid).toBe(true);
    const expected = letterSum('DO') + letterSum('AD') + letterSum('TO');
    expect(expected).toBe(3 + 3 + 2);
    expect(result.totalScore).toBe(expected);
  });

  it('scores high-value letters from the tile set', () => {
    const board = emptyBoard();
    const result = validatePlay(board, lay('JO', { row: 6, col: 6 }, 'h'), dictionary, 'NW');
    expect(result.valid).toBe(true);
    expect(result.totalScore).toBe(11); // J10 + O1
  });

  it('scores a two-letter word', () => {
    const board = emptyBoard();
    const result = validatePlay(board, lay('OX', { row: 6, col: 6 }, 'h'), dictionary, 'NW');
    expect(result.valid).toBe(true);
    expect(result.totalScore).toBe(9); // O1 + X8
  });

  it('scores a blank as zero but validates its assigned letter', () => {
    const board = emptyBoard();
    const placements: Placement[] = [
      { tile: tile('O'), position: { row: 6, col: 6 } },
      { tile: blank(), position: { row: 6, col: 7 }, assignedLetter: 'X' as Letter },
    ];

    const result = validatePlay(board, placements, dictionary, 'NW');
    expect(result.valid).toBe(true);
    expect(result.words?.[0].word).toBe('OX');
    expect(result.totalScore).toBe(1); // O1 + blank 0
  });

  it('rejects a blank with no assigned letter', () => {
    const board = emptyBoard();
    const result = validatePlay(
      board,
      [
        { tile: tile('O'), position: { row: 6, col: 6 } },
        { tile: blank(), position: { row: 6, col: 7 } },
      ],
      dictionary,
      'NW'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/blank/i);
  });

  it('scores a capturing play with no capture bonus', () => {
    expect(FLAG_POSTS.NW).toEqual({ row: 2, col: 2 });

    // T already sits below the NW post; playing A onto the post makes AT.
    const board = emptyBoard();
    put(board, 'T', { row: 3, col: 2 }, 'v');

    const result = validatePlay(
      board,
      [{ tile: tile('A'), position: FLAG_POSTS.NW }],
      dictionary,
      'NW'
    );
    expect(result.valid).toBe(true);
    expect(result.captures).toBe(true);
    expect(result.words?.map(w => w.word)).toEqual(['AT']);
    // Letter values only: A1 + T1. No doubling, no +20.
    expect(result.totalScore).toBe(2);
  });

  it('applies no bingo bonus for emptying a seven-tile rack', () => {
    const board = emptyBoard();
    const result = validatePlay(
      board,
      lay('QUARTZ', { row: 6, col: 4 }, 'h'),
      dictionary,
      'NW'
    );
    expect(result.valid).toBe(true);
    // Q10 + U2 + A1 + R1 + T1 + Z10 = 25, with nothing added for the long play.
    expect(result.totalScore).toBe(letterSum('QUARTZ'));
    expect(result.totalScore).toBe(25);
  });
});

describe('placement rules', () => {
  it('requires the first word to cover the centre star', () => {
    expect(CENTRE_STAR).toEqual({ row: 6, col: 6 });

    const offCentre = validatePlay(
      emptyBoard(),
      lay('CAT', { row: 1, col: 1 }, 'h'),
      dictionary,
      'NW'
    );
    expect(offCentre.valid).toBe(false);
    expect(offCentre.reason).toMatch(/centre star/);

    const onCentre = validatePlay(
      emptyBoard(),
      lay('CAT', { row: 6, col: 6 }, 'h'),
      dictionary,
      'NW'
    );
    expect(onCentre.valid).toBe(true);
  });

  it('requires later plays to touch the board', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 6, col: 5 }, 'h');

    const detached = validatePlay(board, lay('DOG', { row: 1, col: 1 }, 'h'), dictionary, 'NW');
    expect(detached.valid).toBe(false);
    expect(detached.reason).toMatch(/touch/);
  });

  it('rejects a single tile that forms no word', () => {
    const board = emptyBoard();
    const result = validatePlay(
      board,
      [{ tile: tile('A'), position: CENTRE_STAR }],
      dictionary,
      'NW'
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
      'NW'
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
      'NW'
    );
    expect(result.valid).toBe(false);
  });

  it('flags a capture only when a tile lands on the live post', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 3, col: 2 }, 'v');

    const onLive = validatePlay(
      board,
      [{ tile: tile('S'), position: { row: 6, col: 2 } }],
      dictionary,
      'NW'
    );
    // (6,2) is not a post, so no capture even if the word is fine.
    expect(onLive.captures ?? false).toBe(false);
  });
});

// Move generator locks: everything it returns must be legal, and it must not
// miss plays that exist. Pass depends on this being right — Pass is only legal
// when the generator finds nothing.

import { describe, it, expect } from 'vitest';
import { Dictionary } from './dictionary';
import { generateLegalPlays, hasLegalPlay } from './moveGenerator';
import { validatePlay, type FlagContext } from './validator';
import type { Board, FlagPost, GameState, Letter, Position, Tile } from './types';
import { PHONE_9, centreStar, flagPosts } from './variants';

// These tests exercise the phone default; the geometry comes from its rule set.
const BOARD_SIZE = PHONE_9.boardSize;
const CENTRE_STAR = centreStar(BOARD_SIZE);
const FLAG_POSTS = flagPosts(BOARD_SIZE);

import { emptySpareCorners } from './game';

const VALUES: Record<string, number> = {
  A: 1, B: 4, C: 4, D: 2, E: 1, F: 4, G: 3, H: 3, I: 1, J: 10, K: 5, L: 2, M: 4,
  N: 2, O: 1, P: 4, Q: 10, R: 1, S: 1, T: 1, U: 2, V: 5, W: 4, X: 8, Y: 3, Z: 10,
};

const dictionary = new Dictionary([
  'AT', 'AD', 'AS', 'ART', 'CAT', 'CATS', 'DO', 'DOG', 'ID', 'IT', 'OD', 'OS', 'SO',
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

function mockState(
  board: Board,
  flags: { P1: FlagPost | null; P2: FlagPost | null } = { P1: 'NW', P2: 'SE' }
): GameState {
  return {
    rules: PHONE_9,
    board,
    players: [
      { id: 'P1', rack: [], score: 0, flagsLost: 0 },
      { id: 'P2', rack: [], score: 0, flagsLost: 0 },
    ],
    currentPlayer: 0,
    market: [],
    bag: [],
    flags,
    consecutiveExchanges: 0,
    consecutivePasses: 0,
    gameOver: false,
    turnCount: 0,
    moveHistory: [],
  };
}

function flagContext(state: GameState, playerId: 'P1' | 'P2'): FlagContext {
  return {
    flags: state.flags,
    playerId,
    flagsLost: { P1: state.players[0].flagsLost, P2: state.players[1].flagsLost },
    emptySpareCount: emptySpareCorners(state).length,
  };
}

describe('opening plays', () => {
  it('only generates plays that cover the centre star', () => {
    const state = mockState(emptyBoard());
    const plays = generateLegalPlays(state, rackOf('CAT'), dictionary, 'P1');
    expect(plays.length).toBeGreaterThan(0);
    for (const play of plays) {
      const coversCentre = play.tiles.some(
        t => t.position.row === CENTRE_STAR.row && t.position.col === CENTRE_STAR.col
      );
      expect(coversCentre).toBe(true);
    }
  });

  it('finds the opening word in both directions', () => {
    const state = mockState(emptyBoard());
    const plays = generateLegalPlays(state, rackOf('CAT'), dictionary, 'P1');
    const cats = plays.filter(p => p.words.some(w => w.word === 'CAT'));
    const across = cats.filter(p => p.tiles.every(t => t.position.row === p.tiles[0].position.row));
    const down = cats.filter(p => p.tiles.every(t => t.position.col === p.tiles[0].position.col));
    expect(across.length).toBeGreaterThan(0);
    expect(down.length).toBeGreaterThan(0);
  });

  it('finds nothing when the rack cannot make a word', () => {
    const state = mockState(emptyBoard());
    // No two-letter or longer word in this dictionary uses only B and G.
    expect(hasLegalPlay(state, rackOf('BG'), dictionary, 'P1')).toBe(false);
  });
});

describe('every generated play is legal', () => {
  it('revalidates cleanly on an empty board', () => {
    const board = emptyBoard();
    const state = mockState(board);
    const plays = generateLegalPlays(state, rackOf('CATSO'), dictionary, 'P1');
    expect(plays.length).toBeGreaterThan(0);
    for (const play of plays) {
      const check = validatePlay(board, play.tiles, dictionary, flagContext(state, 'P1'));
      expect(check.valid, `${play.words.map(w => w.word).join('/')} should be legal`).toBe(true);
      expect(check.totalScore).toBe(play.totalScore);
    }
  });

  it('revalidates cleanly mid-game, including all crosswords', () => {
    const board = emptyBoard();
    put(board, 'STAR', { row: 6, col: 5 }, 'h');
    const state = mockState(board);

    const plays = generateLegalPlays(state, rackOf('CATOD'), dictionary, 'P1');
    expect(plays.length).toBeGreaterThan(0);
    for (const play of plays) {
      const check = validatePlay(board, play.tiles, dictionary, flagContext(state, 'P1'));
      expect(check.valid, `${play.words.map(w => w.word).join('/')} should be legal`).toBe(true);
      for (const word of check.words ?? []) {
        expect(dictionary.isValid(word.word)).toBe(true);
      }
    }
  });

  it('never places a tile on an occupied square', () => {
    const board = emptyBoard();
    put(board, 'STAR', { row: 6, col: 5 }, 'h');
    const state = mockState(board);

    for (const play of generateLegalPlays(state, rackOf('CATO'), dictionary, 'P1')) {
      for (const placed of play.tiles) {
        expect(board[placed.position.row - 1][placed.position.col - 1]).toBeNull();
      }
    }
  });

  it('never uses a rack tile twice in one play', () => {
    const board = emptyBoard();
    put(board, 'STAR', { row: 6, col: 5 }, 'h');
    const state = mockState(board);

    for (const play of generateLegalPlays(state, rackOf('SATOD'), dictionary, 'P1')) {
      const ids = play.tiles.map(t => t.tile.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('completeness', () => {
  it('finds the single-tile play that extends an existing word', () => {
    const board = emptyBoard();
    put(board, 'CAT', { row: 6, col: 5 }, 'h');
    const state = mockState(board);

    const plays = generateLegalPlays(state, rackOf('S'), dictionary, 'P1');
    const cats = plays.find(p => p.words.some(w => w.word === 'CATS'));
    expect(cats).toBeDefined();
    expect(cats!.tiles).toHaveLength(1);
    expect(cats!.tiles[0].position).toEqual({ row: 6, col: 8 });
    expect(cats!.totalScore).toBe(7); // C4 A1 T1 S1
  });

  it('finds a play that hooks perpendicular to an existing word', () => {
    const board = emptyBoard();
    put(board, 'AT', { row: 6, col: 6 }, 'h');
    const state = mockState(board);

    // DO under AT makes AD and TO as well.
    const plays = generateLegalPlays(state, rackOf('DO'), dictionary, 'P1');
    const hook = plays.find(
      p => p.words.some(w => w.word === 'DO') && p.words.some(w => w.word === 'AD')
    );
    expect(hook).toBeDefined();
    expect(hook!.totalScore).toBe(3 + 3 + 2); // DO + AD + TO
  });

  it('uses a blank when no real tile fits, scoring it zero', () => {
    const state = mockState(emptyBoard());
    const plays = generateLegalPlays(state, [tile('A'), blank()], dictionary, 'P1');
    const withBlank = plays.filter(p => p.tiles.some(t => t.tile.isBlank));
    expect(withBlank.length).toBeGreaterThan(0);
    for (const play of withBlank) {
      const blankTile = play.tiles.find(t => t.tile.isBlank)!;
      expect(blankTile.assignedLetter).toBeDefined();
      expect(play.totalScore).toBe(1); // only the A scores
    }
  });

  it('reports a capture when a play covers the opponent flag', () => {
    const board = emptyBoard();
    // RT sits beside the NW corner so playing A onto (1,1) makes ART and steals P2's flag.
    put(board, 'RT', { row: 1, col: 2 }, 'h');
    put(board, 'STAR', { row: 6, col: 5 }, 'h'); // board is not empty

    const stealState = mockState(board, { P1: 'SE', P2: 'NW' });
    const plays = generateLegalPlays(stealState, rackOf('A'), dictionary, 'P1');
    const capture = plays.find(p => p.capturesOpponentFlag);
    expect(capture).toBeDefined();
    expect(capture!.tiles[0].position).toEqual(FLAG_POSTS.NW);

    // The same play is not a steal when P2's flag sits elsewhere.
    const safeState = mockState(board, { P1: 'NW', P2: 'SE' });
    const elsewhere = generateLegalPlays(safeState, rackOf('A'), dictionary, 'P1');
    expect(elsewhere.some(p => p.capturesOpponentFlag)).toBe(false);
  });
});

/**
 * Reference generator: try every combination of cells and rack tiles and keep
 * whatever validatePlay accepts. Far too slow to ship, but it is an independent
 * definition of "legal", so comparing against it catches both missed plays and
 * illegal ones. Pass legality depends on this being exact — Pass unlocks only
 * when the generator finds nothing.
 */
function bruteForceLegalPlays(
  state: GameState,
  rack: Tile[],
  dict: Dictionary,
  playerId: 'P1' | 'P2',
  maxTiles: number
): Set<string> {
  const board = state.board;
  const ctx = flagContext(state, playerId);
  const cells: Position[] = [];
  for (let row = 1; row <= BOARD_SIZE; row++) {
    for (let col = 1; col <= BOARD_SIZE; col++) {
      if (!board[row - 1][col - 1]) cells.push({ row, col });
    }
  }

  const found = new Set<string>();

  const key = (placements: { tile: Tile; position: Position }[]) =>
    placements
      .map(p => `${p.position.row},${p.position.col}:${p.tile.letter}`)
      .sort()
      .join('|');

  const tryPlacement = (placements: { tile: Tile; position: Position }[]) => {
    if (validatePlay(board, placements, dict, ctx).valid) found.add(key(placements));
  };

  // Every arrangement of `size` rack tiles over `size` distinct empty cells.
  const walk = (
    chosen: { tile: Tile; position: Position }[],
    cellIndex: number,
    remaining: Tile[],
    size: number
  ) => {
    if (chosen.length === size) {
      tryPlacement(chosen);
      return;
    }
    for (let c = cellIndex; c < cells.length; c++) {
      for (let t = 0; t < remaining.length; t++) {
        walk(
          [...chosen, { tile: remaining[t], position: cells[c] }],
          c + 1,
          [...remaining.slice(0, t), ...remaining.slice(t + 1)],
          size
        );
      }
    }
  };

  for (let size = 1; size <= maxTiles; size++) {
    walk([], 0, rack, size);
  }

  return found;
}

describe('matches a brute-force reference', () => {
  const canonical = (plays: ReturnType<typeof generateLegalPlays>) =>
    new Set(
      plays.map(p =>
        p.tiles
          .map(t => `${t.position.row},${t.position.col}:${t.assignedLetter ?? t.tile.letter}`)
          .sort()
          .join('|')
      )
    );

  it('finds exactly the legal plays on an opening board', () => {
    const board = emptyBoard();
    const state = mockState(board);
    const rack = rackOf('CAT');

    const generated = canonical(generateLegalPlays(state, rack, dictionary, 'P1'));
    const reference = bruteForceLegalPlays(state, rack, dictionary, 'P1', 3);

    expect(generated.size).toBeGreaterThan(0);
    expect([...reference].filter(p => !generated.has(p))).toEqual([]); // none missed
    expect([...generated].filter(p => !reference.has(p))).toEqual([]); // none invented
  });

  it('finds exactly the legal plays mid-game, hooks and crosswords included', () => {
    const board = emptyBoard();
    put(board, 'STAR', { row: 6, col: 5 }, 'h');
    put(board, 'DO', { row: 7, col: 5 }, 'v'); // D under S, O below it
    const state = mockState(board);

    const rack = rackOf('AT');
    const generated = canonical(generateLegalPlays(state, rack, dictionary, 'P1'));
    const reference = bruteForceLegalPlays(state, rack, dictionary, 'P1', 2);

    expect(reference.size).toBeGreaterThan(0);
    expect([...reference].filter(p => !generated.has(p))).toEqual([]);
    expect([...generated].filter(p => !reference.has(p))).toEqual([]);
  });

  it('agrees that nothing is legal when nothing is legal', () => {
    const board = emptyBoard();
    put(board, 'STAR', { row: 6, col: 5 }, 'h');
    const state = mockState(board);

    const rack = rackOf('BF');
    expect(generateLegalPlays(state, rack, dictionary, 'P1')).toHaveLength(0);
    expect(bruteForceLegalPlays(state, rack, dictionary, 'P1', 2).size).toBe(0);
  });
});

describe('early exit', () => {
  it('stops at the requested limit', () => {
    const state = mockState(emptyBoard());
    const plays = generateLegalPlays(state, rackOf('CATSO'), dictionary, 'P1', { limit: 3 });
    expect(plays).toHaveLength(3);
  });

  it('hasLegalPlay agrees with the full generator', () => {
    const board = emptyBoard();
    put(board, 'STAR', { row: 6, col: 5 }, 'h');
    const state = mockState(board);

    expect(hasLegalPlay(state, rackOf('S'), dictionary, 'P1')).toBe(true);
    expect(hasLegalPlay(state, [], dictionary, 'P1')).toBe(false);

    // Only high-value consonants that form nothing in this small dictionary.
    const stuck = generateLegalPlays(state, rackOf('BFJK'), dictionary, 'P1');
    expect(stuck).toHaveLength(0);
    expect(hasLegalPlay(state, rackOf('BFJK'), dictionary, 'P1')).toBe(false);
  });
});

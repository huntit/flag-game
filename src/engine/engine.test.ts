// Feel-test lock: board geometry, opening deal, market, stuck-only pass, shuffle.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initializeGame,
  createTileBag,
  getNextFlagPost,
  isFirstWord,
  facedownRack,
  shuffleRack,
  mulberry32,
  setRandomSource,
  resetRandomSource,
} from './game';
import { executeAction, canDraw, canGrowRack, canPass, validateDraw } from './actions';
import { Dictionary } from './dictionary';
import type { GameState, TileData, Tile } from './types';
import {
  BOARD_SIZE,
  CENTRE_STAR,
  FLAG_POSTS,
  MARKET_SIZE,
  MAX_MARKET_TAKE,
  RACK_MAX,
  STARTING_RACK_TILES,
} from './types';

const mockTileData: TileData = {
  source: { values: 'test', counts: 'test' },
  note: 'test',
  defaultSet: 'wwf',
  bagSize: 104,
  blankCount: 2,
  tileSets: {
    wwf: {
      description: 'Test',
      tiles: [
        { letter: 'A', count: 9, value: 1 },
        { letter: 'E', count: 13, value: 1 },
        { letter: 'T', count: 7, value: 1 },
        { letter: 'S', count: 5, value: 1 },
      ],
      blanks: { count: 2, value: 0 },
    },
  },
};

const dictionary = new Dictionary(['AT', 'ATE', 'EATS', 'TEA', 'TEAS', 'SET', 'SEAT', 'SEATS', 'AS', 'ET']);

function tile(id: string, letter: 'A' | 'E' | 'T' | 'S', value = 1): Tile {
  return { id, letter, value, isBlank: false };
}

/** Strand the active player: nothing to draw, nothing to play. */
function makeStuck(state: GameState): void {
  state.market = [];
  state.bag = [];
  state.players[0].rack = [];
  state.players[1].rack = [];
}

afterEach(() => {
  resetRandomSource();
});

describe('board geometry', () => {
  it('is an 11x11 board with a centre cell and four posts', () => {
    expect(BOARD_SIZE).toBe(11);
    expect(BOARD_SIZE % 2).toBe(1); // odd, so a centre cell exists
    expect(CENTRE_STAR).toEqual({ row: 6, col: 6 });
    expect(FLAG_POSTS.NW).toEqual({ row: 2, col: 2 });
    expect(FLAG_POSTS.NE).toEqual({ row: 2, col: 10 });
    expect(FLAG_POSTS.SE).toEqual({ row: 10, col: 10 });
    expect(FLAG_POSTS.SW).toEqual({ row: 10, col: 2 });
  });
});

describe('setup', () => {
  it('deals a 4-tile market and 2 bag tiles to each rack', () => {
    const state = initializeGame(mockTileData);

    expect(state.board).toHaveLength(BOARD_SIZE);
    expect(state.board[0]).toHaveLength(BOARD_SIZE);
    expect(state.market).toHaveLength(MARKET_SIZE);
    expect(MARKET_SIZE).toBe(4);
    expect(STARTING_RACK_TILES).toBe(2);
    expect(state.players[0].rack).toHaveLength(2);
    expect(state.players[1].rack).toHaveLength(2);
  });

  it('deals opening racks from the bag, never from the market', () => {
    const state = initializeGame(mockTileData);
    const marketIds = new Set(state.market.map(t => t.id));
    for (const t of [...state.players[0].rack, ...state.players[1].rack]) {
      expect(marketIds.has(t.id)).toBe(false);
    }
  });

  it('lets turn one be either Draw or Play', () => {
    const state = initializeGame(mockTileData);
    expect(canDraw(state)).toBe(true);
    // Nothing in the state forces a Draw first.
    expect(state.moveHistory).toHaveLength(0);
    expect(state.players[0].rack.length).toBeGreaterThan(0);
  });

  it('starts with no legal Pass', () => {
    const state = initializeGame(mockTileData);
    expect(canPass(state, dictionary)).toBe(false);
  });

  it('builds a bag with the configured composition', () => {
    const bag = createTileBag(mockTileData);
    expect(bag).toHaveLength(9 + 13 + 7 + 5 + 2);
    expect(bag.filter(t => t.isBlank)).toHaveLength(2);
  });

  it('is reproducible from a seed', () => {
    setRandomSource(mulberry32(1234));
    const a = initializeGame(mockTileData);
    setRandomSource(mulberry32(1234));
    const b = initializeGame(mockTileData);

    expect(a.livePost).toBe(b.livePost);
    expect(a.market.map(t => t.letter)).toEqual(b.market.map(t => t.letter));
    expect(a.players[0].rack.map(t => t.letter)).toEqual(b.players[0].rack.map(t => t.letter));
  });
});

describe('opponent rack visibility', () => {
  it('publishes the tile count but no letters or values', () => {
    const state = initializeGame(mockTileData);
    const hidden = facedownRack(state.players[1].rack.length);

    expect(hidden).toHaveLength(state.players[1].rack.length);
    expect(hidden).toHaveLength(STARTING_RACK_TILES);
    for (const t of hidden) {
      expect(t.letter).toBeNull();
      expect(t.value).toBe(0);
    }
  });

  it('reports a count for every rack size up to the maximum', () => {
    for (let count = 0; count <= RACK_MAX; count++) {
      expect(facedownRack(count)).toHaveLength(count);
    }
  });
});

describe('rack shuffle', () => {
  it('keeps the same tiles and does not consume a turn', () => {
    setRandomSource(mulberry32(5));
    const state = initializeGame(mockTileData);
    state.players[0].rack = state.bag.splice(0, 7);

    const before = state.players[0].rack;
    const beforeIds = [...before].map(t => t.id).sort();
    const turnCount = state.turnCount;
    const currentPlayer = state.currentPlayer;
    const score = state.players[0].score;
    const livePost = state.livePost;

    const after = shuffleRack(before);

    expect(after).toHaveLength(before.length);
    expect([...after].map(t => t.id).sort()).toEqual(beforeIds);
    // Same tile objects, only reordered — identity and values are untouched.
    for (const t of after) {
      expect(before.some(original => original === t)).toBe(true);
    }
    expect(state.turnCount).toBe(turnCount);
    expect(state.currentPlayer).toBe(currentPlayer);
    expect(state.players[0].score).toBe(score);
    expect(state.livePost).toBe(livePost);
    expect(state.moveHistory).toHaveLength(0);
  });

  it('always changes the order, so the button never looks dead', () => {
    setRandomSource(mulberry32(3));

    // Two tiles are the tricky case: a plain shuffle leaves them alone half the
    // time, which reads as a broken button.
    for (const size of [2, 3, 7]) {
      const rack = Array.from({ length: size }, (_, i) =>
        tile(`t${size}-${i}`, (['A', 'E', 'T', 'S'] as const)[i % 4])
      );
      for (let attempt = 0; attempt < 30; attempt++) {
        const shuffled = shuffleRack(rack);
        expect(shuffled.map(t => t.id).join(',')).not.toBe(rack.map(t => t.id).join(','));
        expect([...shuffled].map(t => t.id).sort()).toEqual([...rack].map(t => t.id).sort());
      }
    }
  });

  it('leaves a rack of one tile alone', () => {
    const rack = [tile('only', 'A')];
    expect(shuffleRack(rack).map(t => t.id)).toEqual(['only']);
    expect(shuffleRack([]).length).toBe(0);
  });
});

describe('flag rotation', () => {
  it('rotates clockwise NW to NE to SE to SW', () => {
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    expect(getNextFlagPost('NW', board)).toBe('NE');
    expect(getNextFlagPost('NE', board)).toBe('SE');
    expect(getNextFlagPost('SE', board)).toBe('SW');
    expect(getNextFlagPost('SW', board)).toBe('NW');
  });

  it('skips occupied posts', () => {
    const state = initializeGame(mockTileData);
    state.board[1][9] = tile('x', 'A'); // NE (2,10)
    expect(getNextFlagPost('NW', state.board)).toBe('SE');
  });

  it('returns null when every post is occupied', () => {
    const state = initializeGame(mockTileData);
    state.board[1][1] = tile('1', 'A');
    state.board[1][9] = tile('2', 'E');
    state.board[9][9] = tile('3', 'T');
    state.board[9][1] = tile('4', 'S');
    expect(getNextFlagPost('NW', state.board)).toBeNull();
  });
});

describe('pass is stuck-only', () => {
  let state: GameState;

  beforeEach(() => {
    state = initializeGame(mockTileData);
  });

  it('is illegal while the market has tiles', () => {
    expect(state.market.length).toBeGreaterThan(0);
    expect(canPass(state, dictionary)).toBe(false);

    const result = executeAction(state, { type: 'pass' }, dictionary);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Draw and Play/);
  });

  it('is illegal while the bag has tiles', () => {
    state.market = [];
    expect(state.bag.length).toBeGreaterThan(0);
    expect(canPass(state, dictionary)).toBe(false);
    expect(executeAction(state, { type: 'pass' }, dictionary).success).toBe(false);
  });

  it('is illegal when a legal play exists, even with market and bag empty', () => {
    state.market = [];
    state.bag = [];
    state.players[state.currentPlayer].rack = [tile('a1', 'A'), tile('t1', 'T')];

    // AT through the centre star is available, so Pass must stay locked.
    expect(canPass(state, dictionary)).toBe(false);
    const result = executeAction(state, { type: 'pass' }, dictionary);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/legal play/);
  });

  it('stays illegal while the rack has room, even with no legal play', () => {
    // Two tiles that make no word, but the rack can still grow.
    state.players[state.currentPlayer].rack = [tile('t1', 'T'), tile('t2', 'T')];
    expect(canGrowRack(state)).toBe(true);
    expect(canPass(state, dictionary)).toBe(false);
  });

  it('is legal when a full rack can only exchange and has no legal play', () => {
    // Reachable in real play: a crowded board leaves no legal placement, and a
    // full-rack draw is a tile-neutral exchange, so nothing can end the game.
    const player = state.players[state.currentPlayer];
    player.rack = Array.from({ length: RACK_MAX }, (_, i) => tile(`stuck${i}`, 'T'));
    expect(player.rack).toHaveLength(RACK_MAX);
    expect(state.market.length).toBeGreaterThan(0);
    expect(state.bag.length).toBeGreaterThan(0);

    expect(canDraw(state)).toBe(true); // an exchange is still available
    expect(canGrowRack(state)).toBe(false); // but it cannot add tiles
    expect(canPass(state, dictionary)).toBe(true);
    expect(executeAction(state, { type: 'pass' }, dictionary).success).toBe(true);
  });

  it('is legal only with no Draw and no Play', () => {
    makeStuck(state);
    expect(canPass(state, dictionary)).toBe(true);

    const result = executeAction(state, { type: 'pass' }, dictionary);
    expect(result.success).toBe(true);
    expect(state.consecutivePasses).toBe(1);
    expect(state.gameOver).toBe(false);
  });

  it('ends the game only after two explicit passes in a row', () => {
    makeStuck(state);

    executeAction(state, { type: 'pass' }, dictionary);
    expect(state.gameOver).toBe(false);
    expect(state.consecutivePasses).toBe(1);

    executeAction(state, { type: 'pass' }, dictionary);
    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('double_pass');
  });

  it('resets the pass counter after a draw', () => {
    makeStuck(state);
    executeAction(state, { type: 'pass' }, dictionary);
    expect(state.consecutivePasses).toBe(1);

    state.market = [tile('m1', 'A'), tile('m2', 'E')];
    const result = executeAction(state, { type: 'draw', marketTiles: ['m1'], takeBagTile: false }, dictionary);
    expect(result.success).toBe(true);
    expect(state.consecutivePasses).toBe(0);
  });
});

describe('draw', () => {
  let state: GameState;

  beforeEach(() => {
    state = initializeGame(mockTileData);
  });

  it('takes one or two market tiles', () => {
    const size = state.players[0].rack.length;
    expect(
      executeAction(state, { type: 'draw', marketTiles: [state.market[0].id], takeBagTile: false }, dictionary).success
    ).toBe(true);
    expect(state.players[0].rack).toHaveLength(size + 1);

    const p2Size = state.players[1].rack.length;
    const [a, b] = state.market;
    expect(
      executeAction(state, { type: 'draw', marketTiles: [a.id, b.id], takeBagTile: false }, dictionary).success
    ).toBe(true);
    expect(state.players[1].rack).toHaveLength(p2Size + 2);
  });

  it('refuses more than the market take limit', () => {
    expect(MAX_MARKET_TAKE).toBe(2);
    const ids = state.market.slice(0, 3).map(t => t.id);
    const result = executeAction(state, { type: 'draw', marketTiles: ids, takeBagTile: false }, dictionary);
    expect(result.success).toBe(false);
  });

  it('makes a blank the whole market take', () => {
    state.market[0] = { id: 'blank1', letter: null, value: 0, isBlank: true };
    const result = executeAction(
      state,
      { type: 'draw', marketTiles: ['blank1', state.market[1].id], takeBagTile: false },
      dictionary
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/blank/);

    expect(
      executeAction(state, { type: 'draw', marketTiles: ['blank1'], takeBagTile: false }, dictionary).success
    ).toBe(true);
  });

  it('refills the market to four', () => {
    executeAction(state, { type: 'draw', marketTiles: [state.market[0].id], takeBagTile: false }, dictionary);
    expect(state.market).toHaveLength(MARKET_SIZE);
  });

  it('requires a discard when the take would overfill the rack', () => {
    const player = state.players[0];
    player.rack = state.bag.splice(0, RACK_MAX);
    expect(player.rack).toHaveLength(7);

    // Fixed non-blank market: a blank would be a single take instead.
    state.market = [tile('m1', 'A'), tile('m2', 'E'), tile('m3', 'T'), tile('m4', 'S')];
    const ids = state.market.slice(0, 2).map(t => t.id);
    const noDiscard = validateDraw(state, { type: 'draw', marketTiles: ids, takeBagTile: false });
    expect(noDiscard.valid).toBe(false);

    const withDiscard = executeAction(
      state,
      {
        type: 'draw',
        marketTiles: ids,
        discardTiles: [player.rack[0].id, player.rack[1].id],
        takeBagTile: false,
      },
      dictionary
    );
    expect(withDiscard.success).toBe(true);
    expect(player.rack).toHaveLength(RACK_MAX);
  });

  it('refuses a bag tile on a refresh turn', () => {
    const player = state.players[0];
    player.rack = state.bag.splice(0, RACK_MAX);
    state.market = [tile('m1', 'A'), tile('m2', 'E'), tile('m3', 'T'), tile('m4', 'S')];
    const ids = [state.market[0].id];
    const result = validateDraw(state, {
      type: 'draw',
      marketTiles: ids,
      discardTiles: [player.rack[0].id],
      takeBagTile: true,
    });
    expect(result.valid).toBe(false);
  });

  it('leaves the state untouched when a draw is rejected', () => {
    const marketBefore = state.market.map(t => t.id);
    const rackBefore = state.players[0].rack.map(t => t.id);
    const bagBefore = state.bag.length;

    const result = executeAction(state, { type: 'draw', marketTiles: ['nope'], takeBagTile: false }, dictionary);
    expect(result.success).toBe(false);
    expect(state.market.map(t => t.id)).toEqual(marketBefore);
    expect(state.players[0].rack.map(t => t.id)).toEqual(rackBefore);
    expect(state.bag).toHaveLength(bagBefore);
  });

  it('takes an optional facedown bag tile', () => {
    const player = state.players[0];
    const size = player.rack.length;
    const result = executeAction(
      state,
      { type: 'draw', marketTiles: [state.market[0].id], takeBagTile: true },
      dictionary
    );
    expect(result.success).toBe(true);
    expect(player.rack).toHaveLength(size + 2);
  });
});

describe('play', () => {
  it('scores the play, empties the used tiles and does not refill the rack', () => {
    const state = initializeGame(mockTileData);
    const player = state.players[0];
    player.rack = [tile('a1', 'A'), tile('t1', 'T'), tile('e1', 'E')];

    const result = executeAction(
      state,
      {
        type: 'play',
        placements: [
          { tileId: 'a1', position: { row: 6, col: 6 } },
          { tileId: 't1', position: { row: 6, col: 7 } },
        ],
      },
      dictionary
    );

    expect(result.success).toBe(true);
    expect(player.score).toBe(2); // A1 + T1
    expect(player.rack.map(t => t.id)).toEqual(['e1']); // no refill
    expect(state.lastPlay?.words.map(w => w.word)).toEqual(['AT']);
  });

  it('rejects an illegal play without changing the board', () => {
    const state = initializeGame(mockTileData);
    const player = state.players[0];
    player.rack = [tile('t1', 'T'), tile('t2', 'T')];

    const result = executeAction(
      state,
      {
        type: 'play',
        placements: [
          { tileId: 't1', position: { row: 6, col: 6 } },
          { tileId: 't2', position: { row: 6, col: 7 } },
        ],
      },
      dictionary
    );

    expect(result.success).toBe(false);
    expect(isFirstWord(state.board)).toBe(true);
    expect(player.score).toBe(0);
    expect(player.rack).toHaveLength(2);
  });

  it('ends the game immediately on a capture, with no rotation', () => {
    const state = initializeGame(mockTileData);
    state.livePost = 'NW';
    state.board[2][1] = tile('board-t', 'T'); // T at (3,2), under the NW post
    const player = state.players[state.currentPlayer];
    player.rack = [tile('a1', 'A')];

    const result = executeAction(
      state,
      { type: 'play', placements: [{ tileId: 'a1', position: FLAG_POSTS.NW }] },
      dictionary
    );

    expect(result.success).toBe(true);
    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('capture');
    expect(state.livePost).toBe('NW'); // no rotation after a capture
    expect(player.score).toBe(2); // A1 + T1, no capture bonus
  });
});

describe('game end', () => {
  it('ends after the turn when the bag ran dry', () => {
    const state = initializeGame(mockTileData);
    state.bag = [];
    state.bagDepleted = true;

    const result = executeAction(
      state,
      { type: 'draw', marketTiles: [state.market[0].id], takeBagTile: false },
      dictionary
    );
    expect(result.success).toBe(true);
    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('bag');
  });

  it('ends when all four posts are occupied', () => {
    const state = initializeGame(mockTileData);
    state.board[1][1] = tile('1', 'A');
    state.board[1][9] = tile('2', 'E');
    state.board[9][9] = tile('3', 'T');
    state.board[9][1] = tile('4', 'S');
    makeStuck(state);

    executeAction(state, { type: 'pass' }, dictionary);
    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('posts_full');
  });

  it('declares the higher score the winner and ties a draw', () => {
    const state = initializeGame(mockTileData);
    makeStuck(state);
    state.players[0].score = 20;
    state.players[1].score = 20;

    executeAction(state, { type: 'pass' }, dictionary);
    executeAction(state, { type: 'pass' }, dictionary);
    expect(state.winner).toBe('draw');
  });
});

describe('first word detection', () => {
  it('sees an empty board and a played board', () => {
    const state = initializeGame(mockTileData);
    expect(isFirstWord(state.board)).toBe(true);
    state.board[5][5] = tile('x', 'A');
    expect(isFirstWord(state.board)).toBe(false);
  });
});

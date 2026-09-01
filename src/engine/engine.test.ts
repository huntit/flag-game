// Feel-test lock: board geometry, flag setup, market, capture multipliers, pass, draw.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initializeGame,
  isFirstWord,
  facedownRack,
  shuffleRack,
  mulberry32,
  setRandomSource,
  resetRandomSource,
  diagonalCorner,
  spareCorners,
  marketShowingCount,
  getMarketTiles,
  emptySpareCorners,
  reorderRack,
  refillMarketSlot,
} from './game';
import {
  executeAction,
  canDraw,
  canPass,
  validateDraw,
  isExchangeDraw,
  wouldTriggerExchangeThreeOnDraw,
} from './actions';
import { Dictionary } from './dictionary';
import { validatePlay } from './validator';
import type { GameState, TileData, Tile } from './types';
import {
  BOARD_SIZE,
  CENTRE_STAR,
  FLAG_POSTS,
  MARKET_SLOTS,
  MARKET_FACE_UP,
  MARKET_FACE_DOWN,
  DRAW_COUNT,
  RACK_MAX,
  P1_STARTING_RACK_TILES,
  P2_STARTING_RACK_TILES,
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
        { letter: 'R', count: 6, value: 1 },
      ],
      blanks: { count: 2, value: 0 },
    },
  },
};

const dictionary = new Dictionary(['AT', 'ATE', 'ART', 'EATS', 'TEA', 'TEAS', 'SET', 'SEAT', 'SEATS', 'AS', 'ET', 'STAR']);

function tile(id: string, letter: 'A' | 'E' | 'T' | 'S' | 'R', value = 1): Tile {
  return { id, letter, value, isBlank: false };
}

function flagCtx(state: GameState, playerId: 'P1' | 'P2') {
  return {
    flags: state.flags,
    playerId,
    flagsLost: { P1: state.players[0].flagsLost, P2: state.players[1].flagsLost },
    emptySpareCount: emptySpareCorners(state).length,
  };
}

function marketIds(state: GameState, count = DRAW_COUNT): string[] {
  return getMarketTiles(state.market).slice(0, count).map(t => t.id);
}

afterEach(() => {
  resetRandomSource();
});

describe('board geometry', () => {
  it('is an 11x11 board with centre at (6,6) and true corners only', () => {
    expect(BOARD_SIZE).toBe(11);
    expect(CENTRE_STAR).toEqual({ row: 6, col: 6 });
    expect(FLAG_POSTS.NW).toEqual({ row: 1, col: 1 });
    expect(FLAG_POSTS.NE).toEqual({ row: 1, col: 11 });
    expect(FLAG_POSTS.SE).toEqual({ row: 11, col: 11 });
    expect(FLAG_POSTS.SW).toEqual({ row: 11, col: 1 });
  });
});

describe('flag setup', () => {
  it('places P1 on a random corner and P2 diagonally opposite', () => {
    setRandomSource(mulberry32(42));
    const state = initializeGame(mockTileData);
    expect(state.flags.P1).toBeTruthy();
    expect(state.flags.P2).toBe(diagonalCorner(state.flags.P1!));
  });

  it('leaves the other two corners as spares', () => {
    setRandomSource(mulberry32(7));
    const state = initializeGame(mockTileData);
    const spares = spareCorners(state.flags.P1!, state.flags.P2!);
    expect(spares).toHaveLength(2);
    expect(state.flags.P1).not.toBe(state.flags.P2);
  });
});

describe('setup', () => {
  it('deals 4 face-up + 2 face-down market and P1=2 / P2=3 bag tiles', () => {
    const state = initializeGame(mockTileData);
    expect(state.market).toHaveLength(MARKET_SLOTS);
    expect(state.market.filter(s => s.faceUp).length).toBe(MARKET_FACE_UP);
    expect(state.market.filter(s => !s.faceUp).length).toBe(MARKET_FACE_DOWN);
    expect(state.players[0].rack).toHaveLength(P1_STARTING_RACK_TILES);
    expect(state.players[1].rack).toHaveLength(P2_STARTING_RACK_TILES);
  });

  it('starts with Draw legal, Pass illegal, and zero consecutive Exchanges', () => {
    const state = initializeGame(mockTileData);
    expect(canDraw(state)).toBe(true);
    expect(canPass(state, dictionary)).toBe(false);
    expect(state.consecutiveExchanges).toBe(0);
    expect(state.consecutivePasses).toBe(0);
  });
});

describe('draw', () => {
  let state: GameState;

  beforeEach(() => {
    state = initializeGame(mockTileData);
  });

  it('requires exactly 2 tiles from the market', () => {
    const one = executeAction(
      state,
      { type: 'draw', marketTiles: [marketIds(state, 1)[0]] },
      dictionary
    );
    expect(one.success).toBe(false);

    const two = executeAction(state, { type: 'draw', marketTiles: marketIds(state) }, dictionary);
    expect(two.success).toBe(true);
  });

  it('is illegal when market showing < 2', () => {
    state.market.forEach((slot, i) => {
      if (i > 0) slot.tile = null;
    });
    state.players[0].rack = [];
    state.players[1].rack = [];
    expect(marketShowingCount(state.market)).toBe(1);
    expect(canDraw(state)).toBe(false);
    expect(canPass(state, dictionary)).toBe(true);
  });

  it('does not block Draw on a full rack — draw 2 then discard to 7', () => {
    const player = state.players[0];
    player.rack = Array.from({ length: RACK_MAX }, (_, i) => tile(`r${i}`, 'T'));
    const ids = marketIds(state);
    const check = validateDraw(state, {
      type: 'draw',
      marketTiles: ids,
      discardTiles: [player.rack[0].id, player.rack[1].id],
    });
    expect(check.valid).toBe(true);
    expect(canDraw(state)).toBe(true);
    expect(canPass(state, dictionary)).toBe(false);
  });

  it('refills emptied slots preserving orientation', () => {
    const faceUpBefore = state.market.filter(s => s.faceUp).length;
    executeAction(state, { type: 'draw', marketTiles: marketIds(state) }, dictionary);
    expect(state.market.filter(s => s.faceUp).length).toBe(faceUpBefore);
    expect(marketShowingCount(state.market)).toBe(MARKET_SLOTS);
  });
});

describe('bag empty', () => {
  it('ends the game when the bag is empty at turn start', () => {
    const state = initializeGame(mockTileData);
    state.bag = [];
    const result = executeAction(state, { type: 'draw', marketTiles: marketIds(state) }, dictionary);
    expect(result.success).toBe(false);
    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('bag_empty');
  });

  it('ends after a draw when refill depletes the bag', () => {
    const state = initializeGame(mockTileData);
    state.bag = [tile('last', 'A')];
    executeAction(state, { type: 'draw', marketTiles: marketIds(state) }, dictionary);
    expect(state.bag).toHaveLength(0);
    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('bag_empty');
  });
});

describe('exchange vs non-exchange draw', () => {
  function ensureBag(state: GameState) {
    for (let i = 0; i < 40; i++) {
      state.bag.push(tile(`bag-${i}`, 'A'));
    }
  }

  function fillRack(state: GameState, size: number) {
    const player = state.players[state.currentPlayer];
    player.rack = Array.from({ length: size }, (_, i) => tile(`r${player.id}-${size}-${i}`, 'T'));
  }

  function drawWithDiscards(state: GameState) {
    const player = state.players[state.currentPlayer];
    const required = Math.max(0, player.rack.length + DRAW_COUNT - RACK_MAX);
    const result = executeAction(
      state,
      {
        type: 'draw',
        marketTiles: marketIds(state),
        discardTiles: required > 0 ? player.rack.slice(0, required).map(t => t.id) : undefined,
      },
      dictionary
    );
    expect(result.success, result.error).toBe(true);
  }

  it('counts a full-rack Draw 2 + Discard 2 as an Exchange, not a 6-tile Draw', () => {
    const state = initializeGame(mockTileData);
    ensureBag(state);
    fillRack(state, RACK_MAX);
    expect(isExchangeDraw(state)).toBe(true);
    drawWithDiscards(state);
    expect(state.consecutiveExchanges).toBe(1);

    fillRack(state, 6);
    expect(isExchangeDraw(state)).toBe(false);
    drawWithDiscards(state);
    expect(state.consecutiveExchanges).toBe(0);
  });

  it('does not count a Draw that discards 0 or 1 as an Exchange', () => {
    const state = initializeGame(mockTileData);
    ensureBag(state);
    fillRack(state, 5);
    drawWithDiscards(state);
    expect(state.consecutiveExchanges).toBe(0);

    fillRack(state, 6);
    drawWithDiscards(state);
    expect(state.consecutiveExchanges).toBe(0);
  });

  it('increments consecutiveExchanges across both players and ends on the third', () => {
    const state = initializeGame(mockTileData);
    ensureBag(state);
    for (let i = 0; i < 2; i++) {
      fillRack(state, RACK_MAX);
      expect(wouldTriggerExchangeThreeOnDraw(state)).toBe(false);
      drawWithDiscards(state);
      expect(state.gameOver).toBe(false);
      expect(state.consecutiveExchanges).toBe(i + 1);
    }
    fillRack(state, RACK_MAX);
    expect(wouldTriggerExchangeThreeOnDraw(state)).toBe(true);
    drawWithDiscards(state);
    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('exchange_three');
    expect(state.consecutiveExchanges).toBe(3);
  });

  it('resets consecutiveExchanges on a non-Exchange Draw', () => {
    const state = initializeGame(mockTileData);
    ensureBag(state);
    fillRack(state, RACK_MAX);
    drawWithDiscards(state);
    expect(state.consecutiveExchanges).toBe(1);
    fillRack(state, 6);
    drawWithDiscards(state);
    expect(state.consecutiveExchanges).toBe(0);
    fillRack(state, RACK_MAX);
    drawWithDiscards(state);
    expect(state.consecutiveExchanges).toBe(1);
    expect(state.gameOver).toBe(false);
  });

  it('resets consecutiveExchanges on Play', () => {
    const state = initializeGame(mockTileData);
    ensureBag(state);
    fillRack(state, RACK_MAX);
    drawWithDiscards(state);
    expect(state.consecutiveExchanges).toBe(1);
    state.currentPlayer = 0;
    state.players[0].rack = [tile('a1', 'A'), tile('t1', 'T')];
    executeAction(
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
    expect(state.consecutiveExchanges).toBe(0);
  });

  it('resets consecutiveExchanges on Pass', () => {
    const state = initializeGame(mockTileData);
    ensureBag(state);
    fillRack(state, RACK_MAX);
    drawWithDiscards(state);
    expect(state.consecutiveExchanges).toBe(1);
    state.market.forEach(s => {
      s.tile = null;
    });
    state.players[state.currentPlayer].rack = [];
    executeAction(state, { type: 'pass' }, dictionary);
    expect(state.consecutiveExchanges).toBe(0);
    expect(state.consecutivePasses).toBe(1);
    expect(state.gameOver).toBe(false);
  });
});

describe('pass', () => {
  it('is legal only when no Play and Draw is illegal', () => {
    const state = initializeGame(mockTileData);
    expect(canPass(state, dictionary)).toBe(false);
    state.market.forEach(s => {
      s.tile = null;
    });
    state.players[0].rack = [];
    expect(canPass(state, dictionary)).toBe(true);
  });

  it('ends double_pass when both players are stuck with market showing < 2', () => {
    const state = initializeGame(mockTileData);
    state.market.forEach(s => {
      s.tile = null;
    });
    state.players[0].rack = [];
    state.players[1].rack = [];
    expect(canDraw(state)).toBe(false);

    executeAction(state, { type: 'pass' }, dictionary);
    expect(state.gameOver).toBe(false);
    expect(state.consecutivePasses).toBe(1);

    executeAction(state, { type: 'pass' }, dictionary);
    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('double_pass');
  });

  it('Draw between Passes breaks the pass streak', () => {
    const state = initializeGame(mockTileData);
    for (let i = 0; i < 20; i++) state.bag.push(tile(`extra-${i}`, 'A'));
    state.market.forEach(s => {
      s.tile = null;
    });
    state.players[0].rack = [];
    state.players[1].rack = [];

    executeAction(state, { type: 'pass' }, dictionary);
    expect(state.consecutivePasses).toBe(1);

    state.market[0].tile = tile('m1', 'A');
    state.market[1].tile = tile('m2', 'E');
    executeAction(state, { type: 'draw', marketTiles: marketIds(state) }, dictionary);
    expect(state.consecutivePasses).toBe(0);
  });
});

describe('flag capture scoring', () => {
  it('applies TWS on own-flag capture word only and ends immediately', () => {
    const state = initializeGame(mockTileData);
    state.flags.P1 = 'NW';
    state.flags.P2 = 'SE';
    state.board[0][1] = tile('board-r', 'R'); // (1,2)
    state.board[0][2] = tile('board-t', 'T'); // (1,3) — play A at NW for ART
    const player = state.players[0];
    player.rack = [tile('a1', 'A')];

    const evalResult = validatePlay(
      state.board,
      [{ tile: player.rack[0], position: FLAG_POSTS.NW }],
      dictionary,
      flagCtx(state, 'P1')
    );
    expect(evalResult.capturesOwnFlag).toBe(true);
    expect(evalResult.totalScore).toBe(9); // ART base 3 × 3

    executeAction(
      state,
      { type: 'play', placements: [{ tileId: 'a1', position: FLAG_POSTS.NW }] },
      dictionary
    );
    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('self_capture');
    expect(player.score).toBe(9);
  });

  it('applies DWS on first opponent steal and spawns replacement on empty spare', () => {
    setRandomSource(mulberry32(99));
    const state = initializeGame(mockTileData);
    state.flags.P1 = 'NW';
    state.flags.P2 = 'SE';
    state.board[10][8] = tile('board-a', 'A'); // (11,9)
    state.board[10][9] = tile('board-r', 'R'); // (11,10)
    const hunter = state.players[0];
    hunter.rack = [tile('t1', 'T')];

    executeAction(
      state,
      { type: 'play', placements: [{ tileId: 't1', position: FLAG_POSTS.SE }] },
      dictionary
    );

    expect(state.gameOver).toBe(false);
    expect(state.players[1].flagsLost).toBe(1);
    expect(state.flags.P2).toBeTruthy();
    expect(state.flags.P2).not.toBe('SE');
    expect(hunter.score).toBe(6); // ART base 3 × 2
  });

  it('ends on second steal of opponent flag', () => {
    const state = initializeGame(mockTileData);
    state.flags.P1 = 'NW';
    state.flags.P2 = 'SE';
    state.players[1].flagsLost = 1;
    state.flags.P2 = 'NE';
    state.board[0][8] = tile('a', 'A'); // (1,9)
    state.board[0][9] = tile('r', 'R'); // (1,10)
    const hunter = state.players[0];
    hunter.rack = [tile('t1', 'T')];

    executeAction(
      state,
      { type: 'play', placements: [{ tileId: 't1', position: FLAG_POSTS.NE }] },
      dictionary
    );

    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('second_steal');
    expect(state.players[1].flagsLost).toBe(2);
  });

  it('ends with no_spare when steal would replace but no empty spare corner', () => {
    const state = initializeGame(mockTileData);
    state.flags.P1 = 'NW';
    state.flags.P2 = 'SE';
    state.board[0][10] = tile('block-ne', 'A'); // (1,11) NE spare blocked
    state.board[10][0] = tile('block-sw', 'A'); // (11,1) SW spare blocked
    state.board[10][8] = tile('board-a', 'A'); // (11,9)
    state.board[10][9] = tile('board-r', 'R'); // (11,10)
    const hunter = state.players[0];
    hunter.rack = [tile('t1', 'T')];

    executeAction(
      state,
      { type: 'play', placements: [{ tileId: 't1', position: FLAG_POSTS.SE }] },
      dictionary
    );

    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('no_spare');
  });

  it('resolves own-flag first — never stacks 3× and 2× on the capturing word', () => {
    const state = initializeGame(mockTileData);
    state.flags.P1 = 'NW';
    state.flags.P2 = 'NE';
    state.board[0][1] = tile('r', 'R');
    state.board[0][2] = tile('t', 'T');
    const player = state.players[0];
    player.rack = [tile('a1', 'A')];

    const evalResult = validatePlay(
      state.board,
      [{ tile: player.rack[0], position: FLAG_POSTS.NW }],
      dictionary,
      flagCtx(state, 'P1')
    );

    expect(evalResult.capturesOwnFlag).toBe(true);
    expect(evalResult.endsGame).toBe(true);
    const capturing = evalResult.words!.find(w => w.flagMultiplier === 3);
    expect(capturing?.score).toBe(9);
    expect(evalResult.words!.some(w => w.flagMultiplier === 2)).toBe(false);
  });
});

describe('play scoring', () => {
  it('scores crosswords normally without flag multipliers', () => {
    const state = initializeGame(mockTileData);
    const player = state.players[0];
    player.rack = [tile('a1', 'A'), tile('t1', 'T'), tile('e1', 'E')];

    executeAction(
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

    expect(player.score).toBe(2);
    expect(player.rack.map(t => t.id)).toEqual(['e1']);
  });
});

describe('opponent rack visibility', () => {
  it('publishes count only', () => {
    const hidden = facedownRack(3);
    expect(hidden).toHaveLength(3);
    for (const t of hidden) {
      expect(t.letter).toBeNull();
    }
  });
});

describe('rack shuffle', () => {
  it('does not consume a turn', () => {
    setRandomSource(mulberry32(5));
    const state = initializeGame(mockTileData);
    const turnCount = state.turnCount;
    shuffleRack(state.players[0].rack);
    expect(state.turnCount).toBe(turnCount);
  });
});

describe('rack reorder', () => {
  const rack = () => [
    tile('a', 'A'),
    tile('b', 'E'),
    tile('c', 'T'),
    tile('d', 'A'),
  ];

  it('drops a tile immediately before whatever sits at the target slot', () => {
    // Rightward moves are the ones that go wrong if you forget that pulling
    // the tile out shifts everything after it down one.
    expect(reorderRack(rack(), 'a', 2).map(t => t.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(reorderRack(rack(), 'a', 4).map(t => t.id)).toEqual(['b', 'c', 'd', 'a']);
    expect(reorderRack(rack(), 'd', 0).map(t => t.id)).toEqual(['d', 'a', 'b', 'c']);
    expect(reorderRack(rack(), 'c', 1).map(t => t.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('clamps out-of-range slots and leaves an unknown tile alone', () => {
    expect(reorderRack(rack(), 'b', 99).map(t => t.id)).toEqual(['a', 'c', 'd', 'b']);
    expect(reorderRack(rack(), 'b', -3).map(t => t.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(reorderRack(rack(), 'nope', 0).map(t => t.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('never changes which tiles you hold, only their order', () => {
    const before = rack();
    const after = reorderRack(before, 'c', 0);
    expect([...after].map(t => t.id).sort()).toEqual([...before].map(t => t.id).sort());
    expect(before.map(t => t.id)).toEqual(['a', 'b', 'c', 'd']); // input untouched
  });
});

describe('market face-down slots', () => {
  it('keeps the two face-down slots on the end of the row, every deal', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      setRandomSource(mulberry32(seed));
      const state = initializeGame(mockTileData);
      expect(state.market.filter(s => !s.faceUp)).toHaveLength(MARKET_FACE_DOWN);
      seen.add(state.market.map(s => (s.faceUp ? 'u' : 'd')).join(''));
    }
    expect([...seen]).toEqual(['uuuudd']);
  });

  it('refills a slot in place, keeping its face-up or face-down identity', () => {
    setRandomSource(mulberry32(9));
    const state = initializeGame(mockTileData);
    const before = state.market.map(s => s.faceUp);

    for (const slot of state.market) slot.tile = null;
    for (const slot of state.market) refillMarketSlot(state.bag, slot);

    expect(state.market.map(s => s.faceUp)).toEqual(before);
    expect(state.market.every(s => s.tile !== null)).toBe(true);
  });
});

describe('first word detection', () => {
  it('sees empty vs played board', () => {
    const state = initializeGame(mockTileData);
    expect(isFirstWord(state.board)).toBe(true);
    state.board[5][5] = tile('x', 'A');
    expect(isFirstWord(state.board)).toBe(false);
  });
});

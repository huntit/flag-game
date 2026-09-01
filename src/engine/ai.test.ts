// AI locks. The important one is termination: a full-rack refresh draw is
// tile-neutral, so an AI that always prefers a draw stalls the game forever.

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Dictionary } from './dictionary';
import { initializeGame, mulberry32, setRandomSource, resetRandomSource } from './game';
import { executeAction } from './actions';
import { planAIAction, selectAIAction } from './ai';
import type { AIPersonality, Letter, MarketSlot, TileData, Tile } from './types';
import { DRAW_COUNT, FLAG_POSTS, MARKET_FACE_UP, RACK_MAX } from './types';

const tileData: TileData = {
  source: { values: 'test', counts: 'test' },
  note: 'test',
  defaultSet: 'wwf',
  bagSize: 104,
  blankCount: 2,
  tileSets: {
    wwf: {
      description: 'Test',
      tiles: [
        { letter: 'A', count: 12, value: 1 },
        { letter: 'E', count: 12, value: 1 },
        { letter: 'S', count: 10, value: 1 },
        { letter: 'T', count: 10, value: 1 },
        { letter: 'R', count: 8, value: 1 },
        { letter: 'O', count: 8, value: 1 },
        { letter: 'D', count: 6, value: 2 },
        { letter: 'N', count: 6, value: 2 },
      ],
      blanks: { count: 2, value: 0 },
    },
  },
};

const dictionary = new Dictionary([
  'AD', 'AE', 'AN', 'AR', 'AS', 'AT', 'ART', 'DA', 'DE', 'DO', 'ED', 'EN', 'ER', 'ES',
  'ET', 'NA', 'NE', 'NO', 'OD', 'OE', 'ON', 'OR', 'OS', 'RE', 'SO', 'TA', 'TO',
  'AND', 'ANT', 'ARE', 'ATE', 'EAR', 'EAT', 'END', 'ERA', 'NOD', 'NOR', 'NOT',
  'OAR', 'ODE', 'ONE', 'RAN', 'RAT', 'RED', 'ROD', 'ROT', 'RT', 'SAD', 'SAT', 'SEA',
  'SET', 'SON', 'STAR', 'RATE', 'TEARS', 'STONE', 'SNORED', 'SANDER',
]);

let seq = 0;
function tile(letter: Letter, value = 1): Tile {
  return { id: `ai${seq++}`, letter, value, isBlank: false };
}
function blank(): Tile {
  return { id: `aib${seq++}`, letter: null, value: 0, isBlank: true };
}

function marketSlots(tiles: (Tile | null)[], faceUpCount = MARKET_FACE_UP): MarketSlot[] {
  return tiles.map((t, i) => ({ tile: t, faceUp: i < faceUpCount }));
}

afterEach(() => {
  resetRandomSource();
});

describe('draw policy', () => {
  it('plays when the best move meets the score threshold instead of drawing', () => {
    setRandomSource(mulberry32(2));
    const state = initializeGame(tileData);
    const player = state.players[0];

    // Full rack that can make SANDER (8 points) on an opening board.
    player.rack = [
      tile('S'), tile('A'), tile('N', 2), tile('D', 2), tile('E'), tile('R'), tile('O'),
    ];
    expect(player.rack).toHaveLength(RACK_MAX);
    state.market = marketSlots([
      tile('A'), tile('E'), tile('T'), tile('S'),
      tile('N'), tile('O'),
    ]);

    const action = selectAIAction(state, 'greedy', dictionary, 8);
    expect(action.type).toBe('play');
  });

  it('draws exactly 2 tiles from a full rack when the best play is below threshold', () => {
    setRandomSource(mulberry32(3));
    const state = initializeGame(tileData);
    const player = state.players[0];
    player.rack = [
      tile('S'), tile('T'), tile('A'), tile('R'), tile('E'), tile('O'), tile('D', 2),
    ];

    const theBlank = blank();
    state.market = marketSlots([
      theBlank, tile('A'), tile('E'), tile('T'),
      tile('N'), tile('O'),
    ]);

    const action = selectAIAction(state, 'greedy', dictionary, 8);
    expect(action.type).toBe('draw');
    if (action.type === 'draw') {
      expect(action.marketTiles).toHaveLength(DRAW_COUNT);
      expect(action.discardTiles).toHaveLength(DRAW_COUNT);
    }
  });

  it('draws exactly 2 tiles while the rack has room', () => {
    setRandomSource(mulberry32(4));
    const state = initializeGame(tileData);
    state.players[0].rack = [tile('Q' as Letter, 10)];

    const action = selectAIAction(state, 'greedy', dictionary, 8);
    expect(action.type).toBe('draw');
    if (action.type === 'draw') {
      expect(action.marketTiles).toHaveLength(DRAW_COUNT);
    }
  });
});

describe('personalities', () => {
  it('hunter takes an available capture', () => {
    setRandomSource(mulberry32(6));
    const state = initializeGame(tileData);
    state.flags = { P1: 'SE', P2: 'NW' };
    // RT beside the NW corner — playing A onto (1,1) makes ART and steals P2's flag.
    state.board[0][1] = tile('R');
    state.board[0][2] = tile('T');
    state.board[5][5] = tile('A'); // board is no longer empty
    state.players[0].rack = [tile('A'), tile('S'), tile('E')];

    const { action, legalPlays } = planAIAction(state, 'hunter', dictionary, 8);
    expect(legalPlays.some(p => p.capturesOpponentFlag)).toBe(true);
    expect(action.type).toBe('play');
    if (action.type === 'play') {
      expect(action.placements.some(p => p.position.row === FLAG_POSTS.NW.row && p.position.col === FLAG_POSTS.NW.col)).toBe(true);
    }
  });

  it('sleeper refuses a capture that would not win', () => {
    setRandomSource(mulberry32(6));
    const state = initializeGame(tileData);
    state.flags = { P1: 'SE', P2: 'NW' };
    state.board[0][1] = tile('R');
    state.board[0][2] = tile('T');
    state.board[5][5] = tile('A');
    state.players[0].rack = [tile('A'), tile('S'), tile('E')];
    state.players[0].score = 0;
    state.players[1].score = 500; // capturing now would lose

    const { action } = planAIAction(state, 'sleeper', dictionary, 8);
    if (action.type === 'play') {
      const capturesPost = action.placements.some(
        p => p.position.row === FLAG_POSTS.NW.row && p.position.col === FLAG_POSTS.NW.col
      );
      expect(capturesPost).toBe(false);
    }
  });
});

// Termination is checked against the real word list and tile set, because that
// is what ships and what the stall depends on: a full-rack refresh draw is
// tile-neutral, so a game only ends if plays keep happening.
describe.sequential('games terminate on the shipping data', () => {
  const realTiles: TileData = JSON.parse(
    readFileSync(resolve(__dirname, '../../data/tiles.json'), 'utf-8')
  );
  const realDictionary = Dictionary.fromText(
    readFileSync(resolve(__dirname, '../../data/words.txt'), 'utf-8')
  );

  const matchups: [AIPersonality, AIPersonality][] = [
    ['greedy', 'greedy'],
    ['hunter', 'sleeper'],
    ['hunter', 'greedy'],
    ['sleeper', 'greedy'],
  ];

  it.each(matchups)('%s vs %s reaches a game-end condition', (p1, p2) => {
    const validEndings = ['self_capture', 'second_steal', 'no_spare', 'exchange_three', 'double_pass', 'stuck_out', 'bag_empty'];

    for (let seed = 2; seed <= 4; seed++) {
      setRandomSource(mulberry32(seed * 977));
      const state = initializeGame(realTiles);
      const seats: [AIPersonality, AIPersonality] = [p1, p2];

      let guard = 0;
      while (!state.gameOver && guard < 600) {
        const action = selectAIAction(state, seats[state.currentPlayer], realDictionary, 8);
        const result = executeAction(state, action, realDictionary);
        expect(result.success, `${action.type} failed: ${result.error}`).toBe(true);
        guard++;
      }

      expect(state.gameOver, `${p1} vs ${p2} seed ${seed} did not finish`).toBe(true);
      expect(validEndings).toContain(state.endReason);
    }
  }, 120_000);
});

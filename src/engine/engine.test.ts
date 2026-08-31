import { describe, it, expect, beforeEach } from 'vitest';
import { initializeGame, createTileBag, getNextFlagPost, isFirstWord } from '../engine/game';
import { executeAction } from '../engine/actions';
import { Dictionary } from '../engine/dictionary';
import type { GameState, TileData } from '../engine/types';

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

const testWords = ['AT', 'ATE', 'EATS', 'TEA', 'TEAS', 'SET', 'SEAT', 'SEATS'];
const mockDictionary = new Dictionary(testWords);

describe('Game Initialization', () => {
  it('should create a valid initial game state', () => {
    const state = initializeGame(mockTileData);
    
    expect(state.board).toHaveLength(9);
    expect(state.board[0]).toHaveLength(9);
    expect(state.players).toHaveLength(2);
    expect(state.players[0].rack).toHaveLength(0);
    expect(state.players[1].rack).toHaveLength(0);
    expect(state.market).toHaveLength(4);
    expect(state.currentPlayer).toBe(0);
    expect(state.gameOver).toBe(false);
  });

  it('should create a tile bag with correct composition', () => {
    const bag = createTileBag(mockTileData);
    const expectedSize = 9 + 13 + 7 + 5 + 2; // A + E + T + S + blanks
    expect(bag).toHaveLength(expectedSize);
    
    const blanks = bag.filter(t => t.isBlank);
    expect(blanks).toHaveLength(2);
  });
});

describe('Flag Rotation', () => {
  it('should rotate flag clockwise through posts', () => {
    const emptyBoard = Array(9).fill(null).map(() => Array(9).fill(null));
    
    expect(getNextFlagPost('NW', emptyBoard)).toBe('NE');
    expect(getNextFlagPost('NE', emptyBoard)).toBe('SE');
    expect(getNextFlagPost('SE', emptyBoard)).toBe('SW');
    expect(getNextFlagPost('SW', emptyBoard)).toBe('NW');
  });

  it('should skip occupied posts', () => {
    const state = initializeGame(mockTileData);
    
    // Occupy NE post (2, 8)
    state.board[1][7] = {
      id: 'test',
      letter: 'A',
      value: 1,
      isBlank: false,
    };

    const nextPost = getNextFlagPost('NW', state.board);
    expect(nextPost).not.toBe('NE');
    expect(nextPost).toBe('SE'); // Should skip NE and go to SE
  });

  it('should return null when all posts are occupied', () => {
    const state = initializeGame(mockTileData);
    
    // Occupy all posts
    state.board[1][1] = { id: '1', letter: 'A', value: 1, isBlank: false }; // NW
    state.board[1][7] = { id: '2', letter: 'B', value: 4, isBlank: false }; // NE
    state.board[7][7] = { id: '3', letter: 'C', value: 4, isBlank: false }; // SE
    state.board[7][1] = { id: '4', letter: 'D', value: 2, isBlank: false }; // SW

    const nextPost = getNextFlagPost('NW', state.board);
    expect(nextPost).toBeNull();
  });
});

describe('Pass Rules', () => {
  let state: GameState;

  beforeEach(() => {
    state = initializeGame(mockTileData);
  });

  it('should not allow pass when market has tiles', () => {
    expect(state.market.length).toBeGreaterThan(0);
    
    const result = executeAction(state, { type: 'pass' }, mockDictionary);
    expect(result.success).toBe(false);
    expect(result.error).toContain('market and bag are empty');
  });

  it('should not allow pass when bag has tiles', () => {
    state.market = [];
    expect(state.bag.length).toBeGreaterThan(0);
    
    const result = executeAction(state, { type: 'pass' }, mockDictionary);
    expect(result.success).toBe(false);
  });

  it('should allow pass only when market and bag are both empty', () => {
    state.market = [];
    state.bag = [];
    
    const result = executeAction(state, { type: 'pass' }, mockDictionary);
    expect(result.success).toBe(true);
    expect(state.consecutivePasses).toBe(1);
  });

  it('should end game after double pass', () => {
    state.market = [];
    state.bag = [];
    
    // First pass
    executeAction(state, { type: 'pass' }, mockDictionary);
    expect(state.gameOver).toBe(false);
    expect(state.consecutivePasses).toBe(1);
    
    // Second pass
    executeAction(state, { type: 'pass' }, mockDictionary);
    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('double_pass');
  });

  it('should reset consecutive passes after a draw', () => {
    // First, set up for a pass
    state.market = [];
    state.bag = [];
    executeAction(state, { type: 'pass' }, mockDictionary);
    expect(state.consecutivePasses).toBe(1);
    
    // Add tiles back to market for next player
    state.market = [
      { id: 'test1', letter: 'A', value: 1, isBlank: false },
      { id: 'test2', letter: 'E', value: 1, isBlank: false },
    ];
    
    // Next player draws
    const result = executeAction(
      state,
      {
        type: 'draw',
        marketTiles: ['test1'],
        takeBagTile: false,
      },
      mockDictionary
    );
    
    expect(result.success).toBe(true);
    expect(state.consecutivePasses).toBe(0);
  });
});

describe('Draw Action', () => {
  let state: GameState;

  beforeEach(() => {
    state = initializeGame(mockTileData);
  });

  it('should allow drawing 1 tile from market', () => {
    const marketTile = state.market[0];
    const player = state.players[0];
    const initialRackSize = player.rack.length;
    
    const result = executeAction(
      state,
      {
        type: 'draw',
        marketTiles: [marketTile.id],
        takeBagTile: false,
      },
      mockDictionary
    );
    
    expect(result.success).toBe(true);
    expect(player.rack).toHaveLength(initialRackSize + 1);
  });

  it('should allow drawing 2 tiles from market', () => {
    const [tile1, tile2] = state.market;
    const player = state.players[0];
    
    const result = executeAction(
      state,
      {
        type: 'draw',
        marketTiles: [tile1.id, tile2.id],
        takeBagTile: false,
      },
      mockDictionary
    );
    
    expect(result.success).toBe(true);
    expect(player.rack).toHaveLength(2);
  });

  it('should restrict blank tile to single take', () => {
    // Add a blank to market
    state.market[0] = {
      id: 'blank1',
      letter: null,
      value: 0,
      isBlank: true,
    };

    const result = executeAction(
      state,
      {
        type: 'draw',
        marketTiles: ['blank1', state.market[1].id],
        takeBagTile: false,
      },
      mockDictionary
    );
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot take more than 1 tile when taking a blank');
  });

  it('should refill market after draw', () => {
    const initialMarketSize = state.market.length;
    
    executeAction(
      state,
      {
        type: 'draw',
        marketTiles: [state.market[0].id],
        takeBagTile: false,
      },
      mockDictionary
    );
    
    expect(state.market).toHaveLength(initialMarketSize);
  });
});

describe('Game End Conditions', () => {
  it('should end game when bag is depleted', () => {
    const state = initializeGame(mockTileData);
    state.bag = [];
    state.bagDepleted = true;
    
    // Trigger flag rotation
    executeAction(
      state,
      {
        type: 'draw',
        marketTiles: [],
        takeBagTile: false,
      },
      mockDictionary
    );
    
    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('bag');
  });

  it('should end game when all posts are occupied', () => {
    const state = initializeGame(mockTileData);
    
    // Occupy all posts
    state.board[1][1] = { id: '1', letter: 'A', value: 1, isBlank: false };
    state.board[1][7] = { id: '2', letter: 'B', value: 4, isBlank: false };
    state.board[7][7] = { id: '3', letter: 'C', value: 4, isBlank: false };
    state.board[7][1] = { id: '4', letter: 'D', value: 2, isBlank: false };
    
    // Trigger flag rotation
    state.market = [];
    state.bag = [];
    executeAction(state, { type: 'pass' }, mockDictionary);
    
    expect(state.gameOver).toBe(true);
    expect(state.endReason).toBe('posts_full');
  });
});

describe('First Word Requirement', () => {
  it('should detect empty board', () => {
    const state = initializeGame(mockTileData);
    expect(isFirstWord(state.board)).toBe(true);
  });

  it('should detect board with tiles', () => {
    const state = initializeGame(mockTileData);
    state.board[4][4] = { id: 'test', letter: 'A', value: 1, isBlank: false };
    expect(isFirstWord(state.board)).toBe(false);
  });
});

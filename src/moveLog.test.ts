import { describe, it, expect } from 'vitest';
import { describeMove, firstPlayerLogEntry, joinWords, playSummaryText, seatDisplayName } from './moveLog';
import { initializeGame } from './engine/game';
import { executeAction } from './engine/actions';
import type { TileData } from './engine/types';
import { DRAW_COUNT } from './engine/types';
import { PHONE_9 } from './engine/variants';

const RACK_MAX = PHONE_9.rackMax;
import { Dictionary } from './engine/dictionary';

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
      ],
      blanks: { count: 2, value: 0 },
    },
  },
};

const dictionary = new Dictionary(['AT', 'ATE', 'ART', 'TEA', 'AS']);

const soloCtx = { isVsAI: true, isHotseat: false, humanSeat: 0 as const, aiName: 'Hunter' };
const hotseatCtx = { isVsAI: false, isHotseat: true, humanSeat: 0 as const, aiName: null };

describe('move log seat names', () => {
  it('never uses P1/P2 in display names', () => {
    expect(seatDisplayName('P1', soloCtx)).toBe('You');
    expect(seatDisplayName('P2', soloCtx)).toBe('Hunter');
    expect(seatDisplayName('P1', hotseatCtx)).toBe('Teal');
    expect(seatDisplayName('P2', hotseatCtx)).toBe('Terracotta');
  });

  it('logs first-player banner as a system line', () => {
    const entry = firstPlayerLogEntry('You play first');
    expect(entry.system).toBe(true);
    expect(entry.text).toBe('You play first');
    expect(entry.name).toBeUndefined();
  });
});

describe('play line copy', () => {
  it('reads "<words> for <score>", never "+score"', () => {
    expect(playSummaryText('ABHORS + AD + BO + HE', 22)).toBe('ABHORS + AD + BO + HE for 22');
    expect(playSummaryText('ABHORS + AD + BO + HE', 22)).not.toContain('+22');
  });

  it('joins every word the play made in scoring order', () => {
    expect(joinWords([{ word: 'ABHORS' }, { word: 'AD' }, { word: 'BO' }, { word: 'HE' }])).toBe(
      'ABHORS + AD + BO + HE'
    );
  });

  it('hands the UI the words and the score apart, so the score can be styled', () => {
    const state = initializeGame(mockTileData);
    state.flags.P1 = 'NW';
    state.flags.P2 = 'SE';
    state.board[5][5] = { id: 'a0', letter: 'A', value: 1, isBlank: false };
    state.players[0].rack = [{ id: 't1', letter: 'T', value: 1, isBlank: false }];
    executeAction(
      state,
      { type: 'play', placements: [{ tileId: 't1', position: { row: 6, col: 7 } }] },
      dictionary
    );
    const entry = describeMove(state, soloCtx);
    expect(entry?.words).toBe('AT');
    expect(entry?.score).toBe(state.lastPlay!.totalScore);
    // The plain text still carries the whole line for screen readers.
    expect(entry?.text).toBe(`AT for ${state.lastPlay!.totalScore}`);
  });
});

describe('move log copy', () => {
  it('labels draws as Draw 2', () => {
    const state = initializeGame(mockTileData);
    executeAction(state, { type: 'draw', marketTiles: state.market.slice(0, 2).map(s => s.tile!.id) }, dictionary);
    const entry = describeMove(state, soloCtx);
    expect(entry?.text).toMatch(/^Draw 2/);
    expect(entry?.name).toBe('You');
  });

  it('logs flag captures clearly', () => {
    const state = initializeGame(mockTileData);
    state.flags.P1 = 'NW';
    state.flags.P2 = 'SE';
    state.board[0][1] = { id: 'r', letter: 'R', value: 1, isBlank: false };
    state.board[0][2] = { id: 't', letter: 'T', value: 1, isBlank: false };
    state.players[0].rack = [{ id: 'a1', letter: 'A', value: 1, isBlank: false }];
    executeAction(
      state,
      { type: 'play', placements: [{ tileId: 'a1', position: { row: 1, col: 1 } }] },
      dictionary
    );
    const entry = describeMove(state, soloCtx);
    expect(entry?.text).toContain('own flag captured (TWS)');
  });

  it('logs exchange-three ending on the third full-rack Exchange', () => {
    const state = initializeGame(mockTileData);
    for (let i = 0; i < 40; i++) {
      state.bag.push({ id: `x${i}`, letter: 'A', value: 1, isBlank: false });
    }
    for (let i = 0; i < 3; i++) {
      const player = state.players[state.currentPlayer];
      player.rack = Array.from({ length: RACK_MAX }, (_, n) => ({
        id: `rack-${i}-${n}`,
        letter: 'T' as const,
        value: 1,
        isBlank: false,
      }));
      executeAction(
        state,
        {
          type: 'draw',
          marketTiles: state.market.filter(s => s.tile).slice(0, 2).map(s => s.tile!.id),
          discardTiles: player.rack.slice(0, DRAW_COUNT).map(t => t.id),
        },
        dictionary
      );
    }
    const entry = describeMove(state, soloCtx);
    expect(entry?.text).toContain('three consecutive Exchanges, game over');
  });
});

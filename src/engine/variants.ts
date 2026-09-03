// The two boards Word Heist ships, and everything that scales with them.
//
// A rule set is chosen once, when a game is created, and then travels on the
// GameState (`state.rules`). Nothing reads a board size out of module scope:
// a game that started on a 9×9 stays a 9×9 game even if the window is resized
// past the breakpoint mid-play, and two games with different geometry can be
// alive in the same process (which is what the sim CLI and the tests do).
//
// Geometry that is *implied* by the board size — where the centre star sits,
// where the four true corners are — is derived here rather than stored, so a
// variant cannot be declared with corners that do not match its own board.

import type { FlagPost, Position } from './types';

export type RuleSetId = 'phone-9' | 'tablet-11';

export interface RuleSet {
  id: RuleSetId;
  /** Cells per side. Always odd, so there is a single centre cell. */
  boardSize: number;
  /** Tiles a player may hold. Draw 2 above this forces a discard back to it. */
  rackMax: number;
  marketFaceUp: number;
  marketFaceDown: number;
}

/**
 * Phone default (v0.1). A short game on a small screen: six tiles in hand and
 * five in the market, so a draw is a real choice without a wall of tiles.
 */
export const PHONE_9: RuleSet = {
  id: 'phone-9',
  boardSize: 9,
  rackMax: 6,
  marketFaceUp: 3,
  marketFaceDown: 2,
};

/**
 * Tablet and desktop. A bigger screen affords a bigger board, and the rack and
 * market scale with it: seven in hand, six showing. The extra face-up tile is
 * what keeps a wider market a choice rather than a longer queue — four face-up
 * gives six ways to take two, against three on the phone.
 */
export const TABLET_11: RuleSet = {
  id: 'tablet-11',
  boardSize: 11,
  rackMax: 7,
  marketFaceUp: 4,
  marketFaceDown: 2,
};

export const RULE_SETS: Record<RuleSetId, RuleSet> = {
  'phone-9': PHONE_9,
  'tablet-11': TABLET_11,
};

/** Largest board any variant uses — the dictionary's longest playable word. */
export const MAX_BOARD_SIZE = Math.max(
  ...Object.values(RULE_SETS).map(rules => rules.boardSize)
);

export function marketSlots(rules: RuleSet): number {
  return rules.marketFaceUp + rules.marketFaceDown;
}

/** The single centre cell. Odd board sizes only, which is why they are odd. */
export function centreStar(boardSize: number): Position {
  const middle = (boardSize + 1) / 2;
  return { row: middle, col: middle };
}

/** The four true corners, 1-indexed. No inland posts. */
export function flagPosts(boardSize: number): Record<FlagPost, Position> {
  return {
    NW: { row: 1, col: 1 },
    NE: { row: 1, col: boardSize },
    SE: { row: boardSize, col: boardSize },
    SW: { row: boardSize, col: 1 },
  };
}

export function flagPost(boardSize: number, corner: FlagPost): Position {
  return flagPosts(boardSize)[corner];
}

/** The rule set a board belongs to, recovered from its own dimensions. */
export function rulesForBoardSize(boardSize: number): RuleSet {
  const match = Object.values(RULE_SETS).find(rules => rules.boardSize === boardSize);
  if (!match) throw new Error(`No rule set for a ${boardSize}×${boardSize} board`);
  return match;
}

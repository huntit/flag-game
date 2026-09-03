// Core game types for Word Heist

import type { RuleSet } from './variants';

export type Letter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' |
                     'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

export type TileId = string; // Unique identifier for each tile instance

export interface Tile {
  id: TileId;
  letter: Letter | null; // null for blank tiles
  value: number;
  isBlank: boolean;
}

export interface PlacedTile extends Tile {
  assignedLetter?: Letter; // For blank tiles, the letter they represent
  playerId?: 'P1' | 'P2';
}

export type Position = {
  row: number; // 1-indexed
  col: number; // 1-indexed
};

export type FlagPost = 'NW' | 'NE' | 'SE' | 'SW';

export const DRAW_COUNT = 2;
/** Three consecutive Exchange turns (full-rack Draw 2 + Discard 2), counted across both players. */
export const MAX_CONSECUTIVE_EXCHANGES = 3;
/** Opening deal from bag — P1 acts first; P2 gets one extra tile (no points bonus). Do not scale. */
export const P1_STARTING_RACK_TILES = 2;
export const P2_STARTING_RACK_TILES = 3;

export const SEAT_COLOR_NAMES = {
  P1: 'Teal',
  P2: 'Terracotta',
} as const;
export const MIN_WORD_LENGTH = 2;

// Board size, rack cap, market shape and the geometry that follows from them
// (centre star, true corners) belong to a rule set, not to the module: see
// ./variants.ts. A live game carries its own in `GameState.rules`.

export const PLAYER_COLORS = {
  P1: '#56867C',
  P2: '#CB6B49',
} as const;

export const THEME_COLORS = {
  cream: '#F7F1E8',
  ink: '#2C3A3D',
  sand: '#E8DFD0',
} as const;

export type BoardCell = PlacedTile | null;

// Square, sized by the game's rule set. 0-indexed internally, displayed 1-indexed.
export type Board = BoardCell[][];

export interface Player {
  id: 'P1' | 'P2';
  rack: Tile[];
  score: number;
  flagsLost: number;
}

export interface MarketSlot {
  tile: Tile | null;
  faceUp: boolean;
}

export interface ScoredWord {
  word: string;
  positions: Position[];
  score: number;
  /** Base letter sum before flag multipliers. */
  baseScore?: number;
  flagMultiplier?: 1 | 2 | 3;
}

export interface WordPlacement {
  tiles: { tile: Tile; position: Position; assignedLetter?: Letter }[];
  words: ScoredWord[];
  totalScore: number;
  capturesOwnFlag: boolean;
  capturesOpponentFlag: boolean;
  endsGame: boolean;
  /** Any flag cell covered (own or opponent). */
  captures: boolean;
}

export interface DrawAction {
  type: 'draw';
  marketTiles: TileId[];
  discardTiles?: TileId[];
}

export interface PlayAction {
  type: 'play';
  placements: { tileId: TileId; position: Position; assignedLetter?: Letter }[];
}

export interface PassAction {
  type: 'pass';
}

export type GameAction = DrawAction | PlayAction | PassAction;

export type EndReason =
  | 'self_capture'
  | 'second_steal'
  | 'no_spare'
  | 'going_out'
  | 'exchange_three'
  | 'double_pass'
  | 'stuck_out';

/** Ends that apply Scrabble leftover (ender adds opponent rack; opponent loses that sum). */
export const LEFTOVER_END_REASONS: readonly EndReason[] = [
  'self_capture',
  'second_steal',
  'going_out',
  'no_spare',
];

export interface GameState {
  /** The board and rack sizes this game was dealt with; fixed for its lifetime. */
  rules: RuleSet;
  board: Board;
  players: [Player, Player];
  currentPlayer: 0 | 1;
  market: MarketSlot[];
  bag: Tile[];
  /** Corner where each player's flag token sits; null after capture until replacement. */
  flags: { P1: FlagPost | null; P2: FlagPost | null };
  /** Full-rack Exchange turns in a row; Play, non-Exchange Draw, and Pass reset to 0. */
  consecutiveExchanges: number;
  /** Explicit Passes in a row; Draw or Play resets to 0. Two consecutive Passes end the game. */
  consecutivePasses: number;
  gameOver: boolean;
  endReason?: EndReason;
  winner?: 'P1' | 'P2' | 'draw';
  /** Opponent rack letter-value sum transferred on leftover ends. Undefined if leftover did not apply. */
  leftoverPoints?: number;
  turnCount: number;
  moveHistory: { player: 'P1' | 'P2'; action: GameAction }[];
  /** Result of the most recent Play, for the turn readout. */
  lastPlay?: {
    player: 'P1' | 'P2';
    words: ScoredWord[];
    totalScore: number;
    captures: boolean;
    capturesOwnFlag: boolean;
    capturesOpponentFlag: boolean;
  };
}

export type AIPersonality = 'greedy' | 'hunter' | 'sleeper';

export interface TileSet {
  letter: Letter;
  count: number;
  value: number;
}

export interface TileData {
  source: { values: string; counts: string };
  note: string;
  defaultSet: string;
  bagSize: number;
  blankCount: number;
  tileSets: {
    wwf: {
      description: string;
      tiles: TileSet[];
      blanks: { count: number; value: number };
    };
  };
}

// Core game types for Flag

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

export const BOARD_SIZE = 9;
export const RACK_MAX = 6;
export const MARKET_FACE_UP = 3;
export const MARKET_FACE_DOWN = 2;
export const MARKET_SLOTS = MARKET_FACE_UP + MARKET_FACE_DOWN;
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
export const MAX_WORD_LENGTH = 9;

/** True corners (1-indexed). No inland posts. Phone v0.1 9×9. */
export const FLAG_POSTS: Record<FlagPost, Position> = {
  NW: { row: 1, col: 1 },
  NE: { row: 1, col: 9 },
  SE: { row: 9, col: 9 },
  SW: { row: 9, col: 1 },
};

export const CENTRE_STAR: Position = { row: 5, col: 5 };

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

export type Board = BoardCell[][]; // BOARD_SIZE×BOARD_SIZE, 0-indexed internally, display 1-indexed

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

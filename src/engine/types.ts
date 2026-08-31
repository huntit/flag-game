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
}

export type Position = {
  row: number; // 1-indexed
  col: number; // 1-indexed
};

export type FlagPost = 'NW' | 'NE' | 'SE' | 'SW';

export const BOARD_SIZE = 11;
export const RACK_MAX = 7;
export const MARKET_SIZE = 4;
export const MAX_MARKET_TAKE = 2;
export const STARTING_RACK_TILES = 2; // drawn from bag, not market
export const MIN_WORD_LENGTH = 2;
export const MAX_WORD_LENGTH = 11;

export const FLAG_POSTS: Record<FlagPost, Position> = {
  NW: { row: 2, col: 2 },
  NE: { row: 2, col: 10 },
  SE: { row: 10, col: 10 },
  SW: { row: 10, col: 2 },
};

export const CENTRE_STAR: Position = { row: 6, col: 6 };

export type BoardCell = PlacedTile | null;

export type Board = BoardCell[][]; // BOARD_SIZE×BOARD_SIZE, 0-indexed internally, display 1-indexed

export interface Player {
  id: 'P1' | 'P2';
  rack: Tile[];
  score: number;
}

export interface ScoredWord {
  word: string;
  positions: Position[];
  score: number;
}

export interface WordPlacement {
  tiles: { tile: Tile; position: Position; assignedLetter?: Letter }[];
  words: ScoredWord[];
  totalScore: number;
  captures: boolean;
}

export interface DrawAction {
  type: 'draw';
  marketTiles: TileId[];
  discardTiles?: TileId[]; // For refresh mode
  takeBagTile: boolean;
}

export interface PlayAction {
  type: 'play';
  placements: { tileId: TileId; position: Position; assignedLetter?: Letter }[];
}

export interface PassAction {
  type: 'pass';
}

export type GameAction = DrawAction | PlayAction | PassAction;

export type EndReason = 'capture' | 'bag' | 'posts_full' | 'double_pass';

export interface GameState {
  board: Board;
  players: [Player, Player];
  currentPlayer: 0 | 1;
  market: Tile[];
  bag: Tile[];
  livePost: FlagPost;
  bagDepleted: boolean;
  consecutivePasses: number;
  gameOver: boolean;
  endReason?: EndReason;
  winner?: 'P1' | 'P2' | 'draw';
  turnCount: number;
  moveHistory: { player: 'P1' | 'P2'; action: GameAction }[];
  /** Result of the most recent Play, for the "STAR +4" turn readout. */
  lastPlay?: {
    player: 'P1' | 'P2';
    words: ScoredWord[];
    totalScore: number;
    captures: boolean;
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

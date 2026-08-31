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
  row: number; // 1-9
  col: number; // 1-9
};

export type FlagPost = 'NW' | 'NE' | 'SE' | 'SW';

export const FLAG_POSTS: Record<FlagPost, Position> = {
  NW: { row: 2, col: 2 },
  NE: { row: 2, col: 8 },
  SE: { row: 8, col: 8 },
  SW: { row: 8, col: 2 },
};

export const CENTRE_STAR: Position = { row: 5, col: 5 };

export type BoardCell = PlacedTile | null;

export type Board = BoardCell[][]; // 9x9 grid (0-indexed internally, but display as 1-9)

export interface Player {
  id: 'P1' | 'P2';
  rack: Tile[];
  score: number;
}

export interface WordPlacement {
  tiles: { tile: Tile; position: Position; assignedLetter?: Letter }[];
  words: { word: string; positions: Position[]; score: number }[];
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

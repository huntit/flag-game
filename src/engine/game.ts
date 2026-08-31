// Game initialization and tile bag management

import type { Tile, TileId, TileData, FlagPost, GameState, Board, Player } from './types';
import { FLAG_POSTS } from './types';

let tileIdCounter = 0;

function generateTileId(): TileId {
  return `tile_${tileIdCounter++}`;
}

export function createTileBag(tileData: TileData): Tile[] {
  const tiles: Tile[] = [];
  const wwfSet = tileData.tileSets.wwf;

  // Add letter tiles
  for (const tileSet of wwfSet.tiles) {
    for (let i = 0; i < tileSet.count; i++) {
      tiles.push({
        id: generateTileId(),
        letter: tileSet.letter,
        value: tileSet.value,
        isBlank: false,
      });
    }
  }

  // Add blank tiles
  for (let i = 0; i < wwfSet.blanks.count; i++) {
    tiles.push({
      id: generateTileId(),
      letter: null,
      value: wwfSet.blanks.value,
      isBlank: true,
    });
  }

  return tiles;
}

export function shuffleBag(bag: Tile[]): void {
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}

export function drawFromBag(bag: Tile[], count: number): Tile[] {
  return bag.splice(0, Math.min(count, bag.length));
}

export function returnToBag(bag: Tile[], tiles: Tile[]): void {
  bag.push(...tiles);
}

function createEmptyBoard(): Board {
  return Array(9).fill(null).map(() => Array(9).fill(null));
}

function randomFlagPost(): FlagPost {
  const posts: FlagPost[] = ['NW', 'NE', 'SE', 'SW'];
  return posts[Math.floor(Math.random() * posts.length)];
}

export function initializeGame(tileData: TileData): GameState {
  const bag = createTileBag(tileData);
  shuffleBag(bag);

  const market = drawFromBag(bag, 4);

  const players: [Player, Player] = [
    { id: 'P1', rack: [], score: 0 },
    { id: 'P2', rack: [], score: 0 },
  ];

  return {
    board: createEmptyBoard(),
    players,
    currentPlayer: 0,
    market,
    bag,
    livePost: randomFlagPost(),
    bagDepleted: false,
    consecutivePasses: 0,
    gameOver: false,
    turnCount: 0,
    moveHistory: [],
  };
}

export function positionEquals(a: { row: number; col: number }, b: { row: number; col: number }): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isValidPosition(pos: { row: number; col: number }): boolean {
  return pos.row >= 1 && pos.row <= 9 && pos.col >= 1 && pos.col <= 9;
}

export function getBoardTile(board: Board, pos: { row: number; col: number }) {
  if (!isValidPosition(pos)) return null;
  return board[pos.row - 1][pos.col - 1];
}

export function setBoardTile(board: Board, pos: { row: number; col: number }, tile: any) {
  if (!isValidPosition(pos)) return;
  board[pos.row - 1][pos.col - 1] = tile;
}

export function getNextFlagPost(current: FlagPost, board: Board): FlagPost | null {
  const order: FlagPost[] = ['NW', 'NE', 'SE', 'SW'];
  const currentIndex = order.indexOf(current);
  
  for (let i = 1; i <= 4; i++) {
    const nextPost = order[(currentIndex + i) % 4];
    const pos = FLAG_POSTS[nextPost];
    if (!getBoardTile(board, pos)) {
      return nextPost;
    }
  }
  
  return null; // All posts are occupied
}

export function isFirstWord(board: Board): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== null) {
        return false;
      }
    }
  }
  return true;
}

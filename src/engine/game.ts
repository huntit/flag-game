// Game initialization, board helpers and tile bag management

import type { Tile, TileId, TileData, FlagPost, GameState, Board, Player } from './types';
import { FLAG_POSTS, BOARD_SIZE, MARKET_SIZE, STARTING_RACK_TILES } from './types';

let tileIdCounter = 0;

function generateTileId(): TileId {
  return `tile_${tileIdCounter++}`;
}

// Randomness is pluggable so the flag-sim CLI can reproduce a game from a seed
// and tests can pin shuffles. Everything in the engine draws from here.
let randomSource: () => number = Math.random;

export function setRandomSource(source: () => number): void {
  randomSource = source;
}

export function resetRandomSource(): void {
  randomSource = Math.random;
}

export function random(): number {
  return randomSource();
}

/** Deterministic PRNG for seeded simulation runs. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createTileBag(tileData: TileData): Tile[] {
  const tiles: Tile[] = [];
  const wwfSet = tileData.tileSets.wwf;

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
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}

/**
 * Reorder a player's own rack. Shuffling is a display convenience, not a turn:
 * it never changes which tiles you hold, only the order they sit in.
 *
 * A plain shuffle of two tiles leaves them alone half the time, which reads as a
 * dead button, so keep shuffling until the order actually changes (when a
 * different order is possible at all).
 */
export function shuffleRack(rack: Tile[]): Tile[] {
  if (rack.length < 2) return [...rack];

  const order = (tiles: Tile[]) => tiles.map(t => t.id).join(',');
  const original = order(rack);

  let next = [...rack];
  for (let attempt = 0; attempt < 12; attempt++) {
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    if (order(next) !== original) return next;
    next = [...rack];
  }

  // Fall back to a rotation, which always differs for two or more tiles.
  return [...rack.slice(1), rack[0]];
}

export function drawFromBag(bag: Tile[], count: number): Tile[] {
  return bag.splice(0, Math.min(count, bag.length));
}

export function returnToBag(bag: Tile[], tiles: Tile[]): void {
  bag.push(...tiles);
}

function createEmptyBoard(): Board {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
}

function randomFlagPost(): FlagPost {
  const posts: FlagPost[] = ['NW', 'NE', 'SE', 'SW'];
  return posts[Math.floor(random() * posts.length)];
}

export function initializeGame(tileData: TileData): GameState {
  const bag = createTileBag(tileData);
  shuffleBag(bag);

  // Market is dealt first, then two tiles per player straight from the bag.
  const market = drawFromBag(bag, MARKET_SIZE);

  const players: [Player, Player] = [
    { id: 'P1', rack: drawFromBag(bag, STARTING_RACK_TILES), score: 0 },
    { id: 'P2', rack: drawFromBag(bag, STARTING_RACK_TILES), score: 0 },
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
  return pos.row >= 1 && pos.row <= BOARD_SIZE && pos.col >= 1 && pos.col <= BOARD_SIZE;
}

export function getBoardTile(board: Board, pos: { row: number; col: number }) {
  if (!isValidPosition(pos)) return null;
  return board[pos.row - 1][pos.col - 1];
}

export function setBoardTile(board: Board, pos: { row: number; col: number }, tile: Board[number][number]) {
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
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== null) {
        return false;
      }
    }
  }
  return true;
}

/** Public opponent rack: tile count only, no letters or values. */
export function facedownRack(count: number): Tile[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `hidden_${i}`,
    letter: null,
    value: 0,
    isBlank: true,
  }));
}

// Game initialization, board helpers and tile bag management

import type {
  Tile,
  TileId,
  TileData,
  FlagPost,
  GameState,
  Board,
  Player,
  MarketSlot,
  Position,
} from './types';
import {
  P1_STARTING_RACK_TILES,
  P2_STARTING_RACK_TILES,
} from './types';
import type { RuleSet } from './variants';
import { PHONE_9, flagPosts } from './variants';

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

  return [...rack.slice(1), rack[0]];
}

/**
 * Move one rack tile so it sits immediately before whatever is at toIndex in
 * the rack as it stands now (toIndex === rack.length puts it last). Like
 * shuffleRack this is a display convenience — the tiles you hold never change,
 * only the order they sit in.
 */
export function reorderRack(rack: Tile[], tileId: TileId, toIndex: number): Tile[] {
  const from = rack.findIndex(t => t.id === tileId);
  if (from === -1) return [...rack];

  const clamped = Math.max(0, Math.min(rack.length, toIndex));
  const next = [...rack];
  const [moved] = next.splice(from, 1);
  // Pulling the tile out shifts everything after it down one, so a rightward
  // move lands one short of the slot the player aimed at without this.
  next.splice(clamped > from ? clamped - 1 : clamped, 0, moved);
  return next;
}

export function drawFromBag(bag: Tile[], count: number): Tile[] {
  return bag.splice(0, Math.min(count, bag.length));
}

export function returnToBag(bag: Tile[], tiles: Tile[]): void {
  bag.push(...tiles);
}

function createEmptyBoard(boardSize: number): Board {
  return Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
}

/** The four true corners of the board in hand — a board is square, so its own
    length is the authority on its geometry. */
export function cornersOf(board: Board): Record<FlagPost, Position> {
  return flagPosts(board.length);
}

const ALL_CORNERS: FlagPost[] = ['NW', 'NE', 'SE', 'SW'];

export function diagonalCorner(corner: FlagPost): FlagPost {
  const pairs: Record<FlagPost, FlagPost> = {
    NW: 'SE',
    SE: 'NW',
    NE: 'SW',
    SW: 'NE',
  };
  return pairs[corner];
}

export function spareCorners(p1Corner: FlagPost, p2Corner: FlagPost): FlagPost[] {
  return ALL_CORNERS.filter(c => c !== p1Corner && c !== p2Corner);
}

/**
 * Face-up slots first, then the two face-down ones on the end. A slot keeps its
 * face-up/face-down identity for the whole game: refilling writes the
 * replacement into the same slot (see refillMarketSlot), so the two face-down
 * positions stay put and the row never reshuffles under the player's eye.
 */
function dealMarket(bag: Tile[], rules: RuleSet): MarketSlot[] {
  const slots: MarketSlot[] = [];
  for (let i = 0; i < rules.marketFaceUp; i++) {
    slots.push({ tile: bag.shift() ?? null, faceUp: true });
  }
  for (let i = 0; i < rules.marketFaceDown; i++) {
    slots.push({ tile: bag.shift() ?? null, faceUp: false });
  }
  return slots;
}

export function rackLetterValueSum(rack: Tile[]): number {
  return rack.reduce((sum, t) => sum + (t.isBlank ? 0 : t.value), 0);
}

export function marketShowingCount(market: MarketSlot[]): number {
  return market.filter(slot => slot.tile !== null).length;
}

export function getMarketTiles(market: MarketSlot[]): Tile[] {
  return market.flatMap(slot => (slot.tile ? [slot.tile] : []));
}

/**
 * Opening flag corners are fixed, not drawn: P1 in the north-west, P2 in the
 * south-east, leaving NE and SW as the spare corners. Both players learn one
 * board rather than re-reading which diagonal they are on every game, and the
 * corner a player defends is the one nearest their own score card.
 */
export const P1_FLAG_CORNER: FlagPost = 'NW';
export const P2_FLAG_CORNER: FlagPost = 'SE';

export function initializeGame(tileData: TileData, rules: RuleSet = PHONE_9): GameState {
  const bag = createTileBag(tileData);
  shuffleBag(bag);

  const market = dealMarket(bag, rules);

  const players: [Player, Player] = [
    { id: 'P1', rack: drawFromBag(bag, P1_STARTING_RACK_TILES), score: 0, flagsLost: 0 },
    { id: 'P2', rack: drawFromBag(bag, P2_STARTING_RACK_TILES), score: 0, flagsLost: 0 },
  ];

  const p1Corner = P1_FLAG_CORNER;
  const p2Corner = P2_FLAG_CORNER;

  return {
    rules,
    board: createEmptyBoard(rules.boardSize),
    players,
    currentPlayer: 0,
    market,
    bag,
    flags: { P1: p1Corner, P2: p2Corner },
    consecutiveExchanges: 0,
    consecutivePasses: 0,
    gameOver: false,
    turnCount: 0,
    moveHistory: [],
  };
}

export function positionEquals(a: { row: number; col: number }, b: { row: number; col: number }): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isValidPosition(pos: { row: number; col: number }, size: number): boolean {
  return pos.row >= 1 && pos.row <= size && pos.col >= 1 && pos.col <= size;
}

export function isOnBoard(board: Board, pos: { row: number; col: number }): boolean {
  return isValidPosition(pos, board.length);
}

export function getBoardTile(board: Board, pos: { row: number; col: number }) {
  if (!isOnBoard(board, pos)) return null;
  return board[pos.row - 1][pos.col - 1];
}

export function setBoardTile(board: Board, pos: { row: number; col: number }, tile: Board[number][number]) {
  if (!isOnBoard(board, pos)) return;
  board[pos.row - 1][pos.col - 1] = tile;
}

export function cornerAtPosition(
  pos: Position,
  flags: GameState['flags'],
  boardSize: number
): FlagPost | null {
  const posts = flagPosts(boardSize);
  for (const corner of ALL_CORNERS) {
    if (positionEquals(pos, posts[corner])) {
      if (flags.P1 === corner || flags.P2 === corner) return corner;
    }
  }
  return null;
}

export function flagOwnerAtCorner(corner: FlagPost, flags: GameState['flags']): 'P1' | 'P2' | null {
  if (flags.P1 === corner) return 'P1';
  if (flags.P2 === corner) return 'P2';
  return null;
}

/** Spare true corners with no tile and no flag token. */
export function emptySpareCorners(state: GameState): FlagPost[] {
  const occupied = new Set<FlagPost>();
  if (state.flags.P1) occupied.add(state.flags.P1);
  if (state.flags.P2) occupied.add(state.flags.P2);

  const posts = cornersOf(state.board);
  return ALL_CORNERS.filter(corner => {
    if (occupied.has(corner)) return false;
    return !getBoardTile(state.board, posts[corner]);
  });
}

export function randomEmptySpareCorner(state: GameState): FlagPost | null {
  const spares = emptySpareCorners(state);
  if (spares.length === 0) return null;
  return spares[Math.floor(random() * spares.length)];
}

export function isFirstWord(board: Board): boolean {
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board.length; col++) {
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

export function refillMarketSlot(bag: Tile[], slot: MarketSlot): void {
  if (slot.tile !== null || bag.length === 0) return;
  slot.tile = bag.shift() ?? null;
}

export function refillMarket(bag: Tile[], market: MarketSlot[]): void {
  for (const slot of market) {
    refillMarketSlot(bag, slot);
  }
}

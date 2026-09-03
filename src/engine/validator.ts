// Placement validation, word formation and scoring.
//
// Every new straight-line word of two or more letters formed by a play must be
// in the dictionary, and each such word scores the sum of the letter values of
// every tile in it (blanks score 0). Flag multipliers apply to the capturing
// word only — TWS for whoever covers a flag cell (own or steal).

import type { Board, Position, PlacedTile, Tile, Letter } from './types';
import { getBoardTile, setBoardTile, isOnBoard, isValidPosition, positionEquals, isFirstWord } from './game';
import { MIN_WORD_LENGTH } from './types';
import { centreStar, flagPosts } from './variants';
import type { Dictionary } from './dictionary';

export interface WordInfo {
  word: string;
  positions: Position[];
  score: number;
  baseScore?: number;
  flagMultiplier?: 1 | 2 | 3;
}

export interface Placement {
  tile: Tile;
  position: Position;
  assignedLetter?: Letter;
}

export interface PlayEvaluation {
  valid: boolean;
  reason?: string;
  words?: WordInfo[];
  totalScore?: number;
  captures?: boolean;
  capturesOwnFlag?: boolean;
  capturesOpponentFlag?: boolean;
  endsGame?: boolean;
}

/** The letter a tile shows on the board; a blank shows its assigned letter. */
export function effectiveLetter(tile: PlacedTile): string {
  if (tile.isBlank) return tile.assignedLetter ?? '';
  return tile.letter ?? '';
}

/** Blanks score 0 no matter which letter they stand for. */
export function tileScore(tile: PlacedTile): number {
  return tile.isBlank ? 0 : tile.value;
}

function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

function step(pos: Position, horizontal: boolean, delta: number): Position {
  return horizontal
    ? { row: pos.row, col: pos.col + delta }
    : { row: pos.row + delta, col: pos.col };
}

/**
 * Read the full contiguous run of tiles through `pos` along one axis.
 * Returns null when the run is a single tile (a lone letter is not a word).
 */
export function readWord(board: Board, pos: Position, horizontal: boolean): WordInfo | null {
  if (!getBoardTile(board, pos)) return null;

  let start = pos;
  while (true) {
    const previous = step(start, horizontal, -1);
    if (!isOnBoard(board, previous) || !getBoardTile(board, previous)) break;
    start = previous;
  }

  const positions: Position[] = [];
  let word = '';
  let score = 0;
  let cursor = start;
  while (isOnBoard(board, cursor)) {
    const tile = getBoardTile(board, cursor);
    if (!tile) break;
    positions.push(cursor);
    word += effectiveLetter(tile);
    score += tileScore(tile);
    cursor = step(cursor, horizontal, 1);
  }

  if (positions.length < MIN_WORD_LENGTH) return null;
  return { word, positions, score, baseScore: score, flagMultiplier: 1 };
}

export function wordKey(word: WordInfo): string {
  const first = word.positions[0];
  const last = word.positions[word.positions.length - 1];
  return `${first.row},${first.col}-${last.row},${last.col}`;
}

function wordContainingPosition(words: WordInfo[], pos: Position): WordInfo | null {
  return words.find(w => w.positions.some(p => positionEquals(p, pos))) ?? null;
}

/**
 * Collect every new word a play forms: the main word along the play axis plus
 * one crossword per placed tile on the perpendicular axis.
 */
export function findWordsFormed(
  board: Board,
  placements: Placement[],
  dictionary: Dictionary
): { words: WordInfo[]; valid: boolean; reason?: string } {
  const layout = describeLayout(placements, board.length);
  if (!layout.valid) {
    return { words: [], valid: false, reason: layout.reason };
  }

  const tempBoard = cloneBoard(board);
  for (const placement of placements) {
    const placedTile: PlacedTile = {
      ...placement.tile,
      assignedLetter: placement.assignedLetter,
    };
    setBoardTile(tempBoard, placement.position, placedTile);
  }

  if (layout.horizontal !== null) {
    const horizontal = layout.horizontal;
    const positions = placements.map(p => p.position);
    const from = horizontal
      ? Math.min(...positions.map(p => p.col))
      : Math.min(...positions.map(p => p.row));
    const to = horizontal
      ? Math.max(...positions.map(p => p.col))
      : Math.max(...positions.map(p => p.row));
    const line = horizontal ? positions[0].row : positions[0].col;
    for (let i = from; i <= to; i++) {
      const cell = horizontal ? { row: line, col: i } : { row: i, col: line };
      if (!getBoardTile(tempBoard, cell)) {
        return { words: [], valid: false, reason: 'Tiles must be contiguous' };
      }
    }
  }

  const found: WordInfo[] = [];
  const seen = new Set<string>();
  const push = (word: WordInfo | null) => {
    if (!word) return;
    const key = wordKey(word);
    if (seen.has(key)) return;
    seen.add(key);
    found.push(word);
  };

  if (layout.horizontal === null) {
    push(readWord(tempBoard, placements[0].position, true));
    push(readWord(tempBoard, placements[0].position, false));
  } else {
    push(readWord(tempBoard, placements[0].position, layout.horizontal));
    for (const placement of placements) {
      push(readWord(tempBoard, placement.position, !layout.horizontal));
    }
  }

  if (found.length === 0) {
    return { words: [], valid: false, reason: 'Placement must form a word' };
  }

  const invalid = found.find(word => !dictionary.isValid(word.word));
  if (invalid) {
    return { words: [], valid: false, reason: `Not a word: ${invalid.word}` };
  }

  return { words: found, valid: true };
}

function describeLayout(
  placements: Placement[],
  boardSize: number
): { valid: true; horizontal: boolean | null } | { valid: false; reason: string } {
  if (placements.length === 0) {
    return { valid: false, reason: 'No tiles placed' };
  }

  for (const placement of placements) {
    if (!isValidPosition(placement.position, boardSize)) {
      return { valid: false, reason: 'Placement is off the board' };
    }
  }

  const cells = new Set(placements.map(p => `${p.position.row},${p.position.col}`));
  if (cells.size !== placements.length) {
    return { valid: false, reason: 'Two tiles cannot share a square' };
  }

  if (placements.length === 1) {
    return { valid: true, horizontal: null };
  }

  const rows = placements.map(p => p.position.row);
  const cols = placements.map(p => p.position.col);
  const sameRow = rows.every(r => r === rows[0]);
  const sameCol = cols.every(c => c === cols[0]);

  if (sameRow) return { valid: true, horizontal: true };
  if (sameCol) return { valid: true, horizontal: false };
  return { valid: false, reason: 'Tiles must be in one straight line' };
}

function attachesToBoard(board: Board, placements: Placement[]): boolean {
  return placements.some(placement => {
    const { row, col } = placement.position;
    const neighbours = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ];
    return neighbours.some(n => isOnBoard(board, n) && getBoardTile(board, n));
  });
}

export interface FlagContext {
  flags: { P1: import('./types').FlagPost | null; P2: import('./types').FlagPost | null };
  playerId: 'P1' | 'P2';
  flagsLost: { P1: number; P2: number };
  emptySpareCount: number;
}

function applyFlagMultipliers(
  words: WordInfo[],
  placements: Placement[],
  flags: FlagContext,
  boardSize: number
): {
  words: WordInfo[];
  totalScore: number;
  capturesOwnFlag: boolean;
  capturesOpponentFlag: boolean;
  endsGame: boolean;
} {
  const opponentId = flags.playerId === 'P1' ? 'P2' : 'P1';
  const ownCorner = flags.flags[flags.playerId];
  const oppCorner = flags.flags[opponentId];
  const posts = flagPosts(boardSize);

  let capturesOwnFlag = false;
  let capturesOpponentFlag = false;
  let capturingWord: WordInfo | null = null;
  let multiplier: 1 | 2 | 3 = 1;

  for (const placement of placements) {
    if (ownCorner && positionEquals(placement.position, posts[ownCorner])) {
      capturesOwnFlag = true;
      capturingWord = wordContainingPosition(words, placement.position);
      multiplier = 3;
      break;
    }
  }

  if (!capturesOwnFlag) {
    for (const placement of placements) {
      if (oppCorner && positionEquals(placement.position, posts[oppCorner])) {
        capturesOpponentFlag = true;
        capturingWord = wordContainingPosition(words, placement.position);
        multiplier = 3;
        break;
      }
    }
  }

  const scoredWords = words.map(word => {
    const baseScore = word.score;
    const isCapturingWord = capturingWord && wordKey(word) === wordKey(capturingWord);
    const flagMultiplier = isCapturingWord ? multiplier : 1;
    return {
      ...word,
      baseScore,
      flagMultiplier,
      score: baseScore * flagMultiplier,
    };
  });

  const totalScore = scoredWords.reduce((sum, w) => sum + w.score, 0);

  let endsGame = false;
  if (capturesOwnFlag) {
    endsGame = true;
  } else if (capturesOpponentFlag) {
    const victimLosses = flags.flagsLost[opponentId] + 1;
    if (victimLosses >= 2) {
      endsGame = true;
    } else if (flags.emptySpareCount === 0) {
      endsGame = true;
    }
  }

  return {
    words: scoredWords,
    totalScore,
    capturesOwnFlag,
    capturesOpponentFlag,
    endsGame,
  };
}

export function validatePlay(
  board: Board,
  placements: Placement[],
  dictionary: Dictionary,
  flagContext: FlagContext
): PlayEvaluation {
  if (placements.length === 0) {
    return { valid: false, reason: 'No tiles placed' };
  }

  if (placements.length > board.length) {
    return { valid: false, reason: 'Too many tiles for one line' };
  }

  for (const placement of placements) {
    if (!isOnBoard(board, placement.position)) {
      return { valid: false, reason: 'Placement is off the board' };
    }
    if (getBoardTile(board, placement.position)) {
      return { valid: false, reason: 'Square already taken' };
    }
    if (placement.tile.isBlank && !placement.assignedLetter) {
      return { valid: false, reason: 'Choose a letter for the blank' };
    }
  }

  if (isFirstWord(board)) {
    if (!placements.some(p => positionEquals(p.position, centreStar(board.length)))) {
      return { valid: false, reason: 'First word must cover the centre star' };
    }
  } else if (!attachesToBoard(board, placements)) {
    return { valid: false, reason: 'Play must touch a tile already on the board' };
  }

  const result = findWordsFormed(board, placements, dictionary);
  if (!result.valid) {
    return { valid: false, reason: result.reason };
  }

  const flagResult = applyFlagMultipliers(result.words, placements, flagContext, board.length);
  const captures = flagResult.capturesOwnFlag || flagResult.capturesOpponentFlag;

  return {
    valid: true,
    words: flagResult.words,
    totalScore: flagResult.totalScore,
    captures,
    capturesOwnFlag: flagResult.capturesOwnFlag,
    capturesOpponentFlag: flagResult.capturesOpponentFlag,
    endsGame: flagResult.endsGame,
  };
}

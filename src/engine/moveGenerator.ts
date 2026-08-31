// Legal play generation.
//
// Used both to pick AI moves and to answer "is any Play legal?" (which decides
// whether Pass is available). The search walks every line of the board, enumerates
// the candidate word spans on it, and fills the empty squares of each span with
// rack letters, pruning against the dictionary's prefix ranges. That pruning is
// what makes 11x11 tractable — a naive permutation of a 7-tile rack over every
// anchor is hundreds of thousands of full-board validations per turn.

import type { Board, Tile, Position, WordPlacement, Letter } from './types';
import { getBoardTile, isFirstWord, isValidPosition } from './game';
import { validatePlay, effectiveLetter, type Placement } from './validator';
import type { Dictionary, PrefixRange } from './dictionary';
import { CENTRE_STAR, BOARD_SIZE, MIN_WORD_LENGTH, RACK_MAX } from './types';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') as Letter[];

export interface GenerateOptions {
  /** Stop once this many plays have been found. Use 1 for "is a play legal?". */
  limit?: number;
}

interface RackPool {
  /** Remaining real tiles for each letter. */
  byLetter: Map<string, Tile[]>;
  /** Remaining blanks, usable as any letter for 0 points. */
  blanks: Tile[];
  size: number;
}

function buildPool(rack: Tile[]): RackPool {
  const byLetter = new Map<string, Tile[]>();
  const blanks: Tile[] = [];
  for (const tile of rack) {
    if (tile.isBlank) {
      blanks.push(tile);
      continue;
    }
    const letter = tile.letter ?? '';
    const bucket = byLetter.get(letter);
    if (bucket) bucket.push(tile);
    else byLetter.set(letter, [tile]);
  }
  return { byLetter, blanks, size: rack.length };
}

function boardLetter(board: Board, pos: Position): string | null {
  const tile = getBoardTile(board, pos);
  return tile ? effectiveLetter(tile) : null;
}

function cellOf(line: number, index: number, horizontal: boolean): Position {
  return horizontal ? { row: line, col: index } : { row: index, col: line };
}

/**
 * Which letters may be placed on an empty square without creating an invalid
 * word on the perpendicular axis. Squares with no perpendicular neighbours
 * accept anything.
 */
function crossChecks(
  board: Board,
  pos: Position,
  horizontal: boolean,
  dictionary: Dictionary,
  cache: Map<string, Set<string> | null>
): Set<string> | null {
  const key = `${horizontal ? 'h' : 'v'}:${pos.row},${pos.col}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const before: string[] = [];
  const after: string[] = [];
  const delta = horizontal ? { row: 1, col: 0 } : { row: 0, col: 1 };

  let cursor = { row: pos.row - delta.row, col: pos.col - delta.col };
  while (isValidPosition(cursor)) {
    const letter = boardLetter(board, cursor);
    if (!letter) break;
    before.unshift(letter);
    cursor = { row: cursor.row - delta.row, col: cursor.col - delta.col };
  }

  cursor = { row: pos.row + delta.row, col: pos.col + delta.col };
  while (isValidPosition(cursor)) {
    const letter = boardLetter(board, cursor);
    if (!letter) break;
    after.push(letter);
    cursor = { row: cursor.row + delta.row, col: cursor.col + delta.col };
  }

  // No perpendicular word would be formed, so every letter is fine.
  if (before.length === 0 && after.length === 0) {
    cache.set(key, null);
    return null;
  }

  const prefix = before.join('');
  const suffix = after.join('');
  const allowed = new Set<string>();
  for (const letter of ALPHABET) {
    if (dictionary.isValid(prefix + letter + suffix)) allowed.add(letter);
  }
  cache.set(key, allowed);
  return allowed;
}

export function generateLegalPlays(
  board: Board,
  rack: Tile[],
  dictionary: Dictionary,
  livePost: string,
  options: GenerateOptions = {}
): WordPlacement[] {
  const limit = options.limit ?? Infinity;
  const plays: WordPlacement[] = [];
  if (rack.length === 0 || limit <= 0) return plays;

  const first = isFirstWord(board);
  const pool = buildPool(rack);
  const maxTiles = Math.min(pool.size, RACK_MAX);
  const crossCache = new Map<string, Set<string> | null>();
  const seen = new Set<string>();

  const record = (placements: Placement[]): boolean => {
    const key = placements
      .map(p => `${p.position.row},${p.position.col}:${p.assignedLetter ?? p.tile.letter}`)
      .sort()
      .join('|');
    if (seen.has(key)) return false;
    seen.add(key);

    const result = validatePlay(board, placements, dictionary, livePost);
    if (!result.valid || !result.words) return false;

    plays.push({
      tiles: placements.map(p => ({ ...p })),
      words: result.words,
      totalScore: result.totalScore ?? 0,
      captures: result.captures ?? false,
    });
    return true;
  };

  for (const horizontal of [true, false]) {
    for (let line = 1; line <= BOARD_SIZE; line++) {
      for (let start = 1; start <= BOARD_SIZE - (MIN_WORD_LENGTH - 1); start++) {
        const beforeSpan = cellOf(line, start - 1, horizontal);
        if (isValidPosition(beforeSpan) && boardLetter(board, beforeSpan)) continue;

        for (let end = start + MIN_WORD_LENGTH - 1; end <= BOARD_SIZE; end++) {
          const afterSpan = cellOf(line, end + 1, horizontal);
          if (isValidPosition(afterSpan) && boardLetter(board, afterSpan)) continue;

          const span: Position[] = [];
          for (let i = start; i <= end; i++) span.push(cellOf(line, i, horizontal));

          const empties = span.filter(pos => !boardLetter(board, pos));
          if (empties.length === 0) continue;
          if (empties.length > maxTiles) continue;

          if (!spanIsPlayable(board, span, empties, first)) continue;

          fillSpan({
            board,
            dictionary,
            span,
            horizontal,
            pool,
            crossCache,
            onComplete: record,
            shouldStop: () => plays.length >= limit,
          });

          if (plays.length >= limit) return plays;
        }
      }
    }
  }

  return plays;
}

/**
 * Cheap pre-filter: the first word must cover the centre star, and every later
 * play must touch something already on the board.
 */
function spanIsPlayable(
  board: Board,
  span: Position[],
  empties: Position[],
  first: boolean
): boolean {
  if (first) {
    return span.some(pos => pos.row === CENTRE_STAR.row && pos.col === CENTRE_STAR.col);
  }

  if (span.length !== empties.length) return true; // span reads through a board tile

  return empties.some(pos => {
    const neighbours = [
      { row: pos.row - 1, col: pos.col },
      { row: pos.row + 1, col: pos.col },
      { row: pos.row, col: pos.col - 1 },
      { row: pos.row, col: pos.col + 1 },
    ];
    return neighbours.some(n => isValidPosition(n) && boardLetter(board, n));
  });
}

interface FillContext {
  board: Board;
  dictionary: Dictionary;
  span: Position[];
  horizontal: boolean;
  pool: RackPool;
  crossCache: Map<string, Set<string> | null>;
  onComplete: (placements: Placement[]) => boolean;
  shouldStop: () => boolean;
}

function fillSpan(ctx: FillContext): void {
  const { board, dictionary, span, horizontal, pool, crossCache } = ctx;
  const length = span.length;
  const chosen: Placement[] = [];

  const walk = (index: number, range: PrefixRange): void => {
    if (ctx.shouldStop()) return;

    if (index === length) {
      if (chosen.length > 0 && dictionary.isCompleteWord(range, length)) {
        ctx.onComplete(chosen.map(p => ({ ...p })));
      }
      return;
    }

    const pos = span[index];
    const existing = boardLetter(board, pos);
    if (existing) {
      const next = dictionary.narrow(range, existing, index);
      if (dictionary.hasWords(next)) walk(index + 1, next);
      return;
    }

    const allowed = crossChecks(board, pos, horizontal, dictionary, crossCache);

    for (const letter of ALPHABET) {
      if (allowed && !allowed.has(letter)) continue;

      const next = dictionary.narrow(range, letter, index);
      if (!dictionary.hasWords(next)) continue;

      // Prefer a real tile; fall back to a blank only when no real tile of that
      // letter is left, so we never emit a strictly lower-scoring duplicate.
      const real = pool.byLetter.get(letter);
      if (real && real.length > 0) {
        const tile = real.pop()!;
        chosen.push({ tile, position: pos });
        walk(index + 1, next);
        chosen.pop();
        real.push(tile);
      } else if (pool.blanks.length > 0) {
        const tile = pool.blanks.pop()!;
        chosen.push({ tile, position: pos, assignedLetter: letter });
        walk(index + 1, next);
        chosen.pop();
        pool.blanks.push(tile);
      }

      if (ctx.shouldStop()) return;
    }
  };

  walk(0, dictionary.fullRange());
}

export function hasLegalPlay(
  board: Board,
  rack: Tile[],
  dictionary: Dictionary,
  livePost: string
): boolean {
  return generateLegalPlays(board, rack, dictionary, livePost, { limit: 1 }).length > 0;
}

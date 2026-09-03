// Legal play generation.
//
// Used both to pick AI moves and to answer "is any Play legal?" (which decides
// whether Pass is available).

import type { Board, Tile, Position, WordPlacement, Letter, GameState } from './types';
import { getBoardTile, isFirstWord, isOnBoard, emptySpareCorners } from './game';
import { validatePlay, effectiveLetter, type Placement, type FlagContext } from './validator';
import type { Dictionary, PrefixRange } from './dictionary';
import { MIN_WORD_LENGTH } from './types';
import { centreStar } from './variants';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') as Letter[];

export interface GenerateOptions {
  /** Stop once this many plays have been found. Use 1 for "is a play legal?". */
  limit?: number;
}

interface RackPool {
  byLetter: Map<string, Tile[]>;
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
  while (isOnBoard(board, cursor)) {
    const letter = boardLetter(board, cursor);
    if (!letter) break;
    before.unshift(letter);
    cursor = { row: cursor.row - delta.row, col: cursor.col - delta.col };
  }

  cursor = { row: pos.row + delta.row, col: pos.col + delta.col };
  while (isOnBoard(board, cursor)) {
    const letter = boardLetter(board, cursor);
    if (!letter) break;
    after.push(letter);
    cursor = { row: cursor.row + delta.row, col: cursor.col + delta.col };
  }

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

function buildFlagContext(state: GameState, playerId: 'P1' | 'P2'): FlagContext {
  return {
    flags: state.flags,
    playerId,
    flagsLost: { P1: state.players[0].flagsLost, P2: state.players[1].flagsLost },
    emptySpareCount: emptySpareCorners(state).length,
  };
}

export function generateLegalPlays(
  state: GameState,
  rack: Tile[],
  dictionary: Dictionary,
  playerId: 'P1' | 'P2',
  options: GenerateOptions = {}
): WordPlacement[] {
  const { board } = state;
  const limit = options.limit ?? Infinity;
  const plays: WordPlacement[] = [];
  if (rack.length === 0 || limit <= 0) return plays;

  const flagContext = buildFlagContext(state, playerId);
  const first = isFirstWord(board);
  const pool = buildPool(rack);
  const size = board.length;
  const maxTiles = Math.min(pool.size, state.rules.rackMax);
  const crossCache = new Map<string, Set<string> | null>();
  const seen = new Set<string>();

  const record = (placements: Placement[]): boolean => {
    const key = placements
      .map(p => `${p.position.row},${p.position.col}:${p.assignedLetter ?? p.tile.letter}`)
      .sort()
      .join('|');
    if (seen.has(key)) return false;
    seen.add(key);

    const result = validatePlay(board, placements, dictionary, flagContext);
    if (!result.valid || !result.words) return false;

    plays.push({
      tiles: placements.map(p => ({ ...p })),
      words: result.words,
      totalScore: result.totalScore ?? 0,
      capturesOwnFlag: result.capturesOwnFlag ?? false,
      capturesOpponentFlag: result.capturesOpponentFlag ?? false,
      endsGame: result.endsGame ?? false,
      captures: result.captures ?? false,
    });
    return true;
  };

  for (const horizontal of [true, false]) {
    for (let line = 1; line <= size; line++) {
      for (let start = 1; start <= size - (MIN_WORD_LENGTH - 1); start++) {
        const beforeSpan = cellOf(line, start - 1, horizontal);
        if (isOnBoard(board, beforeSpan) && boardLetter(board, beforeSpan)) continue;

        for (let end = start + MIN_WORD_LENGTH - 1; end <= size; end++) {
          const afterSpan = cellOf(line, end + 1, horizontal);
          if (isOnBoard(board, afterSpan) && boardLetter(board, afterSpan)) continue;

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

function spanIsPlayable(
  board: Board,
  span: Position[],
  empties: Position[],
  first: boolean
): boolean {
  if (first) {
    const centre = centreStar(board.length);
    return span.some(pos => pos.row === centre.row && pos.col === centre.col);
  }

  if (span.length !== empties.length) return true;

  return empties.some(pos => {
    const neighbours = [
      { row: pos.row - 1, col: pos.col },
      { row: pos.row + 1, col: pos.col },
      { row: pos.row, col: pos.col - 1 },
      { row: pos.row, col: pos.col + 1 },
    ];
    return neighbours.some(n => isOnBoard(board, n) && boardLetter(board, n));
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
  state: GameState,
  rack: Tile[],
  dictionary: Dictionary,
  playerId: 'P1' | 'P2'
): boolean {
  return generateLegalPlays(state, rack, dictionary, playerId, { limit: 1 }).length > 0;
}

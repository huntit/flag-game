// Move generator for finding all legal plays

import type { Board, Tile, Position, WordPlacement, Letter } from './types';
import { getBoardTile, isFirstWord } from './game';
import { validatePlay } from './validator';
import type { Dictionary } from './dictionary';
import { CENTRE_STAR } from './types';

export function generateLegalPlays(
  board: Board,
  rack: Tile[],
  dictionary: Dictionary,
  livePost: string
): WordPlacement[] {
  const plays: WordPlacement[] = [];

  if (rack.length === 0) return plays;

  if (isFirstWord(board)) {
    // Generate plays through centre star
    const centreRow = CENTRE_STAR.row;
    const centreCol = CENTRE_STAR.col;

    // Try horizontal words through centre
    for (let startCol = Math.max(1, centreCol - 8); startCol <= centreCol; startCol++) {
      const endCol = Math.min(9, startCol + 8);
      for (let len = 2; len <= Math.min(rack.length, endCol - startCol + 1); len++) {
        if (startCol <= centreCol && startCol + len - 1 >= centreCol) {
          const placements = generatePermutations(rack, len, (i) => ({
            row: centreRow,
            col: startCol + i
          }));
          for (const placement of placements) {
            const result = validatePlay(board, placement, dictionary, livePost);
            if (result.valid && result.words) {
              plays.push({
                tiles: placement,
                words: result.words,
                totalScore: result.totalScore || 0,
                captures: result.captures || false,
              });
            }
          }
        }
      }
    }

    // Try vertical words through centre
    for (let startRow = Math.max(1, centreRow - 8); startRow <= centreRow; startRow++) {
      const endRow = Math.min(9, startRow + 8);
      for (let len = 2; len <= Math.min(rack.length, endRow - startRow + 1); len++) {
        if (startRow <= centreRow && startRow + len - 1 >= centreRow) {
          const placements = generatePermutations(rack, len, (i) => ({
            row: startRow + i,
            col: centreCol
          }));
          for (const placement of placements) {
            const result = validatePlay(board, placement, dictionary, livePost);
            if (result.valid && result.words) {
              plays.push({
                tiles: placement,
                words: result.words,
                totalScore: result.totalScore || 0,
                captures: result.captures || false,
              });
            }
          }
        }
      }
    }
  } else {
    // Generate plays that attach to existing tiles
    // This is a simplified brute-force approach for 9x9 board
    
    // Find all anchor points (empty cells adjacent to filled cells)
    const anchors: Position[] = [];
    for (let row = 1; row <= 9; row++) {
      for (let col = 1; col <= 9; col++) {
        if (!getBoardTile(board, { row, col })) {
          const hasNeighbor = [
            { row: row - 1, col },
            { row: row + 1, col },
            { row, col: col - 1 },
            { row, col: col + 1 },
          ].some(n => n.row >= 1 && n.row <= 9 && n.col >= 1 && n.col <= 9 && getBoardTile(board, n));
          
          if (hasNeighbor) {
            anchors.push({ row, col });
          }
        }
      }
    }

    // For each anchor, try placing tiles horizontally and vertically
    for (const anchor of anchors) {
      // Try single tile placement
      for (const tile of rack) {
        const placement = [{ tile, position: anchor, assignedLetter: (tile.isBlank ? ('A' as Letter) : undefined) }];
        const result = validatePlay(board, placement, dictionary, livePost);
        if (result.valid && result.words) {
          plays.push({
            tiles: placement,
            words: result.words,
            totalScore: result.totalScore || 0,
            captures: result.captures || false,
          });
        }
      }

      // Try multi-tile placements (horizontal)
      for (let len = 2; len <= Math.min(rack.length, 9 - anchor.col + 1); len++) {
        const placements = generatePermutations(rack, len, (i) => ({
          row: anchor.row,
          col: anchor.col + i
        }));
        for (const placement of placements) {
          const result = validatePlay(board, placement, dictionary, livePost);
          if (result.valid && result.words) {
            plays.push({
              tiles: placement,
              words: result.words,
              totalScore: result.totalScore || 0,
              captures: result.captures || false,
            });
          }
        }
      }

      // Try multi-tile placements (vertical)
      for (let len = 2; len <= Math.min(rack.length, 9 - anchor.row + 1); len++) {
        const placements = generatePermutations(rack, len, (i) => ({
          row: anchor.row + i,
          col: anchor.col
        }));
        for (const placement of placements) {
          const result = validatePlay(board, placement, dictionary, livePost);
          if (result.valid && result.words) {
            plays.push({
              tiles: placement,
              words: result.words,
              totalScore: result.totalScore || 0,
              captures: result.captures || false,
            });
          }
        }
      }
    }
  }

  return plays;
}

function generatePermutations(
  rack: Tile[],
  length: number,
  positionFn: (index: number) => Position
): { tile: Tile; position: Position; assignedLetter?: Letter }[][] {
  const results: { tile: Tile; position: Position; assignedLetter?: Letter }[][] = [];
  
  function permute(selected: Tile[], remaining: Tile[], depth: number) {
    if (depth === length) {
      const placement = selected.map((tile, i) => ({
        tile,
        position: positionFn(i),
        assignedLetter: (tile.isBlank ? 'A' : undefined) as Letter | undefined,
      }));
      results.push(placement);
      return;
    }

    for (let i = 0; i < remaining.length; i++) {
      const tile = remaining[i];
      const newRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      permute([...selected, tile], newRemaining, depth + 1);
    }
  }

  permute([], rack, 0);
  return results;
}

export function hasLegalPlay(
  board: Board,
  rack: Tile[],
  dictionary: Dictionary,
  livePost: string
): boolean {
  // Quick check: if rack is empty, no legal play
  if (rack.length === 0) return false;
  
  // For performance, we can do a quick check instead of generating all moves
  // For now, just generate and check if any exist
  const plays = generateLegalPlays(board, rack, dictionary, livePost);
  return plays.length > 0;
}

// Move validation and word formation logic

import type { Board, Position, PlacedTile, Tile, Letter } from './types';
import { getBoardTile, setBoardTile, isValidPosition, positionEquals, isFirstWord } from './game';
import { CENTRE_STAR, FLAG_POSTS, BOARD_SIZE } from './types';
import type { Dictionary } from './dictionary';

interface WordInfo {
  word: string;
  positions: Position[];
  score: number;
}

function getLetterForTile(tile: PlacedTile): string {
  if (tile.isBlank && tile.assignedLetter) {
    return tile.assignedLetter;
  }
  return tile.letter || '';
}

function getValueForTile(tile: PlacedTile): number {
  return tile.value;
}

export function findWordsFormed(
  board: Board,
  placements: { tile: Tile; position: Position; assignedLetter?: Letter }[],
  dictionary: Dictionary
): { words: WordInfo[]; valid: boolean; reason?: string } {
  // Create a temporary board with the new tiles
  const tempBoard: Board = board.map(row => row.map(cell => cell ? { ...cell } : null));
  
  for (const placement of placements) {
    const placedTile: PlacedTile = {
      ...placement.tile,
      assignedLetter: placement.assignedLetter,
    };
    setBoardTile(tempBoard, placement.position, placedTile);
  }

  const words: WordInfo[] = [];

  // Find main word (horizontal or vertical line through placements)
  const mainWord = findMainWord(tempBoard, placements);
  if (mainWord && mainWord.word.length > 1) {
    words.push(mainWord);
  }

  // Find crosswords
  for (const placement of placements) {
    const crossWords = findCrossWords(tempBoard, placement.position, mainWord);
    words.push(...crossWords);
  }

  // Validate single tile placement forms at least one word
  if (placements.length === 1 && words.length === 0) {
    return { words: [], valid: false, reason: 'Single tile must form a word' };
  }

  // Validate all words are in dictionary
  for (const word of words) {
    if (!dictionary.isValid(word.word)) {
      return { words: [], valid: false, reason: `Word not in dictionary: ${word.word}` };
    }
  }

  return { words, valid: true };
}

function findMainWord(board: Board, placements: { tile: Tile; position: Position; assignedLetter?: string }[]): WordInfo | null {
  if (placements.length === 0) return null;

  // Determine direction
  const positions = placements.map(p => p.position);
  const rows = positions.map(p => p.row);
  const cols = positions.map(p => p.col);
  const allSameRow = rows.every(r => r === rows[0]);
  const allSameCol = cols.every(c => c === cols[0]);

  if (!allSameRow && !allSameCol) {
    return null; // Invalid placement
  }

  const isHorizontal = allSameRow;
  const row = isHorizontal ? rows[0] : -1;
  const col = allSameCol ? cols[0] : -1;

  // Find the full word extent
  let wordPositions: Position[] = [];
  let word = '';
  let score = 0;

  if (isHorizontal) {
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);
    
    // Extend left
    let startCol = minCol;
    while (startCol > 1 && getBoardTile(board, { row, col: startCol - 1 })) {
      startCol--;
    }
    
    // Extend right
    let endCol = maxCol;
    while (endCol < BOARD_SIZE && getBoardTile(board, { row, col: endCol + 1 })) {
      endCol++;
    }

    // Check contiguity
    for (let c = startCol; c <= endCol; c++) {
      const tile = getBoardTile(board, { row, col: c });
      if (!tile) {
        return null; // Gap in word
      }
      wordPositions.push({ row, col: c });
      word += getLetterForTile(tile);
      score += getValueForTile(tile);
    }
  } else {
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    
    // Extend up
    let startRow = minRow;
    while (startRow > 1 && getBoardTile(board, { row: startRow - 1, col })) {
      startRow--;
    }
    
    // Extend down
    let endRow = maxRow;
    while (endRow < BOARD_SIZE && getBoardTile(board, { row: endRow + 1, col })) {
      endRow++;
    }

    // Check contiguity
    for (let r = startRow; r <= endRow; r++) {
      const tile = getBoardTile(board, { row: r, col });
      if (!tile) {
        return null; // Gap in word
      }
      wordPositions.push({ row: r, col });
      word += getLetterForTile(tile);
      score += getValueForTile(tile);
    }
  }

  if (word.length <= 1) return null;

  return { word, positions: wordPositions, score };
}

function findCrossWords(board: Board, pos: Position, mainWord: WordInfo | null): WordInfo[] {
  const words: WordInfo[] = [];

  // Check if this position is part of the main word
  const isPartOfMainWord = mainWord?.positions.some(p => positionEquals(p, pos)) || false;

  // If main word is horizontal, check vertical; if vertical, check horizontal
  const mainIsHorizontal = mainWord && mainWord.positions.length > 1 && 
    mainWord.positions[0].row === mainWord.positions[1].row;

  // Check vertical word
  if (!mainIsHorizontal || !isPartOfMainWord) {
    const vertWord = extractWord(board, pos, false);
    if (vertWord && vertWord.word.length > 1) {
      words.push(vertWord);
    }
  }

  // Check horizontal word
  if (mainIsHorizontal === false || !isPartOfMainWord) {
    const horizWord = extractWord(board, pos, true);
    if (horizWord && horizWord.word.length > 1) {
      words.push(horizWord);
    }
  }

  return words;
}

function extractWord(board: Board, pos: Position, horizontal: boolean): WordInfo | null {
  const { row, col } = pos;
  let wordPositions: Position[] = [pos];
  let word = '';
  let score = 0;

  const tile = getBoardTile(board, pos);
  if (!tile) return null;

  if (horizontal) {
    // Extend left
    let c = col - 1;
    while (c >= 1) {
      const t = getBoardTile(board, { row, col: c });
      if (!t) break;
      wordPositions.unshift({ row, col: c });
      c--;
    }

    // Extend right
    c = col + 1;
    while (c <= BOARD_SIZE) {
      const t = getBoardTile(board, { row, col: c });
      if (!t) break;
      wordPositions.push({ row, col: c });
      c++;
    }
  } else {
    // Extend up
    let r = row - 1;
    while (r >= 1) {
      const t = getBoardTile(board, { row: r, col });
      if (!t) break;
      wordPositions.unshift({ row: r, col });
      r--;
    }

    // Extend down
    r = row + 1;
    while (r <= BOARD_SIZE) {
      const t = getBoardTile(board, { row: r, col });
      if (!t) break;
      wordPositions.push({ row: r, col });
      r++;
    }
  }

  if (wordPositions.length <= 1) return null;

  for (const p of wordPositions) {
    const t = getBoardTile(board, p);
    if (t) {
      word += getLetterForTile(t);
      score += getValueForTile(t);
    }
  }

  return { word, positions: wordPositions, score };
}

export function validatePlay(
  board: Board,
  placements: { tile: Tile; position: Position; assignedLetter?: Letter }[],
  dictionary: Dictionary,
  livePost: string
): { valid: boolean; words?: WordInfo[]; totalScore?: number; captures?: boolean; reason?: string } {
  if (placements.length === 0) {
    return { valid: false, reason: 'No tiles placed' };
  }

  // Check all positions are empty
  for (const placement of placements) {
    if (getBoardTile(board, placement.position)) {
      return { valid: false, reason: 'Position already occupied' };
    }
  }

  // Check if first word covers centre star
  if (isFirstWord(board)) {
    const coversCenter = placements.some(p => positionEquals(p.position, CENTRE_STAR));
    if (!coversCenter) {
      return { valid: false, reason: 'First word must cover centre star' };
    }
  } else {
    // Check if play attaches to existing words
    const attaches = placements.some(p => {
      const { row, col } = p.position;
      const neighbors = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ];
      return neighbors.some(n => isValidPosition(n) && getBoardTile(board, n));
    });

    if (!attaches) {
      return { valid: false, reason: 'Play must attach to existing words' };
    }
  }

  // Check if blank tiles have assigned letters
  for (const placement of placements) {
    if (placement.tile.isBlank && !placement.assignedLetter) {
      return { valid: false, reason: 'Blank tile must have assigned letter' };
    }
  }

  // Find and validate words
  const result = findWordsFormed(board, placements, dictionary);
  if (!result.valid) {
    return { valid: false, reason: result.reason };
  }

  const totalScore = result.words.reduce((sum, w) => sum + w.score, 0);

  // Check if captures flag
  const livePostPos = FLAG_POSTS[livePost as keyof typeof FLAG_POSTS];
  const captures = placements.some(p => positionEquals(p.position, livePostPos));

  return {
    valid: true,
    words: result.words,
    totalScore,
    captures,
  };
}

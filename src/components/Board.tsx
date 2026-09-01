// Board component. Tap-to-place only — no HTML5 drag anywhere.

import type { Board as BoardModel, FlagPost, Position } from '../engine/types';
import { FLAG_POSTS, CENTRE_STAR, BOARD_SIZE } from '../engine/types';
import { getBoardTile, positionEquals, isFirstWord } from '../engine/game';
import { effectiveLetter, tileScore } from '../engine/validator';
import { TileFace } from './TileFace';
import './Board.css';

const base = import.meta.env.BASE_URL;

export interface PendingPlacement {
  tileId: string;
  position: Position;
  letter: string;
  value: number;
  isBlank: boolean;
  playerId: 'P1' | 'P2';
}

interface BoardProps {
  board: BoardModel;
  flags: { P1: FlagPost | null; P2: FlagPost | null };
  pendingPlacements: PendingPlacement[];
  highlight: Position[];
  onCellClick: (position: Position) => void;
}

function cornerFlagOwner(
  position: Position,
  flags: { P1: FlagPost | null; P2: FlagPost | null }
): 'P1' | 'P2' | null {
  for (const player of ['P1', 'P2'] as const) {
    const corner = flags[player];
    if (corner && positionEquals(position, FLAG_POSTS[corner])) return player;
  }
  return null;
}

function cornerTokenSrc(flagOwner: 'P1' | 'P2' | null): string {
  if (flagOwner === 'P1') return `${base}token-p1.svg`;
  if (flagOwner === 'P2') return `${base}token-p2.svg`;
  return `${base}token-corner-empty.svg`;
}

function Board({ board, flags, pendingPlacements, highlight, onCellClick }: BoardProps) {
  const showCentreStar = isFirstWord(board) && pendingPlacements.length === 0;
  const cornerPositions = Object.values(FLAG_POSTS);

  const renderCell = (row: number, col: number) => {
    const position = { row, col };
    const boardTile = getBoardTile(board, position);
    const pending = pendingPlacements.find(p => positionEquals(p.position, position));

    const isCorner = cornerPositions.some(p => positionEquals(p, position));
    const flagOwner = cornerFlagOwner(position, flags);
    const isCentre = positionEquals(position, CENTRE_STAR);
    const isHighlighted = highlight.some(p => positionEquals(p, position));

    const letter = pending ? pending.letter : boardTile ? effectiveLetter(boardTile) : '';
    const value = pending ? pending.value : boardTile ? tileScore(boardTile) : 0;
    const isBlank = pending ? pending.isBlank : Boolean(boardTile?.isBlank);
    const tilePlayer = pending?.playerId ?? boardTile?.playerId;

    const classes = [
      'board-cell',
      isCorner && 'is-corner',
      flagOwner && `has-flag is-flag-${flagOwner.toLowerCase()}`,
      isCentre && 'is-centre',
      isHighlighted && 'is-highlighted',
    ]
      .filter(Boolean)
      .join(' ');

    const tileClasses = [
      'board-tile',
      pending && 'is-pending',
      isBlank && !letter && 'is-blank',
      tilePlayer && `is-player-${tilePlayer.toLowerCase()}`,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        type="button"
        key={`${row}-${col}`}
        className={classes}
        data-row={row}
        data-col={col}
        aria-label={`Row ${row} column ${col}${letter ? `, ${letter}` : ''}`}
        onClick={() => onCellClick(position)}
      >
        {letter ? (
          <span className={tileClasses}>
            <TileFace letter={letter} value={value} isBlank={isBlank && !letter} />
          </span>
        ) : (
          <>
            {showCentreStar && isCentre && <span className="cell-mark">★</span>}
            {isCorner && (
              <img
                className="corner-token"
                src={cornerTokenSrc(flagOwner)}
                alt=""
              />
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <div
      className="board"
      data-board-size={BOARD_SIZE}
      data-centre={`${CENTRE_STAR.row},${CENTRE_STAR.col}`}
    >
      {Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => renderCell(row + 1, col + 1))
      )}
    </div>
  );
}

export default Board;

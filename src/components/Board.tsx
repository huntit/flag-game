// Board component. Tap-to-place and drag-to-place; a cell is a drop target
// identified by its data-row / data-col (see useTileDrag).

import type { Board as BoardModel, FlagPost, Position } from '../engine/types';
import { FLAG_POSTS, CENTRE_STAR, BOARD_SIZE, SEAT_COLOR_NAMES } from '../engine/types';
import { getBoardTile, positionEquals, isFirstWord } from '../engine/game';
import { effectiveLetter, tileScore } from '../engine/validator';
import { TileFace } from './TileFace';
import './Board.css';

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
  /** Cell the pointer is currently over mid-drag, so it can light up. */
  dropTarget?: Position | null;
  /** Tile ids being carried by a drag — hidden at rest, drawn under the cursor. */
  liftedTileIds?: string[];
  onCellClick: (position: Position) => void;
  onTilePointerDown?: (event: React.PointerEvent, tileId: string) => void;
  /** Names shown on each goal square, so "whose corner is this" needs no legend. */
  seatNames?: { P1: string; P2: string };
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

function Board({
  board,
  flags,
  pendingPlacements,
  highlight,
  dropTarget,
  liftedTileIds = [],
  onCellClick,
  onTilePointerDown,
  seatNames,
}: BoardProps) {
  // The star marks where the opening word must cross, so it stays until a word
  // is committed. Placing the first tile somewhere else does not answer the
  // question the star is there to answer. A tile ON the centre covers it, which
  // the letter branch below handles.
  const showCentreStar = isFirstWord(board);
  const cornerPositions = Object.values(FLAG_POSTS);

  const renderCell = (row: number, col: number) => {
    const position = { row, col };
    const boardTile = getBoardTile(board, position);
    const pending = pendingPlacements.find(p => positionEquals(p.position, position));

    const isCorner = cornerPositions.some(p => positionEquals(p, position));
    const flagOwner = cornerFlagOwner(position, flags);
    const isCentre = positionEquals(position, CENTRE_STAR);
    const isHighlighted = highlight.some(p => positionEquals(p, position));
    const isDropTarget = Boolean(dropTarget && positionEquals(dropTarget, position));

    const letter = pending ? pending.letter : boardTile ? effectiveLetter(boardTile) : '';
    const value = pending ? pending.value : boardTile ? tileScore(boardTile) : 0;
    const isBlank = pending ? pending.isBlank : Boolean(boardTile?.isBlank);
    const tilePlayer = pending?.playerId ?? boardTile?.playerId;
    const isLifted = Boolean(pending && liftedTileIds.includes(pending.tileId));

    const classes = [
      'board-cell',
      isCorner && 'is-corner',
      flagOwner && `has-flag is-flag-${flagOwner.toLowerCase()}`,
      isCentre && 'is-centre',
      isHighlighted && 'is-highlighted',
      isDropTarget && 'is-drop-target',
    ]
      .filter(Boolean)
      .join(' ');

    const tileClasses = [
      'board-tile',
      pending && 'is-pending',
      isLifted && 'is-lifted',
      isBlank && !letter && 'is-blank',
      tilePlayer && `is-player-${tilePlayer.toLowerCase()}`,
    ]
      .filter(Boolean)
      .join(' ');

    const goalName = flagOwner ? (seatNames?.[flagOwner] ?? SEAT_COLOR_NAMES[flagOwner]) : null;

    return (
      <button
        type="button"
        key={`${row}-${col}`}
        className={classes}
        data-row={row}
        data-col={col}
        aria-label={
          flagOwner && !letter
            ? `Row ${row} column ${col}, ${goalName} goal square, triple word`
            : `Row ${row} column ${col}${letter ? `, ${letter}` : ''}`
        }
        onClick={() => onCellClick(position)}
      >
        {letter ? (
          <span
            className={tileClasses}
            data-tile-id={pending?.tileId}
            onPointerDown={
              pending && onTilePointerDown
                ? e => onTilePointerDown(e, pending.tileId)
                : undefined
            }
          >
            <TileFace letter={letter} value={value} isBlank={isBlank && !letter} />
          </span>
        ) : (
          <>
            {showCentreStar && isCentre && <span className="cell-mark">★</span>}
            {flagOwner && (
              /* The goal is a triple-word square painted in its owner's
                 colour — the same colour as their score card — so there is
                 no doubt about whose corner it is. */
              <span className={`goal-square is-${flagOwner.toLowerCase()}`}>
                <span className="goal-mult">3×</span>
                <span className="goal-word">WORD</span>
              </span>
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

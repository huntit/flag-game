// Board component. Tap-to-place and drag-to-place; a cell is a drop target
// identified by its data-row / data-col (see useTileDrag).

import type { Board as BoardModel, FlagPost, Position } from '../engine/types';
import { SEAT_COLOR_NAMES } from '../engine/types';
import { centreStar, flagPosts } from '../engine/variants';
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
  /** Cell the pointer is currently over mid-drag, so it can light up. */
  dropTarget?: Position | null;
  /** Tile ids being carried by a drag — hidden at rest, drawn under the cursor. */
  liftedTileIds?: string[];
  onCellClick: (position: Position) => void;
  onTilePointerDown?: (event: React.PointerEvent, tileId: string) => void;
  /** Names shown on each goal square, so "whose corner is this" needs no legend. */
  seatNames?: { P1: string; P2: string };
}

function trueCornerAt(position: Position, posts: Record<FlagPost, Position>): FlagPost | null {
  for (const corner of ['NW', 'NE', 'SE', 'SW'] as const) {
    if (positionEquals(position, posts[corner])) return corner;
  }
  return null;
}

function cornerFlagOwner(
  position: Position,
  flags: { P1: FlagPost | null; P2: FlagPost | null },
  posts: Record<FlagPost, Position>
): 'P1' | 'P2' | null {
  for (const player of ['P1', 'P2'] as const) {
    const corner = flags[player];
    if (corner && positionEquals(position, posts[corner])) return player;
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
  // The board is square and carries its own geometry, so a 9×9 and an 11×11
  // game render through the same component with nothing to keep in sync.
  const size = board.length;
  const centre = centreStar(size);
  const posts = flagPosts(size);
  const showCentreStar = isFirstWord(board) && pendingPlacements.length === 0;
  const cornerPositions: Position[] = Object.values(posts);

  const renderCell = (row: number, col: number) => {
    const position = { row, col };
    const boardTile = getBoardTile(board, position);
    const pending = pendingPlacements.find(p => positionEquals(p.position, position));

    const isCorner = cornerPositions.some(p => positionEquals(p, position));
    const trueCorner = trueCornerAt(position, posts);
    const flagOwner = cornerFlagOwner(position, flags, posts);
    const isCentre = positionEquals(position, centre);
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
            {flagOwner && trueCorner && (
              /* Occupied true corner: the occupying player's matching
                 NW/NE/SE/SW 3× badge. Spare empty corners stay empty. */
              <img
                className={`goal-square is-${flagOwner.toLowerCase()}`}
                src={`${base}corner-a-badge-${flagOwner.toLowerCase()}-${trueCorner.toLowerCase()}.svg`}
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
      data-board-size={size}
      data-centre={`${centre.row},${centre.col}`}
      /* The grid is drawn from the board's own size rather than a fixed
         repeat(), so one rule serves both variants. */
      style={{ '--board-cells': size } as React.CSSProperties}
    >
      {Array.from({ length: size }, (_, row) =>
        Array.from({ length: size }, (_, col) => renderCell(row + 1, col + 1))
      )}
    </div>
  );
}

export default Board;

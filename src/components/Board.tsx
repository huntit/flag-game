// Board component. Tap-to-place only — no HTML5 drag anywhere.

import type { Board as BoardModel, FlagPost, Position } from '../engine/types';
import { FLAG_POSTS, CENTRE_STAR, BOARD_SIZE } from '../engine/types';
import { getBoardTile, positionEquals, isFirstWord } from '../engine/game';
import { effectiveLetter, tileScore } from '../engine/validator';
import './Board.css';

export interface PendingPlacement {
  tileId: string;
  position: Position;
  letter: string;
  value: number;
  isBlank: boolean;
}

interface BoardProps {
  board: BoardModel;
  livePost: FlagPost;
  pendingPlacements: PendingPlacement[];
  highlight: Position[];
  onCellClick: (position: Position) => void;
}

function Board({ board, livePost, pendingPlacements, highlight, onCellClick }: BoardProps) {
  const livePostPos = FLAG_POSTS[livePost];
  const showCentreStar = isFirstWord(board) && pendingPlacements.length === 0;
  const postPositions = Object.values(FLAG_POSTS);

  const renderCell = (row: number, col: number) => {
    const position = { row, col };
    const boardTile = getBoardTile(board, position);
    const pending = pendingPlacements.find(p => positionEquals(p.position, position));

    const isLivePost = positionEquals(position, livePostPos);
    const isDarkPost = !isLivePost && postPositions.some(p => positionEquals(p, position));
    const isCentre = positionEquals(position, CENTRE_STAR);
    const isHighlighted = highlight.some(p => positionEquals(p, position));

    const letter = pending ? pending.letter : boardTile ? effectiveLetter(boardTile) : '';
    const value = pending ? pending.value : boardTile ? tileScore(boardTile) : 0;
    const isBlank = pending ? pending.isBlank : Boolean(boardTile?.isBlank);

    const classes = [
      'board-cell',
      isLivePost && 'is-live-post',
      isDarkPost && 'is-dark-post',
      isCentre && 'is-centre',
      isHighlighted && 'is-highlighted',
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
          <span className={`board-tile ${pending ? 'is-pending' : ''} ${isBlank ? 'is-blank' : ''}`}>
            <span className="tile-letter">{letter}</span>
            {!isBlank && <span className="tile-value">{value}</span>}
          </span>
        ) : (
          <>
            {showCentreStar && isCentre && <span className="cell-mark">★</span>}
            {isLivePost && <span className="cell-mark cell-flag">⚑</span>}
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
      data-post-nw={`${FLAG_POSTS.NW.row},${FLAG_POSTS.NW.col}`}
      data-post-ne={`${FLAG_POSTS.NE.row},${FLAG_POSTS.NE.col}`}
      data-post-se={`${FLAG_POSTS.SE.row},${FLAG_POSTS.SE.col}`}
      data-post-sw={`${FLAG_POSTS.SW.row},${FLAG_POSTS.SW.col}`}
    >
      {Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => renderCell(row + 1, col + 1))
      )}
    </div>
  );
}

export default Board;

// Board component

import type { Board, FlagPost, Position } from '../engine/types';
import { FLAG_POSTS, CENTRE_STAR } from '../engine/types';
import { getBoardTile, positionEquals, isFirstWord } from '../engine/game';
import './Board.css';

interface BoardProps {
  board: Board;
  livePost: FlagPost;
  pendingPlacements: { tileId: string; position: Position }[];
  onCellClick: (position: Position) => void;
}

function Board({ board, livePost, pendingPlacements, onCellClick }: BoardProps) {
  const livePostPos = FLAG_POSTS[livePost];
  const showCentreStar = isFirstWord(board);

  const renderCell = (row: number, col: number) => {
    const position = { row, col };
    const tile = getBoardTile(board, position);
    const isPending = pendingPlacements.some(p => positionEquals(p.position, position));
    const isLivePost = positionEquals(position, livePostPos);
    const isDarkPost = Object.values(FLAG_POSTS).some(
      p => positionEquals(p, position) && !positionEquals(p, livePostPos)
    );
    const isCentreStar = showCentreStar && positionEquals(position, CENTRE_STAR);

    const cellClasses = [
      'board-cell',
      isLivePost && 'live-post',
      isDarkPost && 'dark-post',
      isCentreStar && 'centre-star',
      isPending && 'pending',
    ].filter(Boolean).join(' ');

    return (
      <div
        key={`${row}-${col}`}
        className={cellClasses}
        onClick={() => onCellClick(position)}
      >
        {tile && (
          <div className="board-tile">
            <span className="tile-letter">
              {tile.isBlank && tile.assignedLetter ? tile.assignedLetter : tile.letter}
            </span>
            <span className="tile-value">{tile.value}</span>
          </div>
        )}
        {isCentreStar && !tile && <div className="star">★</div>}
        {isLivePost && !tile && <div className="flag-icon">🚩</div>}
      </div>
    );
  };

  return (
    <div className="board-container">
      <div className="board">
        {Array.from({ length: 9 }, (_, row) => (
          <div key={row} className="board-row">
            {Array.from({ length: 9 }, (_, col) => renderCell(row + 1, col + 1))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Board;

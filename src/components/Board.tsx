// Board component

import type { Board, FlagPost, Position } from '../engine/types';
import { FLAG_POSTS, CENTRE_STAR, BOARD_SIZE } from '../engine/types';
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
        data-row={row}
        data-col={col}
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
    <div
      className="board-container"
      data-board-size={BOARD_SIZE}
      data-centre={`${CENTRE_STAR.row},${CENTRE_STAR.col}`}
      data-post-nw={`${FLAG_POSTS.NW.row},${FLAG_POSTS.NW.col}`}
      data-post-ne={`${FLAG_POSTS.NE.row},${FLAG_POSTS.NE.col}`}
      data-post-se={`${FLAG_POSTS.SE.row},${FLAG_POSTS.SE.col}`}
      data-post-sw={`${FLAG_POSTS.SW.row},${FLAG_POSTS.SW.col}`}
    >
      <div className="board">
        {Array.from({ length: BOARD_SIZE }, (_, row) => (
          <div key={row} className="board-row">
            {Array.from({ length: BOARD_SIZE }, (_, col) => renderCell(row + 1, col + 1))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Board;

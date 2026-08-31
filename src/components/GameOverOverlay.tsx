// GameOverOverlay component

import type { GameState } from '../engine/types';
import './GameOverOverlay.css';

interface GameOverOverlayProps {
  gameState: GameState;
  onNewGame: () => void;
  onBackToMenu: () => void;
}

function GameOverOverlay({ gameState, onNewGame, onBackToMenu }: GameOverOverlayProps) {
  const [p1, p2] = gameState.players;
  const endReasonText = {
    capture: 'Flag captured!',
    bag: 'Bag depleted',
    posts_full: 'All posts occupied',
    double_pass: 'Double pass',
  }[gameState.endReason || 'capture'];

  const winnerText = gameState.winner === 'draw' 
    ? "It's a draw!" 
    : `${gameState.winner} wins!`;

  return (
    <div className="game-over-overlay">
      <div className="game-over-content">
        <h2 className="game-over-title">Game Over</h2>
        <p className="game-over-reason">{endReasonText}</p>
        <p className="game-over-winner">{winnerText}</p>

        <div className="final-scores">
          <div className="final-score">
            <span className="player-label">P1:</span>
            <span className="score-value">{p1.score}</span>
          </div>
          <div className="final-score">
            <span className="player-label">P2:</span>
            <span className="score-value">{p2.score}</span>
          </div>
        </div>

        <div className="game-over-actions">
          <button className="game-over-button" onClick={onNewGame}>
            New Game
          </button>
          <button className="game-over-button secondary" onClick={onBackToMenu}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameOverOverlay;

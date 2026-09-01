// End-of-game overlay: reason, winner, final scores.

import type { GameState } from '../engine/types';
import './GameOverOverlay.css';

interface GameOverOverlayProps {
  gameState: GameState;
  youLabel: string;
  otherLabel: string;
  viewerIndex: 0 | 1;
  onNewGame: () => void;
  onBackToMenu: () => void;
}

const END_REASONS: Record<string, string> = {
  self_capture: 'Own flag captured (triple-word)',
  second_steal: 'Second flag stolen',
  no_spare: 'Flag stolen — no spare corner',
  double_pass: 'Both players passed',
  stuck_out: 'Both players stuck',
};

function GameOverOverlay({
  gameState,
  youLabel,
  otherLabel,
  viewerIndex,
  onNewGame,
  onBackToMenu,
}: GameOverOverlayProps) {
  const viewer = gameState.players[viewerIndex];
  const other = gameState.players[viewerIndex === 0 ? 1 : 0];

  const winnerText =
    gameState.winner === 'draw'
      ? 'Draw'
      : gameState.winner === viewer.id
        ? `${youLabel} win`
        : `${otherLabel} wins`;

  return (
    <div className="game-over">
      <div className="game-over-panel">
        <p className="game-over-reason">{END_REASONS[gameState.endReason ?? ''] ?? 'Game over'}</p>
        <h2 className="game-over-winner">{winnerText}</h2>

        <div className="game-over-scores">
          <div className={`game-over-score is-${viewer.id.toLowerCase()}`}>
            <span>{youLabel}</span>
            <strong>{viewer.score}</strong>
          </div>
          <div className={`game-over-score is-${other.id.toLowerCase()}`}>
            <span>{otherLabel}</span>
            <strong>{other.score}</strong>
          </div>
        </div>

        <button type="button" className="game-over-button" onClick={onNewGame}>
          New game
        </button>
        <button type="button" className="game-over-button is-secondary" onClick={onBackToMenu}>
          Menu
        </button>
      </div>
    </div>
  );
}

export default GameOverOverlay;

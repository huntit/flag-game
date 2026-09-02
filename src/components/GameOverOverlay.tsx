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
  going_out: 'Went out',
  exchange_three: 'Three consecutive Exchanges',
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

  // The result is announced in the winner's own colour, the same way names
  // are coloured on the score cards.
  const winnerSeat =
    gameState.winner === 'P1' || gameState.winner === 'P2' ? gameState.winner : null;

  return (
    <div className="game-over">
      <div className="game-over-panel">
        <p className="game-over-reason">{END_REASONS[gameState.endReason ?? ''] ?? 'Game over'}</p>
        <h2 className={`game-over-winner ${winnerSeat ? `is-${winnerSeat.toLowerCase()}` : 'is-draw'}`}>
          {winnerText}
        </h2>

        <div className="game-over-scores">
          <div className={`game-over-score is-${viewer.id.toLowerCase()}`}>
            <span>{youLabel}</span>
            <strong className="score-value">{viewer.score}</strong>
          </div>
          <div className={`game-over-score is-${other.id.toLowerCase()}`}>
            <span>{otherLabel}</span>
            <strong className="score-value">{other.score}</strong>
          </div>
        </div>
        {gameState.leftoverPoints !== undefined && gameState.leftoverPoints !== 0 && (
          <p className="game-over-leftover">
            Leftover tiles {gameState.leftoverPoints}
          </p>
        )}

        <button type="button" className="control control-solid game-over-button" onClick={onNewGame}>
          New game
        </button>
        <button
          type="button"
          className="control control-outline game-over-button is-secondary"
          onClick={onBackToMenu}
        >
          Menu
        </button>
      </div>
    </div>
  );
}

export default GameOverOverlay;

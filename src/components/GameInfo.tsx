// GameInfo component

import type { GameState } from '../engine/types';
import './GameInfo.css';

interface GameInfoProps {
  gameState: GameState;
  isVsAI: boolean;
  isAIThinking: boolean;
}

function GameInfo({ gameState, isAIThinking }: GameInfoProps) {
  const [p1, p2] = gameState.players;
  const currentPlayer = gameState.players[gameState.currentPlayer];

  return (
    <div className="game-info">
      <div className="scores">
        <div className={`player-score ${currentPlayer.id === 'P1' ? 'active' : ''}`}>
          <div className="player-name">P1 {currentPlayer.id === 'P1' && '◀'}</div>
          <div className="score">{p1.score}</div>
        </div>
        <div className={`player-score ${currentPlayer.id === 'P2' ? 'active' : ''}`}>
          <div className="player-name">P2 {currentPlayer.id === 'P2' && '◀'}</div>
          <div className="score">{p2.score}</div>
        </div>
      </div>

      <div className="game-status">
        <div className="status-item">
          <span className="status-label">Live Post:</span>
          <span className="status-value">{gameState.livePost}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Bag:</span>
          <span className="status-value">{gameState.bag.length} tiles</span>
        </div>
        <div className="status-item">
          <span className="status-label">Turn:</span>
          <span className="status-value">{gameState.turnCount + 1}</span>
        </div>
      </div>

      {isAIThinking && (
        <div className="ai-thinking">AI is thinking...</div>
      )}
    </div>
  );
}

export default GameInfo;

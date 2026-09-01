// Score cards: reserved name + score on one line; tile-backs cannot overlap that text.

import { RACK_MAX } from '../engine/types';
import './GameInfo.css';

interface ScoreCardProps {
  name: string;
  score: number;
  rackCount: number;
  isActive: boolean;
  playerColor: 'P1' | 'P2';
  variant?: 'you' | 'opponent';
}

export function ScoreCard({
  name,
  score,
  rackCount,
  isActive,
  playerColor,
  variant = 'you',
}: ScoreCardProps) {
  const shown = Math.max(0, Math.min(RACK_MAX, rackCount));

  return (
    <div
      className={`score-card ${variant === 'you' ? 'hud-you' : 'opponent-inner'} is-${playerColor.toLowerCase()} ${isActive ? 'is-active' : ''}`}
    >
      <div className="score-card-id">
        <span className={`score-card-name ${variant === 'you' ? 'hud-key' : 'opponent-name'}`}>
          {name}
        </span>
        <span className={`score-card-score ${variant === 'you' ? 'hud-value' : 'opponent-score'}`}>
          {score}
        </span>
      </div>
      <div className="score-backs" aria-label={`${name} holds ${rackCount} tiles`}>
        {Array.from({ length: shown }, (_, i) => (
          <span
            key={`back-${i}`}
            className={`score-back ${variant === 'opponent' ? 'opponent-back' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

interface GameInfoProps {
  youLabel: string;
  yourScore: number;
  rackCount: number;
  isYourTurn: boolean;
  playerColor: 'P1' | 'P2';
}

function GameInfo({ youLabel, yourScore, rackCount, isYourTurn, playerColor }: GameInfoProps) {
  return (
    <ScoreCard
      name={youLabel}
      score={yourScore}
      rackCount={rackCount}
      isActive={isYourTurn}
      playerColor={playerColor}
      variant="you"
    />
  );
}

export default GameInfo;

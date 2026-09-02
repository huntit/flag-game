// Score cards: FIRST player left, SECOND player right (true P1/P2 seat order).
// A player is identified by their name in their own colour — no avatars.
// The mini-rack below is a scale model of their real rack: six slots, filled
// with tile backs for the tiles they hold.

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
      data-seat={playerColor}
    >
      <div className="score-card-head">
        <span
          className="score-card-turn"
          aria-label={isActive ? `${name} to play` : undefined}
        />
        <span className={`score-card-name ${variant === 'you' ? 'hud-key' : 'opponent-name'}`}>
          {name}
        </span>
        <span
          className={`score-card-score score-value ${variant === 'you' ? 'hud-value' : 'opponent-score'}`}
        >
          {score}
        </span>
      </div>
      <div className="score-backs" aria-label={`${name} holds ${rackCount} tiles`}>
        {Array.from({ length: RACK_MAX }, (_, i) => (
          <span
            key={`pip-${i}`}
            className={`score-pip ${
              i < shown
                ? `score-back is-filled ${variant === 'opponent' ? 'opponent-back' : ''}`
                : 'is-empty'
            }`}
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

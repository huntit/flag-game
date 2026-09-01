// Score cards: FIRST player left, SECOND player right (true P1/P2 seat order).
// Mini-rack pips: filled backs + dotted empty slots. Avatar sits with the name.

import { RACK_MAX } from '../engine/types';
import { PlayerAvatar, type AvatarKind } from './PlayerAvatar';
import './GameInfo.css';

interface ScoreCardProps {
  name: string;
  score: number;
  rackCount: number;
  isActive: boolean;
  playerColor: 'P1' | 'P2';
  kind: AvatarKind;
  variant?: 'you' | 'opponent';
}

export function ScoreCard({
  name,
  score,
  rackCount,
  isActive,
  playerColor,
  kind,
  variant = 'you',
}: ScoreCardProps) {
  const shown = Math.max(0, Math.min(RACK_MAX, rackCount));

  return (
    <div
      className={`score-card ${variant === 'you' ? 'hud-you' : 'opponent-inner'} is-${playerColor.toLowerCase()} ${isActive ? 'is-active' : ''}`}
      data-seat={playerColor}
    >
      <div className="score-card-id">
        <PlayerAvatar kind={kind} playerColor={playerColor} name={name} />
        <span className={`score-card-name ${variant === 'you' ? 'hud-key' : 'opponent-name'}`}>
          {name}
        </span>
        <span className={`score-card-score ${variant === 'you' ? 'hud-value' : 'opponent-score'}`}>
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
  kind: AvatarKind;
}

function GameInfo({ youLabel, yourScore, rackCount, isYourTurn, playerColor, kind }: GameInfoProps) {
  return (
    <ScoreCard
      name={youLabel}
      score={yourScore}
      rackCount={rackCount}
      isActive={isYourTurn}
      playerColor={playerColor}
      kind={kind}
      variant="you"
    />
  );
}

export default GameInfo;

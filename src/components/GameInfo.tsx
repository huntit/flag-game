// Compact HUD: your score chip in player colour, plus rack-count tile backs.

import './GameInfo.css';

interface GameInfoProps {
  youLabel: string;
  yourScore: number;
  rackCount: number;
  isYourTurn: boolean;
  playerColor: 'P1' | 'P2';
}

function GameInfo({ youLabel, yourScore, rackCount, isYourTurn, playerColor }: GameInfoProps) {
  return (
    <div
      className={`hud-chip hud-you is-${playerColor.toLowerCase()} ${isYourTurn ? 'is-active' : ''}`}
    >
      <span className="hud-key">{youLabel}</span>
      <span className="hud-value">{yourScore}</span>
      <div className="score-backs" aria-label={`${youLabel} holds ${rackCount} tiles`}>
        {Array.from({ length: rackCount }, (_, i) => (
          <span key={`you-back-${i}`} className="score-back" />
        ))}
      </div>
    </div>
  );
}

export default GameInfo;

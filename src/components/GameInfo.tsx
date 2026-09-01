// Compact HUD: your score chip in player colour.

import './GameInfo.css';

interface GameInfoProps {
  youLabel: string;
  yourScore: number;
  isYourTurn: boolean;
  playerColor: 'P1' | 'P2';
}

function GameInfo({ youLabel, yourScore, isYourTurn, playerColor }: GameInfoProps) {
  return (
    <div
      className={`hud-chip hud-you is-${playerColor.toLowerCase()} ${isYourTurn ? 'is-active' : ''}`}
    >
      <span className="hud-key">{youLabel}</span>
      <span className="hud-value">{yourScore}</span>
    </div>
  );
}

export default GameInfo;

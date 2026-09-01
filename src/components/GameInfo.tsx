// Compact HUD: logo home link, your score chip in player colour.

import HomeLink from './HomeLink';
import './GameInfo.css';

interface GameInfoProps {
  youLabel: string;
  yourScore: number;
  isYourTurn: boolean;
  playerColor: 'P1' | 'P2';
  onHome: () => void;
}

function GameInfo({ youLabel, yourScore, isYourTurn, playerColor, onHome }: GameInfoProps) {
  return (
    <>
      <HomeLink variant="hud" onNavigate={onHome} />

      <div
        className={`hud-chip hud-you is-${playerColor.toLowerCase()} ${isYourTurn ? 'is-active' : ''}`}
      >
        <span className="hud-key">{youLabel}</span>
        <span className="hud-value">{yourScore}</span>
      </div>
    </>
  );
}

export default GameInfo;

// Compact HUD strip: menu, your score, live post and bag count on one line.

import './GameInfo.css';

interface GameInfoProps {
  youLabel: string;
  yourScore: number;
  isYourTurn: boolean;
  livePost: string;
  bagCount: number;
  onBackToMenu: () => void;
}

function GameInfo({ youLabel, yourScore, isYourTurn, livePost, bagCount, onBackToMenu }: GameInfoProps) {
  return (
    <>
      <button type="button" className="icon-button" onClick={onBackToMenu} aria-label="Back to menu">
        ‹
      </button>

      <div className={`hud-chip hud-you ${isYourTurn ? 'is-active' : ''}`}>
        <span className="hud-key">{youLabel}</span>
        <span className="hud-value">{yourScore}</span>
      </div>

      <div className="hud-chip">
        <span className="hud-key">Flag</span>
        <span className="hud-value hud-flag">{livePost}</span>
      </div>

      <div className="hud-chip">
        <span className="hud-key">Bag</span>
        <span className="hud-value">{bagCount}</span>
      </div>
    </>
  );
}

export default GameInfo;

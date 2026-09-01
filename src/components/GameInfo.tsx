// Compact HUD: logo home link, your score chip in player colour.

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
      <a className="hud-logo" href="/flag-game/" onClick={e => { e.preventDefault(); onHome(); }} aria-label="Flag home">
        <img src={`${import.meta.env.BASE_URL}logo-header.png`} alt="Flag" className="hud-logo-img" />
      </a>

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

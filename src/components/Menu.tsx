// Main menu. Logo is the title; fits the viewport with no scrolling.

import type { GameMode, AIOpponent } from '../App';
import HomeLink from './HomeLink';
import './Menu.css';

interface MenuProps {
  onSelectMode: (mode: GameMode, opponent?: AIOpponent) => void;
}

function Menu({ onSelectMode }: MenuProps) {
  return (
    <div className="screen menu">
      <div className="screen-panel menu-panel">
        <div className="menu-head">
          <HomeLink variant="menu" />
          <p className="menu-subtitle">9×9 · steal flags or self-capture to end</p>
        </div>

        <div className="menu-buttons">
          <button type="button" className="menu-button is-primary" onClick={() => onSelectMode('vs-ai', 'hunter')}>
            vs Hunter
            <small>Hunts your flag</small>
          </button>
          <button type="button" className="menu-button" onClick={() => onSelectMode('hotseat')}>
            Hotseat
            <small>Two players, one phone</small>
          </button>
          <div className="menu-split">
            <button type="button" className="menu-button is-small" onClick={() => onSelectMode('vs-ai', 'greedy')}>
              vs Greedy
            </button>
            <button type="button" className="menu-button is-small" onClick={() => onSelectMode('vs-ai', 'sleeper')}>
              vs Sleeper
            </button>
          </div>
          <button type="button" className="menu-button is-small" onClick={() => onSelectMode('online')}>
            Remote 2-player
          </button>
          <button
            type="button"
            className="menu-button is-small is-quiet"
            onClick={() => onSelectMode('how-to-play')}
          >
            How to Play
          </button>
        </div>

        <p className="menu-note">
          Draw exactly 2 from the market <strong>or</strong> play tiles — never both.
        </p>
      </div>
    </div>
  );
}

export default Menu;

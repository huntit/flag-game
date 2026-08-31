// Main menu. Fits the viewport with no scrolling, like every other screen.

import type { GameMode, AIOpponent } from '../App';
import './Menu.css';

interface MenuProps {
  onSelectMode: (mode: GameMode, opponent?: AIOpponent) => void;
}

function Menu({ onSelectMode }: MenuProps) {
  return (
    <div className="screen menu">
      <div className="screen-panel menu-panel">
        <div className="menu-head">
          <h1 className="menu-title">Flag</h1>
          <p className="menu-subtitle">11×11 · cover the live post to end it</p>
        </div>

        <div className="menu-buttons">
          <button type="button" className="menu-button is-primary" onClick={() => onSelectMode('vs-ai', 'hunter')}>
            vs Hunter
            <small>Hunts the flag</small>
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
        </div>

        <p className="menu-note">
          Draw from the market <strong>or</strong> play tiles — never both. Pass only exists when
          you are stuck.
        </p>
      </div>
    </div>
  );
}

export default Menu;

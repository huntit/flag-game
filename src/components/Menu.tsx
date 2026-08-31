// Menu component

import type { GameMode, AIOpponent } from '../App';
import './Menu.css';

interface MenuProps {
  onSelectMode: (mode: GameMode, opponent?: AIOpponent) => void;
}

function Menu({ onSelectMode }: MenuProps) {
  return (
    <div className="menu">
      <div className="menu-content">
        <h1 className="menu-title">Flag</h1>
        <p className="menu-subtitle">Two-player word game</p>

        <div className="menu-buttons">
          <button
            className="menu-button"
            onClick={() => onSelectMode('vs-ai', 'hunter')}
          >
            vs Hunter
          </button>

          <button
            className="menu-button"
            onClick={() => onSelectMode('hotseat')}
          >
            Hotseat
          </button>

          <button
            className="menu-button"
            onClick={() => onSelectMode('vs-ai', 'greedy')}
          >
            vs Greedy
          </button>

          <button
            className="menu-button"
            onClick={() => onSelectMode('vs-ai', 'sleeper')}
          >
            vs Sleeper
          </button>

          <button
            className="menu-button menu-button-secondary"
            onClick={() => onSelectMode('online')}
          >
            Remote 2P
          </button>
        </div>

        <div className="menu-info">
          <p>
            <strong>Goal:</strong> Score points by forming words. Cover the live flag post to end the game.
          </p>
          <p>
            <strong>Turn:</strong> Draw tiles from the market OR play tiles from your rack.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Menu;

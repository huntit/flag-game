// Market component

import type { Tile } from '../engine/types';
import './Market.css';

interface MarketProps {
  market: Tile[];
  selectedTileIds: string[];
  onTileClick: (tile: Tile) => void;
  disabled: boolean;
}

function Market({ market, selectedTileIds, onTileClick, disabled }: MarketProps) {
  return (
    <div className="market-container">
      <div className="market-label">Market</div>
      <div className="market">
        {market.map((tile) => {
          const isSelected = selectedTileIds.includes(tile.id);

          return (
            <div
              key={tile.id}
              className={`market-tile ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => !disabled && onTileClick(tile)}
            >
              <span className="tile-letter">
                {tile.isBlank ? '_' : tile.letter}
              </span>
              <span className="tile-value">{tile.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Market;

// Rack component

import type { Tile } from '../engine/types';
import './Rack.css';

interface RackProps {
  tiles: Tile[];
  selectedTileIds: string[];
  placedTileIds: string[];
  onTileClick: (tile: Tile) => void;
  disabled: boolean;
  label?: string;
}

function Rack({ tiles, selectedTileIds, placedTileIds, onTileClick, disabled, label }: RackProps) {
  return (
    <div className="rack-container">
      {label && <div className="rack-label">{label}</div>}
      <div className="rack">
        {tiles.map((tile) => {
          const isSelected = selectedTileIds.includes(tile.id);
          const isPlaced = placedTileIds.includes(tile.id);
          
          if (isPlaced) return null;

          return (
            <div
              key={tile.id}
              className={`rack-tile ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
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

export default Rack;

// Rack component

import type { Tile } from '../engine/types';
import { RACK_MAX } from '../engine/types';
import './Rack.css';

interface RackProps {
  tiles: Tile[];
  selectedTileIds: string[];
  placedTileIds: string[];
  onTileClick: (tile: Tile) => void;
  disabled: boolean;
  label?: string;
  /** Facedown backs for occupied slots; empty slots stay visible. No letters, no numeric count. */
  hidden?: boolean;
}

function Rack({ tiles, selectedTileIds, placedTileIds, onTileClick, disabled, label, hidden }: RackProps) {
  const visibleTiles = hidden
    ? tiles
    : tiles.filter(tile => !placedTileIds.includes(tile.id));
  const occupied = hidden ? tiles.length : visibleTiles.length;
  const emptySlots = Math.max(0, RACK_MAX - occupied);

  return (
    <div className={`rack-container ${hidden ? 'rack-hidden' : ''}`} data-hidden={hidden ? 'true' : 'false'}>
      {label && <div className="rack-label">{label}</div>}
      <div className="rack" aria-label={hidden ? 'Opponent rack' : label}>
        {hidden
          ? tiles.map((_, i) => (
              <div
                key={`back-${i}`}
                className="rack-tile rack-tile-back"
                aria-hidden="true"
              />
            ))
          : visibleTiles.map((tile) => {
              const isSelected = selectedTileIds.includes(tile.id);
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
        {Array.from({ length: emptySlots }, (_, i) => (
          <div key={`empty-${i}`} className="rack-slot-empty" aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}

export default Rack;

// Market: four face-up tiles, plus the optional facedown bag tile toggle.

import type { Tile } from '../engine/types';
import { MARKET_SIZE } from '../engine/types';
import './Market.css';

interface MarketProps {
  market: Tile[];
  selectedTileIds: string[];
  disabled: boolean;
  bagTileAvailable: boolean;
  bagTileSelected: boolean;
  onTileClick: (tile: Tile) => void;
  onToggleBagTile: () => void;
}

function Market({
  market,
  selectedTileIds,
  disabled,
  bagTileAvailable,
  bagTileSelected,
  onTileClick,
  onToggleBagTile,
}: MarketProps) {
  const emptySlots = Math.max(0, MARKET_SIZE - market.length);

  return (
    <div className="market-row-inner" data-market-count={market.length}>
      <span className="tray-label">Market</span>
      <div className="tray market-tray" aria-label="Market">
        {market.map(tile => {
          const classes = [
            'tray-tile',
            'market-tile',
            selectedTileIds.includes(tile.id) && 'is-selected',
            tile.isBlank && 'is-blank',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              type="button"
              key={tile.id}
              className={classes}
              disabled={disabled}
              onClick={() => onTileClick(tile)}
              aria-label={tile.isBlank ? 'Blank tile' : `${tile.letter}, ${tile.value} points`}
            >
              <span className="tile-letter">{tile.isBlank ? '★' : tile.letter}</span>
              <span className="tile-value">{tile.value}</span>
            </button>
          );
        })}
        {Array.from({ length: emptySlots }, (_, i) => (
          <span key={`market-empty-${i}`} className="tray-slot-empty" aria-hidden="true" />
        ))}
      </div>

      <button
        type="button"
        className={`bag-toggle ${bagTileSelected ? 'is-on' : ''}`}
        disabled={disabled || !bagTileAvailable}
        onClick={onToggleBagTile}
        aria-pressed={bagTileSelected}
      >
        +1
        <small>bag</small>
      </button>
    </div>
  );
}

export default Market;

// Market: 4 face-up + 2 face-down tiles, bag count nearby. No +1 bag button.

import type { MarketSlot, Tile } from '../engine/types';
import { MARKET_SLOTS } from '../engine/types';
import { TileFace } from './TileFace';
import './Market.css';

interface MarketProps {
  market: MarketSlot[];
  selectedTileIds: string[];
  bagCount: number;
  disabled: boolean;
  onTileClick: (tile: Tile) => void;
}

function Market({ market, selectedTileIds, bagCount, disabled, onTileClick }: MarketProps) {
  const emptySlots = Math.max(0, MARKET_SLOTS - market.length);

  return (
    <div className="market-row-inner" data-market-count={market.length}>
      <span className="tray-label">Market</span>
      <div className="tray market-tray" aria-label="Market">
        {market.map((slot, index) => {
          const tile = slot.tile;
          if (!tile) {
            return (
              <span
                key={`market-empty-${index}`}
                className={`tray-slot-empty ${slot.faceUp ? 'is-face-up' : 'is-face-down'}`}
                aria-hidden="true"
              />
            );
          }

          if (!slot.faceUp) {
            const selected = selectedTileIds.includes(tile.id);
            return (
              <button
                type="button"
                key={tile.id}
                className={`tray-tile market-tile is-facedown ${selected ? 'is-selected' : ''}`}
                disabled={disabled}
                onClick={() => onTileClick(tile)}
                aria-label="Face-down market tile"
              />
            );
          }

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
              <TileFace letter={tile.letter} value={tile.value} isBlank={tile.isBlank} />
            </button>
          );
        })}
        {Array.from({ length: emptySlots }, (_, i) => (
          <span key={`market-pad-${i}`} className="tray-slot-empty" aria-hidden="true" />
        ))}
      </div>

      <div className="bag-count" aria-label={`${bagCount} tiles in bag`}>
        <span className="bag-count-label">Bag</span>
        <span className="bag-count-value">{bagCount}</span>
      </div>
    </div>
  );
}

export default Market;

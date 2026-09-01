// Market: 4 face-up + 2 face-down tiles. Bag art + remaining count (no MARKET word).

import type { MarketSlot, Tile } from '../engine/types';
import { MARKET_SLOTS } from '../engine/types';
import { TileFace } from './TileFace';
import './Market.css';

const base = import.meta.env.BASE_URL;

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
      <div className="market-bag" aria-label={`${bagCount} tiles in bag`}>
        <img className="market-bag-art" src={`${base}market-bag.svg`} alt="" />
        <span className="market-bag-count">{bagCount}</span>
      </div>
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
    </div>
  );
}

export default Market;

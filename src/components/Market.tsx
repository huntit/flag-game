// Market: the variant's slots — face up first, then the face-down pair on the
// end. The bag sits immediately to the left of the row it refills, with its
// remaining count as plain text rather than a badge stamped on the art.

import type { MarketSlot, Tile } from '../engine/types';
import { TileFace } from './TileFace';
import './Market.css';

const base = import.meta.env.BASE_URL;

interface MarketProps {
  market: MarketSlot[];
  /** Slots the variant deals — 5 on the 9×9, 6 on the 11×11. */
  capacity: number;
  selectedTileIds: string[];
  bagCount: number;
  disabled: boolean;
  onTileClick: (tile: Tile) => void;
}

function Market({ market, capacity, selectedTileIds, bagCount, disabled, onTileClick }: MarketProps) {
  const emptySlots = Math.max(0, capacity - market.length);

  return (
    <div className="market-row-inner" data-market-count={market.length}>
      <div className="market-bag" aria-label={`${bagCount} tiles left in the bag`}>
        <img className="market-bag-art" src={`${base}market-bag.svg`} alt="" />
        <span className="market-bag-count" aria-hidden="true">
          {bagCount}
        </span>
      </div>
      <div className="tray market-tray" aria-label="Market">
        {market.map((slot, index) => {
          const tile = slot.tile;
          if (!tile) {
            return (
              <span
                key={`market-empty-${index}`}
                className={`tray-slot-empty market-slot-empty ${slot.faceUp ? 'is-face-up' : 'is-face-down'}`}
                aria-hidden="true"
              />
            );
          }

          const selected = selectedTileIds.includes(tile.id);
          const classes = [
            'tray-tile',
            'market-tile',
            selected && 'is-selected',
            slot.faceUp ? 'is-faceup' : 'is-facedown',
            slot.faceUp && tile.isBlank && 'is-blank',
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
              aria-label={
                !slot.faceUp
                  ? 'Face-down market tile'
                  : tile.isBlank
                    ? 'Blank tile'
                    : `${tile.letter}, ${tile.value} points`
              }
            >
              {slot.faceUp ? (
                <TileFace letter={tile.letter} value={tile.value} isBlank={tile.isBlank} />
              ) : null}
            </button>
          );
        })}
        {Array.from({ length: emptySlots }, (_, i) => (
          <span key={`market-pad-${i}`} className="tray-slot-empty market-slot-empty" aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}

export default Market;

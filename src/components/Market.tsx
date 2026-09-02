// Market: six slots — four face up, then two face down on the end.
//
// The slots are always rendered, filled or not, and each one is a groove the
// tile sits in. That is what makes it read as a physical card rather than a
// row of floating tiles: you can see the six places tiles belong even when the
// bag has stopped filling them.

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
  const slots: (MarketSlot | null)[] = [
    ...market,
    ...Array.from({ length: Math.max(0, MARKET_SLOTS - market.length) }, () => null),
  ];

  return (
    <div className="market-row-inner" data-market-count={market.length}>
      {/* Heading and bag share the card's top line: the title on the left
          edge, the source of the tiles on the right. */}
      <div className="market-head">
        <h2 className="market-heading">Market</h2>
        <div className="market-bag" aria-label={`${bagCount} tiles left in the bag`}>
          <img className="market-bag-art" src={`${base}market-bag.svg`} alt="" />
          <span className="market-bag-count" aria-hidden="true">
            {bagCount}
          </span>
        </div>
      </div>

      <div className="tray market-tray" aria-label="Market">
        {slots.map((slot, index) => {
          const tile = slot?.tile ?? null;
          const faceUp = slot?.faceUp ?? index < market.length;

          return (
            <span
              key={tile ? tile.id : `market-slot-${index}`}
              className={`market-slot ${faceUp ? 'is-face-up' : 'is-face-down'} ${tile ? 'is-filled' : 'is-empty'}`}
            >
              {tile ? (
                <button
                  type="button"
                  className={[
                    'tray-tile',
                    'market-tile',
                    selectedTileIds.includes(tile.id) && 'is-selected',
                    faceUp ? 'is-faceup' : 'is-facedown',
                    faceUp && tile.isBlank && 'is-blank',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={disabled}
                  onClick={() => onTileClick(tile)}
                  aria-label={
                    !faceUp
                      ? 'Face-down market tile'
                      : tile.isBlank
                        ? 'Blank tile'
                        : `${tile.letter}, ${tile.value} points`
                  }
                >
                  {faceUp ? (
                    <TileFace letter={tile.letter} value={tile.value} isBlank={tile.isBlank} />
                  ) : null}
                </button>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default Market;

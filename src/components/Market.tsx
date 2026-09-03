// Market: the variant's slots — face up first, then the face-down pair on the
// end. The bag sits immediately to the left of the row it refills, with its
// remaining count as plain text rather than a badge stamped on the art.
//
// Every slot is drawn whether or not it holds a tile, and each one is a groove
// the tile sits down into. That is what makes the market read as a physical
// thing tiles come from rather than a row of tiles that happen to be adjacent:
// you can still see the places tiles belong when the bag has stopped filling
// them.

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
  // Always the variant's full complement of grooves: the dealt slots, then
  // empty ones for any the bag can no longer fill.
  const slots: (MarketSlot | null)[] = [
    ...market.slice(0, capacity),
    ...Array.from({ length: Math.max(0, capacity - market.length) }, () => null),
  ];

  return (
    <div className="market-row-inner" data-market-count={market.length}>
      {/* Heading and bag share one row wherever the market is a card of its
          own; on the phone the wrapper collapses and the bag simply sits at
          the head of the row, as it always has. */}
      <div className="market-head">
        <span className="market-heading">Market</span>
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
          // A slot with no tile left in it keeps whichever face it was dealt
          // with, so the two face-down places stay recognisable to the end.
          const faceUp = slot?.faceUp ?? index < capacity - 2;

          return (
            <span
              key={tile ? tile.id : `market-slot-${index}`}
              className={[
                'market-slot',
                faceUp ? 'is-face-up' : 'is-face-down',
                tile ? 'is-filled' : 'is-empty',
              ].join(' ')}
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

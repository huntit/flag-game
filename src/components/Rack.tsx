// Your rack. Your own letters are always visible; an opponent's never are.
// Tiles stand in a rail tinted with your seat colour — the same fill as your
// score card — so "these are mine" needs no label. Market tiles, by contrast,
// lie flat on the table with no tray behind them.

import type { Tile } from '../engine/types';
import { TileFace } from './TileFace';
import { ScoreCard } from './GameInfo';
import './Rack.css';

interface RackProps {
  tiles: Tile[];
  /** Rack cap for the variant in play — 6 on the 9×9, 7 on the 11×11. */
  capacity: number;
  label: string;
  playerColor: 'P1' | 'P2';
  selectedTileId: string | null;
  discardTileIds: string[];
  placedTileIds: string[];
  /** Tile currently under the cursor mid-drag — hidden here, drawn floating. */
  liftedTileId?: string | null;
  /** Slot the drag would drop into, so the rack can open a gap for it. */
  dropIndex?: number | null;
  disabled: boolean;
  onTileClick: (tile: Tile) => void;
  onTilePointerDown?: (event: React.PointerEvent, tileId: string) => void;
  /** Rendered to the right of the tiles — the desktop shell's Shuffle/Clear
   *  button, which has no room of its own on that pointer's actions row. */
  trailingButton?: React.ReactNode;
}

export function Rack({
  tiles,
  capacity,
  label,
  playerColor,
  selectedTileId,
  discardTileIds,
  placedTileIds,
  liftedTileId,
  dropIndex,
  disabled,
  onTileClick,
  onTilePointerDown,
  trailingButton,
}: RackProps) {
  const available = tiles.filter(tile => !placedTileIds.includes(tile.id));
  const emptySlots = Math.max(0, capacity - available.length);

  return (
    <div className={`rack-row-inner is-${playerColor.toLowerCase()}`}>
      <div className="tray rack-tray" data-rack-zone="true" aria-label={`${label}: your tiles`}>
        {available.map((tile, index) => {
          const classes = [
            'tray-tile',
            'rack-tile',
            selectedTileId === tile.id && 'is-selected',
            discardTileIds.includes(tile.id) && 'is-discarding',
            liftedTileId === tile.id && 'is-lifted',
            tile.isBlank && 'is-blank',
            dropIndex === index && 'has-gap-before',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              type="button"
              key={tile.id}
              className={classes}
              data-tile-id={tile.id}
              data-rack-index={index}
              data-lifted={liftedTileId === tile.id ? 'true' : undefined}
              disabled={disabled}
              onClick={() => onTileClick(tile)}
              onPointerDown={
                onTilePointerDown && !disabled
                  ? e => onTilePointerDown(e, tile.id)
                  : undefined
              }
              aria-label={tile.isBlank ? 'Blank tile' : `${tile.letter}, ${tile.value} points`}
            >
              <TileFace letter={tile.letter} value={tile.value} isBlank={tile.isBlank} />
            </button>
          );
        })}
        {Array.from({ length: emptySlots }, (_, i) => (
          <span
            key={`empty-${i}`}
            className={`tray-slot-empty rack-slot-empty ${
              dropIndex === available.length + i ? 'has-gap-before' : ''
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
      {trailingButton && <div className="rack-trailing">{trailingButton}</div>}
    </div>
  );
}

interface OpponentRackProps {
  name: string;
  playerColor: 'P1' | 'P2';
  count: number;
  capacity: number;
  score: number;
  isTheirTurn: boolean;
}

export function OpponentRack({
  name,
  playerColor,
  count,
  capacity,
  score,
  isTheirTurn,
}: OpponentRackProps) {
  return (
    <ScoreCard
      name={name}
      score={score}
      rackCount={count}
      rackCapacity={capacity}
      isActive={isTheirTurn}
      playerColor={playerColor}
      variant="opponent"
    />
  );
}

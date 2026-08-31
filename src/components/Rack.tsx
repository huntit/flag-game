// Racks. Your own letters are always visible; an opponent's never are.

import type { Tile } from '../engine/types';
import { RACK_MAX } from '../engine/types';
import './Rack.css';

interface RackProps {
  tiles: Tile[];
  label: string;
  selectedTileId: string | null;
  discardTileIds: string[];
  placedTileIds: string[];
  disabled: boolean;
  onTileClick: (tile: Tile) => void;
}

export function Rack({
  tiles,
  label,
  selectedTileId,
  discardTileIds,
  placedTileIds,
  disabled,
  onTileClick,
}: RackProps) {
  const available = tiles.filter(tile => !placedTileIds.includes(tile.id));
  const emptySlots = Math.max(0, RACK_MAX - available.length);

  return (
    <div className="rack-row-inner">
      <span className="tray-label">{label}</span>
      <div className="tray" aria-label={label}>
        {available.map(tile => {
          const classes = [
            'tray-tile',
            selectedTileId === tile.id && 'is-selected',
            discardTileIds.includes(tile.id) && 'is-discarding',
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
          <span key={`empty-${i}`} className="tray-slot-empty" aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}

interface OpponentRackProps {
  name: string;
  count: number;
  score: number;
  isTheirTurn: boolean;
}

/**
 * The opponent's rack: facedown backs and empty slots so the shape of their hand
 * reads at a glance, plus the count as a number because that is the figure you
 * actually plan around. Letters are never rendered or passed in — only a count.
 */
export function OpponentRack({ name, count, score, isTheirTurn }: OpponentRackProps) {
  const emptySlots = Math.max(0, RACK_MAX - count);

  return (
    <div className={`opponent-inner ${isTheirTurn ? 'is-their-turn' : ''}`}>
      <span className="opponent-name">{name}</span>
      <span className="opponent-score">{score}</span>
      <div className="opponent-tiles" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span key={`back-${i}`} className="opponent-back" />
        ))}
        {Array.from({ length: emptySlots }, (_, i) => (
          <span key={`gap-${i}`} className="opponent-gap" />
        ))}
      </div>
      <span className="opponent-count" aria-label={`${name} holds ${count} tiles`}>
        {count} <small>tiles</small>
      </span>
    </div>
  );
}

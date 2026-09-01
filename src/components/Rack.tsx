// Racks. Your own letters are always visible; an opponent's never are.

import type { Tile } from '../engine/types';
import { RACK_MAX } from '../engine/types';
import { TileFace } from './TileFace';
import { ScoreCard } from './GameInfo';
import { PlayerAvatar, type AvatarKind } from './PlayerAvatar';
import './Rack.css';

interface RackProps {
  tiles: Tile[];
  label: string;
  playerColor: 'P1' | 'P2';
  kind: AvatarKind;
  selectedTileId: string | null;
  discardTileIds: string[];
  placedTileIds: string[];
  disabled: boolean;
  onTileClick: (tile: Tile) => void;
}

export function Rack({
  tiles,
  label,
  playerColor,
  kind,
  selectedTileId,
  discardTileIds,
  placedTileIds,
  disabled,
  onTileClick,
}: RackProps) {
  const available = tiles.filter(tile => !placedTileIds.includes(tile.id));
  const emptySlots = Math.max(0, RACK_MAX - available.length);

  return (
    <div className={`rack-row-inner is-${playerColor.toLowerCase()}`}>
      <span className="tray-label">
        <PlayerAvatar kind={kind} playerColor={playerColor} name={label} />
        <span className="tray-label-text">{label}</span>
      </span>
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
              <TileFace letter={tile.letter} value={tile.value} isBlank={tile.isBlank} />
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
  playerColor: 'P1' | 'P2';
  kind: AvatarKind;
  count: number;
  score: number;
  isTheirTurn: boolean;
}

export function OpponentRack({ name, playerColor, kind, count, score, isTheirTurn }: OpponentRackProps) {
  return (
    <ScoreCard
      name={name}
      score={score}
      rackCount={count}
      isActive={isTheirTurn}
      playerColor={playerColor}
      kind={kind}
      variant="opponent"
    />
  );
}

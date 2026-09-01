// Scrolling move log for desktop/iPad — entries coloured by player.

import type { MoveLogEntry } from '../moveLog';
import './MoveLog.css';

export type { MoveLogEntry };

interface MoveLogProps {
  entries: MoveLogEntry[];
}

function MoveLog({ entries }: MoveLogProps) {
  if (entries.length === 0) return null;

  return (
    <div className="move-log" aria-label="Move log">
      <span className="move-log-label">Log</span>
      <ol className="move-log-list">
        {entries.map((entry, i) => (
          <li
            key={i}
            className={`move-log-entry ${entry.player ? `is-${entry.player.toLowerCase()}` : 'is-system'} ${entry.system ? 'is-system' : ''}`}
          >
            {!entry.system && entry.name && (
              <span className="move-log-seat">{entry.name}</span>
            )}
            <span className="move-log-text">{entry.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default MoveLog;

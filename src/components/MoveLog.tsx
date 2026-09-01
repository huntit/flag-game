// Scrolling move log for desktop/iPad — entries coloured by player.

import './MoveLog.css';

export interface MoveLogEntry {
  player: 'P1' | 'P2';
  text: string;
}

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
          <li key={i} className={`move-log-entry is-${entry.player.toLowerCase()}`}>
            <span className="move-log-seat">{entry.player}</span>
            <span className="move-log-text">{entry.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default MoveLog;

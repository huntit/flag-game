// Scrolling move log — entries coloured by player, scores in the score colour.

import { useEffect, useRef } from 'react';
import type { MoveLogEntry } from '../moveLog';
import './MoveLog.css';

export type { MoveLogEntry };

interface MoveLogProps {
  entries: MoveLogEntry[];
}

/**
 * "ABHORS + AD + BO + HE for 22" — the words plain, the total bold in the
 * score colour, so a glance down the log reads as a column of scores.
 */
export function MoveLogText({ entry }: { entry: MoveLogEntry }) {
  if (entry.words === undefined || entry.score === undefined) {
    return <span className="move-log-text">{entry.text}</span>;
  }

  return (
    <span className="move-log-text">
      <span className="move-log-words">{entry.words}</span>
      <span className="move-log-for"> for </span>
      <span className="score-value">{entry.score}</span>
      {entry.suffix}
    </span>
  );
}

function MoveLog({ entries }: MoveLogProps) {
  const listRef = useRef<HTMLOListElement>(null);

  // The window is a fixed height, so the newest move is the one off the bottom.
  // Follow it: what a player wants to see is what just happened, not the
  // opening of a game they have been playing for twenty turns.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="move-log is-empty" aria-label="Move log">
        <p className="move-log-blank">Moves appear here as the game unfolds.</p>
      </div>
    );
  }

  return (
    <div className="move-log" aria-label="Move log">
      <ol className="move-log-list" ref={listRef}>
        {entries.map((entry, i) => (
          <li
            key={i}
            className={`move-log-entry ${entry.player ? `is-${entry.player.toLowerCase()}` : 'is-system'} ${entry.system ? 'is-system' : ''}`}
          >
            {!entry.system && entry.name && (
              <span className="move-log-seat">{entry.name}</span>
            )}
            <MoveLogText entry={entry} />
          </li>
        ))}
      </ol>
    </div>
  );
}

export default MoveLog;

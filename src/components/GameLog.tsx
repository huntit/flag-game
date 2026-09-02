// The Game Log: a fixed window onto a growing list, sitting under the score
// cards and above the market.
//
// It does not open and close. A disclosure earns its arrow when the thing
// behind it is optional and costs space when open — this costs the same space
// either way, because its height is fixed by the shell rather than by how many
// moves have been played. So the arrow would only ever offer to leave a hole
// in the column. The heading stays, because the panel still needs naming.

import MoveLog, { type MoveLogEntry } from './MoveLog';
import './GameLog.css';

interface GameLogProps {
  entries: MoveLogEntry[];
}

function GameLog({ entries }: GameLogProps) {
  return (
    <aside className="game-log-panel" aria-label="Game log">
      <h2 className="game-log-heading">Game Log</h2>
      <div className="game-log-body">
        <MoveLog entries={entries} />
      </div>
    </aside>
  );
}

export default GameLog;

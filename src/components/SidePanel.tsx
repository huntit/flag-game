// Collapsible RHS panel for desktop move log (pointer:fine + min-width 900 only).

import { useState } from 'react';
import MoveLog, { type MoveLogEntry } from './MoveLog';
import './SidePanel.css';

interface SidePanelProps {
  entries: MoveLogEntry[];
}

function SidePanel({ entries }: SidePanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <aside
      className={`side-panel ${expanded ? 'is-expanded' : 'is-collapsed'}`}
      aria-label="Game extras"
    >
      <button
        type="button"
        className="side-panel-toggle"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-controls="side-panel-log"
      >
        {expanded ? 'Hide log' : 'Log'}
      </button>
      <div id="side-panel-log" className="side-panel-body">
        <MoveLog entries={entries} />
      </div>
    </aside>
  );
}

export default SidePanel;

// Desktop move log. It opens and closes with a standard disclosure — a titled
// header row with a chevron — rather than a shouty LOG / HIDE LOG button.

import { useState } from 'react';
import MoveLog, { type MoveLogEntry } from './MoveLog';
import './SidePanel.css';

interface SidePanelProps {
  entries: MoveLogEntry[];
}

function Chevron() {
  return (
    <svg className="disclosure-chevron" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 3.5 10.5 8 6 12.5"
      />
    </svg>
  );
}

function SidePanel({ entries }: SidePanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <aside
      className={`side-panel ${expanded ? 'is-expanded' : 'is-collapsed'}`}
      aria-label="Game extras"
    >
      <section className="disclosure">
        <h2 className="disclosure-heading">
          <button
            type="button"
            className="disclosure-toggle"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-controls="side-panel-log"
          >
            <Chevron />
            <span className="disclosure-title">Move log</span>
          </button>
        </h2>
        <div id="side-panel-log" className="disclosure-body" hidden={!expanded}>
          <MoveLog entries={entries} />
        </div>
      </section>
    </aside>
  );
}

export default SidePanel;

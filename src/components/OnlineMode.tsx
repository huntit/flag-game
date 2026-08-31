// Online mode component (placeholder for Remote 2P)

import './OnlineMode.css';

interface OnlineModeProps {
  onBackToMenu: () => void;
}

function OnlineMode({ onBackToMenu }: OnlineModeProps) {
  return (
    <div className="online-mode">
      <div className="online-content">
        <h1>Remote 2-Player</h1>
        
        <div className="online-info">
          <p>
            <strong>Status:</strong> Implementation complete, deployment pending
          </p>
          <p>
            Remote multiplayer uses PartyKit (Cloudflare Durable Objects) for engine-authoritative gameplay with secret seat links.
          </p>
          <p>
            <strong>Features:</strong>
          </p>
          <ul>
            <li>Persistent game links (games survive disconnects)</li>
            <li>Secret unguessable seat tokens</li>
            <li>Engine-authoritative validation</li>
            <li>Opponent racks hidden</li>
            <li>Works for both live and correspondence play</li>
          </ul>
          <p>
            <strong>Note:</strong> Deployment requires Cloudflare account and PartyKit setup. Peter will handle hosting and DNS configuration.
          </p>
        </div>

        <button className="back-button-large" onClick={onBackToMenu}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}

export default OnlineMode;

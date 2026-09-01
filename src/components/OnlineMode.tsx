// Remote 2-player. The room (src/server/index.ts) is engine-authoritative and
// persistent; it needs a PartyKit deployment before this screen can hand out
// links, which is Peter's hosting step rather than a code change.

import './OnlineMode.css';

interface OnlineModeProps {
  onHome: () => void;
}

function OnlineMode({ onHome }: OnlineModeProps) {
  return (
    <div className="screen">
      <div className="screen-panel online-panel">
        <div className="online-head">
          <a className="online-logo" href="/flag-game/" onClick={e => { e.preventDefault(); onHome(); }} aria-label="Flag home">
            <img src={`${import.meta.env.BASE_URL}logo-header.png`} alt="Flag" className="online-logo-img" />
          </a>
          <h1>Remote 2-player</h1>
        </div>

        <div className="online-body">
          <p>
            Live and correspondence are the same mode: a persistent game link with a secret token
            per seat, so either player can come back days later on any device without an account.
          </p>
          <p>
            The room runs the same rules engine as this build and keeps the snapshot in storage, so
            a closed tab is never treated as a pass. Rack <strong>counts</strong> are public; rack{' '}
            <strong>letters</strong> are not.
          </p>
          <p className="online-status">
            Waiting on the PartyKit deployment. Solo and Hotseat play now.
          </p>
        </div>

      </div>
    </div>
  );
}

export default OnlineMode;

// Hotseat handover. Nothing from the incoming player's game is on screen behind
// this, so the outgoing player cannot glimpse the next rack.

import { SEAT_COLOR_NAMES } from '../engine/types';
import './PassThePhone.css';

interface PassThePhoneProps {
  seat: 'P1' | 'P2';
  onContinue: () => void;
}

function PassThePhone({ seat, onContinue }: PassThePhoneProps) {
  return (
    <div className={`screen handover is-${seat.toLowerCase()}`}>
      <div className="screen-panel">
        <p className="handover-kicker">Pass the phone</p>
        <h1 className="handover-seat">{SEAT_COLOR_NAMES[seat]}&apos;s turn</h1>
        <p className="handover-note">Hand the device over, then tap Ready.</p>
        <button type="button" className="control control-solid handover-button" onClick={onContinue}>
          Ready
        </button>
      </div>
    </div>
  );
}

export default PassThePhone;

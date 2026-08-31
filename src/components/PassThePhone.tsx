// PassThePhone component for hotseat mode

import './PassThePhone.css';

interface PassThePhoneProps {
  currentPlayer: 'P1' | 'P2';
  onContinue: () => void;
}

function PassThePhone({ currentPlayer, onContinue }: PassThePhoneProps) {
  return (
    <div className="pass-the-phone">
      <div className="pass-the-phone-content">
        <h2 className="pass-the-phone-title">Pass the Phone</h2>
        <p className="pass-the-phone-text">
          It's {currentPlayer}'s turn
        </p>
        <p className="pass-the-phone-instruction">
          Hand the device to the next player
        </p>
        <button className="pass-the-phone-button" onClick={onContinue}>
          Ready
        </button>
      </div>
    </div>
  );
}

export default PassThePhone;

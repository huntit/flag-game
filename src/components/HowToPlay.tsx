// How to Play. A short rules card reachable from the menu, so a new player
// does not have to be told the game out loud.
//
// Every number here is read off the rule set the device will actually deal,
// so the 9x9 phone game and the 11x11 large game each describe themselves
// rather than sharing one set of hard-coded figures that would be wrong for
// one of them.

import type { RuleSet } from '../engine/variants';
import { centreStar, marketSlots } from '../engine/variants';
import { SEAT_COLOR_NAMES } from '../engine/types';
import { SeatMark } from './SeatMark';
import HomeLink from './HomeLink';
import './HowToPlay.css';

interface HowToPlayProps {
  rules: RuleSet;
  onBack: () => void;
}

function HowToPlay({ rules, onBack }: HowToPlayProps) {
  const { boardSize, rackMax, marketFaceUp, marketFaceDown } = rules;
  const centre = centreStar(boardSize);

  return (
    <div className="screen how-to-play">
      <div className="screen-panel htp-panel">
        <header className="htp-head">
          <HomeLink variant="menu" onNavigate={onBack} />
          <h1 className="htp-title">How to Play</h1>
        </header>

        <div className="htp-body">
          <section className="htp-section">
            <h2>The idea</h2>
            <p>
              Two players build crossword words on a {boardSize}×{boardSize} board. Each
              player owns one corner — their <strong>flag</strong>. Covering a flag scores
              triple word for whoever covers it, and can end the game. Highest score wins.
            </p>
          </section>

          <section className="htp-section">
            <h2>Who is who</h2>
            <p className="htp-seats">
              {(['P1', 'P2'] as const).map(seat => (
                <span key={seat} className={`htp-seat is-${seat.toLowerCase()}`}>
                  <SeatMark seat={seat} />
                  {SEAT_COLOR_NAMES[seat]}
                </span>
              ))}
            </p>
            <p>
              Your mark and colour appear in three places: your score card, the left end of
              your rack, and your goal corner. The corner wearing your mark is the one you
              are aiming at.
            </p>
          </section>

          <section className="htp-section">
            <h2>Your turn: draw or play</h2>
            <p>
              Each turn you do exactly one of these — never both.
            </p>
            <ul>
              <li>
                <strong>Draw 2</strong> — take two tiles from the market of{' '}
                {marketSlots(rules)} ({marketFaceUp} face up, {marketFaceDown} face down).
                Your rack holds {rackMax}; drawing past that makes you put tiles back.
              </li>
              <li>
                <strong>Play</strong> — lay tiles in one line to make a word. Everything
                they touch must read as a word too. Playing does not refill your rack.
              </li>
            </ul>
            <p className="htp-note">
              Shuffle only reorders your own tiles. It is not a turn.
            </p>
          </section>

          <section className="htp-section">
            <h2>The first word</h2>
            <p>
              The opening word must cover the centre star at ({centre.row},{centre.col}).
              After that, every word must touch what is already on the board.
            </p>
          </section>

          <section className="htp-section">
            <h2>Flags, and how the game ends</h2>
            <ul>
              <li>
                <strong>Cover your own flag</strong> — triple word on that word, and the
                game ends at once. Worth it if you are ahead.
              </li>
              <li>
                <strong>Cover your opponent's flag</strong> — triple word, and their flag
                moves to a spare empty corner. Take their second flag and the game ends.
              </li>
              <li>
                The game also ends if someone plays out their last tile with the bag and
                market empty, or if play stalls.
              </li>
            </ul>
            <p className="htp-note">
              When a flag ends the game, the player who ended it adds the value of the
              tiles still on the other rack, and the other player loses the same.
            </p>
          </section>

          <section className="htp-section">
            <h2>Scoring</h2>
            <p>
              A word scores its letters. There are no premium squares on the grid and no
              bonus for using every tile — the flags are the only multipliers.
            </p>
          </section>
        </div>

        <button type="button" className="menu-button is-primary htp-back" onClick={onBack}>
          Back to menu
        </button>
      </div>
    </div>
  );
}

export default HowToPlay;

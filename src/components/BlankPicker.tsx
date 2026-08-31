// Letter picker for a blank. A blank scores 0 but must be assigned a letter,
// which is what the dictionary then validates.

import type { Letter } from '../engine/types';
import './BlankPicker.css';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') as Letter[];

interface BlankPickerProps {
  onPick: (letter: Letter) => void;
  onCancel: () => void;
}

function BlankPicker({ onPick, onCancel }: BlankPickerProps) {
  return (
    <div className="blank-picker" role="dialog" aria-label="Choose a letter for the blank">
      <div className="blank-picker-panel">
        <p className="blank-picker-title">Blank stands for…</p>
        <div className="blank-picker-grid">
          {ALPHABET.map(letter => (
            <button type="button" key={letter} className="blank-picker-key" onClick={() => onPick(letter)}>
              {letter}
            </button>
          ))}
        </div>
        <button type="button" className="blank-picker-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default BlankPicker;

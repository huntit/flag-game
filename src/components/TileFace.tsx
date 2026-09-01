// Shared tile face: SVG text so letters stay crisp at every cell size.
// WWF-style point value is top-right (never Scrabble bottom-right).

interface TileFaceProps {
  letter: string | null;
  value: number;
  /** True only when the tile is an unassigned blank (rack / market). Assigned board blanks show their letter. */
  isBlank?: boolean;
}

export function TileFace({ letter, value, isBlank }: TileFaceProps) {
  const hasLetter = Boolean(letter && letter !== '?');
  const displayLetter = hasLetter ? letter! : isBlank ? '★' : (letter ?? '');

  return (
    <svg className="tile-face" viewBox="0 0 100 100" aria-hidden="true">
      <text className="tile-letter" x="46" y="66" textAnchor="middle">
        {displayLetter}
      </text>
      <text className="tile-value" x="90" y="22" textAnchor="end">
        {value}
      </text>
    </svg>
  );
}

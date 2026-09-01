// Shared tile face: centred letter, WWF-style point value top-right (never Scrabble bottom-right).

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
    <>
      <span className="tile-letter">{displayLetter}</span>
      <span className="tile-value">{value}</span>
    </>
  );
}

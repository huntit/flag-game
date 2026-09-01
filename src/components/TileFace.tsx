// Shared tile face: centred letter, WWF-style point value top-right (never Scrabble bottom-right).

interface TileFaceProps {
  letter: string | null;
  value: number;
  isBlank?: boolean;
}

export function TileFace({ letter, value, isBlank }: TileFaceProps) {
  const displayLetter = isBlank ? '★' : (letter ?? '');

  return (
    <>
      <span className="tile-letter">{displayLetter}</span>
      <span className="tile-value">{value}</span>
    </>
  );
}

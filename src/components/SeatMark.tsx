// The seat symbol: a shape that says which player something belongs to.
//
// Colour alone was doing this job, and it was not enough — on the board you
// could not tell at a glance which of two coloured corners was the one you
// were aiming at. A shape reads faster than a hue, survives the two seat
// colours sitting far apart on the screen, and still works for a player who
// cannot separate teal from terracotta.
//
// The same mark appears on your score card, at the head of your rack, and on
// your goal square, which is what ties the three together.

export type Seat = 'P1' | 'P2';

/** Circle for the first seat, diamond for the second. */
export const SEAT_SHAPES: Record<Seat, 'circle' | 'diamond'> = {
  P1: 'circle',
  P2: 'diamond',
};

interface SeatMarkProps {
  seat: Seat;
  /** Extra classes; colour comes from currentColor so CSS owns the palette. */
  className?: string;
  /** Hollow until the seat is the one to play, matching the old turn dot. */
  filled?: boolean;
  title?: string;
}

// Drawn in a 24×24 box. The diamond is sized to carry the same visual weight
// as the circle rather than the same bounding box — a square on its corner
// looks smaller than a circle of the same width.
const PATHS: Record<'circle' | 'diamond', string> = {
  circle: 'M12 2.6 A9.4 9.4 0 1 1 11.99 2.6 Z',
  diamond: 'M12 1.6 L22.4 12 L12 22.4 L1.6 12 Z',
};

export function SeatMark({ seat, className, filled = true, title }: SeatMarkProps) {
  const shape = SEAT_SHAPES[seat];

  return (
    <svg
      className={['seat-mark', `is-${shape}`, filled ? 'is-filled' : 'is-hollow', className]
        .filter(Boolean)
        .join(' ')}
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[shape]} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default SeatMark;

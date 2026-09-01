// Seat avatars — Skye placeholders until painted files replace these SVGs.
// Human vs Hunter-style AI; colour comes from the p1/p2 asset.

const base = import.meta.env.BASE_URL;

export type AvatarKind = 'human' | 'ai';

interface PlayerAvatarProps {
  kind: AvatarKind;
  playerColor: 'P1' | 'P2';
  name: string;
}

export function PlayerAvatar({ kind, playerColor, name }: PlayerAvatarProps) {
  const seat = playerColor.toLowerCase();
  const file = kind === 'ai' ? `avatar-hunter-${seat}.svg` : `avatar-human-${seat}.svg`;

  return (
    <img
      className={`player-avatar is-${seat} is-${kind}`}
      src={`${base}${file}`}
      alt=""
      aria-label={name}
      width={64}
      height={64}
    />
  );
}

// Which shell the play screen is in, and therefore which rule set a new game
// is dealt with.
//
// These are media queries, not user-agent tests. The large shell is claimed by
// two kinds of window: a wide fine-pointer desktop window, and a tablet, which
// is coarse-pointer but roomy in BOTH orientations. The second half is written
// as min-width AND min-height on purpose — a phone in landscape is wide (a
// 16 Pro Max is 932pt across) but never 700pt tall, so a width-only query
// would hand a phone an 11×11 board the moment it was turned sideways.
//
// Game.css is gated on the same two queries, so the CSS and the rule set can
// never disagree about which shell is up.

import { useEffect, useState } from 'react';
import type { RuleSet } from '../engine/variants';
import { PHONE_9, TABLET_11 } from '../engine/variants';

/** Shortest side a tablet must have, in CSS pixels, to earn the big board. */
export const LARGE_SHELL_MIN = 700;

export const DESKTOP_QUERY = '(min-width: 900px) and (pointer: fine)';
export const TABLET_QUERY = `(min-width: ${LARGE_SHELL_MIN}px) and (min-height: ${LARGE_SHELL_MIN}px)`;

/** Desktop windows and tablets both get the two-column shell and the 11×11 board. */
export const LARGE_SHELL_QUERY = `${DESKTOP_QUERY}, ${TABLET_QUERY}`;

function matches(query: string): boolean {
  return typeof window !== 'undefined' && window.matchMedia(query).matches;
}

function useMediaQuery(query: string): boolean {
  const [active, setActive] = useState(() => matches(query));

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setActive(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return active;
}

/** True while the two-column shell is up: a wide desktop window, or a tablet. */
export function useLargeShell(): boolean {
  return useMediaQuery(LARGE_SHELL_QUERY);
}

/** True only on the desktop shell — a tablet in landscape arranges itself differently. */
export function useDesktopLayout(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}

export function ruleSetForShell(large: boolean): RuleSet {
  return large ? TABLET_11 : PHONE_9;
}

/**
 * Whether this device could show the big board at all, whatever its window is
 * doing right now. The dictionary is loaded once, before any game exists, and
 * an 11×11 game needs the 10- and 11-letter words a 9×9 game can never use —
 * so the question is about the device, not the current viewport. A desktop
 * window can always be widened again, and a tablet in split view can always be
 * made full-screen, so both load the long words; a phone never can (its screen
 * is under 700pt on the short side however it is held) and keeps the smaller
 * heap the in-place dictionary index was built for.
 */
export function deviceSupportsLargeBoard(): boolean {
  if (typeof window === 'undefined') return true;
  if (matches('(pointer: fine)')) return true;
  const { width, height } = window.screen;
  return Math.min(width, height) >= LARGE_SHELL_MIN;
}

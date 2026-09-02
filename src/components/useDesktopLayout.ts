// True when the desktop shell is in force.
//
// Layout is CSS's job almost everywhere in this game, and this hook watches the
// exact same query the desktop rules in Game.css are gated on. It exists for the
// one thing CSS cannot do: Draw 2 belongs beside the market, and on desktop the
// market moves to the other column. Rendering the button twice and hiding one
// would put a second identical control in the accessibility tree, so the button
// is rendered once, in the column it belongs to.
//
// Note this is a media query, not a user-agent test — a narrow desktop window
// and a tablet both get the phone shell, which is the intent.

import { useEffect, useState } from 'react';

export const DESKTOP_QUERY = '(min-width: 900px) and (pointer: fine)';

export function useDesktopLayout(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches
  );

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

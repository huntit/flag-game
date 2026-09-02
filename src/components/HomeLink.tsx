// Word Heist 05e stacked lockup — 2×2 + WORD over HEIST. Vector SVG, PNG fallback.

import './HomeLink.css';

interface HomeLinkProps {
  variant: 'menu' | 'hud' | 'online' | 'play';
  onNavigate?: () => void;
}

const base = import.meta.env.BASE_URL;

function HomeLink({ variant, onNavigate }: HomeLinkProps) {
  return (
    <a
      className={`home-link is-${variant}`}
      href="/flag-game/"
      onClick={e => {
        if (onNavigate) {
          e.preventDefault();
          onNavigate();
        }
      }}
      aria-label="Word Heist home"
    >
      <picture>
        <source srcSet={`${base}05e-geometric-2x2-lockup-stacked.svg`} type="image/svg+xml" />
        <img
          src={`${base}05e-geometric-2x2-lockup-stacked.png`}
          srcSet={`${base}05e-geometric-2x2-lockup-stacked.png 1x, ${base}05e-geometric-2x2-lockup-stacked@2x.png 2x`}
          alt="Word Heist"
          className="home-link-img"
          width={1007}
          height={360}
        />
      </picture>
    </a>
  );
}

export default HomeLink;

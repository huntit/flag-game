// Word Heist 05f stacked lockup — 2×2 + title-case Word over Heist.

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
      href="/wordheist-game/"
      onClick={e => {
        if (onNavigate) {
          e.preventDefault();
          onNavigate();
        }
      }}
      aria-label="Word Heist home"
    >
      <picture>
        <source srcSet={`${base}05f-geometric-2x2-lockup-stacked.svg`} type="image/svg+xml" />
        <img
          src={`${base}05f-geometric-2x2-lockup-stacked.png`}
          srcSet={`${base}05f-geometric-2x2-lockup-stacked.png 1x, ${base}05f-geometric-2x2-lockup-stacked@2x.png 2x`}
          alt="Word Heist"
          className="home-link-img"
          width={690}
          height={360}
        />
      </picture>
    </a>
  );
}

export default HomeLink;

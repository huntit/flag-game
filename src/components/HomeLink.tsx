// Skye v3 wordmark home link — vector SVG, PNG fallback (never upscale a tiny bitmap).

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
      aria-label="Flag home"
    >
      <picture>
        <source srcSet={`${base}logo-header.svg`} type="image/svg+xml" />
        <img
          src={`${base}logo-header.png`}
          alt="Flag"
          className="home-link-img"
          width={1145}
          height={236}
        />
      </picture>
    </a>
  );
}

export default HomeLink;

// Skye v2 2-band pennant wordmark (logo-header.png) as the home link.

import './HomeLink.css';

interface HomeLinkProps {
  variant: 'menu' | 'hud' | 'online';
  onNavigate?: () => void;
}

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
      <img
        src={`${import.meta.env.BASE_URL}logo-header.png`}
        alt="Flag"
        className="home-link-img"
      />
    </a>
  );
}

export default HomeLink;

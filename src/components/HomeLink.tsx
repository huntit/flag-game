// Text FLAG home link until Skye ships the 2-band wordmark assets.

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
      <span className="home-link-mark" aria-hidden="true" />
      <span className="home-link-word">FLAG</span>
    </a>
  );
}

export default HomeLink;

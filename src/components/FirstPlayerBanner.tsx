// One-line banner before the first action.

import './FirstPlayerBanner.css';

interface FirstPlayerBannerProps {
  text: string;
}

function FirstPlayerBanner({ text }: FirstPlayerBannerProps) {
  return (
    <div className="first-player-banner" role="status" aria-live="polite">
      {text}
    </div>
  );
}

export default FirstPlayerBanner;

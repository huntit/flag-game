# Flag v0 - Development & Deployment Guide

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run headless simulation
npm run sim -- --games 100 --p1 greedy --p2 hunter --out ./out
```

## Local Development

Development server runs at `http://localhost:5173`

The game is phone-first and optimized for iPhone Safari, but works on desktop browsers too.

Tap-to-place must keep working on the 9×9 board on iPhone Safari (smaller cells are OK). Dragging is additive, never a replacement, and is built on **pointer events only** — HTML5 `dragstart` never fires on touch, so it is banned outright (`src/components/useTileDrag.ts`, locked by `layout.test.ts`).

## Deployment

### GitHub Pages (live)

This is what actually ships. Pushing to `main` runs `.github/workflows/deploy.yml`,
which typechecks, runs unit tests, builds, checks the bundle is base-path correct,
and then publishes `dist` to the `gh-pages` branch — the Pages source for this repo.

Live at https://huntit.github.io/flag-game/. There is nothing to run by hand: merge
to `main` and the deploy follows.

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Or deploy to production
vercel --prod
```

### Cloudflare Pages

1. Connect GitHub repository in Cloudflare Pages dashboard
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Deploy

### Environment Variables

No environment variables required for v0. The word list is **not** bundled: it ships
as a static asset and is fetched at runtime from `data/words.txt` (see Dictionary
memory below).

## PartyKit (Remote Multiplayer)

Remote 2P infrastructure is implemented but requires deployment:

```bash
# Install PartyKit CLI
npm install -g partykit

# Deploy PartyKit server
partykit deploy
```

Configure the PartyKit URL in the app after deployment.

## flag-sim CLI

Run headless AI vs AI simulations for game balance analysis:

```bash
# Basic usage
npm run sim -- --games 200 --p1 greedy --p2 hunter

# Custom threshold
npm run sim -- --games 100 --p1 sleeper --p2 hunter --threshold 10

# Custom output directory
npm run sim -- --games 500 --p1 greedy --p2 greedy --out ./analysis

# With seed for reproducibility
npm run sim -- --games 100 --p1 hunter --p2 sleeper --seed 42
```

### Output

- `games.jsonl` - One JSON object per line with detailed game stats
- `summary.json` - Aggregate statistics across all games

### CLI Options

- `--games <n>` - Number of games to simulate (default: 100)
- `--p1 <personality>` - Player 1 AI: greedy, hunter, or sleeper (default: greedy)
- `--p2 <personality>` - Player 2 AI: greedy, hunter, or sleeper (default: greedy)
- `--threshold <n>` - Draw threshold for AI (default: 8)
- `--seed <n>` - Random seed for reproducibility
- `--out <dir>` - Output directory (default: ./out)
- `--no-swap` - Don't swap player positions between games

## Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm run test src/engine/engine.test.ts
```

## Architecture

### Engine (`src/engine/`)
- `types.ts` - Core game types
- `game.ts` - Game initialization and utilities
- `dictionary.ts` - Word validation
- `validator.ts` - Move validation and word formation
- `moveGenerator.ts` - Legal play generation
- `actions.ts` - Game action execution (draw, play, pass)
- `ai.ts` - AI personalities (Greedy, Hunter, Sleeper)

### UI (`src/components/`)
- `Menu.tsx` - Main menu
- `Game.tsx` - Game orchestration
- `Board.tsx` - 9×9 board display, incl. the per-player triple-word goal corners
- `Rack.tsx` - Player tile rack
- `Market.tsx` - Market row: 5 slots (3 face up, then 2 face down) plus the bag
- `GameInfo.tsx` - Score card: name, score, and a mini-rack of tile backs
- `useTileDrag.ts` - Pointer-event dragging (rack reorder, drag to board)
- `SidePanel.tsx` / `MoveLog.tsx` - Move log and its disclosure
- `BlankPicker.tsx` - Letter picker for a blank
- `GameOverOverlay.tsx` - End game overlay
- `PassThePhone.tsx` - Hotseat interstitial
- `HomeLink.tsx` - Wordmark home link

### App-level (`src/`)
- `gameSetup.ts` - Seat assignment and first-player banners
- `moveLog.ts` - Move-log copy, testable without React

### Server (`src/server/`)
- `index.ts` - PartyKit Durable Object for remote multiplayer

### CLI (`src/cli/`)
- `flag-sim.ts` - Headless simulation tool

## Layout and UI notes

- **One tile size.** `--tile-size` in `Game.css` is the largest square that fits
  both the rack (7 across) and the market (6 across beside the bag), and is capped
  against a board cell. Rack and market read from the same variable so a tile looks
  like the same object wherever it sits.
- **Board sizing.** The board is sized from leftover viewport space, then every row
  is pinned to `--board-size` so the whole column shares one left and right edge. On
  phones the board runs to the screen edges; only the actions row insets itself. On a
  short phone the board is limited by the height the chrome rows leave behind, not by
  screen width, so the *lower* bounds of those clamps matter as much as the upper ones.
- **Seat identity.** A player is their name in their own colour — no avatars. One fill
  per seat (`--seat-card-bg-p1/p2`) is shared by their score card and their rack, so
  the rack reads as an extension of the card.
- **Rack vs market.** Rack tiles stand in a tinted rail and cast a shadow; market
  tiles lie flat on the bare page with no tray. Held versus on the table is the whole
  distinction, and it carries no caption.
- **Scores.** Every score in the game uses `--color-score` and the `.score-value`
  class: score cards, the play preview, the move log, the final result. Plays read
  "ABHORS + AD + BO + HE for 22", never "+22".
- **Buttons.** One family in `App.css`: `.control` plus `.control-solid` /
  `.control-outline` / `.control-round`. Consumers set `--ctl-h` to size it.

## Dictionary memory

The word list is the single biggest allocation in the app, and on iOS a memory spike
is what gets a backgrounded Safari tab discarded mid-game.

`Dictionary` does **not** keep 143k JavaScript strings. It indexes the fetched text in
place: the blob as-is, plus offsets in a `Uint32Array` and lengths in a `Uint8Array`.
Lookups compare characters against the blob rather than materialising words.

Measured in Chrome at an iPhone viewport:

| | peak heap | steady in-play |
|---|---|---|
| split → Set → sorted `string[]` | 26.3 MB | ~18 MB |
| in-place index | 9.5 MB | ~8.2 MB |

`data/words.txt` is already sorted, unique, uppercase and A–Z only, so a single scan is
the whole job — but nothing assumes it. The scan verifies as it goes and falls back to
normalising if the list ever changes. `dictionary.test.ts` asserts the real file still
takes the fast path: a silent fall back would cost the whole saving and nothing else
would notice.

**If you regenerate `data/words.txt`, keep it sorted, unique and uppercase.**

## Verification

Unit tests cover the engine and lock layout intent from the source. Anything that only
shows up in a real browser has a script instead — each starts a game and measures the
live DOM. Run them against a preview server (`npm run preview`):

```bash
npm run verify:layout    # geometry at 6 real device viewports; no overflow, no scroll
npm run verify:play      # a full legal play through the UI
npm run verify:drag      # rack reorder precision, mid-drag geometry, real touch drags
npm run verify:hotseat   # seat handover, no letter leaks between players
npm run verify:modes     # every menu mode opens and is playable
```

## Data Files

- `data/tiles.json` - WWF English tile bag (104 tiles, 2 blanks) + Word Eagle values
- `data/words.txt` - Custom ENABLE-based word list (175,030 words; load length 2–11 for v0, do not shrink the file)

## Tech Stack

- **Framework**: Vite + React + TypeScript
- **Styling**: Vanilla CSS with CSS variables
- **Testing**: Vitest, plus Playwright verification scripts
- **Multiplayer**: PartyKit (Cloudflare Durable Objects)
- **Deployment**: GitHub Pages via Actions (`gh-pages` branch)
- **CLI Runtime**: Node.js + tsx

## Browser Support

Optimized for:
- iPhone Safari (primary target)
- Desktop Safari, Chrome, Firefox, Edge

Tap-to-place works everywhere. Dragging — rack reordering, and dragging a tile onto
the board — is pointer-event based, so mouse, touch and pen take one code path and it
works on iPhone Safari. HTML5 drag-and-drop is not used anywhere.

## Contributing

See [docs/prototype-spec.md](docs/prototype-spec.md) for the complete technical specification.

## License

Private repository. No license yet.

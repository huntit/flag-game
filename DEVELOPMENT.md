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

## Deployment

### Vercel (Recommended)

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

No environment variables required for v0. The dictionary is bundled at build time.

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
- `Board.tsx` - 9×9 board display
- `Rack.tsx` - Player tile rack
- `Market.tsx` - 4-tile market display
- `GameInfo.tsx` - Score and game state
- `GameOverOverlay.tsx` - End game overlay
- `PassThePhone.tsx` - Hotseat interstitial

### Server (`src/server/`)
- `index.ts` - PartyKit Durable Object for remote multiplayer

### CLI (`src/cli/`)
- `flag-sim.ts` - Headless simulation tool

## Data Files

- `data/tiles.json` - WWF English tile bag (104 tiles, 2 blanks) + Word Eagle values
- `data/words.txt` - Custom ENABLE-based word list (175,030 words, filtered to 2-9 for v0)

## Tech Stack

- **Framework**: Vite + React + TypeScript
- **Styling**: Vanilla CSS with CSS variables
- **Testing**: Vitest
- **Multiplayer**: PartyKit (Cloudflare Durable Objects)
- **Deployment**: Vercel / Cloudflare Pages
- **CLI Runtime**: Node.js + tsx

## Browser Support

Optimized for:
- iPhone Safari (primary target)
- Desktop Safari, Chrome, Firefox, Edge

Touch-friendly tap-to-place interaction (no drag-and-drop on mobile).

## Contributing

See [docs/prototype-spec.md](docs/prototype-spec.md) for the complete technical specification.

## License

Private repository. No license yet.

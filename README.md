# Flag

**Working title** — Private prototype repository

A two-player word game combining crossword mechanics with a six-tile market (four face-up, two face-down) and per-player corner flags. Both players start with two tiles from the bag. Players build a rack by drawing exactly two tiles from the market, then spend those tiles to form words on an 11×11 crossword grid (odd size so there is a centre cell). Each player has a coloured flag on a true corner; covering flags applies triple-word or double-word multipliers and can end the game. Highest score wins.

## Status

v0 playable prototype. Solo vs Hunter/Greedy/Sleeper and Hotseat play now; Remote 2-player is engine-complete but waiting on a PartyKit deployment.

**Play it:** https://huntit.github.io/flag-game/ — built for iPhone Safari, Add to Home Screen for the feel-test.

**Stack:** Phone-first static web app (Vite + React + TypeScript, iPhone Safari as primary target). 11×11 stays tap-to-place on iPhone Safari (smaller cells are OK; do not switch to desktop drag). The play screen fits the visual viewport with no vertical scrolling — see [prototype-spec.md](docs/prototype-spec.md) section 10.

```bash
npm install
npm run dev          # local dev server
npx vitest run       # unit tests
npm run build        # production build into dist/
npm run sim -- --games 200 --p1 greedy --p2 hunter --seed 1 --out ./out
```

**Data files:**
- ✅ Word list available at `data/words.txt` (175,030 words from Word Eagle)
- ✅ Tile set available at `data/tiles.json` (WWF English bag: 104 tiles, 2 blanks + Word Eagle WWF values)

## Documentation

- [How to Play](docs/how-to-play.md) — Human-readable rules for v0
- [Prototype Specification](docs/prototype-spec.md) — Technical build spec for Ada
- [Assets](docs/assets.md) — Word list ✅, tile set ✅ (WWF English bag + Word Eagle values)
- [Cloudflare Pages + GitHub autodeploy](docs/cloudflare-pages.md) — Hosting setup walkthrough

## Distinctiveness

Flag is a distinct game, not a variant of commercial crossword products:

- **Custom dictionary and tile set** — Flag uses Peter's custom ENABLE-based word list and the WWF English bag (104 tiles) paired with Word Eagle's WWF letter values, not third-party crossword publisher data
- **11×11 board with no premium squares** — Odd size so there is a centre cell (6,6). Not 10×10. Simple grid, no double/triple letter or word scores on the board
- **Two opening tiles from the bag** — Each player starts with 2 tiles dealt from the bag (not from the market, not a full 7). First action may be Draw or Play
- **Draw XOR Play** — Draw exactly 2 tiles from a 6-tile market (4 face-up + 2 face-down) OR play tiles to score; playing does not refill your rack
- **Per-player corner flags** — Each player has a flag on a true corner; own-flag capture is triple-word and ends the game; opponent steals apply double-word and can end on a second steal
- **Public rack count, hidden letters** — Opponent (and AI) rack letters stay hidden; tile count is public as 0–7 facedown backs with empty slots plus a readable count number

The crossword-on-a-grid mechanic is shared with games like Scrabble and Words With Friends, but Flag's six-tile market, two-tile bag opening, per-player flag scoring, and custom tile set make it a different game.

## Playtesting

The prototype supports three modes plus the lab:

- **Solo vs Hunter** — Play against Greedy, Hunter, or Sleeper personality locally (no room server)
- **Hotseat** — Two players on one device (local, no room)
- **Remote 2-player** — Persistent game links (live and correspondence, same mode). Host creates a game and gets a P2 invite link. Secret unguessable seat tokens. No accounts. Games persist across disconnects and days. Transport: PartyKit (Cloudflare Durable Objects).
- **Lab simulation** — Headless AI vs AI matchups for game balance analysis (`flag-sim --games 200 --p1 greedy --p2 hunter`)

**Build readiness:**
- ✅ Word list available (`data/words.txt`)
- ✅ Tile set available (`data/tiles.json` — WWF English bag: 104 tiles, 2 blanks + Word Eagle WWF values)

## Team

- **Design** — Finch
- **Prototype build** — Ada
- **Art** — Skye
- **Marketing** — Cleo
- **Owner** — Peter Hunt ([github.com/huntit](https://github.com/huntit))

## Prior Work

Peter's other game [Word Eagle](https://www.huntit.com.au/apps/wordgame/) ([source](https://github.com/huntit/web-apps/tree/main/wordgame)) already implements the custom word list and tile set that Flag will use. Ada may reuse UI ideas (tile rack, drag-and-drop, definition lookup) but should not copy Word Eagle code for v0.

## Archive

Earlier Google Drive copies (repo is now source of truth):

- [Drive folder](https://drive.google.com/drive/folders/1skSqLrI4lSrzkskmsIq5-Tm_hxGULs0t)
- [How to Play (Google Doc)](https://docs.google.com/document/d/1-ZFjE2EZGdYqpILMd8chPZzAAPWF10ScC18IfuG0rCU/edit)
- [Prototype Spec (Google Doc)](https://docs.google.com/document/d/1Q6kq_IFX7HX4kG35uxUY7W_bfS3gGtGSJqb1PNSWlE0/edit)

## License

None yet. Private repository.

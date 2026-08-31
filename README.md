# Flag

**Working title** — Private prototype repository

A two-player word game combining crossword mechanics with a shared tile market and rotating capture-the-flag endgame. Players build a rack by drawing from a market of four face-up tiles, then spend those tiles to form words on a 9×9 crossword grid. A flag rotates clockwise through four corner posts; cover the live flag post to end the game. Highest score wins.

## Status

Documentation for v0 playable slice. No implementation yet. Ada will build from the prototype specification. Three play modes: Solo vs Hunter (local), Hotseat (local), and Remote 2-player (persistent game links via PartyKit).

**Stack:** Phone-first static web app (Vite + React + TypeScript, Vercel hosting, iPhone Safari as primary target)

**Data files:**
- ✅ Word list available at `data/words.txt` (175,030 words from Word Eagle)
<<<<<<< HEAD
- ✅ Tile data at `data/tiles.json` (Words With Friends bag: 104 tiles, 2 blanks)
=======
- ✅ Tile set available at `data/tiles.json` (WWF English bag: 104 tiles, 2 blanks + Word Eagle WWF values)
>>>>>>> origin/main

## Documentation

- [How to Play](docs/how-to-play.md) — Human-readable rules for v0
- [Prototype Specification](docs/prototype-spec.md) — Technical build spec for Ada
<<<<<<< HEAD
- [Assets](docs/assets.md) — Word list and tile data ✅ (from Peter's Word Eagle)
=======
- [Assets](docs/assets.md) — Word list ✅, tile set ✅ (WWF English bag + Word Eagle values)
>>>>>>> origin/main

## Distinctiveness

Flag is a distinct game, not a variant of commercial crossword products:

- **Custom dictionary and tile set** — Flag uses Peter's custom ENABLE-based word list and the WWF English bag (104 tiles) paired with Word Eagle's WWF letter values, not third-party crossword publisher data
- **9×9 board with no premium squares** — Simple grid, no double/triple letter or word scores
- **Take-or-spend turns** — Draw from market to build your rack OR play tiles to score; playing does not refill your rack
- **Flag clock** — A rotating capture target that moves clockwise through four corner posts, acting as a game timer and victory condition

The crossword-on-a-grid mechanic is shared with games like Scrabble and Words With Friends, but Flag's market system, empty starting racks, rotating flag clock, and custom tile set make it a different game.

## Tile Set

Flag v0 uses the **Words With Friends English** tile set from Peter's Word Eagle (104 tiles, 2 blanks). This is NOT the NYT Crossplay bag (100 tiles, 3 blanks) or Scrabble bag (100 tiles).

**Tile counts (sum: 104 including blanks):**

| Letter | Count | Value |
|--------|-------|-------|
| A | 9 | 1 |
| B | 2 | 4 |
| C | 2 | 4 |
| D | 5 | 2 |
| E | 13 | 1 |
| F | 2 | 4 |
| G | 3 | 3 |
| H | 4 | 3 |
| I | 8 | 1 |
| J | 1 | 10 |
| K | 1 | 5 |
| L | 4 | 2 |
| M | 2 | 4 |
| N | 5 | 2 |
| O | 8 | 1 |
| P | 2 | 4 |
| Q | 1 | 10 |
| R | 6 | 1 |
| S | 5 | 1 |
| T | 7 | 1 |
| U | 4 | 2 |
| V | 2 | 5 |
| W | 2 | 4 |
| X | 1 | 8 |
| Y | 2 | 3 |
| Z | 1 | 10 |
| Blank | 2 | 0 |

**Canonical data:** `data/tiles.json`

## Playtesting

Once built, the prototype supports three modes:

- **Solo vs Hunter** — Play against Greedy, Hunter, or Sleeper personality locally (no room server)
- **Hotseat** — Two players on one device (local, no room)
- **Remote 2-player** — Persistent game links (live and correspondence, same mode). Host creates a game and gets a P2 invite link. Secret unguessable seat tokens. No accounts. Games persist across disconnects and days. Transport: PartyKit (Cloudflare Durable Objects).
- **Lab simulation** — Headless AI vs AI matchups for game balance analysis (`flag-sim --games 200 --p1 greedy --p2 hunter`)

**Build readiness:**
- ✅ Word list available (`data/words.txt`)
<<<<<<< HEAD
- ✅ Tile data available (`data/tiles.json`)
=======
- ✅ Tile set available (`data/tiles.json` — WWF English bag: 104 tiles, 2 blanks + Word Eagle WWF values)
>>>>>>> origin/main

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

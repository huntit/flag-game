# Flag

**Working title** — Private prototype repository

A two-player word game combining crossword mechanics with a shared tile market and rotating capture-the-flag endgame. Players build a rack by drawing from a market of four face-up tiles, then spend those tiles to form words on a 9×9 crossword grid. A flag rotates clockwise through four corner posts; cover the live flag post to end the game. Highest score wins.

## Status

Documentation for v0 playable slice. No implementation yet. Ada will build from the prototype specification.

**Data files:**
- ✅ Word list available at `data/words.txt` (175,030 words from Word Eagle)
- ✅ Letter values available at `data/tiles.json` (WWF and Scrabble values from Word Eagle)
- ⏳ Bag distribution pending (not in Word Eagle code)

## Documentation

- [How to Play](docs/how-to-play.md) — Human-readable rules for v0
- [Prototype Specification](docs/prototype-spec.md) — Technical build spec for Ada
- [Assets](docs/assets.md) — Word list ✅, letter values ✅, bag distribution ⏳

## Distinctiveness

Flag is a distinct game, not a variant of commercial crossword products:

- **Custom dictionary and tiles** — Flag uses Peter's custom ENABLE-based word list and tile set (bag composition, letter values), not third-party crossword publisher data
- **9×9 board with no premium squares** — Simple grid, no double/triple letter or word scores
- **Take-or-spend turns** — Draw from market to build your rack OR play tiles to score; playing does not refill your rack
- **Flag clock** — A rotating capture target that moves clockwise through four corner posts, acting as a game timer and victory condition

The crossword-on-a-grid mechanic is shared with games like Scrabble and Words With Friends, but Flag's market system, empty starting racks, rotating flag clock, and custom tile set make it a different game.

## Playtesting

Once built, the prototype supports three modes:

- **Hotseat** — Two players on one device
- **Human vs AI** — Play against Greedy, Hunter, or Sleeper personality
- **Lab simulation** — Headless AI vs AI matchups for game balance analysis (`flag-sim --games 200 --p1 greedy --p2 hunter`)

**Build readiness:**
- ✅ Word list available (`data/words.txt`)
- ✅ Letter values available (`data/tiles.json`)
- ⏳ Bag distribution pending (not in Word Eagle; needed for full gameplay)

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

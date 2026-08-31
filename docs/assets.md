# Flag Tile Set and Dictionary

**Status:** Word list ✅ | Letter values ✅ | Bag distribution ⏳

## Overview

Flag v0 will **NOT use a third-party crossword publisher's tile bag, letter values, board premiums, or official word list.**

Instead, Flag uses:

- A **custom word list** (Peter's ENABLE-based list with additions and exclusions) ✅
- A **custom tile set:**
  - **Letter values** ✅ — Locked from Word Eagle WWF default
  - **Bag distribution** ⏳ — Pending (not present in Word Eagle, which is a seed-word puzzle, not a bag game)

## Word List

**Format:**

- Text file, one word per line
- Uppercase A–Z only
- Length 2–9 playable on v0's 9×9 board
- No network lookup at runtime

**Path:** `data/words.txt` ✅

**Source:** Peter's custom ENABLE-based dictionary from Word Eagle (`wordlookupv4.txt`). Not a stock ENABLE dump, not an official crossword word list.

**Statistics:**
- Total words: 175,030
- Unique words: 175,030
- Length range: 2–28 characters
- Playable on 9×9 board (length 2–9): 107,437 words
- Longer words (10+): 67,593 words

The full source file is preserved in `data/words.txt`. For v0 (9×9 board), Ada should load only words of length 2–9 for gameplay validation. The longer words are retained for potential future use with larger boards.

## Tile Set

**Path:** `data/tiles.json` ✅

**Source:** Word Eagle (huntit/web-apps/wordgame/index.html TILE_SETS, lines ~997–1002)

### Letter Values ✅

**Locked from Word Eagle WWF default** (Flag v0 letter scores):

```
A1 B4 C4 D2 E1 F4 G3 H3 I1 J10 K5 L2 M4 N2 O1 P4 Q10 R1 S1 T1 U2 V5 W4 X8 Y3 Z10
```

**Also available:** Scrabble values (present in Word Eagle TILE_SETS but not the default):

```
A1 B3 C3 D2 E1 F4 G2 H4 I1 J8 K5 L1 M3 N1 O1 P3 Q10 R1 S1 T1 U1 V4 W4 X8 Y4 Z10
```

**Blanks:** Flag-only (market rule); not present in Word Eagle. Blanks score 0 when played.

### Bag Distribution ⏳

**Still pending.** Word Eagle is a daily 7-tile seed-word puzzle, not a bag game — it does not define letter counts or a tile bag.

The `data/tiles.json` file records letter values with `count: null` for each letter. `countsPending: true` is set at the top level.

**Ada:** Load letter values from `data/tiles.json`. Bag distribution will be added later. Do NOT invent a Scrabble-like 100-tile bag or fabricate counts.

## Word Eagle Assets

Peter's other game [Word Eagle](https://www.huntit.com.au/apps/wordgame/) ([source](https://github.com/huntit/web-apps/tree/main/wordgame)) already implements the real word list and tile values.

**Letter values extracted from Word Eagle TILE_SETS (index.html lines ~997–1002):**
- ✅ WWF values (default) recorded in `data/tiles.json`
- ✅ Scrabble values (also present, not default) recorded in `data/tiles.json`

**Bag distribution not present in Word Eagle** — Word Eagle is a daily 7-tile seed-word puzzle, not a bag game.

**Ada:** Do NOT vendor Word Eagle application code. The word list and letter values are now available as data files in this repository.

---

**When files are ready, Peter will update this document with exact paths and any additional notes.**

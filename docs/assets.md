# Flag Tile Set and Dictionary

**Status:** Word list ✅ | Tile set ✅ (counts + values)

## Overview

Flag v0 will **NOT use a third-party crossword publisher's tile bag, letter values, board premiums, or official word list.**

Instead, Flag uses:

- A **custom word list** (Peter's ENABLE-based list with additions and exclusions) ✅
- **Words With Friends English bag** (104 tiles, 2 blanks) paired with **Word Eagle's WWF letter values** ✅
  - **NOT** NYT Crossplay bag (100 tiles / 3 blanks / different values)
  - **NOT** Scrabble bag (100 tiles)

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

**Source:**
- **Letter values:** Word Eagle TILE_SETS.wwf (huntit/web-apps/wordgame/index.html lines ~997–1002)
- **Bag counts:** Published Words With Friends English distribution (104 tiles, 2 blanks)

### Complete WWF English Tile Set ✅

**104 tiles total** (102 letter tiles + 2 blanks):

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
| **Blank** | **2** | **0** |

**Compact notation:**

```
A9 B2 C2 D5 E13 F2 G3 H4 I8 J1 K1 L4 M2 N5 O8 P2 Q1 R6 S5 T7 U4 V2 W2 X1 Y2 Z1 Blank 2
```

**Values:**

```
A1 B4 C4 D2 E1 F4 G3 H3 I1 J10 K5 L2 M4 N2 O1 P4 Q10 R1 S1 T1 U2 V5 W4 X8 Y3 Z10
```

**Blanks:** Score 0 when played. Taking a blank from the market counts as the one-tile draw (no second tile allowed).

### Important Notes

- **NOT NYT Crossplay bag** (100 tiles / 3 blanks / different values)
- **NOT Scrabble bag** (100 tiles / different counts)
- Flag uses the **WWF English bag (104 tiles)** paired with **Word Eagle's WWF letter values**

## Word Eagle Assets

Peter's other game [Word Eagle](https://www.huntit.com.au/apps/wordgame/) ([source](https://github.com/huntit/web-apps/tree/main/wordgame)) provides the WWF letter values used in Flag.

**Extracted from Word Eagle:**
- ✅ WWF letter values from TILE_SETS.wwf (index.html lines ~997–1002) recorded in `data/tiles.json`

**From published WWF English distribution:**
- ✅ Bag counts (104 tiles, 2 blanks) recorded in `data/tiles.json`

**Ada:** Do NOT vendor Word Eagle application code. The word list and complete tile set (counts + values) are now available as data files in this repository.

---

**When files are ready, Peter will update this document with exact paths and any additional notes.**

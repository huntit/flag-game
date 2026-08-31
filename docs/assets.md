# Flag Tile Set and Dictionary

## Overview

Flag v0 does **NOT use a third-party crossword publisher's tile bag, letter values, board premiums, or official word list.**

Instead, Flag uses:

- A **custom word list** (Peter's ENABLE-based list with additions and exclusions)
- A **custom tile set** (Words With Friends English bag from Word Eagle)

Both files are available from Peter's Word Eagle assets.

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

**Source:** Words With Friends English tile set from Peter's Word Eagle (`TILE_SETS.wwf`). This is NOT the NYT Crossplay bag (100 tiles, 3 blanks) or Scrabble bag (100 tiles).

**Bag composition:**
- **Total tiles:** 104
- **Blanks:** 2 (value 0)
- **Letter tiles:** 102

**Tile counts (must sum to 104 including blanks):**

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

**Format:**

```json
{
  "source": "Words With Friends English tile set (from Word Eagle TILE_SETS.wwf)",
  "bagSize": 104,
  "blankCount": 2,
  "countsPending": false,
  "tiles": [
    { "letter": "A", "count": 9, "value": 1 },
    ...
  ],
  "blanks": {
    "count": 2,
    "value": 0
  }
}
```

Ada should load tile data from `data/tiles.json` at runtime.

## Word Eagle Assets

Peter's other game [Word Eagle](https://www.huntit.com.au/apps/wordgame/) ([source](https://github.com/huntit/web-apps/tree/main/wordgame)) is the source of the word list and tile set used in Flag.

**Ada:** The data files are available in this repository. Do NOT copy Word Eagle application code.

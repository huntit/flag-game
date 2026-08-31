# Flag Tile Set and Dictionary

**Status:** Pending from Peter

## Overview

Flag v0 will **NOT use a third-party crossword publisher's tile bag, letter values, board premiums, or official word list.**

Instead, Flag uses:

- A **custom word list** (Peter's ENABLE-based list with additions and exclusions)
- A **custom tile set** (letter frequencies, letter scores, blank count)

Peter will provide both files from his existing Word Eagle assets.

## Word List

**Format:**

- Text file, one word per line
- Uppercase A–Z only
- Length 2–9
- No network lookup at runtime

**Suggested path:** `data/words.txt`

**Source:** Peter's custom ENABLE-based dictionary (not a stock ENABLE dump, not an official crossword word list). This file does not exist in the repo yet.

Ada should copy the word list data file from Word Eagle when Peter provides it.

## Tile Set

**Format:**

- JSON or similar structured data
- Per-letter count (how many of each letter in the bag)
- Per-letter score (point value)
- Blank count (blanks score 0)

**Suggested path:** `data/tiles.json`

**Source:** Peter's Word Eagle tile set (not a commercial crossword publisher's bag).

### Placeholder Example (NOT FOR PLAY)

Until Peter provides the real tile data, here is the **shape** of the data structure Ada should expect:

```json
{
  "tiles": [
    {
      "letter": "A",
      "count": 0,
      "value": 0
    },
    {
      "letter": "B",
      "count": 0,
      "value": 0
    }
  ],
  "blanks": {
    "count": 0,
    "value": 0
  }
}
```

**⚠️ DO NOT USE THESE PLACEHOLDER VALUES FOR PLAY.**

The real tile counts and scores come from Peter. Ada should implement a loader that reads this file format and include a clear TODO or error if the file is missing or contains only placeholder data.

## Word Eagle Assets

Peter's other game [Word Eagle](https://www.huntit.com.au/apps/wordgame/) ([source](https://github.com/huntit/web-apps/tree/main/wordgame)) already implements the real word list and tile set.

**Ada:** Copy the data files from Word Eagle when Peter says to, but do NOT copy Word Eagle application code.

---

**When files are ready, Peter will update this document with exact paths and any additional notes.**

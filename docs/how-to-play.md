# How to Play Flag

**Version 0 rules** — 31 August 2026

## Overview

Flag is a two-player word game. Drawing from the market builds a better rack for later. Playing tiles scores points immediately but might steal the flag and end the game. Emptying your rack for a big scoring dump leaves you defenseless while your opponent hunts. If you're ahead on points, cover the flag to end it. If you're behind, keep the flag moving and build your comeback.

## What You Need

- **2 players**
- **9×9 board** with centre star at (5,5) and four flag posts
- **Flag's tile set:**
  - **WWF English bag:** 104 tiles (A9 B2 C2 D5 E13 F2 G3 H4 I8 J1 K1 L4 M2 N5 O8 P2 Q1 R6 S5 T7 U4 V2 W2 X1 Y2 Z1 Blank 2)
  - **Word Eagle WWF values:** A1 B4 C4 D2 E1 F4 G3 H3 I1 J10 K5 L2 M4 N2 O1 P4 Q10 R1 S1 T1 U2 V5 W4 X8 Y3 Z10 (Blank 0)
  - See [docs/assets.md](assets.md) for the complete tile table
- **Racks** holding maximum 7 tiles per player
- **Market** showing 4 face-up tiles
- **Bag** with remaining tiles

The board has no premium squares (no double/triple letter or word scores), no bingo bonus, and no capture bonus.

## The Board

9×9 grid with coordinates 1–9 (row 1 at top, column 1 at left).

- **Centre star** at (5,5) — First word must cover this
- **Four flag posts** one square in from each corner:
  - Northwest: (2,2)
  - Northeast: (2,8)
  - Southeast: (8,8)
  - Southwest: (8,2)

One post is **live** (the active capture target) at a time. You know which post is live at the start of your turn.

## Setup

1. Shuffle the tile bag
2. Deal 4 tiles face-up to the market
3. Both players start with **EMPTY racks** (no tiles)
4. Randomly choose which flag post is live at game start
5. Choose first player

The first action of the game is always a Draw.

## Your Turn

On your turn, choose one:

- **Draw** — Take tiles from the market to build your rack
- **Play** — Place tiles from your rack onto the board to score

### Draw

1. Take up to 2 tiles from the 4-tile market
2. **Exception:** If you take a blank from the market, that is your only market take (no second tile)
3. **Optional:** If you have room and it's not a full-rack refresh, take 1 facedown tile from the bag
4. You cannot exceed 7 tiles in your rack
5. **If your take would exceed 7 tiles:** First discard tiles into the bag (your choice), then take from market; you do NOT get a facedown tile from the bag on this refresh turn

After your draw, the market is refilled to 4 tiles from the bag.

### Play

1. Place one or more tiles from your rack in a straight line (horizontal or vertical)
2. Tiles must be contiguous when read through any existing tiles on the board
3. **First word of the game must cover the centre star (5,5)**
4. **All later plays must attach** to existing words (sharing at least one tile or touching)
5. Your rack **does NOT refill** after you play

**Scoring:**

- For each new word formed (your main word plus any crosswords), sum the letter values of **every tile in that word** (including tiles already on the board)
- Blanks score 0
- Add up all the new words' scores — that's your turn score

**Capturing the flag:**

- If any tile you placed lands on the **live flag post**, you capture the flag
- The game **ends immediately**
- Score your play normally; there is no extra capture bonus

Covering a **dark post** (not currently live) is legal and does not capture the flag.

### Stuck?

- If you have no legal plays, you must Draw
- If you cannot Draw (market and bag both empty), you pass
- If both players pass consecutively, the game ends

## Flag Rotation

After your turn (including Draw turns), **unless you captured the flag**, the live flag rotates **clockwise** to the next empty post:

1. Northwest (2,2)
2. Northeast (2,8)
3. Southeast (8,8)
4. Southwest (8,2)
5. Back to Northwest

**Skip occupied posts.** If all four posts are occupied by tiles, the game ends.

## Game End

The game ends when:

- A player captures the flag (covers the live post)
- The bag cannot refill the market to 4 tiles (finish that turn, no extra opponent turn)
- All four flag posts are occupied
- Both players pass consecutively

**Winner:** Highest score. Ties are draws (no tiebreaker).

## What's NOT in v0

- Premium squares (double/triple letter or word scores)
- Bingo bonus for playing all 7 tiles
- Capture bonus points
- Hidden goals
- 3–4 player variants (later)

## Example Start

Both racks are empty. The flag is on Northwest.

**Turn 1 (You):** Draw S and A from market, skip the bag. Flag rotates to Northeast.

**Turn 2 (Opponent):** Draw T and E from market, plus R facedown from bag (3 tiles now). Flag rotates to Southeast.

**Turn 3 (You):** Draw I and N from market (4 tiles: S, A, I, N). Flag rotates to Southwest.

**Turn 4 (Opponent):** Play STAR through the centre star, scoring 4 points. They have 2 tiles left. They did not cover the live post (Southwest). Flag rotates back to Northwest.

**Turn 5 (You):** You could:
- Play SAINT through the R (if the R is placed where you can attach)
- Draw more tiles to build a better rack
- Hunt the Northwest flag post if you have a word that covers it

Only capture the flag if you'll win on points (or if you must).

---

**Designed for Peter Hunt**  
Rules by Finch  
Build spec: [docs/prototype-spec.md](prototype-spec.md)

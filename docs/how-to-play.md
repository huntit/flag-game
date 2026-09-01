# How to Play Flag

**Version 0 rules** — 1 September 2026

## Overview

Flag is a **two-player** word game. Each player has a coloured flag on a true corner of an 11×11 board. Drawing from the market builds a better rack for later. Playing tiles scores points immediately — and covering a flag can end the game or steal your opponent's flag. If you're ahead on points, you might capture your own flag for a triple-word bonus and win. If you're behind, keep building and hunt your opponent's flag twice before they self-capture or outscore you.

## Play Modes

**Three ways to play:**

1. **Solo vs Hunter** — Play against the AI locally in your browser. No room server. This is the iPhone Safari feel-test. You see how many tiles the AI has (facedown backs), not which letters.
2. **Hotseat** — Two humans on one device. Pass-the-phone. No room. After the pass-the-phone interstitial, you see how many tiles the opponent has (facedown backs and empty slots), not the letters.
3. **Remote 2-player** — Play with a friend via persistent game links. Live and correspondence are the same mode. Host creates a game and gets a secret invite link to send. Each seat is a secret token so players can return for days on another device without accounts. The game persists even when both players are offline. No logins, no matchmaking, no friend lists. Rack **count** is public state; rack **letters** are not.

## What You Need

- **2 players**
- **11×11 board** with centre star at (6,6) (odd size so there is a centre cell; not 10×10)
- **Flag's tile set:**
  - **WWF English bag:** 104 tiles (A9 B2 C2 D5 E13 F2 G3 H4 I8 J1 K1 L4 M2 N5 O8 P2 Q1 R6 S5 T7 U4 V2 W2 X1 Y2 Z1 Blank 2)
  - **Word Eagle WWF values:** A1 B4 C4 D2 E1 F4 G3 H3 I1 J10 K5 L2 M4 N2 O1 P4 Q10 R1 S1 T1 U2 V5 W4 X8 Y3 Z10 (Blank 0)
  - See [docs/assets.md](assets.md) for the complete tile table
- **Racks** holding maximum 7 tiles per player. You always see your own letters. Opponent rack **letters** stay hidden; opponent rack **count** is public — 0–7 facedown tile backs with empty slots, **plus the count as a number** so you can plan against it
- **Shuffle** to reorder your own rack. Shuffling is not a turn and does not change which tiles you hold, only the order they sit in
- **Market** showing **6 tiles:** 4 face-up + 2 face-down
- **Bag** with remaining tiles. Show bag remaining (count) near the market

The board has no premium squares (no double/triple letter or word scores on the grid), no bingo bonus, and no capture bonus beyond the flag multipliers described below.

## The Board

11×11 grid with coordinates 1–11 (row 1 at top, column 1 at left). Not 10×10: an odd size is required so there is a centre cell.

- **Centre star** at (6,6) — First word must cover this
- **Four true corners** (1-indexed):
  - (1,1) — northwest
  - (1,11) — northeast
  - (11,11) — southeast
  - (11,1) — southwest

Each player has one flag of their own pleasant colour. Flags sit on true corners and **do not move or rotate**.

## Flags (2-player)

Each player has a distinct pleasant colour and one flag of that colour.

**Setup:** Place P1's flag on a random true corner. Place P2's flag on the **diagonally opposite** true corner. The other two true corners are **spare** corners (empty at start, available for replacement flags).

A flag is **captured** by covering its cell with a tile as part of a legal crossword play. The captured corner keeps the covering tile; the flag token is gone.

### Own flag

Covering **your own** flag scores a **Triple-Word** on **that capturing word only** (other words formed in the same play score normally) and **ends the game immediately**. Winner is highest total score after that bonus; tie = draw. You can lose by capturing your own flag cheaply if you were behind.

### Opponent's flag

Covering the **opponent's** flag scores a **Double-Word** on **that capturing word only**. That flag is removed. The opponent cannot use that captured flag to self-end or take a triple-word. They immediately get a **replacement flag** of their colour in a random **spare true corner** that is empty (no tile, no flag). They may still self-capture the replacement (triple-word + end).

### Second steal

If the opponent later captures that replacement too, score double-word on that word and **end the game** (no third flag). Track `flagsLost` per player; the **second time** a given player's flag is captured **by an opponent**, the game ends. Self-capture always ends (triple-word) regardless of `flagsLost`.

If a steal happens and no empty spare true corner exists, score the double-word and **end** (no replacement). Same as a decisive steal.

### Multiple flags in one play

If one play covers more than one flag:

1. Resolve **own-flag first** (triple-word + end)
2. If no own-flag but opponent's flag, double-word as usual
3. Never stack triple-word and double-word on the same word

## Setup

1. Shuffle the tile bag
2. Deal 4 tiles face-up and 2 tiles face-down to the market (6 showing)
3. Deal **2 tiles from the bag** to each player (not from the market; not a full 7)
4. Randomly choose P1's flag corner; place P2's flag on the diagonally opposite corner
5. Choose first player

The first action of the game may be **Draw or Play**. You do not have to Draw first.

## Your Turn

On your turn, choose one:

- **Draw** — Take tiles from the market to build your rack
- **Play** — Place tiles from your rack onto the board to score

**Draw XOR Play.** Playing does not refill your rack. Pass is not a normal third choice — see Pass below.

### Draw

1. You **must** take **exactly 2 tiles** from the 6 showing in the market — any mix of face-up and face-down (2 up, 2 down, or 1+1)
2. Refill each emptied slot from the bag in the **same orientation** (face-up slot ← face-up from bag; face-down slot ← face-down from bag). If the bag runs short, refill what you can; unfilled slots stay empty
3. If rack size **> 7** after taking, discard down to 7 (you may discard tiles just taken). Discarded tiles are shuffled into the bag

**Draw is illegal** if fewer than 2 tiles are currently showing in the market.

**Full rack does NOT block Draw.** Draw 2, then discard to 7 — that is the exchange.

There is no optional +1 draw from the bag. There is no separate facedown-from-bag action.

### Play

1. Place one or more tiles from your rack in a straight line (horizontal or vertical)
2. Tiles must be contiguous when read through any existing tiles on the board
3. **First word of the game must cover the centre star (6,6)**
4. **All later plays must attach** to existing words (sharing at least one tile or touching)
5. Your rack **does NOT refill** after you play

**Scoring:**

- For each new word formed (your main word plus any crosswords), sum the letter values of **every tile in that word** (including tiles already on the board)
- Blanks score 0
- Add up all the new words' scores — that's your turn score before flag multipliers
- If the play covers a flag, apply the flag multiplier to **that capturing word only** (see Flags above)

### Pass (Stuck-Only)

**Pass is NOT a voluntary third action.** You cannot pass when you can Play, or when Draw is legal. Pass is never silence, a closed tab, or a timeout. It exists only for the stuck case.

**When you can pass** — both must be true:

- You have **no legal Play** (no valid word placements), AND
- **Draw is illegal** (fewer than 2 tiles showing in the market)

**How to pass:**

- Pass is an **explicit button** you must tap
- The Pass button is disabled when you can Play or when Draw is legal
- In remote or correspondence games, **never treat silence, a closed tab, or elapsed time as a pass**

**After you pass:**

- The game ends only after **two consecutive explicit Passes** (one from each player)
- A Draw or Play between Passes breaks the streak

**Important:** Draw OR Play is the normal turn. Pass is a stuck-only escape valve, not a stalling tactic.

## Game End

The game ends when:

- A player captures **their own** flag (triple-word on that word, then end)
- An opponent's **second steal** of the same player's flag (double-word on that word, then end)
- A steal with **no spare empty corner** for replacement (double-word on that word, then end)
- **Two consecutive explicit Passes**
- Draw is permanently illegal for both players and they pass out

After any end, **highest score wins**; tie = draw.

## 3–4 Player Note (Not v0)

There are only four true corners. Two-player uses a diagonal pair so two spares exist for replacements. Extra players need extra corners we do not have; 3–4 player is out of scope until a different board or extra flag posts exist. **Do not ship 3–4 player in v0.**

## What's NOT in v0

- Premium squares on the board (double/triple letter or word scores)
- Bingo bonus for playing all 7 tiles
- Rotating shared flag or inland flag posts
- 4-only face-up market, optional +1 bag draw, or full-rack Pass special case
- Hidden goals
- 3–4 player variants (see note above)
- Turn clocks/timeouts
- Spectators
- Accounts
- Push/email notifications
- Matchmaking

## Example Start

Both players start with 2 tiles from the bag (not the market). The market shows 4 face-up and 2 face-down tiles. P1's flag is on (1,1); P2's on (11,11). Spares are (1,11) and (11,1). You can see how many tiles the opponent has (facedown backs), not which letters. The first action may be Draw or Play.

**Turn 1 (You):** You already have 2 tiles, so you could play a short word through (6,6) if those tiles allow it. Instead you Draw 2 tiles from the market (one face-up, one face-down). The market refills in the same orientations.

**Turn 2 (Opponent):** Draw 2 from the market. If their rack exceeds 7, they discard back to 7.

**Turn 3 (You):** Play STAR through the centre star (6,6), scoring normally. Your rack does not refill.

**Turn 4 (Opponent):** Play a word that covers your flag at (1,1). That word scores double-word. Your flag is removed; you get a replacement on a random empty spare corner.

**Later:** If they steal your replacement too, the game ends on that double-word. Or you might capture your own flag for triple-word and an immediate end — win only if you're ahead after the bonus.

---

**Designed for Peter Hunt**  
Rules by Finch  
Build spec: [docs/prototype-spec.md](prototype-spec.md)

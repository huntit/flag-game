# How to Play Word Heist

**Version 0.1 rules (phone default)** — 2 September 2026

## Overview

Word Heist is a **two-player** word game. Each player has a coloured *flag* — their goal square, a true corner that scores a triple-word multiplier for whoever covers it — on a **9×9 board** (phone v0.1 — the default playtest). Drawing from the market builds a better rack for later. Playing tiles scores points immediately — and covering a flag can end the game or steal your opponent's flag. If you're ahead on points, you might capture your own flag for a triple-word bonus and win. If you're behind, keep building and hunt your opponent's flag twice before they self-capture or outscore you.

## Play Modes

**Three ways to play:**

1. **Solo vs Hunter** — Play against Greedy, Hunter, or Sleeper locally in your browser. No room server. This is the iPhone Safari feel-test. Each new game **randomly** assigns who is Player 1 (first to act). You are sometimes P1, sometimes P2. You see how many tiles the AI has (facedown backs), not which letters.
2. **Hotseat** — Two humans on one device. Pass-the-phone. No room. Each new game **randomly** assigns who is Player 1. After the pass-the-phone interstitial, you see how many tiles the opponent has (facedown backs and empty slots), not the letters.
3. **Remote 2-player** — Play with a friend via persistent game links. Live and correspondence are the same mode. Host creates a game and gets a secret invite link to send. Each seat is a secret token so players can return for days on another device without accounts. Who is Player 1 is **randomised when the second seat sits** — not “first joiner is P1”. The game persists even when both players are offline. No logins, no matchmaking, no friend lists. Rack **count** is public state; rack **letters** are not.

There is **no first-player menu** in v0.1. Before the first action, a one-line banner states who plays first (see Setup). That banner stays visible on the turn indicator via coloured name cards.

## What You Need

- **2 players**
- **9×9 board** with centre star at (5,5) (odd size so there is a centre cell; not 8×8)
- **Word Heist's tile set:**
  - **69 tiles** — a two-thirds Words With Friends English bag (WWF / Word Eagle letter values unchanged). See the full count table in [docs/prototype-spec.md](prototype-spec.md#5-tiles).
  - See [docs/assets.md](assets.md) for letter values (Word Eagle WWF)
- **Racks** holding maximum **6 tiles** per player. You always see your own letters. Opponent rack **letters** stay hidden; opponent rack **count** is public — 0–6 facedown tile backs with empty slots, **plus the count as a number** so you can plan against it
- **Shuffle** to reorder your own rack. Shuffling is not a turn and does not change which tiles you hold, only the order they sit in
- **Market** showing **5 tiles:** 3 face-up + 2 face-down
- **Bag** with remaining tiles. Show bag remaining (count) near the market

The board has no premium squares (no double/triple letter or word scores on the grid), no bingo bonus, and no capture bonus beyond the flag multipliers and leftover scoring on closer ends (see Game End).

## The Board

9×9 grid with coordinates 1–9 (row 1 at top, column 1 at left). Not 8×8: an odd size is required so there is a centre cell.

- **Centre star** at (5,5) — First word must cover this
- **Four true corners** (1-indexed):
  - (1,1) — northwest
  - (1,9) — northeast
  - (9,9) — southeast
  - (9,1) — southwest

Each player has one flag of their own pleasant colour. Flags sit on true corners and **do not move or rotate**.

## Flags (2-player)

Each player has a distinct pleasant colour and one flag of that colour.

**Setup:** Place P1's flag on a random true corner. Place P2's flag on the **diagonally opposite** true corner. The other two true corners are **spare** corners (empty at start, available for replacement flags).

A flag is **captured** by covering its cell with a tile as part of a legal crossword play. The captured corner keeps the covering tile; the flag token is gone. **Colour marks whose flag it is** — your own flag vs a steal/replacement — but the **triple-word multiplier applies to whichever player covers that flag cell**, not only to the flag owner.

### Own flag

Covering **your own** flag scores a **Triple-Word** on **that capturing word only** (other words formed in the same play score normally) and **ends the game immediately**. Apply **leftover scoring** (see Game End). Winner is highest total score after adjustment; tie = draw. You can lose by capturing your own flag cheaply if you were behind.

### Opponent's flag (first steal)

Covering the **opponent's** flag scores a **Triple-Word** on **that capturing word only** (not double-word). That flag is removed. The opponent cannot use that captured flag to self-end or take a triple-word. They immediately get a **replacement flag** of their colour in a random **spare true corner** that is empty (no tile, no flag). They may still self-capture the replacement (triple-word + end + leftover).

### Second steal

If the opponent later captures that replacement too, score **triple-word** on that word and **end the game** (no third flag). Apply **leftover scoring**. Track `flagsLost` per player; the **second time** a given player's flag is captured **by an opponent**, the game ends. Self-capture always ends (triple-word + leftover) regardless of `flagsLost`.

If a steal happens and no empty spare true corner exists, score the triple-word and **end** (no replacement). Same as a finishing capture; apply **leftover scoring**.

### Multiple flags in one play

If one play covers more than one flag:

1. Resolve **own-flag first** (triple-word + end + leftover if applicable)
2. If no own-flag but opponent's flag, triple-word as usual
3. Never stack two multipliers on one word

## Setup

1. Shuffle the tile bag
2. Deal 3 tiles face-up and 2 tiles face-down to the market (5 showing)
3. Deal opening tiles from the bag (not from the market; not a full 6):
   - **Player 1 (P1):** 2 tiles
   - **Player 2 (P2):** 3 tiles — second-player compensation (no extra points, no one-time draw privilege). **Do not scale the opening deal** — P1=2 / P2=3 still compensates first-move on a 6-rack
4. **Randomly assign who is P1** (first to act). P1's flag goes on a random true corner; P2's flag on the diagonally opposite corner
5. P1 takes the first turn

The first action of the game may be **Draw or Play**. You do not have to Draw first.

### Who is Player 1

- **Solo vs AI:** Each new game randomly assigns P1. Before the first action, show a clear one-line banner (not only a log line): **“You play first”** or **“{AI name} plays first”** (e.g. “Hunter plays first”). The banner stays visible on the turn indicator (You / Hunter) via coloured name cards.
- **Hotseat:** Random P1 at game start. Banner: **“{Name/colour} plays first”** (e.g. “Blue plays first”).
- **Remote 2-player:** Random P1 when the **second seat sits**, not when the host creates the room. Same banner format for both seats.

## Your Turn

On your turn, choose one:

- **Draw** — Take tiles from the market to build your rack
- **Play** — Place tiles from your rack onto the board to score

**Draw XOR Play.** Playing does not refill your rack. Pass is not a normal third choice — see Pass below.

### Draw

1. You **must** take **exactly 2 tiles** from the 5 showing in the market — any mix of face-up and face-down (2 up, 2 down, or 1+1)
2. Refill each emptied slot from the bag in the **same orientation** (face-up slot ← face-up from bag; face-down slot ← face-down from bag). If the bag runs short, refill what you can; unfilled slots stay empty
3. If rack size **> 6** after taking, discard down to 6 (you may discard tiles just taken). Discarded tiles are shuffled into the bag

**Draw is illegal** if fewer than 2 tiles are currently showing in the market.

**Full rack does NOT block Draw.** When your rack already holds **6 tiles**, Draw 2 then discard 2 (back to 6) — that turn is an **Exchange**. A Draw from a rack of 5 or fewer (you take 2 but discard 0 or 1) is **not** an Exchange.

There is no optional +1 draw from the bag. There is no separate facedown-from-bag action.

**Exchange stall:** The game ends immediately after **three consecutive Exchanges** (full-rack Draw 2 + Discard 2 turns in a row, counted across both players); highest score wins, tie = draw — **no leftover adjustment** (scores stay as played). Any **Play**, any **Draw that is not an Exchange**, or any **Pass** resets the streak to zero.

Examples (6 = Exchange from a full rack; 5 = Draw from a 5-tile rack, not an Exchange):

- 6-draw, 6-draw, 6-draw → game ends after the third Exchange
- 6-draw, 5-draw, 6-draw → streak was 1, reset to 0 on the 5-draw, then back to 1 after the last 6-draw
- 6-draw, Play, 6-draw → streak was 1, reset to 0 on the Play, then back to 1 after the last 6-draw

On a short bag, **exchange-three** (fishing stall) and **double-pass** (empty-market stall) both remain useful end conditions.

### Play

1. Place one or more tiles from your rack in a straight line (horizontal or vertical)
2. Tiles must be contiguous when read through any existing tiles on the board
3. **First word of the game must cover the centre star (5,5)**
4. **All later plays must attach** to existing words (sharing at least one tile or touching)
5. Your rack **does NOT refill** after you play

**Scoring:**

- For each new word formed (your main word plus any crosswords), sum the letter values of **every tile in that word** (including tiles already on the board)
- Blanks score 0
- Add up all the new words' scores — that's your turn score before flag multipliers
- If the play covers a flag, apply the **triple-word** flag multiplier to **that capturing word only** (see Flags above)

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

- Pass resets any **Exchange** streak (see Draw)
- The game ends only after **two consecutive explicit Passes** (one from each player) — **no leftover adjustment** (scores stay as played)
- A Draw or Play between Passes breaks the streak

**Important:** Draw OR Play is the normal turn. Pass is a stuck-only escape valve when the market has fewer than 2 tiles showing — not a stalling tactic. **Exchange stall** (three consecutive full-rack Exchanges while Draw is still legal) is the separate end condition for rack-fishing; it does not replace double-pass. Neither stall end applies leftover scoring.

## Game End

The game ends when:

- A player captures **their own** flag (triple-word on that word, then end)
- An opponent's **second steal** of the same player's flag (triple-word on that word, then end)
- A steal with **no spare empty corner** for replacement (triple-word on that word, then end)
- **Going out** — bag empty **and** market empty **and** that player plays their last tile(s) this turn (see below)
- **Three consecutive Exchanges** (full-rack Draw 2 + Discard 2 across both players; see Draw above)
- **Two consecutive explicit Passes** (stuck-only — Draw illegal because market showing < 2)

After any end, **highest score wins**; tie = draw.

### Leftover tiles (locked — closer ends only)

On **closer** ends only, apply Scrabble-style leftover scoring:

1. Covering your own flag
2. Capturing the opponent's flag the **second** time (two steals)
3. **Going out** (see below)
4. A steal that ends because there is **no empty spare corner** (finishing capture — same as a closer)

When leftover applies:

- The **ending player** adds the sum of the **opponent's** unplayed rack tile values to their score
- The **opponent's** score is reduced by that same total
- **Blanks count 0**
- The ender's **own** remaining tiles are **not** subtracted (when you go out you have 0 anyway; when you capture with tiles left, you keep them unpenalized)

**Do not** apply leftover on **stall** ends:

- Three consecutive Exchanges
- Two consecutive explicit Passes (stuck-only double-pass)

Those still end the game; scores stay as they are (no rack transfer).

### Going out

You **go out** only when **all three** are true on your turn:

- The **bag is empty**
- The **market is empty** (no tiles showing)
- You **play your last tile(s)** this turn

Then apply **leftover scoring** and end the game. If the bag or market is not both empty, playing your last tile is **not** going out — the game continues unless another end condition applies.

## Large Layout (v0 — not default)

An **11×11** board remains documented for lab / large-layout play but is **not** the default phone playtest Ada ships now.

| Setting | Phone v0.1 (default) | Large v0 |
|---------|----------------------|----------|
| Board | 9×9, centre (5,5) | 11×11, centre (6,6) |
| True corners | (1,1)(1,9)(9,9)(9,1) | (1,1)(1,11)(11,11)(11,1) |
| Rack max | 6 | 7 |
| Market | 3 up + 2 down | 4 up + 2 down |
| Bag | 69 tiles (~⅔ WWF) | Full 104 WWF |
| Word length at load | 2–9 | 2–11 |
| Opening deal | P1=2, P2=3 | P1=2, P2=3 |

Same flags, leftover on closer ends, exchange-three (full rack = 6 or 7 respectively), double-pass, and going-out rules apply to both layouts.

## 3–4 Player Note (Not v0.1)

There are only four true corners. Two-player uses a diagonal pair so two spares exist for replacements. Extra players need extra corners we do not have; 3–4 player is out of scope until a different board or extra flag posts exist. **Do not ship 3–4 player in v0.1.**

## What's NOT in v0.1

- Premium squares on the board (double/triple letter or word scores)
- Bingo bonus for playing all rack tiles
- Rotating shared flag or inland flag posts
- Optional +1 bag draw, or full-rack Pass special case
- Hidden goals
- 3–4 player variants (see note above)
- Turn clocks/timeouts
- Spectators
- Accounts
- Push/email notifications
- Matchmaking

## Example Start

Solo vs Hunter. The game randomly made **you P1**. Banner: **“You play first.”** P1 (you) has **2 tiles** from the bag; P2 (Hunter) has **3 tiles**. The market shows 3 face-up and 2 face-down (5 total). P1's flag is on (1,1); P2's on (9,9) — a diagonal pair of true corners. Spares are (1,9) and (9,1). You can see how many tiles Hunter has (facedown backs), not which letters. P1 to move; first action may be Draw or Play.

**Turn 1 (You, P1):** You already have 2 tiles, so you could play a short word through (5,5) if those tiles allow it. Instead you Draw 2 tiles from the market (one face-up, one face-down). The market refills in the same orientations.

**Turn 2 (Hunter, P2):** Hunter Draws 2 from the market (started with 3 tiles). If their rack exceeds 6, they discard back to 6.

**Turn 3 (You):** Play STAR through the centre star (5,5), scoring normally. Your rack does not refill.

**Turn 4 (Hunter):** Play a word that covers your flag at (1,1). That word scores triple-word. Your flag is removed; you get a replacement on a random empty spare corner.

**Later:** If Hunter steals your replacement too, the game ends on that triple-word and leftover scoring transfers the value of your unplayed tiles. Or you might capture your own flag for triple-word and an immediate end — win only if you're ahead after leftover adjustment.

In a rematch the game might assign Hunter as P1 instead; the banner would read **“Hunter plays first”** and Hunter would start with 2 tiles while you start with 3.

---

**Designed for Peter Hunt**  
Rules by Finch  
Build spec: [docs/prototype-spec.md](prototype-spec.md)

# Flag Prototype Specification

**For Ada** — Build specification v0.1 (phone default)  
**From Finch** — 2 September 2026

Build this. Do not add out-of-scope features. If something is ambiguous, leave a TODO and ask Finch.

Human-readable rules: [docs/how-to-play.md](how-to-play.md)

## 1. What This Is

A two-player digital prototype combining crossword mechanics, a Splendor-style gem market (Draw XOR Play), and per-player corner flags with capture multipliers.

**Default layout: Phone v0.1 (9×9).** Ada ships this now. An **11×11 large layout (v0)** remains documented in section 3.1 for lab use — not the default playtest.

**Three play modes, one engine:**

1. **Solo vs Hunter** — Play against Greedy, Hunter, or Sleeper personality (opponent rack **letters** hidden; rack **count** public as 0–6 facedown tile backs with empty slots **plus a readable number**). Local TypeScript engine in the browser. No room server. **Random P1 each new game** (human sometimes P1 with 2 opening tiles, sometimes P2 with 3). This is the iPhone Safari feel-test.
2. **Hotseat** — Two humans on one device, local engine. Pass-the-phone. No room. **Random P1 each new game.**
3. **Remote 2-player** — Live and correspondence are ONE mode (persistent game links). Secret unguessable game/seat links. No 4-letter room codes. Host creates a game and gets a P2 invite link to send. Each seat is a secret token so players can return for days on another device without accounts. No logins, no matchmaking, no friend lists, no accounts for v0.1. **Random P1 when the second seat sits** (not first joiner). Transport: PartyKit (one Cloudflare Durable Object per game). UI can stay on Vercel; rooms on PartyKit. Authority: the same TypeScript rules engine is room-authoritative. Clients send actions (Draw, Play, Pass). The room validates, applies, and broadcasts public state. Opponent rack **letters** must not leak in the URL or in the other client's payload. Opponent rack **count** is public state. Bag, market, board, scores, flags, whose-turn, and rack counts live on the room. Persistence: store the engine snapshot in room storage. Do NOT destroy the room when tabs close or both players go offline. A game may sit for days. If both players are online it feels live; if not, it waits. Pass is an explicit button. Never treat silence, a closed tab, or elapsed time as a pass. Consecutive double-pass still ends the game only after two explicit Passes in a row (a Draw or Play between Passes breaks the streak). See section 8.3. Notifications are out of scope for v0.1. Testers ping each other (iMessage etc.) for "your turn" until later.
4. **AI vs AI lab** — Headless simulation for game balance analysis

**Constraints:**

- Phone-first (iPhone Safari), desktop-playable
- Dictionary loaded from a text file Peter will supply
- Headless simulation must run with no UI
- Do NOT add: async-only correspondence as a separate mode, turn clocks/timeouts, spectators (optional later), 3–4p, accounts, push/email, Discord, native iOS

**Tech stack (locked):**

- **Phone-first static web app** — NOT native iOS / TestFlight / App Store for v0.1
- **TypeScript rules engine** — Shared by UI, CLI, and PartyKit room authority
- **UI:** Vite + React (tap-to-place input for iPhone Safari; do NOT rely on desktop HTML5 drag). The 9×9 grid must stay tap-to-place on iPhone Safari; smaller cells are OK. Do not switch to desktop drag.
- **CLI:** Node.js for `flag-sim` headless simulation
- **Hosting:** Vercel or Cloudflare Pages from huntit/flag-game (every push gets a preview URL)
- **Remote multiplayer:** PartyKit (one Cloudflare Durable Object per game) for rooms
- **Deployment workflow:** Iterate in iPhone Safari, Add to Home Screen for feel-test
- **Solo vs Hunter = local** — Dictionary loaded from `data/words.txt` bundled with app
- **Hotseat = pass-the-phone** — Two humans on one iPhone
- **Remote 2-player = persistent links** — PartyKit rooms with secret seat tokens

## 2. Success Criteria

All criteria below describe **phone v0.1 (9×9)** unless noted.

- Two humans can complete a legal 9×9 game in hotseat mode
- Two humans can complete a legal 9×9 game in remote mode via persistent game links (live and correspondence, same mode)
- Human can play vs Hunter AI on 9×9 with opponent rack **letters** hidden and rack **count** public (0–6 facedown backs with empty slots; local engine, no room)
- `flag-sim --games 200 --p1 greedy --p2 greedy` writes summary JSON with:
  - P1 win rate
  - End-reason breakdown (self-capture, second-steal, no-spare-replacement, going_out, exchange-three, double-pass, stuck-out)
  - Self-capturer win rate
  - Mean/median scores
  - Mean turn count
  - Draw/play ratio
  - 2-letter play rate
- Tests verify:
  - Per-player flags on diagonally opposite true corners at setup
  - Own-flag capture: triple-word on capturing word only, immediate end, +10 to ender
  - Opponent first steal: triple-word (not double-word), flag removed, replacement on random empty spare corner
  - Opponent second steal: triple-word, immediate end, +10 to ender, no third flag
  - Steal with no spare corner: triple-word, immediate end, no replacement, +10 to ender
  - Multi-flag play resolves own-flag first
  - Flag multiplier applies to whichever player covers the flag cell (not own-colour-only)
  - Market: 3 face-up + 2 face-down; Draw takes exactly 2 from showing tiles; orientation-preserving refill
  - Draw illegal when market showing < 2
  - Full rack does not block Draw (draw 2, discard to 6)
  - Exchange: Draw when rack size was 6 before taking (Draw 2 + discard 2); three consecutive Exchanges end the game
  - `consecutiveExchanges` resets on Play, non-Exchange Draw, and Pass
  - Pass legal only when no legal Play AND Draw illegal
  - Going out: bag empty AND market empty AND player plays last tile(s); +10 to ender; end
  - +10 awarded at most once per game even if multiple +10 triggers on same play
  - Remote game persistence across disconnects/days
  - Opponent rack letters not leaked in URL or client payload; rack count is public
  - Opening deal: P1 gets 2 tiles from the bag, P2 gets 3; market 5 tiles; P1 acts first; first action may be Draw or Play
  - Random P1 assignment: solo vs AI, hotseat, and remote (remote randomises when second seat sits)
  - Dictionary load accepts length 2–9 without shrinking `data/words.txt`
  - Bag: 69 tiles per section 5 count table (update `data/tiles.json` — not in docs-only PR)
  - **Leftover tiles at end:** TODO hook only — Peter has not chosen ignore vs Scrabble-style; do NOT implement leftover scoring
- **Out of scope:** Board premium squares, bingo, 3–4 player, secret goals, turn clocks/timeouts, spectators, accounts, push/email notifications, leftover-tile scoring until Peter chooses

## 3. Board

### 3.1 Phone v0.1 (default — ship this)

**Size:** 9×9 (NOT 8×8 — an odd size is required so there is a centre cell)

**Coordinates:** 1–9 (persist and log as 1-indexed). Row 1 at top, column 1 at left.

**Centre star:** (5,5) — first word must cover this cell.

**True corners** (1-indexed):

| Corner | Coordinates |
|--------|-------------|
| Northwest | (1,1) |
| Northeast | (1,9) |
| Southeast | (9,9) |
| Southwest | (9,1) |

**No inland flag posts.** No rotating shared flag. Flags do not move.

**No premium squares on the board.**

### 3.2 Large layout v0 (not default)

Short reference for lab / future large-board play. **Phone v0.1 is what Ada ships now.**

| Setting | Phone v0.1 | Large v0 |
|---------|------------|----------|
| Board | 9×9 | 11×11 |
| Centre star | (5,5) | (6,6) |
| True corners | (1,1)(1,9)(9,9)(9,1) | (1,1)(1,11)(11,11)(11,1) |
| Rack max | 6 | 7 |
| Market | 3 up + 2 down (5 showing) | 4 up + 2 down (6 showing) |
| Bag | 69 tiles (~⅔ WWF) | Full 104 WWF |
| Word length at load | 2–9 | 2–11 |
| Exchange full rack | 6 | 7 |
| Opening deal | P1=2, P2=3 | P1=2, P2=3 |

Same flags, +10 ends, exchange-three, double-pass, and going-out rules apply to both layouts.

## 4. Flags (2-player)

Each player has a distinct pleasant colour and one flag token of that colour.

**Multiplier rule (locked v0.1):** A flag cell is a **Triple-Word square for EITHER player** who covers it — not own-colour-only. **Colour still marks whose flag** (own capture vs steal/replacement). Never stack two multipliers on one word.

### Setup

1. Choose uniformly at random one true corner for P1's flag.
2. Place P2's flag on the **diagonally opposite** true corner.
3. The other two true corners are **spare corners** (empty at start — no tile, no flag).

Persist each player's flag location, colour, and `flagsLost` (integer, starts at 0).

### Capture

A flag is captured when a legal play places a tile on that flag's cell. The tile remains; the flag token is removed.

**Own flag:** Apply **triple-word** multiplier to the **capturing word only** (other words in the same play score normally). End game immediately. Award **+10** to the ending player. Winner = highest total score after bonuses; tie = draw. Self-capture always ends regardless of `flagsLost`.

**Opponent's flag (first steal):** Apply **triple-word** multiplier to the **capturing word only** (NOT double-word). Remove that flag. Increment victim's `flagsLost`. If victim's `flagsLost` < 2, spawn a **replacement flag** of the victim's colour on a uniformly random **spare true corner** that is empty (no tile, no flag). Victim may still self-capture the replacement later.

**Opponent's flag (second steal):** When `flagsLost` reaches 2 for a player (second capture **by an opponent**), apply triple-word on the capturing word, award **+10** to the ending player, and **end immediately** — no third flag.

**Steal with no spare:** If a steal would grant a replacement but no spare true corner is empty, apply triple-word, award **+10** to the ending player, and **end immediately** (no replacement). Treat as decisive steal.

**Multiple flags in one play:** Resolve own-flag first (triple-word + end + +10 if applicable). If no own-flag but opponent flag(s), apply opponent rules. Never apply two multipliers to the same word.

### +10 flat end bonus (locked)

Award **+10** to the **ending player** on these ends only:

1. Self-capture (own flag)
2. Second opponent-steal of the same player's flag
3. Going out (section 9)

**At most one +10 per game.** If two triggers would fire on the same play (e.g. last tile covers own flag while going out), award +10 once.

### 3–4 player note (do not implement)

Only four true corners exist. Two-player uses a diagonal pair leaving two spares for replacements. Extra players need corners we do not have. **3–4 player is out of scope for v0.1.** Do not ship it.

## 5. Tiles

**DO NOT use a third-party crossword publisher's bag composition or letter values.**

**Tile set:** ✅ Available at `data/tiles.json` — **Ada updates this file to match the v0.1 bag table below.** The docs-only PR does not change `data/tiles.json`.

**Source:**
- **Letter values:** Word Eagle TILE_SETS.wwf (huntit/web-apps/wordgame/index.html lines ~997–1002) — **unchanged**
- **Bag counts (v0.1 phone):** ~⅔ of published Words With Friends English distribution (104 tiles → 69 tiles)

**WWF / Word Eagle letter values (unchanged):**

```
A1 B4 C4 D2 E1 F4 G3 H3 I1 J10 K5 L2 M4 N2 O1 P4 Q10 R1 S1 T1 U2 V5 W4 X8 Y3 Z10 (Blank 0)
```

**Phone v0.1 bag — 69 tiles total** (104 × 2/3 ≈ 69.3; N rounded up from 3.33 so total is 69):

| Letter | Count | Value |
|--------|-------|-------|
| A | 6 | 1 |
| B | 1 | 4 |
| C | 1 | 4 |
| D | 3 | 2 |
| E | 9 | 1 |
| F | 1 | 4 |
| G | 2 | 3 |
| H | 3 | 3 |
| I | 5 | 1 |
| J | 1 | 10 |
| K | 1 | 5 |
| L | 3 | 2 |
| M | 1 | 4 |
| N | 4 | 2 |
| O | 5 | 1 |
| P | 1 | 4 |
| Q | 1 | 10 |
| R | 4 | 1 |
| S | 3 | 1 |
| T | 5 | 1 |
| U | 3 | 2 |
| V | 1 | 5 |
| W | 1 | 4 |
| X | 1 | 8 |
| Y | 1 | 3 |
| Z | 1 | 10 |
| Blank | 1 | 0 |

**Notes:**
- Keep J, Q, X, Z, K at 1 each
- One blank only
- N rounded up from 3.33 (104×2/3 scaling) so total = 69

**Large layout v0 bag:** Full WWF English 104 tiles (A9 B2 C2 D5 E13 F2 G3 H4 I8 J1 K1 L4 M2 N5 O8 P2 Q1 R6 S5 T7 U4 V2 W2 X1 Y2 Z1 Blank 2) — for lab only, not default.

**Important:**
- Load both counts and values from `data/tiles.json` after Ada updates it
- **NOT** NYT Crossplay bag (100 tiles / 3 blanks / different values)
- **NOT** Scrabble bag (100 tiles / different counts)

**Blank tiles:**

- Can be taken from the market (including face-down slots)
- When played, the player assigns it a letter permanently
- Scores 0 points
- Dictionary validation checks the assigned letter (the blank becomes that letter for crossword validation)

## 6. Dictionary

Peter's custom ENABLE-based word list with additions and exclusions from Word Eagle. **NOT a stock ENABLE dump and NOT an official crossword word list.**

**Path:** `data/words.txt` ✅

**Format:**

- Text file, one word per line
- Uppercase A–Z only
- Full source contains words of length 2–28
- **For phone v0.1 (9×9 board):** At load, accept words of length **2–9** for validation. Keep the full `data/words.txt` file; do not shrink it.
- **For large layout v0 (11×11):** Accept words of length 2–11 at load
- No network lookup at runtime

**Validation:**

A play is legal if and only if every new straight-line word (the main play word plus all crosswords formed) appears in the dictionary. Single-letter crosses are not words.

## 7. Setup

1. Shuffle the tile bag
2. Deal 3 tiles **face-up** and 2 tiles **face-down** to the market (5 showing)
3. Deal opening tiles from the bag (not from the market; do NOT deal 6; do NOT deal from the market into opening racks):
   - **P1:** 2 tiles
   - **P2:** 3 tiles (second-player compensation — locked; no points bonus, no one-time draw privilege; **do not scale** for the 6-rack)
4. **Randomly assign who is P1** (first to act). P1 flag corner = random true corner; P2 flag on diagonally opposite corner
5. P1 takes the first turn

**The first action of the game may be Draw or Play.** It is no longer “must Draw”.

### 7.1 Who is Player 1 (locked)

**No first-player menu in v0.1.** Randomise P1 every new game in all modes:

| Mode | When to randomise | Banner (before first action) |
|------|-------------------|------------------------------|
| Solo vs AI | New game start | **“You play first”** or **“{AI personality name} plays first”** (e.g. “Hunter plays first”) |
| Hotseat | New game start | **“{Name/colour} plays first”** (e.g. “Blue plays first”) |
| Remote 2-player | When **second seat sits** — NOT “first joiner is P1” | Same as hotseat for both clients |

**UI:** Show the banner as a clear one-line message before the first action — not only a move-log line. After the game starts, keep “who plays first” context visible on the turn indicator via **coloured player name cards** (You / Hunter, or seat names/colours).

**Solo vs AI:** Human is sometimes P1, sometimes P2. P1 seat gets 2 opening tiles and acts first; P2 seat gets 3 opening tiles. AI personality name in banner when AI is P1.

**Remote:** Host may create the room before P2 joins; defer P1 randomisation and full setup (flags, opening deal, whose-turn) until the second seat token is claimed, then broadcast the banner to both clients.

## 8. Turn Structure

Each turn: **Draw XOR Play**. No flag rotation after turns. Flag state changes only via captures and replacements.

### 8.1 Draw

**Precondition:** At least **2 tiles** are currently showing in the market (face-up + face-down combined). Otherwise Draw is illegal.

**Take:** Player **must** take **exactly 2 tiles** from the 5 showing — any mix of face-up and face-down.

**Refill:** For each emptied market slot, draw from the bag into that slot preserving orientation:
- Face-up slot ← next tile dealt face-up from bag
- Face-down slot ← next tile dealt face-down from bag

If the bag runs short, refill what you can; unfilled slots stay empty.

**Rack cap:** If `rack.size > 6` after taking, player discards down to 6 (may discard tiles just taken). Discarded tiles are shuffled into the bag.

**No optional +1 bag draw.** No separate facedown-from-bag action. Full rack does **not** block Draw — draw 2 then discard to 6 is an **Exchange**.

**Exchange (locked):** An Exchange is a Draw taken when that player's rack **already held 6 tiles** before taking from the market: they must take exactly 2 from the market, then discard exactly 2 (back to 6). That is Draw 2 + Discard 2. A Draw 2 that does **not** discard 2 (rack was under 6 before the take; they discard 0 or 1) is **not** an Exchange and does not increment the counter.

**Exchange stall counter:** Maintain `consecutiveExchanges` (integer, starts at 0).

- After an Exchange turn: increment `consecutiveExchanges`. If it reaches **3**, end the game immediately (`endReason = exchange_three`). Winner = highest score; tie = draw.
- Reset `consecutiveExchanges` to **0** on any **Play**, on any **Draw that is not an Exchange**, and on any **Pass**.
- Count Exchanges **across both players** in turn order (not per player, not three Exchanges in the whole game).

**Examples** (6 = Exchange from full rack; 5 = Draw from 5-tile rack, not an Exchange):

| Turn sequence | `consecutiveExchanges` after last turn |
|---------------|----------------------------------------|
| 6-draw, 6-draw, 6-draw | 3 → game ends |
| 6-draw, 5-draw, 6-draw | 1 (reset on 5-draw) |
| 6-draw, Play, 6-draw | 1 (reset on Play) |

**Illegal draw:** Fewer than 2 tiles showing in the market.

### 8.2 Play

**Placement:**

- Place 1 or more tiles from rack in a straight line (horizontal or vertical)
- Tiles must be contiguous when read through existing board tiles
- **First word must occupy centre star** — (5,5) on phone v0.1
- **All later plays must attach** to existing words (orthogonally adjacent or sharing a cell)

**Validation:**

- All new words formed must be in the dictionary
- Single-letter placements that don't form a word are illegal

**Rack:**

- Do NOT refill the rack after playing

**Scoring:**

- For each new word formed (main word + crosswords):
  - Sum the letter values of **every tile in that word** (including tiles already on the board)
  - Blanks score 0
- Sum all new words' scores → base turn score
- Apply flag **triple-word** multiplier to the **capturing word only** when applicable (see section 4)
- Never stack two multipliers on one word

**Flag resolution:** After scoring, resolve captures per section 4. Game may end immediately.

**No bingo bonus.**

**Play does not refill the market.**

### 8.3 Pass (Stuck-Only)

**Locked.** Pass is not a voluntary third action. Never silence, a closed tab, or elapsed time.

**Pass is legal only when both are true:**

- **No legal Play** (no valid word placements possible), AND
- **Draw is illegal** (fewer than 2 tiles showing in the market)

**Removed obsolete rule:** Full rack does **not** make Draw illegal for Pass purposes. Full rack + market showing ≥ 2 → Draw remains legal (draw 2, discard to 6).

**UI requirement:**

- Pass is an **explicit button** the player must tap
- The Pass button is **disabled or hidden** when the player can Play or when Draw is legal
- **Never auto-pass:** Do not treat silence, a closed tab, or elapsed time as a pass (critical for remote/correspondence multiplayer)

**After a pass:**

- Reset `consecutiveExchanges` to 0
- Consecutive double-pass ends the game **only after two consecutive explicit Passes** (one from each player)
- A Draw or Play between Passes **breaks the streak**

**Important:** Draw XOR Play remains the normal turn action. Pass is a stuck-only escape valve when Draw is illegal (market showing < 2). **Exchange-three** is the separate stall end when Draw is still legal but players only full-rack Exchange; do not conflate with double-pass. On a short bag, both exchange-three and double-pass remain useful.

## 9. Game End

The game ends when:

- **Self-capture** — Player covers own flag (triple-word on that word, +10, then end)
- **Second steal** — Opponent captures a player's flag for the second time (`flagsLost === 2`; triple-word on that word, +10, then end)
- **No spare replacement** — Opponent steals but no empty spare true corner exists (triple-word on that word, +10, then end)
- **Going out** — Bag empty **and** market empty **and** that player plays their last tile(s) this turn; +10 to ender, then end. If bag or market is not both empty, playing last tile(s) is **not** going out
- **Exchange three** — Three consecutive Exchanges (full-rack Draw 2 + Discard 2; see section 8.1). Counted across both players. Play, non-Exchange Draw, or Pass between Exchanges resets `consecutiveExchanges` to 0
- **Double pass** — Two consecutive explicit Passes (one from each player). Stuck-only — Draw illegal because market showing < 2. A Draw or Play between Passes breaks the streak
- **Stuck out** — Draw permanently illegal for both players and they pass out (both stuck, both Pass)

**Winner:** Higher score after all bonuses (including at-most-one +10). Ties are draws (no tiebreaker).

**Log `endReason`:** One of: `self_capture`, `second_steal`, `no_spare`, `going_out`, `exchange_three`, `double_pass`, `stuck_out`.

Do NOT tie-break by who captured.

### 9.1 Leftover tiles (OPEN — do not implement)

**Leftover tiles in racks at game end are NOT locked in v0.1.** Peter has not chosen:

- **Option A:** Ignore leftovers — scores stand as played
- **Option B:** Scrabble-style — e.g. winner/ender adds opponent remaining tile values, or each player subtracts their own unplayed tiles

**TODO:** Leave a hook in the engine; do **not** invent or implement leftover-tile scoring until Peter chooses.

## 10. UI Requirements (Minimum)

**Layout — no vertical scrolling (locked 31 Aug 2026, still applies).**

The whole play UI (board, market, racks, action buttons) must fit the visual viewport on iPhone and iPad. The player must never scroll to reach Draw, Play, Shuffle or Pass. If space runs short, shrink the chrome — never the reachability of the buttons. Use the safe area (`env(safe-area-inset-*)` with `viewport-fit=cover`). State the constraint in CSS: the play screen is `100svh` tall (falling back to `100dvh`, then `100vh`) with `overflow: hidden`, and the board is sized from whatever height the chrome leaves over.

Desktop browsers (wide window, `pointer: fine` — Safari on Mac) use a separate compact centered column: board and tiles are capped and do not grow with the window, the market sits under the board, the rack sits next to a stable action toolbar, and the opponent rack stays a facedown count. Gate that layout with `min-width` + `pointer: fine` only. Do not user-agent sniff. Do not change the iPhone/iPad shells.

**Action buttons.** Every action button is enabled only when that action is legal or has a reason to press, and disabled otherwise. Pass included — see section 8.3.

**Shuffle.** The player can shuffle their own rack. Shuffling is **not a turn**: it does not change the score, and does not change tile identity — only the order tiles sit in.

**Board view:**

- 9×9 grid (phone v0.1 default)
- Each player's flag shown on its true corner in that player's colour
- Spare corners visible (empty until a replacement flag spawns)
- Centre star visible until first word is played
- **Played tiles rendered in that player's colour**
- Tiles on board with letters and scores visible
- **Must stay tap-to-place on iPhone Safari.** Smaller cells are OK. Do not switch to desktop drag.

**Player chrome:**

- **Player name cards in that player's colour**
- **First-player banner:** Before the first action, show one line: “You play first”, “{AI name} plays first”, or “{Name/colour} plays first”. Keep visible on the turn indicator via the coloured name cards after play begins
- **Desktop/iPad:** scrolling move log (human + AI moves) coloured by player
- **Nicer desktop layout/alignment** than phone shell (still compact centered column per above)
- **Title + logo is the home link; no back button**
- **Favicon**
- Placeholder colours OK until Skye delivers art

**Game state:**

- Market: 3 face-up + 2 face-down tiles
- Bag tile count shown near the market
- Both player scores
- Whose turn it is
- Game-end overlay with winner and final scores

**Racks:**

- Your own rack always visible (letters)
- **Opponent (and AI) rack CONTENTS stay hidden.** Rack **COUNT** is public: show 0–6 facedown tile backs with empty slots, **and show the count as a number**
- **Hotseat:** Pass-the-device interstitial between turns. After the interstitial, the incoming player sees how many tiles the opponent has (facedown backs and empty slots), not the letters
- **Remote 2-player:** Rack count is public state; letters are not. Do not leak opponent letters in the URL or the other client's payload

**Debug toggle (optional):**

- Show opponent rack **letters** (count is already public as facedown backs)
- Show count of legal plays available

**Draw flow:**

- Select exactly 2 tiles from the 5 showing (face-up and/or face-down)
- If selection would leave rack > 6, discard down to 6 (may discard tiles just taken)
- Confirm selection
- Refill market preserving orientations
- **No +1 bag button**

**Play flow:**

- Tap tiles from rack to board (tap-to-place). On iPhone Safari this remains tap-to-place even on the 9×9 grid; smaller cells are OK. Do not switch to desktop drag as the primary input.
- Tapping a placed-but-unconfirmed tile returns it to the rack
- Placing a blank prompts for the letter it stands for
- Confirm placement
- Reject illegal plays with a short reason (e.g., "Not a word: CD", "Play must touch a tile already on the board"). The Play button stays disabled while the placement is illegal, so the reason shows before the player commits

**Main menu:**

- Solo vs Hunter (local, no room)
- Hotseat (local, no room)
- Create Remote Game (get invite link)
- Join Remote Game (paste invite link)
- Run lab

**Art:**

Art is Skye's domain later. For v0.1:

- Letter tiles
- Grid
- Flag tokens per player colour
- Minimal visual clarity is enough

**Useful Word Eagle UX to reuse later (do NOT copy code now):**

- Tile rack layout
- Browser drag-and-drop (desktop later only; v0.1 iPhone Safari stays tap-to-place on 9×9)
- Word definition lookup on click

## 11. Remote Multiplayer (Persistent Game Links)

**Live and correspondence are ONE mode, not two products.**

### Architecture

**Transport:** PartyKit (one Cloudflare Durable Object per game). UI can stay on Vercel; rooms on PartyKit. Do NOT add a general Node game server. Do NOT use WebRTC/P2P (unreliable on iPhone Safari).

**Authority:** The same TypeScript rules engine is room-authoritative. Clients send actions (Draw, Play, Pass). The room validates, applies, and broadcasts public state.

**Privacy:** Opponent rack **letters** must NOT leak in the URL or in the other client's payload. Opponent rack **count** is public state. Bag, market, board, scores, flags, whose-turn, and rack counts live on the room.

**Persistence:** Store the engine snapshot in room storage. Do NOT destroy the room when tabs close or both players go offline. A game may sit for days. If both players are online it feels live; if not, it waits.

### Game Creation and Joining

**Host creates a game:**

1. Click "Create Remote Game"
2. Host gets a P2 invite link to send (e.g., via iMessage, email, etc.)
3. Each seat is a secret unguessable token (NOT 4-letter room codes — those get guessed over days)
4. Players can return for days on another device without accounts

**No logins, no matchmaking, no friend lists, no accounts for v0.1.**

**P1 assignment:** Randomise who is P1 when the **second seat sits**, not when the host creates the room. Run full setup (opening deal P1=2 / P2=3, flags, whose-turn) at that moment. Broadcast the first-player banner to both clients. See section 7.1.

### Pass Behavior

Pass is an explicit button. Never treat silence, a closed tab, or elapsed time as a pass. Consecutive double-pass still ends the game only after two explicit Passes in a row (one from each player). A Draw or Play between Passes breaks the streak. See section 8.3 for Pass legality.

### Notifications

Notifications are out of scope for v0.1. Testers ping each other (iMessage etc.) for "your turn" until later.

### Out of Scope for v0.1

- Async-only correspondence as a separate mode
- Turn clocks/timeouts
- Spectators (optional later)
- 3–4 player variants
- Accounts
- Push/email notifications
- Discord integration
- Native iOS app

## 12. Move Generator

`legalPlays(board, rack, isFirstWord, flags) → [Play]`

Returns all legal plays with:

- Tiles used
- Board cells
- Words formed
- Base score
- Flag effects per word (`none`, `triple_word`) — all flag captures use triple-word in v0.1
- `endsGame` (boolean)
- `capturesOwnFlag`, `capturesOpponentFlag` (booleans)

**Implementation:** Brute force is acceptable for 9×9.

Use the same generator for:

- AI move selection
- Illegal-play rejection messages

## 13. AI Personalities

**No search-based AI.** Three simple personalities. They play the same **phone v0.1 setup**: 9×9 board, **P1=2 / P2=3 opening tiles from the bag**, market of 5 (3 up + 2 down), **random P1 assignment each new solo game** (human sometimes P1, sometimes P2), first action may be Draw or Play. Opponent rack letters stay hidden from the human; rack count is public.

**Shared constant:** `DRAW_THRESHOLD = 8` (CLI-configurable)

### Greedy

- If best play's score ≥ threshold (including flag triple-word multipliers on the capturing word):
  - Play it
  - Tiebreaker: longer word, then self-capture-over-steal-over-normal, then stable random
- Else: Draw (when legal)
- If no legal plays exist: Draw (when legal)

### Hunter

- If any play captures opponent flag (first or second steal):
  - Play the highest-scoring among those (including triple-word)
- Else if any self-capture play exists:
  - Play self-capture only if it would win after triple-word + +10
- Else: Greedy behavior

### Sleeper

- If any self-capture play would put you **strictly ahead** after triple-word + +10:
  - Play the highest-scoring among those
- Else if any opponent-flag steal would end the game in your favour:
  - Play it
- Else: Greedy behavior, **excluding self-capture and opponent steals** unless forced

### Draw Policy (All Personalities)

Keep this simple and dumb:

1. If Draw illegal (market showing < 2): Pass if stuck, else Play
2. Take 2 random tiles from showing market (any mix of up/down)
3. If rack > 6 after take: discard random tiles until size 6 (prefer duplicates; never discard blank if other tiles exist)
4. No optional bag tile

**No thinking-time slider.** Human vs AI should respond instantly.

## 14. Lab CLI (Simulation Mode)

**Command:**

```bash
flag-sim --games 200 --p1 greedy --p2 hunter --threshold 8 --seed 1 --out ./out/
```

**Matchup swapping:**

- If personalities differ: run half the games with P1/P2 swapped (unless `--no-swap` flag)
- Report both personality win rate and first-player win rate
- Greedy vs Greedy does NOT swap

### Per-Game JSONL Fields

Write one JSON object per line for each game:

- `gameId`
- `seed`
- `p1` (personality)
- `p2` (personality)
- `first` (which personality went first)
- `winner` (P1, P2, or draw)
- `endReason` (`self_capture`, `second_steal`, `no_spare`, `going_out`, `exchange_three`, `double_pass`, `stuck_out`)
- `selfCapturer` (P1, P2, or null)
- `selfCapturerWon` (boolean or null)
- `scoreP1`
- `scoreP2`
- `flagsLostP1`, `flagsLostP2`
- `endBonus` (+10 or 0 — at most once per game)
- `turns` (total)
- `playsP1`, `drawsP1`, `discardsP1`
- `playsP2`, `drawsP2`, `discardsP2`
- `wordLengths` (array)
- `wordScores` (array)
- `twoLetterPlays` (count)
- `captureWordLength` (or null)
- `captureWordScore` (or null)
- `captureCorner` (NW, NE, SE, SW, or null)
- `captureType` (`self_triple`, `opponent_first`, `opponent_second`, or null)
- `captureTurn` (turn number or null)

### Summary JSON

Write summary statistics in a separate file:

- `games` (total count)
- `drawRate` (ties)
- `p1WinRate`
- `personalityWinRate` (adjusting for swaps)
- End-reason rates (`selfCaptureEndRate`, `secondStealEndRate`, `noSpareEndRate`, `goingOutEndRate`, `exchangeThreeEndRate`, `doublePassEndRate`, `stuckOutEndRate`)
- `selfCapturerWinRate` (when someone self-captured, did they win?)
- Mean and median scores (per player, per game)
- `meanTurns`
- `meanDrawPlayRatio` (draws per play)
- `meanWordLength`
- `twoLetterPlayRate`

**Output:**

- Print a summary table to stdout
- Write JSONL and summary JSON to `--out` directory

### Default Matchups

For the UI "Run lab" button, default to:

1. Greedy vs Greedy
2. Hunter vs Sleeper
3. Hunter vs Greedy

Other matchups via CLI.

## 15. Tuning Knobs

**Constants (with CLI overrides where noted):**

- `DRAW_THRESHOLD = 8` (CLI-configurable: `--threshold`)
- Board size: **9×9 phone v0.1 default** (11×11 large layout documented in section 3.2 — not default)
- Rack max: **6** (7 on large layout only)
- **Second-player compensation (locked):** P1 opens with 2 tiles from the bag; P2 opens with 3. No points compensation, no one-time draw privilege; do not scale for 6-rack
- **Random P1 (locked):** Solo, hotseat, and remote (remote: when second seat sits). No first-player menu in v0.1
- **+10 end bonus (locked):** At most once per game; see section 4 and 9

**Hooks for later tuning (commented out, not implemented):**

- *(none for opening deal — P2+1 tile is locked)*
- **Leftover tiles at end** — OPEN; do not implement until Peter chooses (section 9.1)

**After lab results:**

- If P1 win rate > 60%, revisit compensation (currently P2+1 opening tile only — do not add points or draw privileges without Finch)
- If self-capturer win rate is skewed, revisit AI thresholds
- If 2-letter play rate is absurdly high, consider a length bonus

**Do NOT implement these patches until Finch says so.**

## 16. Out of Scope (Not v0.1)

**3–4 player variant (later):**

- Needs more corners or a different board
- Not spec'd for v0.1 — see section 4 note

**Also out of scope:**

- Hidden roles
- Secret goals
- Public contracts
- Board premium squares
- Bingo bonus
- Rotating shared flag / inland posts
- Optional +1 bag draw, full-rack Pass special case
- User accounts
- Matchmaking
- Animation polish
- Onboarding beyond a short rules blurb
- Search-based AI (Monte Carlo, minimax, etc.)
- Production app-store build
- Turn clocks/timeouts
- Spectators (optional later)
- Push/email notifications
- Discord integration
- Native iOS app
- **Leftover-tile scoring** until Peter chooses (section 9.1)

## 17. Design Intent (Do NOT "Fix")

These are intentional design choices:

- **Draw XOR Play, no refill after play** — Playing empties your rack; drawing builds it
- **Per-player corner flags with triple-word capture multipliers** — Own flag = triple-word + end + +10; opponent steals use triple-word (not double-word); second steal ends (+10)
- **Two spare corners from diagonal setup** — Replacement flags need empty true corners
- **Second-player compensation** — P1 opens with 2 tiles from the bag; P2 opens with 3 (no points bonus, no one-time draw privilege). P1 acts first; do not scale for 6-rack
- **Random P1 every game** — Solo, hotseat, and remote (remote: when second seat sits). Banner before first action; no first-player menu in v0.1
- **Two opening tiles from the bag (P1 only)** — P2 gets three. First action may be Draw or Play
- **9×9 phone default, 11×11 large layout noted** — Odd size so there is a centre cell at (5,5) / (6,6)
- **Public rack count, hidden letters** — Show facedown backs and empty slots plus a readable count number; never expose opponent letters
- **Market 5 = 3 up + 2 down; Draw always takes 2** — Exchange via draw-then-discard when rack full (6)
- **69-tile bag (~⅔ WWF)** — Short bag makes exchange-three and double-pass both matter
- **+10 end bonus at most once** — Self-capture, second steal, or going out
- **Going out requires bag AND market empty** — Playing last tile alone is not enough

## 18. Original Spark (Context, Not v0.1)

Peter's original idea (2 July 2018):

- 2-player capture-the-flag word game
- Crossword board
- Target square that moved to a random near-corner each turn
- 4 face-up market tiles
- "Create a word OR draw up to 2 (1 if blank)"
- Optional facedown tile from bag
- Max 7 tiles
- Game over when target is covered
- Capture bonus was a question mark

**v0.1 changes on purpose:**

- 9×9 phone board (11×11 large layout retained for lab)
- Per-player flags on true corners with triple-word capture scoring for any cover (not DWS on steal)
- Market 5 (3 up + 2 down); Draw takes exactly 2; no +1 bag
- 69-tile bag (~⅔ WWF English)
- P1=2 / P2=3 opening tiles from the bag; random P1 each game; first action may be Draw or Play
- Second-steal and self-capture end conditions; +10 end bonus (once); going out; exchange-three (full-rack stall), double-pass, and stuck-out backups
- Leftover tiles at end: **open question** — do not implement until Peter chooses

---

**Questions on spec?** → Finch  
**Code questions?** → Ada  
**Art questions?** → Skye  
**Marketing questions?** → Cleo

**Do not wait on Skye, Cleo, or Peter for v0.1 implementation.** Build from this spec and placeholder data. Update `data/tiles.json` to the 69-tile bag per section 5.

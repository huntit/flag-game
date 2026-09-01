# Flag Prototype Specification

**For Ada** — Build specification v0  
**From Finch** — 31 August 2026

Build this. Do not add out-of-scope features. If something is ambiguous, leave a TODO and ask Finch.

Human-readable rules: [docs/how-to-play.md](how-to-play.md)

## 1. What This Is

A two-player digital prototype combining crossword mechanics, a Splendor-style gem market (take-or-spend), and a rotating capture-the-flag endgame.

**Three play modes, one engine:**

1. **Solo vs Hunter** — Play against Greedy, Hunter, or Sleeper personality (opponent rack **letters** hidden; rack **count** public as 0–7 facedown tile backs with empty slots **plus a readable number**). Local TypeScript engine in the browser. No room server. This is the iPhone Safari feel-test.
2. **Hotseat** — Two humans on one device, local engine. Pass-the-phone. No room.
3. **Remote 2-player** — Live and correspondence are ONE mode (persistent game links). Secret unguessable game/seat links. No 4-letter room codes. Host creates a game and gets a P2 invite link to send. Each seat is a secret token so players can return for days on another device without accounts. No logins, no matchmaking, no friend lists, no accounts for v0. Transport: PartyKit (one Cloudflare Durable Object per game). UI can stay on Vercel; rooms on PartyKit. Authority: the same TypeScript rules engine is room-authoritative. Clients send actions (Draw, Play, Pass). The room validates, applies, and broadcasts public state. Opponent rack **letters** must not leak in the URL or in the other client's payload. Opponent rack **count** is public state. Bag, market, board, scores, flag, whose-turn, and rack counts live on the room. Persistence: store the engine snapshot in room storage. Do NOT destroy the room when tabs close or both players go offline. A game may sit for days. If both players are online it feels live; if not, it waits. Pass is an explicit button. Never treat silence, a closed tab, or elapsed time as a pass. Consecutive double-pass still ends the game only after two explicit Passes in a row (an exchange between Passes breaks the streak). See section 7.3. Notifications are out of scope for v0. Testers ping each other (iMessage etc.) for "your turn" until later.
4. **AI vs AI lab** — Headless simulation for game balance analysis

**Constraints:**

- Phone-first (iPhone Safari), desktop-playable
- Dictionary loaded from a text file Peter will supply
- Headless simulation must run with no UI
- Do NOT add: async-only correspondence as a separate mode, turn clocks/timeouts, spectators (optional later), 3–4p, accounts, push/email, Discord, native iOS

**Tech stack (locked):**

- **Phone-first static web app** — NOT native iOS / TestFlight / App Store for v0
- **TypeScript rules engine** — Shared by UI, CLI, and PartyKit room authority
- **UI:** Vite + React (tap-to-place input for iPhone Safari; do NOT rely on desktop HTML5 drag). The 11×11 grid must stay tap-to-place on iPhone Safari; smaller cells are OK. Do not switch to desktop drag.
- **CLI:** Node.js for `flag-sim` headless simulation
- **Hosting:** Vercel or Cloudflare Pages from huntit/flag-game (every push gets a preview URL)
- **Remote multiplayer:** PartyKit (one Cloudflare Durable Object per game) for rooms
- **Deployment workflow:** Iterate in iPhone Safari, Add to Home Screen for feel-test
- **Solo vs Hunter = local** — Dictionary loaded from `data/words.txt` bundled with app
- **Hotseat = pass-the-phone** — Two humans on one iPhone
- **Remote 2-player = persistent links** — PartyKit rooms with secret seat tokens

## 2. Success Criteria

- Two humans can complete a legal 11×11 game in hotseat mode
- Two humans can complete a legal 11×11 game in remote mode via persistent game links (live and correspondence, same mode)
- Human can play vs Hunter AI on 11×11 with opponent rack **letters** hidden and rack **count** public (0–7 facedown backs with empty slots; local engine, no room)
- `flag-sim --games 200 --p1 greedy --p2 greedy` writes summary JSON with:
  - P1 win rate
  - Capture-end rate vs bag-empty rate
  - Capturer win rate
  - Mean/median scores
  - Mean turn count
  - Draw/play ratio
  - 2-letter play rate
- Tests verify:
  - Flag rotation (clockwise NW → NE → SE → SW)
  - Skip-occupied-posts logic
  - Blank as single market take
  - Full-rack discard-then-take on refresh
  - Remote game persistence across disconnects/days
  - Opponent rack letters not leaked in URL or client payload; rack count is public
  - Opening deal: 2 tiles from the bag to each rack; market still 4; first action may be Draw or Play
  - Dictionary load accepts length 2–11 without shrinking `data/words.txt`
- **Out of scope:** Premiums, bingo, capture bonus, 3–4 player, secret goals, turn clocks/timeouts, spectators, accounts, push/email notifications

## 3. Board

**Size:** 11×11 (NOT 10×10 — an odd size is required so there is a centre cell)

**Coordinates:** 1–11 (persist and log as 1-indexed). Row 1 at top, column 1 at left.

**Centre star:** (6,6)

**Flag posts:** Four fixed locations one square in from each corner:

- Northwest: (2,2)
- Northeast: (2,10)
- Southeast: (10,10)
- Southwest: (10,2)

**Flag rotation:** Clockwise: NW → NE → SE → SW → NW (repeat).

**Live post:** One post is live (the active capture target) at a time. Setup picks uniformly at random from the four posts.

**No premium squares.**

## 4. Tiles

**DO NOT use a third-party crossword publisher's bag composition or letter values.**

**Tile set:** ✅ Available at `data/tiles.json`

**Source:**
- **Letter values:** Word Eagle TILE_SETS.wwf (huntit/web-apps/wordgame/index.html lines ~997–1002)
- **Bag counts:** Published Words With Friends English distribution (104 tiles, 2 blanks)

**Complete WWF English tile set (104 tiles):**

```
A9 B2 C2 D5 E13 F2 G3 H4 I8 J1 K1 L4 M2 N5 O8 P2 Q1 R6 S5 T7 U4 V2 W2 X1 Y2 Z1 Blank 2
```

**Letter values:**

```
A1 B4 C4 D2 E1 F4 G3 H3 I1 J10 K5 L2 M4 N2 O1 P4 Q10 R1 S1 T1 U2 V5 W4 X8 Y3 Z10
```

**Important:**
- Load both counts and values from `data/tiles.json`
- **NOT** NYT Crossplay bag (100 tiles / 3 blanks / different values)
- **NOT** Scrabble bag (100 tiles / different counts)
- Flag uses the **WWF English bag (104 tiles)** paired with **Word Eagle's WWF letter values**

**Blank tiles:**

- Can be taken from the market
- When played, the player assigns it a letter permanently
- Scores 0 points
- Dictionary validation checks the assigned letter (the blank becomes that letter for crossword validation)

## 5. Dictionary

Peter's custom ENABLE-based word list with additions and exclusions from Word Eagle. **NOT a stock ENABLE dump and NOT an official crossword word list.**

**Path:** `data/words.txt` ✅

**Format:**

- Text file, one word per line
- Uppercase A–Z only
- Full source contains words of length 2–28
- **For v0 (11×11 board):** At load, accept words of length 2–11 for validation. Keep the full `data/words.txt` file; do not shrink it.
- No network lookup at runtime

**Validation:**

A play is legal if and only if every new straight-line word (the main play word plus all crosswords formed) appears in the dictionary. Single-letter crosses are not words.

## 6. Setup

1. Shuffle the tile bag
2. Deal 4 tiles face-up to the market
3. Deal **2 tiles from the bag** to each player (not from the market; do NOT deal 7; do NOT deal from the market into opening racks)
4. Choose a random live post (uniform random from the four)
5. Player 1 goes first

**The first action of the game may be Draw or Play.** It is no longer “must Draw”.

## 7. Turn Structure

Each turn: **Draw** OR **Play**, then flag rotation (unless game ended).

### 7.1 Draw

**Room calculation:** `room = 7 - rack.size`

**Market take:**

- Announce 1 or 2 tiles from the market
- **If take includes a blank, player may take only 1 tile** (the blank)

**Refresh (exceeding capacity):**

- If `take.size > room`:
  - First, return `take.size - room` tiles from rack to bag (player's choice)
  - Shuffle the bag
  - This is **refresh mode**
- Take from market
- **Optional bag tile:**
  - If NOT refresh mode
  - AND `rack.size < 7` after market take
  - AND bag is not empty
  - Then player may take 1 facedown tile from the bag

**Refill market to 4 tiles from the bag.**

If the bag runs out during market refill, set `bagDepleted = true`. The game will end after this turn's flag rotation, even if a post is empty.

**Illegal draw:** Drawing 0 tiles is illegal unless the market is empty (stuck case).

### 7.2 Play

**Placement:**

- Place 1 or more tiles from rack in a straight line (horizontal or vertical)
- Tiles must be contiguous when read through existing board tiles
- **First word must occupy (6,6)**
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
- Sum all new words' scores → that's the turn score

**Capturing the flag:**

- If any newly placed tile lands on the **live post**:
  - **Capture!** Score the play normally
  - Game ends immediately
  - Skip flag rotation
  - **No extra capture bonus points**
- Placing tiles on a dark post (not currently live) is legal and does NOT capture

**No bingo bonus.**

### 7.3 Pass (Stuck-Only)

**Locked (Finch, 31 August 2026).** Ada's full-rack Pass rule is confirmed. Do not treat Pass as a voluntary third action. Do not invent a fifth `endReason`.

**Pass is NOT a voluntary third action.** It exists solely for the stuck case. Never silence, a closed tab, or elapsed time. Never a third choice when the player can Play **or** can add tiles to the rack.

**When Pass is legal:**

Pass is legal **only when** both are true:

- **No legal Play** (no valid word placements possible), AND
- **No legal Draw for Pass purposes**

**"Legal Draw" for Pass purposes** means a Draw that would **ADD at least one tile to the rack**: an empty slot exists (`rack.size < 7`) AND at least one takeable tile exists (market and/or bag). A full rack (7) is therefore **no legal Draw for Pass purposes**, even if the market and bag still have tiles.

**Full-rack exchange remains a legal Draw ACTION.** With a full rack the player may still Draw: discard into the bag first, then take 1–2 from the market (1 if blank). No facedown bag tile on a full-rack refresh. That exchange does **not** make Pass illegal.

**Consequences:**

- Full rack + no legal Play → the player may **Pass OR exchange**
- Rack space + takeable tiles → Pass is **illegal** even if they cannot Play (they must Draw or Play)
- Market and bag both empty + no legal Play → Pass (classic stuck case)

**Why:** otherwise two full unplayable racks can exchange forever (tile-neutral with bag/market) and the game never hits bag-empty, capture, or double-pass.

**UI requirement:**

- Pass is an **explicit button** the player must tap
- The Pass button is **disabled or hidden** when the player can Play, or when a Draw would add a tile to the rack
- The Pass button may be enabled at the same time as a full-rack exchange (both are legal)
- **Never auto-pass:** Do not treat silence, a closed tab, or elapsed time as a pass (critical for remote/correspondence multiplayer)

**After a pass:**

- Still rotate the flag
- Consecutive double-pass ends the game **only after two consecutive explicit Passes** (one from each player)
- An exchange (or any Draw or Play) between Passes **breaks the streak**

**Important:** Draw XOR Play remains the normal turn action. Pass is a stuck-only escape valve, not a stalling tactic, and not a voluntary skip when tiles can be added.

### 7.4 Flag Rotation (if no capture)

Walk clockwise from the current live post (exclusive), wrapping through the four posts. The next **empty** square becomes live.

If no posts are empty, the game ends (`posts_full`).

**Order:** NW (2,2) → NE (2,10) → SE (10,10) → SW (10,2) → NW (repeat)

## 8. Game End

The game ends when:

- **Capture** — A player covers the live post
- **Bag depleted** — After flag rotation, if `bagDepleted` is true
- **Posts full** — All four posts are occupied
- **Double pass** — Two consecutive explicit Passes (one from each player). An exchange between Passes breaks the streak.

**Winner:** Higher score. Ties are draws (no tiebreaker).

**Log `endReason`:** One of: `capture`, `bag`, `posts_full`, `double_pass`.

Do NOT tie-break by who captured.

## 9. UI Requirements (Minimum)

**Layout — no vertical scrolling (locked 31 Aug 2026).**

The whole play UI (board, market, racks, action buttons) must fit the visual viewport on iPhone and iPad. The player must never scroll to reach Draw, Play, Shuffle or Pass. If space runs short, shrink the chrome — never the reachability of the buttons. Use the safe area (`env(safe-area-inset-*)` with `viewport-fit=cover`). State the constraint in CSS: the play screen is `100svh` tall (falling back to `100dvh`, then `100vh`) with `overflow: hidden`, and the board is sized from whatever height the chrome leaves over.

Desktop browsers (wide window, `pointer: fine` — Safari on Mac) use a separate compact centered column: board and tiles are capped and do not grow with the window, the market sits under the board, the rack sits next to a stable action toolbar, and the opponent rack stays a facedown count. Gate that layout with `min-width` + `pointer: fine` only. Do not user-agent sniff. Do not change the iPhone/iPad shells.

**Action buttons.** Every action button is enabled only when that action is legal or has a reason to press, and disabled otherwise. Pass included — see section 7.3.

**Shuffle.** The player can shuffle their own rack. Shuffling is **not a turn**: it does not advance the flag, does not change the score, and does not change tile identity — only the order tiles sit in.

**Board view:**

- 11×11 grid
- Live post highlighted prominently
- Dark posts visible but quieter
- Centre star visible until first word is played
- Tiles on board with letters and scores visible
- **Must stay tap-to-place on iPhone Safari.** Smaller cells are OK. Do not switch to desktop drag.

**Game state:**

- 4-tile market display
- Bag tile count
- Both player scores
- Whose turn it is
- Game-end overlay with winner and final scores

**Racks:**

- Your own rack always visible (letters)
- **Opponent (and AI) rack CONTENTS stay hidden.** Rack **COUNT** is public: show 0–7 facedown tile backs with empty slots, **and show the count as a number** — Peter asked for the count to be readable at a glance for strategy (31 Aug 2026)
- **Hotseat:** Pass-the-device interstitial between turns. After the interstitial, the incoming player sees how many tiles the opponent has (facedown backs and empty slots), not the letters
- **Remote 2-player:** Rack count is public state; letters are not. Do not leak opponent letters in the URL or the other client's payload

**Debug toggle (optional):**

- Show opponent rack **letters** (count is already public as facedown backs)
- Show count of legal plays available

**Draw flow:**

- Tap 1 or 2 market tiles (1 if blank selected)
- If selection exceeds 7, first discard enough tiles from rack
- Confirm selection
- Optional +1 from bag button (disabled in refresh mode)

**Play flow:**

- Tap tiles from rack to board (tap-to-place). On iPhone Safari this remains tap-to-place even on the 11×11 grid; smaller cells are OK. Do not switch to desktop drag as the primary input.
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

Art is Skye's domain later. For v0:

- Letter tiles
- Grid
- Highlighted posts
- Minimal visual clarity is enough

**Useful Word Eagle UX to reuse later (do NOT copy code now):**

- Tile rack layout
- Browser drag-and-drop (desktop later only; v0 iPhone Safari stays tap-to-place on 11×11)
- Word definition lookup on click

## 10. Remote Multiplayer (Persistent Game Links)

**Live and correspondence are ONE mode, not two products.**

### Architecture

**Transport:** PartyKit (one Cloudflare Durable Object per game). UI can stay on Vercel; rooms on PartyKit. Do NOT add a general Node game server. Do NOT use WebRTC/P2P (unreliable on iPhone Safari).

**Authority:** The same TypeScript rules engine is room-authoritative. Clients send actions (Draw, Play, Pass). The room validates, applies, and broadcasts public state.

**Privacy:** Opponent rack **letters** must NOT leak in the URL or in the other client's payload. Opponent rack **count** is public state. Bag, market, board, scores, flag, whose-turn, and rack counts live on the room.

**Persistence:** Store the engine snapshot in room storage. Do NOT destroy the room when tabs close or both players go offline. A game may sit for days. If both players are online it feels live; if not, it waits.

### Game Creation and Joining

**Host creates a game:**

1. Click "Create Remote Game"
2. Host gets a P2 invite link to send (e.g., via iMessage, email, etc.)
3. Each seat is a secret unguessable token (NOT 4-letter room codes — those get guessed over days)
4. Players can return for days on another device without accounts

**No logins, no matchmaking, no friend lists, no accounts for v0.**

### Pass Behavior

Pass is an explicit button. Never treat silence, a closed tab, or elapsed time as a pass. Consecutive double-pass still ends the game only after two explicit Passes in a row (one from each player). An exchange between Passes breaks the streak. See section 7.3 for Pass legality (full-rack exchange does not make Pass illegal).

### Notifications

Notifications are out of scope for v0. Testers ping each other (iMessage etc.) for "your turn" until later.

### Out of Scope for v0

- Async-only correspondence as a separate mode
- Turn clocks/timeouts
- Spectators (optional later)
- 3–4 player variants
- Accounts
- Push/email notifications
- Discord integration
- Native iOS app

## 11. Move Generator

`legalPlays(board, rack, isFirstWord) → [Play]`

Returns all legal plays with:

- Tiles used
- Board cells
- Words formed
- Score
- `captures` (boolean)

**Implementation:** Brute force is acceptable for 11×11.

Use the same generator for:

- AI move selection
- Illegal-play rejection messages

## 12. AI Personalities

**No search-based AI.** Three simple personalities. They play the same v0 setup: 11×11 board, 2 opening tiles from the bag, market of 4, first action may be Draw or Play. Opponent rack letters stay hidden from the human; rack count is public.

**Shared constant:** `DRAW_THRESHOLD = 8` (CLI-configurable)

### Greedy

- If best play's score ≥ threshold:
  - Play it
  - Tiebreaker: longer word, then capture-over-not, then stable random
- Else: Draw
- If no legal plays exist: Draw

### Hunter

- If any capture play exists:
  - Play the highest-scoring capture
- Else: Greedy behavior

### Sleeper

- If any capture play exists that would put you **strictly ahead** on points:
  - Play the highest-scoring among those captures
- Else: Greedy behavior, **excluding captures** (never capture unless it wins)

### Draw Policy (All Personalities)

Keep this simple and dumb:

1. **If blank in market and you have room** (or can discard to make room):
   - Take blank only
2. **Else:**
   - Take 2 random market tiles (or 1 if only 1 available, or room allows only 1)
3. **If take would exceed 7:**
   - Discard random tiles from rack until room is available
   - Prefer discarding duplicate letters
   - Never discard a blank if other tiles exist
4. **Optional bag tile:**
   - Take 1 facedown tile from bag if:
     - NOT refresh mode
     - Rack size after market take ≤ 5
     - Bag not empty

**No thinking-time slider.** Human vs AI should respond instantly.

## 13. Lab CLI (Simulation Mode)

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
- `endReason` (capture, bag, posts_full, double_pass)
- `capturer` (P1, P2, or null)
- `capturerWon` (boolean or null)
- `scoreP1`
- `scoreP2`
- `turns` (total)
- `playsP1`, `drawsP1`, `discardsP1`
- `playsP2`, `drawsP2`, `discardsP2`
- `wordLengths` (array)
- `wordScores` (array)
- `twoLetterPlays` (count)
- `captureWordLength` (or null)
- `captureWordScore` (or null)
- `capturePost` (NW, NE, SE, SW, or null)
- `captureTurn` (turn number or null)
- `captureWasRefused` (boolean or null — did the capturer previously refuse a capture?)
- `legalCapturesRefused` (count of times a capture play was available but not taken)

### Summary JSON

Write summary statistics in a separate file:

- `games` (total count)
- `drawRate` (ties)
- `p1WinRate`
- `personalityWinRate` (adjusting for swaps)
- `captureEndRate`
- `bagEndRate`
- `capturerWinRate` (when someone captured, did they win?)
- Mean and median scores (per player, per game)
- `meanTurns`
- `meanDrawPlayRatio` (draws per play)
- `meanWordLength`
- `twoLetterPlayRate`
- `meanCaptureTurn` (turn number when flag was captured)
- `refusedCaptureRate` (fraction of games with ≥1 refused capture)

**Output:**

- Print a summary table to stdout
- Write JSONL and summary JSON to `--out` directory

### Default Matchups

For the UI "Run lab" button, default to:

1. Greedy vs Greedy
2. Hunter vs Sleeper
3. Hunter vs Greedy

Other matchups via CLI.

## 14. Tuning Knobs

**Constants (with CLI overrides where noted):**

- `DRAW_THRESHOLD = 8` (CLI-configurable: `--threshold`)
- Board size: 11×11 (NOT a runtime flag; NOT 10×10 — need a centre cell)

**Hooks for later tuning (commented out, not implemented):**

- **Capture double-word:** Capturing play scores twice (not +20)
- **Second-player extra starting tile:** P2 begins with 1 tile

**After lab results:**

- If P1 win rate > 60%, consider giving P2 an extra starting tile
- If capturer win rate << 50%, consider capture double-word
- If 2-letter play rate is absurdly high, consider a length bonus

**Do NOT implement these patches until Finch says so.**

## 15. Out of Scope (Not v0)

**3–4 player variant (later):**

- Rotate flag per round, not per turn
- Capture scores points and jumps you ahead instead of ending the game
- 5 or 6 market tiles
- Board larger than v0's 11×11 at 4 players
- Public contracts, not hidden roles

**Also out of scope:**

- Hidden roles
- Secret goals
- Public contracts
- Premium squares
- Bingo bonus
- Capture bonus
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

## 16. Design Intent (Do NOT "Fix")

These are intentional design choices:

- **Take-or-spend, no refill after play** — Playing empties your rack; drawing builds it
- **Flag is a clock, not a scoring event** — No capture bonus; capturing ends the game
- **Flag known before you act** — Don't randomize the live post after a player commits
- **Rotation on Draw is a stall tax** — Even drawing advances the flag
- **Two opening tiles from the bag** — Deal 2 from the bag to each rack (not empty opening racks, not 7, not from the market). First action may be Draw or Play
- **11×11, not 10×10** — Odd size so there is a centre cell at (6,6)
- **Public rack count, hidden letters** — Show facedown backs and empty slots plus a readable count number; never expose opponent letters

## 17. Original Spark (Context, Not v0)

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

**v0 changes on purpose:**

- 11×11 board (not 15×15, not 10×10 — odd size needed for a centre cell)
- Four posted squares rotating clockwise (not a new random cell each turn)
- No capture bonus
- Exchange action folded into Draw
- Two opening tiles dealt from the bag; first action may be Draw or Play
- Bag-empty and posts-full as backup game-end conditions

---

**Questions on spec?** → Finch  
**Code questions?** → Ada  
**Art questions?** → Skye  
**Marketing questions?** → Cleo

**Do not wait on Skye, Cleo, or Peter for v0 implementation.** Build from this spec and placeholder data.

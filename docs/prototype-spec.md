# Flag Prototype Specification

**For Ada** — Build specification v0  
**From Finch** — 31 August 2026

Build this. Do not add out-of-scope features. If something is ambiguous, leave a TODO and ask Finch.

Human-readable rules: [docs/how-to-play.md](how-to-play.md)

## 1. What This Is

A two-player digital prototype combining crossword mechanics, a Splendor-style gem market (take-or-spend), and a rotating capture-the-flag endgame.

**Three play modes, one engine:**

1. **Solo vs Hunter** — Play against Greedy, Hunter, or Sleeper personality (opponent rack hidden). Local TypeScript engine in the browser. No room server. This is the iPhone Safari feel-test.
2. **Hotseat** — Two humans on one device, local engine. Pass-the-phone. No room.
3. **Remote 2-player** — Live and correspondence are ONE mode (persistent game links). Secret unguessable game/seat links. No 4-letter room codes. Host creates a game and gets a P2 invite link to send. Each seat is a secret token so players can return for days on another device without accounts. No logins, no matchmaking, no friend lists, no accounts for v0. Transport: PartyKit (one Cloudflare Durable Object per game). UI can stay on Vercel; rooms on PartyKit. Authority: the same TypeScript rules engine is room-authoritative. Clients send actions (Draw, Play, Pass). The room validates, applies, and broadcasts public state. Opponent racks must not leak in the URL or in the other client's payload. Bag, market, board, scores, flag, and whose-turn live on the room. Persistence: store the engine snapshot in room storage. Do NOT destroy the room when tabs close or both players go offline. A game may sit for days. If both players are online it feels live; if not, it waits. Pass is an explicit button. Never treat silence, a closed tab, or elapsed time as a pass. Consecutive double-pass still ends the game only after two explicit passes in a row. Notifications are out of scope for v0. Testers ping each other (iMessage etc.) for "your turn" until later.
4. **AI vs AI lab** — Headless simulation for game balance analysis

**Constraints:**

- Phone-first (iPhone Safari), desktop-playable
- Dictionary loaded from a text file Peter will supply
- Headless simulation must run with no UI
- Do NOT add: async-only correspondence as a separate mode, turn clocks/timeouts, spectators (optional later), 3–4p, accounts, push/email, Discord, native iOS

**Tech stack (locked):**

- **Phone-first static web app** — NOT native iOS / TestFlight / App Store for v0
- **TypeScript rules engine** — Shared by UI, CLI, and PartyKit room authority
- **UI:** Vite + React (tap-to-place input for iPhone Safari; do NOT rely on desktop HTML5 drag)
- **CLI:** Node.js for `flag-sim` headless simulation
- **Hosting:** Vercel or Cloudflare Pages from huntit/flag-game (every push gets a preview URL)
- **Remote multiplayer:** PartyKit (one Cloudflare Durable Object per game) for rooms
- **Deployment workflow:** Iterate in iPhone Safari, Add to Home Screen for feel-test
- **Solo vs Hunter = local** — Dictionary loaded from `data/words.txt` bundled with app
- **Hotseat = pass-the-phone** — Two humans on one iPhone
- **Remote 2-player = persistent links** — PartyKit rooms with secret seat tokens

## 2. Success Criteria

- Two humans can complete a legal 9×9 game in hotseat mode
- Two humans can complete a legal 9×9 game in remote mode via persistent game links (live and correspondence, same mode)
- Human can play vs Hunter AI with opponent rack hidden (local engine, no room)
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
  - Opponent rack not leaked in URL or client payload
- **Out of scope:** Premiums, bingo, capture bonus, 3–4 player, secret goals, turn clocks/timeouts, spectators, accounts, push/email notifications

## 3. Board

**Size:** 9×9

**Coordinates:** 1–9 (persist and log as 1-indexed). Row 1 at top, column 1 at left.

**Centre star:** (5,5)

**Flag posts:** Four fixed locations one square in from each corner:

- Northwest: (2,2)
- Northeast: (2,8)
- Southeast: (8,8)
- Southwest: (8,2)

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
- **For v0 (9×9 board):** Load only words of length 2–9 for validation
- No network lookup at runtime

**Validation:**

A play is legal if and only if every new straight-line word (the main play word plus all crosswords formed) appears in the dictionary. Single-letter crosses are not words.

## 6. Setup

1. Shuffle the tile bag
2. Deal 4 tiles face-up to the market
3. Both player racks start **empty** (0 tiles)
4. Choose a random live post (uniform random from the four)
5. Player 1 goes first

**First legal action of the game is Draw.**

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
- **First word must occupy (5,5)**
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

**Pass is NOT a voluntary third action.** It exists solely for the stuck case where the active player has no legal moves.

**When Pass is legal:**

- Pass is legal **only when** the player has:
  - No legal Draw (market and bag both empty), AND
  - No legal Play (no valid word placements possible)

**UI requirement:**

- Pass is an **explicit button** the player must tap
- The Pass button is **disabled or hidden** when Draw or Play is legal
- **Never auto-pass:** Do not treat silence, a closed tab, or elapsed time as a pass (critical for remote/correspondence multiplayer)

**After a pass:**

- Still rotate the flag
- Consecutive double-pass (two explicit stuck-passes in a row) ends the game

**Important:** Draw XOR Play remains the normal turn action. Pass is a stuck-only escape valve, not a stalling tactic.

### 7.4 Flag Rotation (if no capture)

Walk clockwise from the current live post (exclusive), wrapping through the four posts. The next **empty** square becomes live.

If no posts are empty, the game ends (`posts_full`).

**Order:** NW (2,2) → NE (2,8) → SE (8,8) → SW (8,2) → NW (repeat)

## 8. Game End

The game ends when:

- **Capture** — A player covers the live post
- **Bag depleted** — After flag rotation, if `bagDepleted` is true
- **Posts full** — All four posts are occupied
- **Double pass** — Both players pass consecutively

**Winner:** Higher score. Ties are draws (no tiebreaker).

**Log `endReason`:** One of: `capture`, `bag`, `posts_full`, `double_pass`.

Do NOT tie-break by who captured.

## 9. UI Requirements (Minimum)

**Board view:**

- 9×9 grid
- Live post highlighted prominently
- Dark posts visible but quieter
- Centre star visible until first word is played
- Tiles on board with letters and scores visible

**Game state:**

- 4-tile market display
- Bag tile count
- Both player scores
- Whose turn it is
- Game-end overlay with winner and final scores

**Racks:**

- Your own rack always visible
- **Opponent rack hidden** in Human vs AI mode
- **Hotseat:** Pass-the-device interstitial between turns (hide opponent rack)

**Debug toggle (optional):**

- Show opponent rack
- Show count of legal plays available

**Draw flow:**

- Tap 1 or 2 market tiles (1 if blank selected)
- If selection exceeds 7, first discard enough tiles from rack
- Confirm selection
- Optional +1 from bag button (disabled in refresh mode)

**Play flow:**

- Drag or tap tiles from rack to board
- Confirm placement
- Reject illegal plays with a short reason (e.g., "Not in dictionary", "Must attach to existing word")

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
- Browser drag-and-drop
- Word definition lookup on click

## 10. Remote Multiplayer (Persistent Game Links)

**Live and correspondence are ONE mode, not two products.**

### Architecture

**Transport:** PartyKit (one Cloudflare Durable Object per game). UI can stay on Vercel; rooms on PartyKit. Do NOT add a general Node game server. Do NOT use WebRTC/P2P (unreliable on iPhone Safari).

**Authority:** The same TypeScript rules engine is room-authoritative. Clients send actions (Draw, Play, Pass). The room validates, applies, and broadcasts public state.

**Privacy:** Opponent racks must NOT leak in the URL or in the other client's payload. Bag, market, board, scores, flag, and whose-turn live on the room.

**Persistence:** Store the engine snapshot in room storage. Do NOT destroy the room when tabs close or both players go offline. A game may sit for days. If both players are online it feels live; if not, it waits.

### Game Creation and Joining

**Host creates a game:**

1. Click "Create Remote Game"
2. Host gets a P2 invite link to send (e.g., via iMessage, email, etc.)
3. Each seat is a secret unguessable token (NOT 4-letter room codes — those get guessed over days)
4. Players can return for days on another device without accounts

**No logins, no matchmaking, no friend lists, no accounts for v0.**

### Pass Behavior

Pass is an explicit button. Never treat silence, a closed tab, or elapsed time as a pass. Consecutive double-pass still ends the game only after two explicit passes in a row.

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

**Implementation:** Brute force is acceptable for 9×9.

Use the same generator for:

- AI move selection
- Illegal-play rejection messages

## 12. AI Personalities

**No search-based AI.** Three simple personalities.

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
- Board size: 9×9 (NOT a runtime flag)

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
- 11×11 board at 4 players
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
- **Empty racks at setup** — Do not deal starting tiles; first action is Draw

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

- 9×9 board (not 15×15)
- Four posted squares rotating clockwise (not a new random cell each turn)
- No capture bonus
- Exchange action folded into Draw
- Bag-empty and posts-full as backup game-end conditions

---

**Questions on spec?** → Finch  
**Code questions?** → Ada  
**Art questions?** → Skye  
**Marketing questions?** → Cleo

**Do not wait on Skye, Cleo, or Peter for v0 implementation.** Build from this spec and placeholder data.

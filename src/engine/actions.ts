// Action executor - validates then applies game actions

import type { GameState, GameAction, DrawAction, PlayAction, Tile, Letter, Position } from './types';
import { MARKET_SIZE, RACK_MAX, MAX_MARKET_TAKE } from './types';
import { drawFromBag, returnToBag, shuffleBag, setBoardTile, getNextFlagPost } from './game';
import { validatePlay } from './validator';
import { hasLegalPlay } from './moveGenerator';
import type { Dictionary } from './dictionary';

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Draw is available whenever there is anything to take. Taking zero market tiles
 * is only legal as the stuck case where the market is empty.
 */
export function canDraw(state: GameState): boolean {
  return state.market.length > 0 || state.bag.length > 0;
}

/**
 * Can a draw actually add tiles to the active player's rack?
 *
 * Locked (Finch, 31 August 2026; spec §7.3). A Draw counts as "legal" for Pass
 * purposes only if it would ADD at least one tile: an empty slot exists AND at
 * least one takeable tile from market/bag. A full rack is therefore no legal
 * Draw for Pass purposes. Full-rack exchange remains a legal Draw ACTION
 * (discard into the bag, then take 1–2 from the market; no facedown on a
 * full-rack refresh) and does not make Pass illegal. Otherwise two full
 * unplayable racks can exchange forever (tile-neutral) and never hit
 * bag-empty, capture, or double-pass.
 */
export function canGrowRack(state: GameState): boolean {
  const player = state.players[state.currentPlayer];
  if (player.rack.length >= RACK_MAX) return false;
  return canDraw(state);
}

/**
 * Pass is a stuck-only escape valve: legal only when no draw can grow the rack
 * and no play is legal. Never triggered by silence or elapsed time — the player
 * must tap the button. Omitting `dictionary` checks the Draw half only.
 */
export function canPass(state: GameState, dictionary?: Dictionary): boolean {
  if (canGrowRack(state)) return false;
  if (!dictionary) return true;
  const player = state.players[state.currentPlayer];
  return !hasLegalPlay(state.board, player.rack, dictionary, state.livePost);
}

export function executeAction(
  state: GameState,
  action: GameAction,
  dictionary: Dictionary
): ActionResult {
  if (state.gameOver) {
    return { success: false, error: 'Game is over' };
  }

  switch (action.type) {
    case 'draw':
      return executeDraw(state, action);
    case 'play':
      return executePlay(state, action, dictionary);
    case 'pass':
      return executePass(state, dictionary);
    default:
      return { success: false, error: 'Invalid action type' };
  }
}

interface DrawPlan {
  take: Tile[];
  discard: Tile[];
  isRefresh: boolean;
  takeBagTile: boolean;
}

/**
 * Check a draw in full before touching any state, so a rejected draw cannot
 * leave the market or rack half-updated.
 */
export function validateDraw(
  state: GameState,
  action: DrawAction
): { valid: false; reason: string } | { valid: true; plan: DrawPlan } {
  const player = state.players[state.currentPlayer];

  const requested = action.marketTiles ?? [];
  if (new Set(requested).size !== requested.length) {
    return { valid: false, reason: 'Cannot take the same market tile twice' };
  }

  if (requested.length === 0 && state.market.length > 0) {
    return { valid: false, reason: 'Pick a market tile to draw' };
  }

  if (requested.length > MAX_MARKET_TAKE) {
    return { valid: false, reason: `Take at most ${MAX_MARKET_TAKE} market tiles` };
  }

  const take: Tile[] = [];
  for (const tileId of requested) {
    const tile = state.market.find(t => t.id === tileId);
    if (!tile) return { valid: false, reason: 'That tile is not in the market' };
    take.push(tile);
  }

  if (take.some(t => t.isBlank) && take.length > 1) {
    return { valid: false, reason: 'A blank is your whole market take' };
  }

  const room = RACK_MAX - player.rack.length;
  const isRefresh = take.length > room;
  const discardIds = action.discardTiles ?? [];

  if (isRefresh) {
    const required = take.length - room;
    if (discardIds.length !== required) {
      return {
        valid: false,
        reason: `Discard ${required} tile${required === 1 ? '' : 's'} to make room`,
      };
    }
  } else if (discardIds.length > 0) {
    return { valid: false, reason: 'No need to discard' };
  }

  if (new Set(discardIds).size !== discardIds.length) {
    return { valid: false, reason: 'Cannot discard the same tile twice' };
  }

  const discard: Tile[] = [];
  for (const tileId of discardIds) {
    const tile = player.rack.find(t => t.id === tileId);
    if (!tile) return { valid: false, reason: 'That tile is not in your rack' };
    discard.push(tile);
  }

  if (action.takeBagTile) {
    if (isRefresh) {
      return { valid: false, reason: 'No bag tile on a refresh turn' };
    }
    if (player.rack.length - discard.length + take.length >= RACK_MAX) {
      return { valid: false, reason: 'Rack would be full' };
    }
    if (state.bag.length === 0) {
      return { valid: false, reason: 'The bag is empty' };
    }
  }

  if (take.length === 0 && !action.takeBagTile && state.bag.length === 0) {
    return { valid: false, reason: 'Nothing left to draw' };
  }

  return {
    valid: true,
    plan: { take, discard, isRefresh, takeBagTile: Boolean(action.takeBagTile) },
  };
}

function executeDraw(state: GameState, action: DrawAction): ActionResult {
  const check = validateDraw(state, action);
  if (!check.valid) {
    return { success: false, error: check.reason };
  }

  const { take, discard, isRefresh, takeBagTile } = check.plan;
  const player = state.players[state.currentPlayer];

  if (isRefresh) {
    const discardIds = new Set(discard.map(t => t.id));
    player.rack = player.rack.filter(t => !discardIds.has(t.id));
    returnToBag(state.bag, discard);
    shuffleBag(state.bag);
  }

  const takenIds = new Set(take.map(t => t.id));
  state.market = state.market.filter(t => !takenIds.has(t.id));
  player.rack.push(...take);

  if (takeBagTile) {
    player.rack.push(...drawFromBag(state.bag, 1));
  }

  state.market.push(...drawFromBag(state.bag, MARKET_SIZE - state.market.length));

  // The bag running dry during the market refill ends the game after rotation.
  if (state.market.length < MARKET_SIZE && state.bag.length === 0) {
    state.bagDepleted = true;
  }

  state.consecutivePasses = 0;
  state.lastPlay = undefined;
  state.moveHistory.push({ player: player.id, action });

  rotateFlagAndCheckEnd(state);
  advanceTurn(state);

  return { success: true };
}

function executePlay(state: GameState, action: PlayAction, dictionary: Dictionary): ActionResult {
  const player = state.players[state.currentPlayer];

  if (action.placements.length === 0) {
    return { success: false, error: 'No tiles placed' };
  }

  const usedIds = action.placements.map(p => p.tileId);
  if (new Set(usedIds).size !== usedIds.length) {
    return { success: false, error: 'Cannot play the same tile twice' };
  }

  const placements: { tile: Tile; position: Position; assignedLetter?: Letter }[] = [];
  for (const placement of action.placements) {
    const tile = player.rack.find(t => t.id === placement.tileId);
    if (!tile) {
      return { success: false, error: 'That tile is not in your rack' };
    }
    placements.push({
      tile,
      position: placement.position,
      assignedLetter: placement.assignedLetter,
    });
  }

  const result = validatePlay(state.board, placements, dictionary, state.livePost);
  if (!result.valid) {
    return { success: false, error: result.reason };
  }

  for (const placement of placements) {
    setBoardTile(state.board, placement.position, {
      ...placement.tile,
      assignedLetter: placement.assignedLetter,
    });
  }

  const playedIds = new Set(usedIds);
  player.rack = player.rack.filter(t => !playedIds.has(t.id));

  // Rack is not refilled after a play — that is the take-or-spend tension.
  player.score += result.totalScore ?? 0;

  state.consecutivePasses = 0;
  state.lastPlay = {
    player: player.id,
    words: result.words ?? [],
    totalScore: result.totalScore ?? 0,
    captures: result.captures ?? false,
  };
  state.moveHistory.push({ player: player.id, action });

  if (result.captures) {
    state.gameOver = true;
    state.endReason = 'capture';
    determineWinner(state);
    return { success: true };
  }

  rotateFlagAndCheckEnd(state);
  advanceTurn(state);

  return { success: true };
}

function executePass(state: GameState, dictionary: Dictionary): ActionResult {
  if (canGrowRack(state)) {
    return { success: false, error: 'Pass is only for when Draw and Play are both impossible' };
  }
  if (!canPass(state, dictionary)) {
    return { success: false, error: 'You still have a legal play' };
  }

  const player = state.players[state.currentPlayer];

  state.consecutivePasses++;
  state.lastPlay = undefined;
  state.moveHistory.push({ player: player.id, action: { type: 'pass' } });

  // Only two explicit passes in a row end the game.
  if (state.consecutivePasses >= 2) {
    state.gameOver = true;
    state.endReason = 'double_pass';
    determineWinner(state);
    return { success: true };
  }

  rotateFlagAndCheckEnd(state);
  advanceTurn(state);

  return { success: true };
}

function advanceTurn(state: GameState): void {
  if (state.gameOver) return;
  state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
  state.turnCount++;
}

function rotateFlagAndCheckEnd(state: GameState): void {
  if (state.bagDepleted) {
    state.gameOver = true;
    state.endReason = 'bag';
    determineWinner(state);
    return;
  }

  const nextPost = getNextFlagPost(state.livePost, state.board);
  if (nextPost === null) {
    state.gameOver = true;
    state.endReason = 'posts_full';
    determineWinner(state);
    return;
  }

  state.livePost = nextPost;
}

function determineWinner(state: GameState): void {
  const [p1, p2] = state.players;
  if (p1.score > p2.score) {
    state.winner = 'P1';
  } else if (p2.score > p1.score) {
    state.winner = 'P2';
  } else {
    state.winner = 'draw';
  }
}

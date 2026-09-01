// Action executor - validates then applies game actions

import type { GameState, GameAction, DrawAction, PlayAction, Tile, Letter, Position } from './types';
import { DRAW_COUNT, RACK_MAX, MAX_CONSECUTIVE_EXCHANGES } from './types';
import {
  returnToBag,
  shuffleBag,
  setBoardTile,
  marketShowingCount,
  refillMarketSlot,
  randomEmptySpareCorner,
  emptySpareCorners,
} from './game';
import { validatePlay, type FlagContext } from './validator';
import { hasLegalPlay } from './moveGenerator';
import type { Dictionary } from './dictionary';

export interface ActionResult {
  success: boolean;
  error?: string;
}

/** Draw is legal when at least 2 tiles are showing in the market. */
export function canDraw(state: GameState): boolean {
  if (state.gameOver) return false;
  return marketShowingCount(state.market) >= DRAW_COUNT;
}

/**
 * Pass is legal only when no legal Play AND Draw is illegal (market showing < 2).
 */
export function canPass(state: GameState, dictionary?: Dictionary): boolean {
  if (state.gameOver) return false;
  if (canDraw(state)) return false;
  if (!dictionary) return true;
  const player = state.players[state.currentPlayer];
  return !hasLegalPlay(state, player.rack, dictionary, player.id);
}

/** A Draw is an Exchange when the acting player already holds a full rack (Draw 2 + Discard 2). */
export function isExchangeDraw(state: GameState): boolean {
  return state.players[state.currentPlayer].rack.length >= RACK_MAX;
}

/** The next Draw would be the 3rd consecutive Exchange and would end the game. */
export function wouldTriggerExchangeThreeOnDraw(state: GameState): boolean {
  return isExchangeDraw(state) && state.consecutiveExchanges === MAX_CONSECUTIVE_EXCHANGES - 1;
}

function buildFlagContext(state: GameState, playerId: 'P1' | 'P2'): FlagContext {
  return {
    flags: state.flags,
    playerId,
    flagsLost: { P1: state.players[0].flagsLost, P2: state.players[1].flagsLost },
    emptySpareCount: emptySpareCorners(state).length,
  };
}

function endIfBagEmpty(state: GameState): boolean {
  if (state.bag.length === 0) {
    state.gameOver = true;
    state.endReason = 'bag_empty';
    determineWinner(state);
    return true;
  }
  return false;
}

export function executeAction(
  state: GameState,
  action: GameAction,
  dictionary: Dictionary
): ActionResult {
  if (state.gameOver) {
    return { success: false, error: 'Game is over' };
  }

  // Bag-empty ends Draw/Play immediately; Pass remains the stuck-only escape
  // when the market cannot refill (market showing < 2).
  if (state.bag.length === 0 && action.type !== 'pass') {
    state.gameOver = true;
    state.endReason = 'bag_empty';
    determineWinner(state);
    return { success: false, error: 'The tile bag is empty' };
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
}

export function validateDraw(
  state: GameState,
  action: DrawAction
): { valid: false; reason: string } | { valid: true; plan: DrawPlan } {
  if (marketShowingCount(state.market) < DRAW_COUNT) {
    return { valid: false, reason: 'Need at least 2 tiles in the market to draw' };
  }

  const player = state.players[state.currentPlayer];
  const requested = action.marketTiles ?? [];

  if (requested.length !== DRAW_COUNT) {
    return { valid: false, reason: `Take exactly ${DRAW_COUNT} tiles from the market` };
  }

  if (new Set(requested).size !== requested.length) {
    return { valid: false, reason: 'Cannot take the same market tile twice' };
  }

  const take: Tile[] = [];
  for (const tileId of requested) {
    const slot = state.market.find(s => s.tile?.id === tileId);
    if (!slot?.tile) return { valid: false, reason: 'That tile is not in the market' };
    take.push(slot.tile);
  }

  const discardIds = action.discardTiles ?? [];
  const rackAfterTake = player.rack.length + take.length - discardIds.length;
  const wouldOverfill = player.rack.length + take.length > RACK_MAX;

  if (wouldOverfill) {
    const required = player.rack.length + take.length - RACK_MAX;
    if (discardIds.length !== required) {
      return {
        valid: false,
        reason: `Discard ${required} tile${required === 1 ? '' : 's'} down to ${RACK_MAX}`,
      };
    }
  } else if (discardIds.length > 0) {
    return { valid: false, reason: 'No need to discard' };
  }

  if (rackAfterTake > RACK_MAX) {
    return { valid: false, reason: `Rack cannot exceed ${RACK_MAX} tiles` };
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

  return { valid: true, plan: { take, discard } };
}

function executeDraw(state: GameState, action: DrawAction): ActionResult {
  const check = validateDraw(state, action);
  if (!check.valid) {
    return { success: false, error: check.reason };
  }

  const { take, discard } = check.plan;
  const player = state.players[state.currentPlayer];
  const rackSizeBefore = player.rack.length;
  const isExchange = rackSizeBefore >= RACK_MAX && discard.length === DRAW_COUNT;

  if (discard.length > 0) {
    const discardIds = new Set(discard.map(t => t.id));
    player.rack = player.rack.filter(t => !discardIds.has(t.id));
    returnToBag(state.bag, discard);
    shuffleBag(state.bag);
  }

  const takenIds = new Set(take.map(t => t.id));
  for (const slot of state.market) {
    if (slot.tile && takenIds.has(slot.tile.id)) {
      slot.tile = null;
    }
  }
  player.rack.push(...take);

  for (const slot of state.market) {
    refillMarketSlot(state.bag, slot);
  }

  state.consecutivePasses = 0;
  if (isExchange) {
    state.consecutiveExchanges++;
  } else {
    state.consecutiveExchanges = 0;
  }
  state.lastPlay = undefined;
  state.moveHistory.push({ player: player.id, action });

  if (state.consecutiveExchanges >= MAX_CONSECUTIVE_EXCHANGES) {
    state.gameOver = true;
    state.endReason = 'exchange_three';
    determineWinner(state);
    return { success: true };
  }

  if (endIfBagEmpty(state)) {
    return { success: true };
  }

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

  const ctx = buildFlagContext(state, player.id);
  const result = validatePlay(state.board, placements, dictionary, ctx);
  if (!result.valid) {
    return { success: false, error: result.reason };
  }

  for (const placement of placements) {
    setBoardTile(state.board, placement.position, {
      ...placement.tile,
      assignedLetter: placement.assignedLetter,
      playerId: player.id,
    });
  }

  const playedIds = new Set(usedIds);
  player.rack = player.rack.filter(t => !playedIds.has(t.id));

  player.score += result.totalScore ?? 0;

  state.consecutiveExchanges = 0;
  state.consecutivePasses = 0;
  state.lastPlay = {
    player: player.id,
    words: result.words ?? [],
    totalScore: result.totalScore ?? 0,
    captures: result.captures ?? false,
    capturesOwnFlag: result.capturesOwnFlag ?? false,
    capturesOpponentFlag: result.capturesOpponentFlag ?? false,
  };
  state.moveHistory.push({ player: player.id, action });

  if (result.capturesOwnFlag) {
    state.flags[player.id] = null;
    state.gameOver = true;
    state.endReason = 'self_capture';
    determineWinner(state);
    return { success: true };
  }

  if (result.capturesOpponentFlag) {
    const opponentIndex = state.currentPlayer === 0 ? 1 : 0;
    const opponent = state.players[opponentIndex];
    state.flags[opponent.id] = null;
    opponent.flagsLost++;

    if (opponent.flagsLost >= 2) {
      state.gameOver = true;
      state.endReason = 'second_steal';
      determineWinner(state);
      return { success: true };
    }

    const spare = randomEmptySpareCorner(state);
    if (spare) {
      state.flags[opponent.id] = spare;
    } else {
      state.gameOver = true;
      state.endReason = 'no_spare';
      determineWinner(state);
      return { success: true };
    }
  }

  if (result.endsGame) {
    state.gameOver = true;
    determineWinner(state);
    return { success: true };
  }

  advanceTurn(state);

  return { success: true };
}

function executePass(state: GameState, dictionary: Dictionary): ActionResult {
  if (canDraw(state)) {
    return { success: false, error: 'Pass is only for when Draw and Play are both impossible' };
  }
  if (!canPass(state, dictionary)) {
    return { success: false, error: 'You still have a legal play' };
  }

  const player = state.players[state.currentPlayer];

  state.consecutiveExchanges = 0;
  state.consecutivePasses++;
  state.lastPlay = undefined;
  state.moveHistory.push({ player: player.id, action: { type: 'pass' } });

  if (state.consecutivePasses >= 2) {
    state.gameOver = true;
    state.endReason = state.bag.length === 0 ? 'stuck_out' : 'double_pass';
    determineWinner(state);
    return { success: true };
  }

  advanceTurn(state);

  return { success: true };
}

function advanceTurn(state: GameState): void {
  if (state.gameOver) return;
  state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
  state.turnCount++;
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

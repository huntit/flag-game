// AI personalities: Greedy, Hunter, Sleeper. No search — see spec section 13.

import type { GameState, AIPersonality, GameAction, DrawAction, PlayAction, Tile, WordPlacement } from './types';
import { RACK_MAX, DRAW_COUNT } from './types';
import { generateLegalPlays } from './moveGenerator';
import { canDraw, wouldTriggerSwapOutOnDraw } from './actions';
import { random, getMarketTiles } from './game';
import type { Dictionary } from './dictionary';

export const DRAW_THRESHOLD = 8;

function toPlayAction(play: WordPlacement): PlayAction {
  return {
    type: 'play',
    placements: play.tiles.map(t => ({
      tileId: t.tile.id,
      position: t.position,
      assignedLetter: t.assignedLetter,
    })),
  };
}

export interface AIPlan {
  action: GameAction;
  legalPlays: WordPlacement[];
}

export function planAIAction(
  state: GameState,
  personality: AIPersonality,
  dictionary: Dictionary,
  threshold: number = DRAW_THRESHOLD
): AIPlan {
  const player = state.players[state.currentPlayer];
  const opponent = state.players[state.currentPlayer === 0 ? 1 : 0];

  const legalPlays = generateLegalPlays(state, player.rack, dictionary, player.id);

  if (legalPlays.length === 0) {
    return { action: selectDrawAction(state), legalPlays };
  }

  if (wouldTriggerSwapOutOnDraw(state)) {
    const bestPlay = findBestPlay(legalPlays);
    if (bestPlay) {
      return { action: toPlayAction(bestPlay), legalPlays };
    }
  }

  switch (personality) {
    case 'hunter':
      return { action: selectHunterAction(state, legalPlays, threshold, player.score, opponent.score), legalPlays };
    case 'sleeper':
      return {
        action: selectSleeperAction(state, legalPlays, threshold, player.score, opponent.score),
        legalPlays,
      };
    case 'greedy':
    default:
      return { action: selectGreedyAction(state, legalPlays, threshold), legalPlays };
  }
}

export function selectAIAction(
  state: GameState,
  personality: AIPersonality,
  dictionary: Dictionary,
  threshold: number = DRAW_THRESHOLD
): GameAction {
  return planAIAction(state, personality, dictionary, threshold).action;
}

function selectGreedyAction(
  state: GameState,
  legalPlays: WordPlacement[],
  threshold: number
): GameAction {
  const bestPlay = findBestPlay(legalPlays);

  if (bestPlay && (bestPlay.totalScore >= threshold || !canDraw(state))) {
    return toPlayAction(bestPlay);
  }

  if (canDraw(state)) {
    return selectDrawAction(state);
  }

  return toPlayAction(bestPlay!);
}

function selectHunterAction(
  state: GameState,
  legalPlays: WordPlacement[],
  threshold: number,
  myScore: number,
  opponentScore: number
): GameAction {
  const stealPlays = legalPlays.filter(p => p.capturesOpponentFlag);
  const bestSteal = findBestPlay(stealPlays);
  if (bestSteal) {
    return toPlayAction(bestSteal);
  }

  const winningSelfCaptures = legalPlays.filter(
    p => p.capturesOwnFlag && myScore + p.totalScore > opponentScore
  );
  const bestSelfCapture = findBestPlay(winningSelfCaptures);
  if (bestSelfCapture) {
    return toPlayAction(bestSelfCapture);
  }

  return selectGreedyAction(state, legalPlays, threshold);
}

function selectSleeperAction(
  state: GameState,
  legalPlays: WordPlacement[],
  threshold: number,
  myScore: number,
  opponentScore: number
): GameAction {
  const winningSelfCaptures = legalPlays.filter(
    p => p.capturesOwnFlag && myScore + p.totalScore > opponentScore
  );
  const bestSelfCapture = findBestPlay(winningSelfCaptures);
  if (bestSelfCapture) {
    return toPlayAction(bestSelfCapture);
  }

  const winningSteals = legalPlays.filter(
    p => p.capturesOpponentFlag && p.endsGame && myScore + p.totalScore > opponentScore
  );
  const bestSteal = findBestPlay(winningSteals);
  if (bestSteal) {
    return toPlayAction(bestSteal);
  }

  const safePlays = legalPlays.filter(p => !p.capturesOwnFlag && !p.capturesOpponentFlag);
  return selectGreedyAction(state, safePlays.length > 0 ? safePlays : legalPlays, threshold);
}

/** Score desc, then longer word, then self-capture over steal over normal. */
export function findBestPlay(plays: WordPlacement[]): WordPlacement | null {
  if (plays.length === 0) return null;

  return [...plays].sort((a, b) => {
    if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;
    if (a.tiles.length !== b.tiles.length) return b.tiles.length - a.tiles.length;
    const rank = (p: WordPlacement) =>
      p.capturesOwnFlag ? 2 : p.capturesOpponentFlag ? 1 : 0;
    if (rank(a) !== rank(b)) return rank(b) - rank(a);
    return 0;
  })[0];
}

function selectDrawAction(state: GameState): DrawAction {
  const player = state.players[state.currentPlayer];
  const marketTiles = getMarketTiles(state.market);
  const chosen = selectRandomMarketTiles(marketTiles, DRAW_COUNT);

  const rackAfterTake = player.rack.length + chosen.length;
  const discardCount = Math.max(0, rackAfterTake - RACK_MAX);
  const discardTiles = discardCount > 0 ? selectDiscardTiles(player.rack, discardCount) : undefined;

  return { type: 'draw', marketTiles: chosen, discardTiles };
}

function selectRandomMarketTiles(market: Tile[], count: number): string[] {
  const shuffled = [...market];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length)).map(t => t.id);
}

function selectDiscardTiles(rack: Tile[], count: number): string[] {
  const nonBlanks = rack.filter(t => !t.isBlank);
  const pool = nonBlanks.length >= count ? nonBlanks : rack;

  const byLetter = new Map<string, Tile[]>();
  for (const tile of pool) {
    const letter = tile.letter ?? '_';
    const bucket = byLetter.get(letter);
    if (bucket) bucket.push(tile);
    else byLetter.set(letter, [tile]);
  }

  const ordered = Array.from(byLetter.values()).sort((a, b) => b.length - a.length);

  const toDiscard: string[] = [];
  for (const tiles of ordered) {
    for (const tile of tiles) {
      if (toDiscard.length < count) toDiscard.push(tile.id);
    }
  }
  return toDiscard;
}

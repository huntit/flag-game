// AI personalities: Greedy, Hunter, Sleeper. No search — see spec section 12.

import type { GameState, AIPersonality, GameAction, DrawAction, PlayAction, Tile, WordPlacement } from './types';
import { RACK_MAX, MAX_MARKET_TAKE } from './types';
import { generateLegalPlays } from './moveGenerator';
import { canDraw, canGrowRack } from './actions';
import { random } from './game';
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
  /** Every play that was on the table, so the lab can spot refused captures. */
  legalPlays: WordPlacement[];
}

/**
 * Choose an action and hand back the plays that were considered. The lab CLI
 * uses the play list for refusal stats, which is why it is returned rather than
 * regenerated.
 */
export function planAIAction(
  state: GameState,
  personality: AIPersonality,
  dictionary: Dictionary,
  threshold: number = DRAW_THRESHOLD
): AIPlan {
  const player = state.players[state.currentPlayer];
  const opponent = state.players[state.currentPlayer === 0 ? 1 : 0];

  const legalPlays = generateLegalPlays(state.board, player.rack, dictionary, state.livePost);

  if (legalPlays.length === 0) {
    return { action: drawWouldHelp(state) ? selectDrawAction(state) : { type: 'pass' }, legalPlays };
  }

  switch (personality) {
    case 'hunter':
      return { action: selectHunterAction(state, legalPlays, threshold), legalPlays };
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

/**
 * Would drawing actually gain the AI anything?
 *
 * A full-rack draw is only an exchange, which never drains the bag (see
 * canGrowRack in actions.ts). Chasing a blank is worth an exchange because a
 * blank is wild and there are only two of them; otherwise the AI spends its rack
 * instead of trading tiles back and forth forever.
 */
function drawWouldHelp(state: GameState): boolean {
  if (!canDraw(state)) return false;
  if (canGrowRack(state)) return true;
  return state.market.some(t => t.isBlank);
}

function selectGreedyAction(
  state: GameState,
  legalPlays: WordPlacement[],
  threshold: number
): GameAction {
  const bestPlay = findBestPlay(legalPlays);
  const canImprove = drawWouldHelp(state);

  if (bestPlay && (bestPlay.totalScore >= threshold || !canImprove)) {
    return toPlayAction(bestPlay);
  }

  if (canImprove) {
    return selectDrawAction(state);
  }

  // Nothing worth drawing for and no play worth making: take what we have.
  if (bestPlay) return toPlayAction(bestPlay);
  return { type: 'pass' };
}

function selectHunterAction(
  state: GameState,
  legalPlays: WordPlacement[],
  threshold: number
): GameAction {
  const capturePlays = legalPlays.filter(p => p.captures);
  const bestCapture = findBestPlay(capturePlays);
  if (bestCapture) {
    return toPlayAction(bestCapture);
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
  // Capture only when it wins outright.
  const winningCaptures = legalPlays.filter(
    p => p.captures && myScore + p.totalScore > opponentScore
  );
  const bestCapture = findBestPlay(winningCaptures);
  if (bestCapture) {
    return toPlayAction(bestCapture);
  }

  return selectGreedyAction(state, legalPlays.filter(p => !p.captures), threshold);
}

/** Score desc, then longer word, then capture over not. */
export function findBestPlay(plays: WordPlacement[]): WordPlacement | null {
  if (plays.length === 0) return null;

  return [...plays].sort((a, b) => {
    if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;
    if (a.tiles.length !== b.tiles.length) return b.tiles.length - a.tiles.length;
    if (a.captures !== b.captures) return a.captures ? -1 : 1;
    return 0;
  })[0];
}

function selectDrawAction(state: GameState): DrawAction {
  const player = state.players[state.currentPlayer];
  const room = RACK_MAX - player.rack.length;

  // Priority 1: a blank is worth the whole market take.
  const blank = state.market.find(t => t.isBlank);
  if (blank) {
    const discardCount = Math.max(0, 1 - room);
    return {
      type: 'draw',
      marketTiles: [blank.id],
      discardTiles: discardCount > 0 ? selectDiscardTiles(player.rack, discardCount) : undefined,
      takeBagTile: false,
    };
  }

  const wanted = Math.min(MAX_MARKET_TAKE, state.market.length);
  const marketTiles = selectRandomMarketTiles(state.market, wanted);

  const isRefresh = wanted > room;
  const discardTiles = isRefresh ? selectDiscardTiles(player.rack, wanted - room) : undefined;

  const rackAfterTake = player.rack.length - (discardTiles?.length ?? 0) + wanted;
  const takeBagTile = !isRefresh && rackAfterTake <= 5 && state.bag.length > 0;

  return { type: 'draw', marketTiles, discardTiles, takeBagTile };
}

function selectRandomMarketTiles(market: Tile[], count: number): string[] {
  const shuffled = [...market];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count).map(t => t.id);
}

/** Prefer discarding duplicate letters; never discard a blank if anything else exists. */
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

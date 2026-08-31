// AI personalities: Greedy, Hunter, Sleeper

import type { GameState, AIPersonality, GameAction, DrawAction, Tile, Letter } from './types';
import { generateLegalPlays } from './moveGenerator';
import { canDraw } from './actions';
import type { Dictionary } from './dictionary';

const DEFAULT_DRAW_THRESHOLD = 8;

export function selectAIAction(
  state: GameState,
  personality: AIPersonality,
  dictionary: Dictionary,
  threshold: number = DEFAULT_DRAW_THRESHOLD
): GameAction {
  const player = state.players[state.currentPlayer];
  const opponent = state.players[state.currentPlayer === 0 ? 1 : 0];

  // Generate legal plays
  const legalPlays = generateLegalPlays(state.board, player.rack, dictionary, state.livePost);

  // Check if stuck
  if (legalPlays.length === 0) {
    if (canDraw(state)) {
      return selectDrawAction(state);
    } else {
      return { type: 'pass' };
    }
  }

  // Personality-specific logic
  switch (personality) {
    case 'greedy':
      return selectGreedyAction(state, legalPlays, threshold);
    case 'hunter':
      return selectHunterAction(state, legalPlays, threshold);
    case 'sleeper':
      return selectSleeperAction(state, legalPlays, threshold, player.score, opponent.score);
    default:
      return selectGreedyAction(state, legalPlays, threshold);
  }
}

function selectGreedyAction(state: GameState, legalPlays: any[], threshold: number): GameAction {
  // Find best play
  const bestPlay = findBestPlay(legalPlays);

  if (bestPlay && bestPlay.totalScore >= threshold) {
    return {
      type: 'play',
      placements: bestPlay.tiles.map((t: any) => ({
        tileId: t.tile.id,
        position: t.position,
        assignedLetter: t.assignedLetter as Letter | undefined,
      })),
    };
  }

  // Otherwise, draw
  if (canDraw(state)) {
    return selectDrawAction(state);
  }

  // Fallback to best play if can't draw
  if (bestPlay) {
    return {
      type: 'play',
      placements: bestPlay.tiles.map((t: { tile: { id: string }; position: any; assignedLetter?: Letter }) => ({
        tileId: t.tile.id,
        position: t.position,
        assignedLetter: t.assignedLetter,
      })),
    };
  }

  return { type: 'pass' };
}

function selectHunterAction(state: GameState, legalPlays: any[], threshold: number): GameAction {
  // Check for capture plays
  const capturePlays = legalPlays.filter((p: any) => p.captures);

  if (capturePlays.length > 0) {
    const bestCapture = findBestPlay(capturePlays);
    return {
      type: 'play',
      placements: bestCapture.tiles.map((t: any) => ({
        tileId: t.tile.id,
        position: t.position,
        assignedLetter: t.assignedLetter as Letter | undefined,
      })),
    };
  }

  // Otherwise, greedy behavior
  return selectGreedyAction(state, legalPlays, threshold);
}

function selectSleeperAction(
  state: GameState,
  legalPlays: any[],
  threshold: number,
  myScore: number,
  opponentScore: number
): GameAction {
  // Check for winning capture plays
  const capturePlays = legalPlays.filter((p: any) => p.captures && myScore + p.totalScore > opponentScore);

  if (capturePlays.length > 0) {
    const bestCapture = findBestPlay(capturePlays);
    return {
      type: 'play',
      placements: bestCapture.tiles.map((t: any) => ({
        tileId: t.tile.id,
        position: t.position,
        assignedLetter: t.assignedLetter as Letter | undefined,
      })),
    };
  }

  // Otherwise, greedy behavior excluding all captures
  const nonCapturePlays = legalPlays.filter((p: any) => !p.captures);
  return selectGreedyAction(state, nonCapturePlays, threshold);
}

function findBestPlay(plays: any[]): any {
  if (plays.length === 0) return null;

  // Sort by: score desc, then length desc, then capture over non-capture
  plays.sort((a, b) => {
    if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;
    if (a.tiles.length !== b.tiles.length) return b.tiles.length - a.tiles.length;
    if (a.captures !== b.captures) return a.captures ? -1 : 1;
    return 0;
  });

  return plays[0];
}

function selectDrawAction(state: GameState): DrawAction {
  const player = state.players[state.currentPlayer];
  const room = 7 - player.rack.length;

  // Priority 1: Take blank if available and have room
  const blank = state.market.find(t => t.isBlank);
  if (blank && (room >= 1 || player.rack.length > 0)) {
    const discardCount = room < 1 ? 1 - room : 0;
    const discardTiles = discardCount > 0 ? selectDiscardTiles(player.rack, discardCount) : undefined;

    return {
      type: 'draw',
      marketTiles: [blank.id],
      discardTiles,
      takeBagTile: false, // Can't take bag tile when taking blank
    };
  }

  // Priority 2: Take 2 random tiles (or 1 if only 1 available)
  const tilesToTake = Math.min(2, state.market.length, room > 0 ? room + player.rack.length : 2);
  const marketTiles = selectRandomMarketTiles(state.market, tilesToTake);

  const needsDiscard = tilesToTake > room;
  const discardTiles = needsDiscard ? selectDiscardTiles(player.rack, tilesToTake - room) : undefined;

  // Optional bag tile: take if not refresh mode and rack will be <= 5 and bag not empty
  const isRefresh = needsDiscard;
  const rackSizeAfterTake = player.rack.length + tilesToTake - (discardTiles?.length || 0);
  const takeBagTile = !isRefresh && rackSizeAfterTake <= 5 && state.bag.length > 0;

  return {
    type: 'draw',
    marketTiles,
    discardTiles,
    takeBagTile,
  };
}

function selectRandomMarketTiles(market: Tile[], count: number): string[] {
  const shuffled = [...market].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(t => t.id);
}

function selectDiscardTiles(rack: Tile[], count: number): string[] {
  // Prefer discarding duplicates, never discard blanks
  const nonBlanks = rack.filter(t => !t.isBlank);
  
  // Count letter frequencies
  const freq = new Map<string, Tile[]>();
  for (const tile of nonBlanks) {
    const letter = tile.letter || '';
    if (!freq.has(letter)) {
      freq.set(letter, []);
    }
    freq.get(letter)!.push(tile);
  }

  // Sort by frequency (descending)
  const sorted = Array.from(freq.entries()).sort((a, b) => b[1].length - a[1].length);

  const toDiscard: string[] = [];
  for (const [, tiles] of sorted) {
    for (const tile of tiles) {
      if (toDiscard.length < count) {
        toDiscard.push(tile.id);
      }
    }
  }

  // If not enough, just take random
  if (toDiscard.length < count) {
    const remaining = nonBlanks.filter(t => !toDiscard.includes(t.id));
    for (const tile of remaining) {
      if (toDiscard.length < count) {
        toDiscard.push(tile.id);
      }
    }
  }

  return toDiscard;
}

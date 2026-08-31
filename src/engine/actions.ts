// Action executor - applies game actions and updates state

import type { GameState, GameAction, DrawAction, PlayAction, Tile, Letter } from './types';
import { drawFromBag, returnToBag, shuffleBag, setBoardTile, getNextFlagPost } from './game';
import { validatePlay } from './validator';
import type { Dictionary } from './dictionary';

export function canDraw(state: GameState): boolean {
  // Can draw if market has tiles OR bag has tiles
  return state.market.length > 0 || state.bag.length > 0;
}

export function canPass(state: GameState): boolean {
  // Pass is only legal when:
  // 1. Player has no legal plays (checked separately)
  // 2. AND cannot draw (market + bag empty)
  return state.market.length === 0 && state.bag.length === 0;
}

export function executeAction(
  state: GameState,
  action: GameAction,
  dictionary: Dictionary
): { success: boolean; error?: string } {
  if (state.gameOver) {
    return { success: false, error: 'Game is over' };
  }

  switch (action.type) {
    case 'draw':
      return executeDraw(state, action);
    case 'play':
      return executePlay(state, action, dictionary);
    case 'pass':
      return executePass(state);
    default:
      return { success: false, error: 'Invalid action type' };
  }
}

function executeDraw(state: GameState, action: DrawAction): { success: boolean; error?: string } {
  const currentPlayer = state.players[state.currentPlayer];
  
  if (action.marketTiles.length === 0 && state.market.length > 0) {
    return { success: false, error: 'Must draw at least 1 tile from market' };
  }

  // Find the tiles in the market
  const tilesToTake: Tile[] = [];
  for (const tileId of action.marketTiles) {
    const tile = state.market.find(t => t.id === tileId);
    if (!tile) {
      return { success: false, error: 'Tile not in market' };
    }
    tilesToTake.push(tile);
  }

  // Check blank restriction (can only take 1 tile if it's a blank)
  const hasBlank = tilesToTake.some(t => t.isBlank);
  if (hasBlank && tilesToTake.length > 1) {
    return { success: false, error: 'Cannot take more than 1 tile when taking a blank' };
  }

  // Check take limit (max 2 from market)
  if (tilesToTake.length > 2) {
    return { success: false, error: 'Cannot take more than 2 tiles from market' };
  }

  const room = 7 - currentPlayer.rack.length;
  const isRefresh = tilesToTake.length > room;

  // Handle refresh mode
  if (isRefresh) {
    if (!action.discardTiles || action.discardTiles.length !== tilesToTake.length - room) {
      return { success: false, error: 'Must discard tiles to make room' };
    }

    // Find and remove discard tiles from rack
    const tilesToDiscard: Tile[] = [];
    for (const tileId of action.discardTiles) {
      const tile = currentPlayer.rack.find(t => t.id === tileId);
      if (!tile) {
        return { success: false, error: 'Discard tile not in rack' };
      }
      tilesToDiscard.push(tile);
    }

    // Return discarded tiles to bag
    currentPlayer.rack = currentPlayer.rack.filter(t => !action.discardTiles?.includes(t.id));
    returnToBag(state.bag, tilesToDiscard);
    shuffleBag(state.bag);
  }

  // Remove tiles from market
  state.market = state.market.filter(t => !action.marketTiles.includes(t.id));
  
  // Add to rack
  currentPlayer.rack.push(...tilesToTake);

  // Optional bag tile (only if not refresh mode and room available and bag not empty)
  if (action.takeBagTile) {
    if (isRefresh) {
      return { success: false, error: 'Cannot take bag tile in refresh mode' };
    }
    if (currentPlayer.rack.length >= 7) {
      return { success: false, error: 'Rack is full' };
    }
    if (state.bag.length === 0) {
      return { success: false, error: 'Bag is empty' };
    }

    const bagTile = drawFromBag(state.bag, 1)[0];
    currentPlayer.rack.push(bagTile);
  }

  // Refill market
  const marketTilesNeeded = 4 - state.market.length;
  const newMarketTiles = drawFromBag(state.bag, marketTilesNeeded);
  state.market.push(...newMarketTiles);

  // Check if bag is depleted
  if (state.bag.length === 0 && state.market.length < 4) {
    state.bagDepleted = true;
  }

  // Reset pass counter
  state.consecutivePasses = 0;

  // Record move
  state.moveHistory.push({
    player: currentPlayer.id,
    action,
  });

  // Rotate flag (unless game ends)
  rotateFlagAndCheckEnd(state);

  // Next player
  if (!state.gameOver) {
    state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
    state.turnCount++;
  }

  return { success: true };
}

function executePlay(state: GameState, action: PlayAction, dictionary: Dictionary): { success: boolean; error?: string } {
  const player = state.players[state.currentPlayer];

  if (action.placements.length === 0) {
    return { success: false, error: 'No tiles placed' };
  }

  // Find tiles in rack
  const tiles: { tile: Tile; position: any; assignedLetter?: Letter }[] = [];
  for (const placement of action.placements) {
    const tile = player.rack.find(t => t.id === placement.tileId);
    if (!tile) {
      return { success: false, error: 'Tile not in rack' };
    }
    tiles.push({
      tile,
      position: placement.position,
      assignedLetter: placement.assignedLetter as Letter | undefined,
    });
  }

  // Validate play
  const result = validatePlay(state.board, tiles, dictionary, state.livePost);
  if (!result.valid) {
    return { success: false, error: result.reason };
  }

  // Apply play to board
  for (const placement of tiles) {
    setBoardTile(state.board, placement.position, {
      ...placement.tile,
      assignedLetter: placement.assignedLetter as any,
    });
  }

  // Remove tiles from rack
  player.rack = player.rack.filter(t => !action.placements.some(p => p.tileId === t.id));

  // Update score
  player.score += result.totalScore || 0;

  // Reset pass counter
  state.consecutivePasses = 0;

  // Record move
  state.moveHistory.push({
    player: player.id,
    action,
  });

  // Check for capture
  if (result.captures) {
    state.gameOver = true;
    state.endReason = 'capture';
    determineWinner(state);
    return { success: true };
  }

  // Rotate flag (unless game ends)
  rotateFlagAndCheckEnd(state);

  // Next player
  if (!state.gameOver) {
    state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
    state.turnCount++;
  }

  return { success: true };
}

function executePass(state: GameState): { success: boolean; error?: string } {
  // Validate pass is legal
  if (!canPass(state)) {
    return { success: false, error: 'Can only pass when market and bag are empty' };
  }

  const currentPlayer = state.players[state.currentPlayer];

  // Increment pass counter
  state.consecutivePasses++;

  // Record move
  state.moveHistory.push({
    player: currentPlayer.id,
    action: { type: 'pass' },
  });

  // Check for double pass
  if (state.consecutivePasses >= 2) {
    state.gameOver = true;
    state.endReason = 'double_pass';
    determineWinner(state);
    return { success: true };
  }

  // Rotate flag
  rotateFlagAndCheckEnd(state);

  // Next player
  if (!state.gameOver) {
    state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
    state.turnCount++;
  }

  return { success: true };
}

function rotateFlagAndCheckEnd(state: GameState): void {
  // Check if bag is depleted
  if (state.bagDepleted) {
    state.gameOver = true;
    state.endReason = 'bag';
    determineWinner(state);
    return;
  }

  // Rotate flag
  const nextPost = getNextFlagPost(state.livePost, state.board);
  if (nextPost === null) {
    // All posts are occupied
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

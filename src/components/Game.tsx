// Main Game component

import { useState, useEffect } from 'react';
import type { TileData, GameState, GameAction, Tile, Position, Letter } from '../engine/types';
import type { Dictionary } from '../engine/dictionary';
import { initializeGame } from '../engine/game';
import { executeAction, canDraw, canPass } from '../engine/actions';
import { selectAIAction } from '../engine/ai';
import { hasLegalPlay } from '../engine/moveGenerator';
import type { GameMode, AIOpponent } from '../App';
import Board from './Board';
import Rack from './Rack';
import Market from './Market';
import GameInfo from './GameInfo';
import GameOverOverlay from './GameOverOverlay';
import PassThePhone from './PassThePhone';
import './Game.css';

interface GameProps {
  tileData: TileData;
  dictionary: Dictionary;
  mode: GameMode;
  aiOpponent?: AIOpponent;
  onBackToMenu: () => void;
}

type SelectedTile = { tile: Tile; source: 'rack' | 'market' };

function Game({ tileData, dictionary, mode, aiOpponent, onBackToMenu }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame(tileData));
  const [selectedTiles, setSelectedTiles] = useState<SelectedTile[]>([]);
  const [pendingPlacements, setPendingPlacements] = useState<{ tileId: string; position: Position; assignedLetter?: Letter }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showPassThePhone, setShowPassThePhone] = useState(false);

  const isVsAI = mode === 'vs-ai';
  const isHotseat = mode === 'hotseat';
  const currentPlayer = gameState.players[gameState.currentPlayer];
  const isAITurn = isVsAI && currentPlayer.id === 'P2';

  // AI turn handler
  useEffect(() => {
    if (isAITurn && !gameState.gameOver && !isAIThinking) {
      setIsAIThinking(true);
      setTimeout(() => {
        const action = selectAIAction(gameState, aiOpponent!, dictionary);
        const result = executeAction(gameState, action, dictionary);
        if (!result.success) {
          console.error('AI action failed:', result.error);
        }
        setGameState({ ...gameState });
        setIsAIThinking(false);
      }, 500); // Small delay for better UX
    }
  }, [isAITurn, gameState, isAIThinking, aiOpponent, dictionary]);

  // Pass-the-phone handler for hotseat
  useEffect(() => {
    if (isHotseat && !gameState.gameOver && gameState.turnCount > 0) {
      setShowPassThePhone(true);
    }
  }, [gameState.currentPlayer, gameState.gameOver, isHotseat, gameState.turnCount]);

  const handleTileClick = (tile: Tile, source: 'rack' | 'market') => {
    if (isAITurn || gameState.gameOver) return;

    // Toggle selection
    const alreadySelected = selectedTiles.some(st => st.tile.id === tile.id);
    if (alreadySelected) {
      setSelectedTiles(selectedTiles.filter(st => st.tile.id !== tile.id));
    } else {
      setSelectedTiles([...selectedTiles, { tile, source }]);
    }
    setError(null);
  };

  const handleCellClick = (position: Position) => {
    if (isAITurn || gameState.gameOver || selectedTiles.length === 0) return;

    // Only allow placing tiles from rack
    const rackTiles = selectedTiles.filter(st => st.source === 'rack');
    if (rackTiles.length === 0) {
      setError('Can only place tiles from your rack');
      return;
    }

    // Place first selected rack tile
    const tile = rackTiles[0].tile;
    setPendingPlacements([...pendingPlacements, {
      tileId: tile.id,
      position,
      assignedLetter: (tile.isBlank ? 'A' : undefined) as Letter | undefined,
    }]);
    setSelectedTiles(selectedTiles.filter(st => st.tile.id !== tile.id));
    setError(null);
  };

  const handleDraw = () => {
    if (isAITurn || gameState.gameOver) return;

    const marketTiles = selectedTiles
      .filter(st => st.source === 'market')
      .map(st => st.tile.id);

    if (marketTiles.length === 0 && gameState.market.length > 0) {
      setError('Select tiles from the market to draw');
      return;
    }

    const action: GameAction = {
      type: 'draw',
      marketTiles,
      takeBagTile: false, // TODO: Add UI for optional bag tile
    };

    const result = executeAction(gameState, action, dictionary);
    if (!result.success) {
      setError(result.error || 'Draw failed');
      return;
    }

    setGameState({ ...gameState });
    setSelectedTiles([]);
    setPendingPlacements([]);
    setError(null);
  };

  const handlePlay = () => {
    if (isAITurn || gameState.gameOver || pendingPlacements.length === 0) return;

    const action: GameAction = {
      type: 'play',
      placements: pendingPlacements,
    };

    const result = executeAction(gameState, action, dictionary);
    if (!result.success) {
      setError(result.error || 'Play failed');
      return;
    }

    setGameState({ ...gameState });
    setSelectedTiles([]);
    setPendingPlacements([]);
    setError(null);
  };

  const handlePass = () => {
    if (isAITurn || gameState.gameOver) return;

    if (!canPass(gameState)) {
      setError('Can only pass when market and bag are empty');
      return;
    }

    const action: GameAction = { type: 'pass' };
    const result = executeAction(gameState, action, dictionary);
    if (!result.success) {
      setError(result.error || 'Pass failed');
      return;
    }

    setGameState({ ...gameState });
    setSelectedTiles([]);
    setPendingPlacements([]);
    setError(null);
  };

  const handleClearPlacements = () => {
    setPendingPlacements([]);
    setSelectedTiles([]);
    setError(null);
  };

  const canDrawNow = canDraw(gameState);
  const canPassNow = canPass(gameState) && !hasLegalPlay(gameState.board, currentPlayer.rack, dictionary, gameState.livePost);

  if (showPassThePhone) {
    return (
      <PassThePhone
        currentPlayer={currentPlayer.id}
        onContinue={() => setShowPassThePhone(false)}
      />
    );
  }

  return (
    <div className="game">
      <div className="game-header">
        <button className="back-button" onClick={onBackToMenu}>
          ← Menu
        </button>
        <h1>Flag</h1>
      </div>

      <GameInfo
        gameState={gameState}
        isVsAI={isVsAI}
        isAIThinking={isAIThinking}
      />

      {error && (
        <div className="game-error">
          {error}
        </div>
      )}

      <Board
        board={gameState.board}
        livePost={gameState.livePost}
        pendingPlacements={pendingPlacements}
        onCellClick={handleCellClick}
      />

      <Market
        market={gameState.market}
        selectedTileIds={selectedTiles.filter(st => st.source === 'market').map(st => st.tile.id)}
        onTileClick={(tile) => handleTileClick(tile, 'market')}
        disabled={isAITurn || gameState.gameOver}
      />

      <Rack
        tiles={currentPlayer.rack}
        selectedTileIds={selectedTiles.filter(st => st.source === 'rack').map(st => st.tile.id)}
        placedTileIds={pendingPlacements.map(p => p.tileId)}
        onTileClick={(tile) => handleTileClick(tile, 'rack')}
        disabled={isAITurn || gameState.gameOver}
        label={`Your Rack (${currentPlayer.id})`}
      />

      <div className="game-actions">
        <button
          className="action-button action-draw"
          onClick={handleDraw}
          disabled={isAITurn || gameState.gameOver || !canDrawNow || pendingPlacements.length > 0}
        >
          Draw
        </button>

        <button
          className="action-button action-play"
          onClick={handlePlay}
          disabled={isAITurn || gameState.gameOver || pendingPlacements.length === 0}
        >
          Play
        </button>

        <button
          className="action-button action-clear"
          onClick={handleClearPlacements}
          disabled={isAITurn || gameState.gameOver || (pendingPlacements.length === 0 && selectedTiles.length === 0)}
        >
          Clear
        </button>

        <button
          className="action-button action-pass"
          onClick={handlePass}
          disabled={isAITurn || gameState.gameOver || !canPassNow}
        >
          Pass
        </button>
      </div>

      {gameState.gameOver && (
        <GameOverOverlay
          gameState={gameState}
          onNewGame={() => {
            setGameState(initializeGame(tileData));
            setSelectedTiles([]);
            setPendingPlacements([]);
            setError(null);
          }}
          onBackToMenu={onBackToMenu}
        />
      )}
    </div>
  );
}

export default Game;

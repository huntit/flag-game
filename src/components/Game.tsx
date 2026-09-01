// Play screen. Tap a rack tile, then tap a square. No drag anywhere.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TileData, GameState, GameAction, Tile, Position, Letter } from '../engine/types';
import { DRAW_COUNT, RACK_MAX } from '../engine/types';
import type { Dictionary } from '../engine/dictionary';
import { getBoardTile, initializeGame, shuffleRack, emptySpareCorners } from '../engine/game';
import { executeAction, canPass, validateDraw } from '../engine/actions';
import { validatePlay, type FlagContext } from '../engine/validator';
import { selectAIAction } from '../engine/ai';
import type { GameMode, AIOpponent } from '../App';
import Board, { type PendingPlacement } from './Board';
import { Rack, OpponentRack } from './Rack';
import Market from './Market';
import GameInfo from './GameInfo';
import MoveLog, { type MoveLogEntry } from './MoveLog';
import GameOverOverlay from './GameOverOverlay';
import PassThePhone from './PassThePhone';
import BlankPicker from './BlankPicker';
import './Game.css';

interface GameProps {
  tileData: TileData;
  dictionary: Dictionary;
  mode: GameMode;
  aiOpponent?: AIOpponent;
  onBackToMenu: () => void;
}

interface Pending {
  tileId: string;
  position: Position;
  assignedLetter?: Letter;
}

const AI_NAMES: Record<AIOpponent, string> = {
  hunter: 'Hunter',
  greedy: 'Greedy',
  sleeper: 'Sleeper',
};

function buildFlagContext(state: GameState, playerId: 'P1' | 'P2'): FlagContext {
  return {
    flags: state.flags,
    playerId,
    flagsLost: { P1: state.players[0].flagsLost, P2: state.players[1].flagsLost },
    emptySpareCount: emptySpareCorners(state).length,
  };
}

function describeMove(state: GameState): MoveLogEntry | null {
  const last = state.moveHistory[state.moveHistory.length - 1];
  if (!last) return null;

  if (last.action.type === 'pass') {
    return { player: last.player, text: 'Pass' };
  }
  if (last.action.type === 'draw') {
    const discards = last.action.discardTiles?.length ?? 0;
    return {
      player: last.player,
      text: discards > 0 ? `Draw 2, discard ${discards}` : 'Draw 2',
    };
  }
  if (last.action.type === 'play' && state.lastPlay) {
    const words = state.lastPlay.words.map(w => w.word).join(' + ');
    return { player: last.player, text: `${words} +${state.lastPlay.totalScore}` };
  }
  return null;
}

function Game({ tileData, dictionary, mode, aiOpponent, onBackToMenu }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame(tileData));
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const [selectedRackTileId, setSelectedRackTileId] = useState<string | null>(null);
  const [selectedMarketIds, setSelectedMarketIds] = useState<string[]>([]);
  const [discardIds, setDiscardIds] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [blankPrompt, setBlankPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [awaitingHandover, setAwaitingHandover] = useState(false);

  const isVsAI = mode === 'vs-ai';
  const isHotseat = mode === 'hotseat';
  const opponentName = isVsAI && aiOpponent ? AI_NAMES[aiOpponent] : null;

  const activeIndex = gameState.currentPlayer;
  const active = gameState.players[activeIndex];
  const viewerIndex = isVsAI ? 0 : activeIndex;
  const viewer = gameState.players[viewerIndex];
  const other = gameState.players[viewerIndex === 0 ? 1 : 0];
  const viewerColor = viewer.id;

  const isAITurn = isVsAI && activeIndex === 1;
  const interactive = !isAITurn && !gameState.gameOver && !awaitingHandover;

  const resetSelection = useCallback(() => {
    setSelectedRackTileId(null);
    setSelectedMarketIds([]);
    setDiscardIds([]);
    setPending([]);
    setBlankPrompt(null);
    setError(null);
    setHint(null);
  }, []);

  const commit = useCallback(
    (next: GameState) => {
      const entry = describeMove(next);
      if (entry) setMoveLog(current => [...current, entry]);
      setGameState({ ...next });
      resetSelection();
    },
    [resetSelection]
  );

  const aiFailures = useRef(0);
  useEffect(() => {
    if (!isVsAI || !aiOpponent || gameState.gameOver) return;
    if (gameState.currentPlayer !== 1) return;
    if (aiFailures.current > 2) return;

    setIsAIThinking(true);
    const timer = window.setTimeout(() => {
      const action = selectAIAction(gameState, aiOpponent, dictionary);
      const result = executeAction(gameState, action, dictionary);
      if (!result.success) {
        aiFailures.current += 1;
        setError(`${AI_NAMES[aiOpponent]} could not move: ${result.error}`);
      } else {
        aiFailures.current = 0;
        const entry = describeMove(gameState);
        if (entry) setMoveLog(current => [...current, entry]);
      }
      setIsAIThinking(false);
      setGameState({ ...gameState });
      resetSelection();
    }, 420);

    return () => {
      window.clearTimeout(timer);
      setIsAIThinking(false);
    };
  }, [gameState, isVsAI, aiOpponent, dictionary, resetSelection]);

  const lastSeat = useRef(gameState.currentPlayer);
  useEffect(() => {
    if (!isHotseat || gameState.gameOver) return;
    if (gameState.currentPlayer === lastSeat.current) return;
    lastSeat.current = gameState.currentPlayer;
    setAwaitingHandover(true);
    resetSelection();
  }, [gameState.currentPlayer, gameState.gameOver, isHotseat, resetSelection]);

  const placedTileIds = useMemo(() => pending.map(p => p.tileId), [pending]);

  const requiredDiscards =
    selectedMarketIds.length === DRAW_COUNT
      ? Math.max(0, viewer.rack.length + DRAW_COUNT - RACK_MAX)
      : 0;

  const drawAction: GameAction = useMemo(
    () => ({
      type: 'draw',
      marketTiles: selectedMarketIds,
      discardTiles: discardIds.length > 0 ? discardIds : undefined,
    }),
    [selectedMarketIds, discardIds]
  );

  const drawCheck = useMemo(
    () => (interactive && pending.length === 0 ? validateDraw(gameState, drawAction) : null),
    [interactive, pending.length, gameState, drawAction]
  );
  const canDrawNow = Boolean(drawCheck?.valid);

  const playEvaluation = useMemo(() => {
    if (!interactive || pending.length === 0) return null;
    const placements = pending.map(p => {
      const tile = active.rack.find(t => t.id === p.tileId)!;
      return { tile, position: p.position, assignedLetter: p.assignedLetter };
    });
    if (placements.some(p => !p.tile)) return null;
    return validatePlay(gameState.board, placements, dictionary, buildFlagContext(gameState, active.id));
  }, [interactive, pending, active.rack, active.id, gameState, dictionary]);

  const canPlayNow = Boolean(playEvaluation?.valid);
  const canPassNow = interactive && canPass(gameState, dictionary);
  const canShuffleNow = interactive && pending.length === 0 && viewer.rack.length > 1;
  const canClearNow =
    interactive &&
    (pending.length > 0 || selectedMarketIds.length > 0 || discardIds.length > 0);

  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(null), 1900);
    return () => window.clearTimeout(timer);
  }, [hint]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 3200);
    return () => window.clearTimeout(timer);
  }, [error]);

  const handleRackTileClick = (tile: Tile) => {
    if (!interactive) return;
    setError(null);

    if (requiredDiscards > 0) {
      setDiscardIds(current => {
        if (current.includes(tile.id)) return current.filter(id => id !== tile.id);
        if (current.length >= requiredDiscards) return [...current.slice(1), tile.id];
        return [...current, tile.id];
      });
      return;
    }

    setSelectedRackTileId(current => (current === tile.id ? null : tile.id));
  };

  const handleMarketTileClick = (tile: Tile) => {
    if (!interactive) return;
    if (pending.length > 0) {
      setError('Clear your placement before drawing');
      return;
    }
    setError(null);
    setDiscardIds([]);

    setSelectedMarketIds(current => {
      if (current.includes(tile.id)) return current.filter(id => id !== tile.id);
      if (current.length >= DRAW_COUNT) return [current[1], tile.id];
      return [...current, tile.id];
    });
  };

  const handleCellClick = (position: Position) => {
    if (!interactive) return;
    setError(null);

    const existing = pending.find(
      p => p.position.row === position.row && p.position.col === position.col
    );
    if (existing) {
      setPending(current => current.filter(p => p.tileId !== existing.tileId));
      setSelectedRackTileId(null);
      return;
    }

    if (getBoardTile(gameState.board, position)) {
      setHint('That square is taken');
      return;
    }

    if (!selectedRackTileId) {
      setHint('Tap one of your tiles first');
      return;
    }

    const tile = viewer.rack.find(t => t.id === selectedRackTileId);
    if (!tile) return;

    setPending(current => [...current, { tileId: tile.id, position }]);
    setSelectedRackTileId(null);
    setSelectedMarketIds([]);
    setHint(null);
    if (tile.isBlank) setBlankPrompt(tile.id);
  };

  const handleBlankPick = (letter: Letter) => {
    setPending(current =>
      current.map(p => (p.tileId === blankPrompt ? { ...p, assignedLetter: letter } : p))
    );
    setBlankPrompt(null);
  };

  const handleBlankCancel = () => {
    setPending(current => current.filter(p => p.tileId !== blankPrompt));
    setBlankPrompt(null);
  };

  const run = (action: GameAction) => {
    const result = executeAction(gameState, action, dictionary);
    if (!result.success) {
      setError(result.error ?? 'That move is not legal');
      return;
    }
    commit(gameState);
  };

  const handleDraw = () => {
    if (!canDrawNow) return;
    run(drawAction);
  };

  const handlePlay = () => {
    if (!canPlayNow) return;
    run({
      type: 'play',
      placements: pending.map(p => ({
        tileId: p.tileId,
        position: p.position,
        assignedLetter: p.assignedLetter,
      })),
    });
  };

  const handlePass = () => {
    if (!canPassNow) return;
    run({ type: 'pass' });
  };

  const handleShuffle = () => {
    if (!canShuffleNow) return;
    gameState.players[viewerIndex].rack = shuffleRack(viewer.rack);
    setGameState({ ...gameState });
    setSelectedRackTileId(null);
  };

  const handleClear = () => {
    if (!canClearNow) return;
    setPending([]);
    setSelectedRackTileId(null);
    setSelectedMarketIds([]);
    setDiscardIds([]);
    setError(null);
  };

  const pendingForBoard: PendingPlacement[] = pending.map(p => {
    const tile = viewer.rack.find(t => t.id === p.tileId);
    return {
      tileId: p.tileId,
      position: p.position,
      letter: p.assignedLetter ?? (tile?.isBlank ? '?' : tile?.letter ?? ''),
      value: tile ? (tile.isBlank ? 0 : tile.value) : 0,
      isBlank: Boolean(tile?.isBlank),
      playerId: viewerColor,
    };
  });

  const lastPlayHighlight = useMemo(
    () => gameState.lastPlay?.words.flatMap(w => w.positions) ?? [],
    [gameState.lastPlay]
  );

  const youLabel = isHotseat ? viewer.id : 'You';
  const otherLabel = opponentName ?? other.id;
  const otherColor = other.id;

  const statusToast = useMemo(() => {
    if (error) return { kind: 'toast-error', text: error };
    if (isAIThinking) return { kind: 'toast-info', text: `${otherLabel} is thinking…` };
    if (pending.length > 0 && playEvaluation && !playEvaluation.valid) {
      return { kind: 'toast-error', text: playEvaluation.reason ?? 'Not a legal play' };
    }
    if (playEvaluation?.valid) {
      const words = playEvaluation.words?.map(w => w.word).join(' + ') ?? '';
      return { kind: 'toast-hint', text: `${words} for ${playEvaluation.totalScore}` };
    }
    if (selectedMarketIds.length > 0 && selectedMarketIds.length < DRAW_COUNT) {
      return { kind: 'toast-hint', text: `Select ${DRAW_COUNT - selectedMarketIds.length} more market tile${DRAW_COUNT - selectedMarketIds.length === 1 ? '' : 's'}` };
    }
    if (requiredDiscards > 0) {
      const left = requiredDiscards - discardIds.length;
      return {
        kind: 'toast-hint',
        text:
          left > 0
            ? `Tap ${left} rack tile${left === 1 ? '' : 's'} to discard`
            : 'Ready — tap Draw',
      };
    }
    if (hint) return { kind: 'toast-hint', text: hint };
    if (gameState.lastPlay) {
      const words = gameState.lastPlay.words.map(w => w.word).join(' + ');
      const who = gameState.lastPlay.player === viewer.id ? youLabel : otherLabel;
      return { kind: 'toast-info', text: `${who} played ${words} +${gameState.lastPlay.totalScore}` };
    }
    return null;
  }, [
    error,
    isAIThinking,
    otherLabel,
    pending.length,
    playEvaluation,
    requiredDiscards,
    discardIds.length,
    selectedMarketIds.length,
    gameState.lastPlay,
    viewer.id,
    youLabel,
    hint,
  ]);

  if (awaitingHandover) {
    return (
      <PassThePhone
        seat={active.id}
        onContinue={() => {
          setAwaitingHandover(false);
          setError(null);
        }}
      />
    );
  }

  return (
    <div className="play-shell">
      <div className="hud">
        <GameInfo
          youLabel={youLabel}
          yourScore={viewer.score}
          isYourTurn={activeIndex === viewerIndex}
          playerColor={viewerColor}
          onHome={onBackToMenu}
        />
      </div>

      <div className="opponent-bar">
        <OpponentRack
          name={otherLabel}
          playerColor={otherColor}
          count={other.rack.length}
          score={other.score}
          isTheirTurn={activeIndex !== viewerIndex}
        />
      </div>

      <div className="stage">
        <Board
          board={gameState.board}
          flags={gameState.flags}
          pendingPlacements={pendingForBoard}
          highlight={pending.length === 0 ? lastPlayHighlight : []}
          onCellClick={handleCellClick}
        />
      </div>

      <div className="market-row">
        <Market
          market={gameState.market}
          selectedTileIds={selectedMarketIds}
          bagCount={gameState.bag.length}
          disabled={!interactive}
          onTileClick={handleMarketTileClick}
        />
      </div>

      <div className="rack-row">
        <Rack
          tiles={viewer.rack}
          label={youLabel}
          playerColor={viewerColor}
          selectedTileId={selectedRackTileId}
          discardTileIds={discardIds}
          placedTileIds={placedTileIds}
          disabled={!interactive}
          onTileClick={handleRackTileClick}
        />
      </div>

      <div className="log-row">
        <MoveLog entries={moveLog} />
      </div>

      <div className="actions">
        <button type="button" className="action-button action-draw" onClick={handleDraw} disabled={!canDrawNow}>
          Draw
        </button>
        <button type="button" className="action-button action-play" onClick={handlePlay} disabled={!canPlayNow}>
          Play
        </button>
        <button
          type="button"
          className="action-button action-shuffle"
          onClick={canClearNow ? handleClear : handleShuffle}
          disabled={!canClearNow && !canShuffleNow}
        >
          {canClearNow ? 'Clear' : 'Shuffle'}
        </button>
        <button
          type="button"
          className="action-button action-pass"
          data-pass-stuck-only="true"
          onClick={handlePass}
          disabled={!canPassNow}
        >
          Pass
        </button>
      </div>

      {statusToast && (
        <div className="toast-layer">
          <div className={`toast ${statusToast.kind}`}>{statusToast.text}</div>
        </div>
      )}

      {blankPrompt && <BlankPicker onPick={handleBlankPick} onCancel={handleBlankCancel} />}

      {gameState.gameOver && (
        <GameOverOverlay
          gameState={gameState}
          youLabel={youLabel}
          otherLabel={otherLabel}
          viewerIndex={viewerIndex}
          onNewGame={() => {
            aiFailures.current = 0;
            lastSeat.current = 0;
            setMoveLog([]);
            commit(initializeGame(tileData));
          }}
          onBackToMenu={onBackToMenu}
        />
      )}
    </div>
  );
}

export default Game;

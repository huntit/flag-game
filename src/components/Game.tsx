// Play screen. Tap a rack tile, then tap a square. No drag anywhere.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TileData, GameState, GameAction, Tile, Position, Letter } from '../engine/types';
import { DRAW_COUNT, RACK_MAX, SEAT_COLOR_NAMES } from '../engine/types';
import type { Dictionary } from '../engine/dictionary';
import { getBoardTile, initializeGame, shuffleRack, emptySpareCorners } from '../engine/game';
import { executeAction, validateDraw, wouldTriggerSwapOutOnDraw } from '../engine/actions';
import { validatePlay, type FlagContext } from '../engine/validator';
import { selectAIAction } from '../engine/ai';
import type { GameMode, AIOpponent } from '../App';
import Board, { type PendingPlacement } from './Board';
import { Rack, OpponentRack } from './Rack';
import Market from './Market';
import GameInfo from './GameInfo';
import HomeLink from './HomeLink';
import SidePanel from './SidePanel';
import GameOverOverlay from './GameOverOverlay';
import PassThePhone from './PassThePhone';
import BlankPicker from './BlankPicker';
import {
  pickHumanSeat,
  soloFirstPlayerBanner,
  hotseatFirstPlayerBanner,
  gameHasStarted,
} from '../gameSetup';
import {
  describeMove,
  firstPlayerLogEntry,
  type MoveLogEntry,
  type SeatNameContext,
} from '../moveLog';
import './Game.css';
import './SidePanel.css';

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

const SWAP_DRAW_WARNING =
  'Third swap each — Draw 2 now ends the game. Play to break the streak.';

function ShuffleIcon() {
  return (
    <svg className="shuffle-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 3h5v5M4 20 10 14M21 3l-9 9M16 21h5v-5M21 21l-5.5-5.5M4 4l6 6"
      />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg className="shuffle-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        d="M6 6l12 12M18 6 6 18"
      />
    </svg>
  );
}

function buildFlagContext(state: GameState, playerId: 'P1' | 'P2'): FlagContext {
  return {
    flags: state.flags,
    playerId,
    flagsLost: { P1: state.players[0].flagsLost, P2: state.players[1].flagsLost },
    emptySpareCount: emptySpareCorners(state).length,
  };
}

function Game({ tileData, dictionary, mode, aiOpponent, onBackToMenu }: GameProps) {
  const [humanSeat, setHumanSeat] = useState<0 | 1>(() => pickHumanSeat(Math.random));
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
  const viewerIndex = isVsAI ? humanSeat : activeIndex;
  const viewer = gameState.players[viewerIndex];
  const other = gameState.players[viewerIndex === 0 ? 1 : 0];
  const viewerColor = viewer.id;

  const isAITurn = isVsAI && activeIndex !== humanSeat;
  const interactive = !isAITurn && !gameState.gameOver && !awaitingHandover;

  const seatCtx: SeatNameContext = useMemo(
    () => ({
      isVsAI,
      isHotseat,
      humanSeat,
      aiName: opponentName,
    }),
    [isVsAI, isHotseat, humanSeat, opponentName]
  );

  const firstPlayerBannerText = useMemo(() => {
    if (gameHasStarted(gameState.moveHistory.length)) return null;
    if (isVsAI && aiOpponent) {
      return soloFirstPlayerBanner(humanSeat, AI_NAMES[aiOpponent]);
    }
    if (isHotseat) return hotseatFirstPlayerBanner();
    return null;
  }, [gameState.moveHistory.length, isVsAI, isHotseat, aiOpponent, humanSeat]);

  const firstLogAdded = useRef(false);

  const resetSelection = useCallback(() => {
    setSelectedRackTileId(null);
    setSelectedMarketIds([]);
    setDiscardIds([]);
    setPending([]);
    setBlankPrompt(null);
    setError(null);
    setHint(null);
  }, []);

  const appendLog = useCallback(
    (next: GameState) => {
      const entry = describeMove(next, seatCtx);
      if (entry) setMoveLog(current => [...current, entry]);
    },
    [seatCtx]
  );

  const commit = useCallback(
    (next: GameState) => {
      appendLog(next);
      setGameState({ ...next });
      resetSelection();
    },
    [appendLog, resetSelection]
  );

  useEffect(() => {
    if (firstLogAdded.current || !firstPlayerBannerText) return;
    if (gameHasStarted(gameState.moveHistory.length)) return;
    firstLogAdded.current = true;
    setMoveLog([firstPlayerLogEntry(firstPlayerBannerText)]);
  }, [firstPlayerBannerText, gameState.moveHistory.length]);

  const aiFailures = useRef(0);
  useEffect(() => {
    if (!isVsAI || !aiOpponent || gameState.gameOver) return;
    if (gameState.currentPlayer === humanSeat) return;
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
        appendLog(gameState);
      }
      setIsAIThinking(false);
      setGameState({ ...gameState });
      resetSelection();
    }, 420);

    return () => {
      window.clearTimeout(timer);
      setIsAIThinking(false);
    };
  }, [gameState, isVsAI, aiOpponent, dictionary, resetSelection, humanSeat, appendLog]);

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
  const swapDrawWarning = interactive && wouldTriggerSwapOutOnDraw(gameState);

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

  const youLabel = isHotseat ? SEAT_COLOR_NAMES[viewer.id] : 'You';
  const otherLabel = isVsAI
    ? (opponentName ?? 'Opponent')
    : SEAT_COLOR_NAMES[other.id];
  const otherColor = other.id;

  const drawButtonLabel = swapDrawWarning ? 'Draw 2 — ends game' : 'Draw 2';

  const statusToasts = useMemo(() => {
    const items: { kind: string; text: string }[] = [];
    if (error) items.push({ kind: 'toast-error', text: error });
    if (firstPlayerBannerText) items.push({ kind: 'toast-info', text: firstPlayerBannerText });
    if (swapDrawWarning && interactive) {
      items.push({ kind: 'toast-hint', text: SWAP_DRAW_WARNING });
    }
    if (isAIThinking) items.push({ kind: 'toast-info', text: `${otherLabel} is thinking…` });
    if (pending.length > 0 && playEvaluation && !playEvaluation.valid) {
      items.push({ kind: 'toast-error', text: playEvaluation.reason ?? 'Not a legal play' });
    } else if (playEvaluation?.valid) {
      const words = playEvaluation.words?.map(w => w.word).join(' + ') ?? '';
      items.push({ kind: 'toast-hint', text: `${words} for ${playEvaluation.totalScore}` });
    }
    if (selectedMarketIds.length > 0 && selectedMarketIds.length < DRAW_COUNT) {
      items.push({
        kind: 'toast-hint',
        text: `Select ${DRAW_COUNT - selectedMarketIds.length} more market tile${DRAW_COUNT - selectedMarketIds.length === 1 ? '' : 's'}`,
      });
    }
    if (requiredDiscards > 0) {
      const left = requiredDiscards - discardIds.length;
      items.push({
        kind: 'toast-hint',
        text:
          left > 0
            ? `Tap ${left} rack tile${left === 1 ? '' : 's'} to discard`
            : 'Ready — tap Draw 2',
      });
    }
    if (hint) items.push({ kind: 'toast-hint', text: hint });
    if (!firstPlayerBannerText && gameState.lastPlay) {
      const words = gameState.lastPlay.words.map(w => w.word).join(' + ');
      const who =
        gameState.lastPlay.player === viewer.id
          ? youLabel
          : isVsAI
            ? otherLabel
            : SEAT_COLOR_NAMES[gameState.lastPlay.player];
      items.push({ kind: 'toast-info', text: `${who} played ${words} +${gameState.lastPlay.totalScore}` });
    }
    return items;
  }, [
    error,
    firstPlayerBannerText,
    swapDrawWarning,
    interactive,
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
    isVsAI,
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
      <div className="play-main">
        <header className="play-header">
          <HomeLink variant="play" onNavigate={onBackToMenu} />
        </header>

        <div className="scores-row">
          <GameInfo
            youLabel={youLabel}
            yourScore={viewer.score}
            rackCount={viewer.rack.length}
            isYourTurn={activeIndex === viewerIndex}
            playerColor={viewerColor}
          />
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
          <button
            type="button"
            className={`action-button action-draw ${swapDrawWarning ? 'is-swap-warning' : ''}`}
            onClick={handleDraw}
            disabled={!canDrawNow}
            aria-label={swapDrawWarning ? `${drawButtonLabel}. ${SWAP_DRAW_WARNING}` : drawButtonLabel}
          >
            {drawButtonLabel}
          </button>
        </div>

        <div className="status-row" aria-live="polite">
          {statusToasts.map((toast, i) => (
            <div key={i} className={`toast ${toast.kind}`}>
              {toast.text}
            </div>
          ))}
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
          <button
            type="button"
            className="icon-button action-shuffle"
            onClick={canClearNow ? handleClear : handleShuffle}
            disabled={!canClearNow && !canShuffleNow}
            aria-label={canClearNow ? 'Clear' : 'Shuffle'}
          >
            {canClearNow ? <ClearIcon /> : <ShuffleIcon />}
            <span className="sr-only">{canClearNow ? 'Clear' : 'Shuffle'}</span>
          </button>
          <button type="button" className="action-button action-play" onClick={handlePlay} disabled={!canPlayNow}>
            Play
          </button>
        </div>
      </div>

      <SidePanel entries={moveLog} />

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
            firstLogAdded.current = false;
            setMoveLog([]);
            setHumanSeat(pickHumanSeat(Math.random));
            commit(initializeGame(tileData));
          }}
          onBackToMenu={onBackToMenu}
        />
      )}
    </div>
  );
}

export default Game;

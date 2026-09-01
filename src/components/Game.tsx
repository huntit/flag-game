// Play screen. Tap a rack tile then tap a square, or drag a tile straight onto
// the board. Rack tiles can also be dragged into a new order.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TileData, GameState, GameAction, Tile, Position, Letter } from '../engine/types';
import { DRAW_COUNT, RACK_MAX, SEAT_COLOR_NAMES } from '../engine/types';
import type { Dictionary } from '../engine/dictionary';
import {
  getBoardTile,
  initializeGame,
  shuffleRack,
  reorderRack,
  emptySpareCorners,
} from '../engine/game';
import { executeAction, validateDraw, wouldTriggerExchangeThreeOnDraw, canPass } from '../engine/actions';
import { validatePlay, type FlagContext } from '../engine/validator';
import { selectAIAction } from '../engine/ai';
import type { GameMode, AIOpponent } from '../App';
import Board, { type PendingPlacement } from './Board';
import { Rack } from './Rack';
import Market from './Market';
import { ScoreCard } from './GameInfo';
import { TileFace } from './TileFace';
import HomeLink from './HomeLink';
import SidePanel from './SidePanel';
import GameOverOverlay from './GameOverOverlay';
import PassThePhone from './PassThePhone';
import BlankPicker from './BlankPicker';
import { useTileDrag } from './useTileDrag';
import {
  pickHumanSeat,
  soloFirstPlayerBanner,
  hotseatFirstPlayerBanner,
  gameHasStarted,
} from '../gameSetup';
import {
  describeMove,
  firstPlayerLogEntry,
  joinWords,
  playSummaryText,
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

interface StatusToast {
  kind: string;
  /** Whole line as text — also the accessible announcement. */
  text: string;
  /** When set, the line is rendered as "<words> for <score>". */
  words?: string;
  score?: number;
  prefix?: string;
}

const AI_NAMES: Record<AIOpponent, string> = {
  hunter: 'Hunter',
  greedy: 'Greedy',
  sleeper: 'Sleeper',
};

const EXCHANGE_WARNING =
  'Third Exchange — Draw 2 now ends the game. Play to break the streak.';

function ShuffleIcon() {
  return (
    <svg className="control-icon" viewBox="0 0 24 24" aria-hidden="true">
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
    <svg className="control-icon" viewBox="0 0 24 24" aria-hidden="true">
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

/** "ABHORS + AD + BO + HE for 22", with the total bold in the score colour. */
function ToastLine({ toast }: { toast: StatusToast }) {
  if (toast.words === undefined || toast.score === undefined) {
    return <>{toast.text}</>;
  }
  return (
    <>
      {toast.prefix && <span className="toast-prefix">{toast.prefix} </span>}
      <span className="toast-words">{toast.words}</span>
      <span className="toast-for"> for </span>
      <span className="score-value">{toast.score}</span>
    </>
  );
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
  const exchangeWarning = interactive && wouldTriggerExchangeThreeOnDraw(gameState);
  const canPassNow = interactive && pending.length === 0 && canPass(gameState, dictionary);

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

  const selectRackTile = useCallback(
    (tile: Tile) => {
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
    },
    [interactive, requiredDiscards]
  );

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

  /** Shared by tap-to-place and drag-to-place: put one held tile on a square. */
  const placeTile = useCallback(
    (tileId: string, position: Position): boolean => {
      if (getBoardTile(gameState.board, position)) {
        setHint('That square is taken');
        return false;
      }

      const tile = viewer.rack.find(t => t.id === tileId);
      if (!tile) return false;

      let blocked = false;
      setPending(current => {
        const occupant = current.find(
          p => p.position.row === position.row && p.position.col === position.col
        );
        if (occupant && occupant.tileId !== tileId) {
          blocked = true;
          return current;
        }
        // Moving a tile already on the board keeps whatever letter a blank was
        // given, so a re-placed blank never has to be chosen twice.
        const without = current.filter(p => p.tileId !== tileId);
        const existing = current.find(p => p.tileId === tileId);
        return [...without, { tileId, position, assignedLetter: existing?.assignedLetter }];
      });

      if (blocked) {
        setHint('That square is taken');
        return false;
      }

      setSelectedRackTileId(null);
      setSelectedMarketIds([]);
      setHint(null);
      if (tile.isBlank && !pending.find(p => p.tileId === tileId)?.assignedLetter) {
        setBlankPrompt(tile.id);
      }
      return true;
    },
    [gameState.board, viewer.rack, pending]
  );

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

    placeTile(selectedRackTileId, position);
  };

  /**
   * Slide a rack tile to the slot the player dropped it on. Visible slots skip
   * tiles that are currently out on the board, so the drop index has to be
   * translated back into a position in the full rack.
   */
  const moveRackTile = useCallback(
    (tileId: string, visibleIndex: number) => {
      const rack = gameState.players[viewerIndex].rack;
      const visible = rack.filter(t => t.id !== tileId && !placedTileIds.includes(t.id));
      const anchor = visible[visibleIndex];
      const rawIndex = anchor ? rack.findIndex(t => t.id === anchor.id) : rack.length;
      gameState.players[viewerIndex].rack = reorderRack(rack, tileId, rawIndex);
      setGameState({ ...gameState });
    },
    [gameState, viewerIndex, placedTileIds]
  );

  const drag = useTileDrag({
    enabled: interactive,
    onDropOnBoard: (tileId, position) => {
      setError(null);
      placeTile(tileId, position);
    },
    onDropOnRack: (tileId, index, origin) => {
      setError(null);
      if (origin.kind === 'board') {
        // Dragged back off the board: return it to the rack at that slot.
        setPending(current => current.filter(p => p.tileId !== tileId));
      }
      moveRackTile(tileId, index);
      setSelectedRackTileId(null);
    },
    onTap: (tileId, origin) => {
      if (origin.kind === 'board') {
        setPending(current => current.filter(p => p.tileId !== tileId));
        setSelectedRackTileId(null);
        return;
      }
      const tile = viewer.rack.find(t => t.id === tileId);
      if (tile) selectRackTile(tile);
    },
  });

  const handleRackTileClick = (tile: Tile) => {
    if (drag.consumeGhostClick(tile.id)) return;
    selectRackTile(tile);
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

  const handlePass = () => {
    if (!canPassNow) return;
    run({ type: 'pass' });
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

  const p1 = gameState.players[0];
  const p2 = gameState.players[1];
  const seatLabel = (seat: 0 | 1) =>
    isVsAI ? (seat === humanSeat ? youLabel : otherLabel) : SEAT_COLOR_NAMES[seat === 0 ? 'P1' : 'P2'];

  const drawButtonLabel = exchangeWarning ? 'Draw 2 — ends game' : 'Draw 2';

  // The tile riding under the cursor, drawn once above everything else.
  const draggedTile = drag.state
    ? viewer.rack.find(t => t.id === drag.state!.tileId) ?? null
    : null;
  const draggedPending = drag.state
    ? pending.find(p => p.tileId === drag.state!.tileId)
    : undefined;
  const dragBoardTarget =
    drag.state?.target?.kind === 'board' ? drag.state.target.position : null;
  const dragRackIndex = drag.state?.target?.kind === 'rack' ? drag.state.target.index : null;
  const liftedTileId = drag.state?.tileId ?? null;

  const statusToasts = useMemo(() => {
    const items: StatusToast[] = [];
    if (error) items.push({ kind: 'toast-error', text: error });
    if (firstPlayerBannerText) items.push({ kind: 'toast-info', text: firstPlayerBannerText });
    if (exchangeWarning && interactive) {
      items.push({ kind: 'toast-hint', text: EXCHANGE_WARNING });
    }
    if (isAIThinking) items.push({ kind: 'toast-info', text: `${otherLabel} is thinking…` });
    if (pending.length > 0 && playEvaluation && !playEvaluation.valid) {
      items.push({ kind: 'toast-error', text: playEvaluation.reason ?? 'Not a legal play' });
    } else if (playEvaluation?.valid) {
      const words = joinWords(playEvaluation.words ?? []);
      const score = playEvaluation.totalScore ?? 0;
      items.push({
        kind: 'toast-score',
        text: playSummaryText(words, score),
        words,
        score,
      });
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
      const words = joinWords(gameState.lastPlay.words);
      const who =
        gameState.lastPlay.player === viewer.id
          ? youLabel
          : isVsAI
            ? otherLabel
            : SEAT_COLOR_NAMES[gameState.lastPlay.player];
      items.push({
        kind: 'toast-score',
        text: `${who} played ${playSummaryText(words, gameState.lastPlay.totalScore)}`,
        prefix: `${who} played`,
        words,
        score: gameState.lastPlay.totalScore,
      });
    }
    return items;
  }, [
    error,
    firstPlayerBannerText,
    exchangeWarning,
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
    <div className={`play-shell ${drag.isDragging ? 'is-dragging' : ''}`}>
      <header className="play-header">
        <HomeLink variant="play" onNavigate={onBackToMenu} />
      </header>

      <div className="play-side">
        <div className="scores-row">
          <ScoreCard
            name={seatLabel(0)}
            score={p1.score}
            rackCount={p1.rack.length}
            isActive={activeIndex === 0}
            playerColor="P1"
            variant={viewerIndex === 0 ? 'you' : 'opponent'}
          />
          <ScoreCard
            name={seatLabel(1)}
            score={p2.score}
            rackCount={p2.rack.length}
            isActive={activeIndex === 1}
            playerColor="P2"
            variant={viewerIndex === 1 ? 'you' : 'opponent'}
          />
        </div>

        <SidePanel entries={moveLog} />
      </div>

      <div className="play-main">
        <div className="stage">
          <Board
            board={gameState.board}
            flags={gameState.flags}
            pendingPlacements={pendingForBoard}
            highlight={pending.length === 0 ? lastPlayHighlight : []}
            dropTarget={dragBoardTarget}
            liftedTileIds={liftedTileId ? [liftedTileId] : []}
            seatNames={{ P1: seatLabel(0), P2: seatLabel(1) }}
            onCellClick={handleCellClick}
            onTilePointerDown={(event, tileId) => {
              const placement = pending.find(p => p.tileId === tileId);
              if (!placement) return;
              drag.begin(event, { kind: 'board', tileId, position: placement.position });
            }}
          />
        </div>

        <div className="dock">
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
              liftedTileId={liftedTileId}
              dropIndex={dragRackIndex}
              disabled={!interactive}
              onTileClick={handleRackTileClick}
              onTilePointerDown={(event, tileId) => drag.begin(event, { kind: 'rack', tileId })}
            />
          </div>

          <div className="actions-row">
            <button
              type="button"
              className="control control-ghost action-shuffle"
              onClick={canClearNow ? handleClear : handleShuffle}
              disabled={!canClearNow && !canShuffleNow}
              aria-label={canClearNow ? 'Clear' : 'Shuffle your tiles'}
              title={canClearNow ? 'Clear' : 'Shuffle your tiles'}
            >
              {canClearNow ? <ClearIcon /> : <ShuffleIcon />}
            </button>

            <span className="actions-spacer" />

            {canPassNow ? (
              <button
                type="button"
                className="control control-solid action-pass"
                data-pass-stuck-only="true"
                onClick={handlePass}
              >
                Pass
              </button>
            ) : (
              <button
                type="button"
                className={`control control-solid action-draw ${exchangeWarning ? 'is-swap-warning' : ''}`}
                onClick={handleDraw}
                disabled={!canDrawNow}
                aria-label={exchangeWarning ? `${drawButtonLabel}. ${EXCHANGE_WARNING}` : drawButtonLabel}
              >
                {drawButtonLabel}
              </button>
            )}

            <button
              type="button"
              className="control control-solid action-play"
              onClick={handlePlay}
              disabled={!canPlayNow}
            >
              Play
            </button>
          </div>
        </div>

        <div className="status-row" aria-live="polite">
          {statusToasts[0] && (
            <div className={`toast ${statusToasts[0].kind}`} title={statusToasts[0].text}>
              <ToastLine toast={statusToasts[0]} />
            </div>
          )}
        </div>
      </div>

      {/* The tile riding under the cursor. Fixed to the viewport and inert, so
          hit-testing sees the board underneath rather than this. */}
      {drag.state && (draggedTile || draggedPending) && (
        <div
          className="drag-ghost"
          style={{
            left: `${drag.state.left}px`,
            top: `${drag.state.top}px`,
            width: `${drag.state.width}px`,
            height: `${drag.state.height}px`,
          }}
          aria-hidden="true"
        >
          <span className={`tray-tile rack-tile ${draggedTile?.isBlank ? 'is-blank' : ''}`}>
            <TileFace
              letter={draggedPending?.assignedLetter ?? draggedTile?.letter ?? null}
              value={draggedTile?.isBlank ? 0 : draggedTile?.value ?? 0}
              isBlank={Boolean(draggedTile?.isBlank) && !draggedPending?.assignedLetter}
            />
          </span>
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

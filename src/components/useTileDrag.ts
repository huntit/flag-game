// Pointer-based tile dragging, in the same shape as Word Eagle's rack drag:
// one pointerdown starts a candidate, a 10px move promotes it to a real drag,
// and a short flick that never leaves tap territory is handed back as a tap.
//
// Pointer events cover mouse, touch and pen with one code path, which is why
// there is no HTML5 dragstart/drop anywhere in this game.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Position } from '../engine/types';

/** How far the pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD_PX = 10;
/** A move shorter and faster than this is a tap the finger wobbled through. */
const TAP_RESCUE_PX = 14;
const TAP_RESCUE_MS = 400;

export type DragOrigin =
  | { kind: 'rack'; tileId: string }
  | { kind: 'board'; tileId: string; position: Position };

export type DragTarget =
  | { kind: 'board'; position: Position }
  | { kind: 'rack'; index: number }
  | null;

export interface DragState {
  tileId: string;
  origin: DragOrigin;
  /** Where the floating tile is drawn, in viewport coordinates. */
  left: number;
  top: number;
  width: number;
  height: number;
  target: DragTarget;
}

interface UseTileDragOptions {
  enabled: boolean;
  onDropOnBoard: (tileId: string, position: Position, origin: DragOrigin) => void;
  onDropOnRack: (tileId: string, index: number, origin: DragOrigin) => void;
  /** Fired when the press turned out to be a tap, so callers keep one path. */
  onTap: (tileId: string, origin: DragOrigin) => void;
}

interface Candidate {
  origin: DragOrigin;
  startX: number;
  startY: number;
  startedAt: number;
  maxDist: number;
  offX: number;
  offY: number;
  width: number;
  height: number;
  active: boolean;
  target: DragTarget;
  pointerId: number;
}

function boardCellAt(x: number, y: number): Position | null {
  const el = document.elementFromPoint(x, y);
  const cell = el?.closest<HTMLElement>('.board-cell');
  if (!cell) return null;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  if (!Number.isFinite(row) || !Number.isFinite(col)) return null;
  return { row, col };
}

/**
 * Which slot a drop at x would land in. Slots are measured from the live DOM
 * rather than assumed, so it stays correct at every tile size.
 */
function rackIndexAt(x: number, y: number): number | null {
  const zone = document.querySelector<HTMLElement>('[data-rack-zone]');
  if (!zone) return null;

  const bounds = zone.getBoundingClientRect();
  // A generous vertical band: dropping just above or below the rail still
  // counts, because fingers rarely land inside a 50px strip.
  const slack = bounds.height * 0.75;
  if (y < bounds.top - slack || y > bounds.bottom + slack) return null;
  if (x < bounds.left - 24 || x > bounds.right + 24) return null;

  const tiles = [...zone.querySelectorAll<HTMLElement>('[data-rack-index]')];
  if (tiles.length === 0) return 0;

  for (let i = 0; i < tiles.length; i++) {
    const r = tiles[i].getBoundingClientRect();
    if (x < r.left + r.width / 2) return i;
  }
  return tiles.length;
}

/** A click the browser fires right after a drag's pointerup is not a click. */
const GHOST_CLICK_MS = 350;

export function useTileDrag({ enabled, onDropOnBoard, onDropOnRack, onTap }: UseTileDragOptions) {
  const candidate = useRef<Candidate | null>(null);
  const [state, setState] = useState<DragState | null>(null);
  const ghostClick = useRef<{ tileId: string; at: number } | null>(null);

  // Callbacks are read through a ref so the window listeners, which are bound
  // once per drag, never close over a stale render.
  const handlers = useRef({ onDropOnBoard, onDropOnRack, onTap });
  handlers.current = { onDropOnBoard, onDropOnRack, onTap };

  const cancel = useCallback(() => {
    candidate.current = null;
    setState(null);
  }, []);

  const begin = useCallback(
    (event: ReactPointerEvent, origin: DragOrigin) => {
      if (!enabled) return;
      // Left button / touch / pen only — a right-click is not a drag.
      if (event.button !== 0) return;

      const el = event.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();

      candidate.current = {
        origin,
        startX: event.clientX,
        startY: event.clientY,
        startedAt: performance.now(),
        maxDist: 0,
        offX: event.clientX - rect.left,
        offY: event.clientY - rect.top,
        width: rect.width,
        height: rect.height,
        active: false,
        target: null,
        pointerId: event.pointerId,
      };
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) {
      cancel();
      return;
    }

    const move = (event: globalThis.PointerEvent) => {
      const c = candidate.current;
      if (!c || event.pointerId !== c.pointerId) return;

      const dx = event.clientX - c.startX;
      const dy = event.clientY - c.startY;
      c.maxDist = Math.max(c.maxDist, Math.hypot(dx, dy));

      if (!c.active) {
        if (c.maxDist < DRAG_THRESHOLD_PX) return;
        c.active = true;
      }

      // Stop the page from panning under a drag on touch.
      if (event.cancelable) event.preventDefault();

      const cell = boardCellAt(event.clientX, event.clientY);
      const rackIndex = cell === null ? rackIndexAt(event.clientX, event.clientY) : null;
      c.target = cell
        ? { kind: 'board', position: cell }
        : rackIndex !== null
          ? { kind: 'rack', index: rackIndex }
          : null;

      setState({
        tileId: c.origin.tileId,
        origin: c.origin,
        left: event.clientX - c.offX,
        top: event.clientY - c.offY,
        width: c.width,
        height: c.height,
        target: c.target,
      });
    };

    const end = (event: globalThis.PointerEvent) => {
      const c = candidate.current;
      if (!c || event.pointerId !== c.pointerId) return;
      candidate.current = null;
      setState(null);

      if (!c.active) return; // never left tap territory — the click event fires

      // The drag was real, so the click the browser is about to fire is a
      // ghost. Swallow it either way; only the rescue path reports a tap.
      ghostClick.current = { tileId: c.origin.tileId, at: performance.now() };

      // Click rescue: a fast micro-drag was a tap the hand slipped through.
      if (c.maxDist < TAP_RESCUE_PX && performance.now() - c.startedAt < TAP_RESCUE_MS) {
        handlers.current.onTap(c.origin.tileId, c.origin);
        return;
      }

      const target = c.target;
      if (target?.kind === 'board') {
        handlers.current.onDropOnBoard(c.origin.tileId, target.position, c.origin);
      } else if (target?.kind === 'rack') {
        handlers.current.onDropOnRack(c.origin.tileId, target.index, c.origin);
      }
      // Dropped on neither: the tile goes home, which is what re-rendering does.
    };

    const abort = (event: globalThis.PointerEvent) => {
      const c = candidate.current;
      if (!c || event.pointerId !== c.pointerId) return;
      cancel();
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', abort);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', abort);
    };
  }, [enabled, cancel]);

  /**
   * Call at the top of a tile's onClick: true when this click is the ghost
   * that follows a drag's pointerup, and should be ignored.
   */
  const consumeGhostClick = useCallback((tileId: string) => {
    const ghost = ghostClick.current;
    if (!ghost || ghost.tileId !== tileId) return false;
    if (performance.now() - ghost.at > GHOST_CLICK_MS) {
      ghostClick.current = null;
      return false;
    }
    ghostClick.current = null;
    return true;
  }, []);

  return { begin, state, isDragging: state !== null, cancel, consumeGhostClick };
}

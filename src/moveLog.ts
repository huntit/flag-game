// Move-log copy helpers (testable without React).

import type { GameState } from './engine/types';
import { SEAT_COLOR_NAMES } from './engine/types';

export interface MoveLogEntry {
  player?: 'P1' | 'P2';
  name?: string;
  /** Whole line as plain text — used for screen readers and assertions. */
  text: string;
  /** Words half of a play line ("ABHORS + AD + BO + HE"), when there is one. */
  words?: string;
  /** Points scored, rendered bold in the score colour beside "for". */
  score?: number;
  /** Anything trailing the score (flag captures, game-over notes). */
  suffix?: string;
  /** System lines (e.g. first-player banner) omit the seat prefix. */
  system?: boolean;
}

export interface SeatNameContext {
  isVsAI: boolean;
  isHotseat: boolean;
  humanSeat: 0 | 1;
  aiName: string | null;
}

export function seatDisplayName(seat: 'P1' | 'P2', ctx: SeatNameContext): string {
  if (ctx.isVsAI) {
    const humanId = ctx.humanSeat === 0 ? 'P1' : 'P2';
    if (seat === humanId) return 'You';
    return ctx.aiName ?? 'Opponent';
  }
  return SEAT_COLOR_NAMES[seat];
}

function captureSuffix(state: GameState): string {
  const play = state.lastPlay;
  if (!play?.captures) return '';

  if (play.capturesOwnFlag) {
    return ' — own flag captured (TWS), game over';
  }
  if (play.capturesOpponentFlag) {
    if (state.endReason === 'second_steal') {
      return ' — stole opponent flag (DWS), game over';
    }
    if (state.endReason === 'no_spare') {
      return ' — stole opponent flag (DWS), no spare corner';
    }
    return ' — stole opponent flag (DWS), flag replaced';
  }
  return '';
}

function drawSuffix(state: GameState): string {
  if (state.endReason === 'exchange_three') {
    return ' — three consecutive Exchanges, game over';
  }
  if (state.endReason === 'bag_empty') {
    return ' — bag empty, game over';
  }
  return '';
}

/** "ABHORS + AD + BO + HE" — every word the play made, in scoring order. */
export function joinWords(words: { word: string }[]): string {
  return words.map(w => w.word).join(' + ');
}

/**
 * "ABHORS + AD + BO + HE for 22" — never "+22". The score reads as a total the
 * words earned, and the UI renders it bold in the score colour.
 */
export function playSummaryText(words: string, score: number): string {
  return `${words} for ${score}`;
}

export function describeMove(state: GameState, ctx: SeatNameContext): MoveLogEntry | null {
  const last = state.moveHistory[state.moveHistory.length - 1];
  if (!last) return null;

  if (last.action.type === 'draw') {
    const discards = last.action.discardTiles?.length ?? 0;
    const base = discards > 0 ? `Draw 2, discard ${discards}` : 'Draw 2';
    return {
      player: last.player,
      name: seatDisplayName(last.player, ctx),
      text: `${base}${drawSuffix(state)}`,
    };
  }

  if (last.action.type === 'pass') {
    const suffix =
      state.endReason === 'double_pass' || state.endReason === 'stuck_out'
        ? ' — game over'
        : '';
    return {
      player: last.player,
      name: seatDisplayName(last.player, ctx),
      text: `Pass${suffix}`,
    };
  }

  if (last.action.type === 'play' && state.lastPlay) {
    const words = joinWords(state.lastPlay.words);
    const score = state.lastPlay.totalScore;
    const suffix = captureSuffix(state);
    return {
      player: last.player,
      name: seatDisplayName(last.player, ctx),
      text: `${playSummaryText(words, score)}${suffix}`,
      words,
      score,
      suffix,
    };
  }

  return null;
}

export function firstPlayerLogEntry(text: string): MoveLogEntry {
  return { text, system: true };
}

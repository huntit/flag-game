// First-player banner copy and solo seat assignment (testable without React).

import { SEAT_COLOR_NAMES } from './engine/types';

export function pickHumanSeat(random: () => number): 0 | 1 {
  return random() < 0.5 ? 0 : 1;
}

/** P1 always acts first; banner names the seat colour that goes first. */
export function hotseatFirstPlayerBanner(): string {
  return `${SEAT_COLOR_NAMES.P1} plays first`;
}

export function soloFirstPlayerBanner(humanSeat: 0 | 1, aiName: string): string {
  return humanSeat === 0 ? 'You play first' : `${aiName} plays first`;
}

export function remoteFirstPlayerBanner(): string {
  return hotseatFirstPlayerBanner();
}

export function gameHasStarted(moveHistoryLength: number): boolean {
  return moveHistoryLength > 0;
}

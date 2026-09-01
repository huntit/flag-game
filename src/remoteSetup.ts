// Remote room: defer full setup until both seats have connected.

export interface SeatConnections {
  P1: boolean;
  P2: boolean;
}

export function shouldInitializeRemoteGame(
  connected: SeatConnections,
  hasGameState: boolean
): boolean {
  return connected.P1 && connected.P2 && !hasGameState;
}

export function markSeatConnected(connected: SeatConnections, seat: 'P1' | 'P2'): SeatConnections {
  return { ...connected, [seat]: true };
}

// PartyKit room for Flag remote 2-player.
//
// One Durable Object per game. The room is authoritative: clients send actions
// and the room validates them with the same rules engine the UI and CLI use.
// The snapshot lives in room storage and is never destroyed when tabs close, so
// a game can sit for days and silence is never treated as a pass.
//
// Privacy: opponent rack LETTERS never leave the room. Rack COUNT is public
// state, and so is the bag count — but not the bag's contents or order.

import type * as Party from 'partykit/server';
import type { GameAction, GameState, TileData } from '../engine/types';
import { facedownRack, initializeGame } from '../engine/game';
import { executeAction } from '../engine/actions';
import { Dictionary } from '../engine/dictionary';
import { hotseatFirstPlayerBanner } from '../gameSetup';
import { markSeatConnected, shouldInitializeRemoteGame } from '../remoteSetup';

/** Where the room fetches its data from; same files the app ships. */
const DATA_BASE_URL = 'https://huntit.github.io/flag-game';

type Seat = 'P1' | 'P2';

interface StoredState {
  gameState: GameState | null;
  p1Token: string;
  p2Token: string;
  seatsConnected: { P1: boolean; P2: boolean };
  firstPlayerBanner: string | null;
}

interface PublicState {
  game: GameState | null;
  yourSeat: Seat;
  bagCount: number;
  opponentTileCount: number;
  awaitingOpponent: boolean;
  firstPlayerBanner: string | null;
}

let dictionaryPromise: Promise<Dictionary> | null = null;
let tileDataPromise: Promise<TileData> | null = null;

function loadDictionary(): Promise<Dictionary> {
  dictionaryPromise ??= fetch(`${DATA_BASE_URL}/data/words.txt`)
    .then(res => res.text())
    .then(text => Dictionary.fromText(text));
  return dictionaryPromise;
}

function loadTileData(): Promise<TileData> {
  tileDataPromise ??= fetch(`${DATA_BASE_URL}/data/tiles.json`).then(
    res => res.json() as Promise<TileData>
  );
  return tileDataPromise;
}

function secretToken(): string {
  // 32 hex characters of crypto randomness: unguessable over days of play,
  // unlike a 4-letter room code.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export default class FlagServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    const token = new URL(ctx.request.url).searchParams.get('token');
    if (!token) {
      connection.close(1008, 'Missing seat token');
      return;
    }

    const stored = await this.load();
    const seat = this.seatFor(token, stored);
    if (!seat) {
      connection.close(1008, 'Invalid seat token');
      return;
    }

    stored.seatsConnected = markSeatConnected(stored.seatsConnected, seat);

    if (shouldInitializeRemoteGame(stored.seatsConnected, stored.gameState !== null)) {
      stored.gameState = initializeGame(await loadTileData());
      stored.firstPlayerBanner = hotseatFirstPlayerBanner();
      await this.save(stored);
    }

    this.send(connection, { type: 'state', state: this.publicState(stored, seat) });
    this.room.broadcast(JSON.stringify({ type: 'seat-connected', seat }), [connection.id]);
  }

  async onMessage(message: string, sender: Party.Connection) {
    const token = new URL(sender.uri).searchParams.get('token');
    if (!token) return;

    const stored = await this.load();
    const seat = this.seatFor(token, stored);
    if (!seat) return;

    let data: { type?: string; action?: GameAction };
    try {
      data = JSON.parse(message);
    } catch {
      this.send(sender, { type: 'error', error: 'Malformed message' });
      return;
    }

    switch (data.type) {
      case 'action':
        if (data.action) await this.applyAction(stored, seat, data.action, sender);
        break;
      case 'get-state':
        this.send(sender, { type: 'state', state: this.publicState(stored, seat) });
        break;
      default:
        this.send(sender, { type: 'error', error: 'Unknown message type' });
    }
  }

  /**
   * Validate and apply one action, then broadcast the new public state to each
   * seat separately so neither payload carries the other rack's letters.
   */
  private async applyAction(
    stored: StoredState,
    seat: Seat,
    action: GameAction,
    sender: Party.Connection
  ) {
    if (!stored.gameState) return;

    const activeSeat = stored.gameState.players[stored.gameState.currentPlayer].id;
    if (activeSeat !== seat) {
      this.send(sender, { type: 'error', error: 'Not your turn' });
      return;
    }

    const dictionary = await loadDictionary();
    const result = executeAction(stored.gameState, action, dictionary);
    if (!result.success) {
      this.send(sender, { type: 'error', error: result.error });
      return;
    }

    await this.save(stored);
    await this.broadcastState(stored);
  }

  private async broadcastState(stored: StoredState) {
    for (const connection of this.room.getConnections()) {
      const token = new URL(connection.uri).searchParams.get('token');
      const seat = token ? this.seatFor(token, stored) : null;
      if (!seat) continue;
      this.send(connection, { type: 'state', state: this.publicState(stored, seat) });
    }
  }

  private seatFor(token: string, stored: StoredState): Seat | null {
    if (token === stored.p1Token) return 'P1';
    if (token === stored.p2Token) return 'P2';
    return null;
  }

  /**
   * Strip everything the other seat is not entitled to: their rack letters and
   * the bag's contents. Counts survive; identities do not.
   */
  private publicState(stored: StoredState, seat: Seat): PublicState {
    const awaitingOpponent = stored.gameState === null;

    if (awaitingOpponent) {
      return {
        game: null,
        yourSeat: seat,
        bagCount: 0,
        opponentTileCount: 0,
        awaitingOpponent: true,
        firstPlayerBanner: null,
      };
    }

    const game = stored.gameState!;
    const youIndex = seat === 'P1' ? 0 : 1;
    const themIndex = youIndex === 0 ? 1 : 0;

    const players = [...game.players] as GameState['players'];
    players[themIndex] = {
      ...game.players[themIndex],
      rack: facedownRack(game.players[themIndex].rack.length),
    };

    return {
      game: {
        ...game,
        players,
        bag: facedownRack(game.bag.length),
      },
      yourSeat: seat,
      bagCount: game.bag.length,
      opponentTileCount: game.players[themIndex].rack.length,
      awaitingOpponent: false,
      firstPlayerBanner:
        game.moveHistory.length === 0 ? stored.firstPlayerBanner : null,
    };
  }

  private async load(): Promise<StoredState> {
    const stored = await this.room.storage.get<StoredState>('state');
    if (stored) {
      stored.seatsConnected ??= { P1: false, P2: false };
      stored.firstPlayerBanner ??= null;
      return stored;
    }

    const fresh: StoredState = {
      gameState: null,
      p1Token: secretToken(),
      p2Token: secretToken(),
      seatsConnected: { P1: false, P2: false },
      firstPlayerBanner: null,
    };
    await this.save(fresh);
    return fresh;
  }

  private async save(stored: StoredState): Promise<void> {
    // Only serialisable state is persisted; live connections are not.
    await this.room.storage.put('state', stored);
  }

  private send(connection: Party.Connection, payload: unknown): void {
    connection.send(JSON.stringify(payload));
  }
}

FlagServer satisfies Party.Worker;

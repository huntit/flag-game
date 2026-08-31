// PartyKit server for Flag remote multiplayer

import type * as Party from "partykit/server";
import { facedownRack } from "../engine/game";

// Server-side game state
interface RoomState {
  gameState: GameState | null;
  p1Token: string;
  p2Token: string;
  connections: Map<string, Party.Connection>;
}

export default class FlagServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Extract token from query params
    const url = new URL(ctx.request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      conn.close(1008, 'Missing token');
      return;
    }

    // Load room state
    const state = await this.getState();
    
    // Verify token
    if (token !== state.p1Token && token !== state.p2Token) {
      conn.close(1008, 'Invalid token');
      return;
    }

    // Store connection
    state.connections.set(conn.id, conn);

    // Send current game state
    if (state.gameState) {
      this.sendToConnection(conn, {
        type: 'state',
        state: this.sanitizeStateForPlayer(state.gameState, token, state),
      });
    }

    // Notify other players
    this.broadcast({
      type: 'player-connected',
      playerId: token === state.p1Token ? 'P1' : 'P2',
    }, [conn.id]);
  }

  async onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);
    const state = await this.getState();

    // Extract sender token from connection
    const url = new URL(sender.url!);
    const token = url.searchParams.get('token');
    
    if (!token) return;

    switch (data.type) {
      case 'action':
        await this.handleAction(data.action, token, state);
        break;
      
      case 'get-state':
        this.sendToConnection(sender, {
          type: 'state',
          state: this.sanitizeStateForPlayer(state.gameState!, token, state),
        });
        break;
    }
  }

  async onClose(conn: Party.Connection) {
    const state = await this.getState();
    state.connections.delete(conn.id);
  }

  private async getState(): Promise<RoomState> {
    const stored = await this.room.storage.get<RoomState>('state');
    if (stored) {
      return {
        ...stored,
        connections: new Map(),
      };
    }

    // Initialize new game
    const p1Token = this.generateToken();
    const p2Token = this.generateToken();

    const newState: RoomState = {
      gameState: null, // Will be initialized when first player connects
      p1Token,
      p2Token,
      connections: new Map(),
    };

    await this.room.storage.put('state', newState);
    return newState;
  }

  private async saveState(state: RoomState) {
    await this.room.storage.put('state', {
      gameState: state.gameState,
      p1Token: state.p1Token,
      p2Token: state.p2Token,
    });
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private sanitizeStateForPlayer(
    gameState: GameState,
    playerToken: string,
    roomState: RoomState
  ): any {
    // Hide opponent's rack
    const isP1 = playerToken === roomState.p1Token;
    const sanitized = { ...gameState };
    
    if (isP1) {
      sanitized.players = [
        gameState.players[0],
        { ...gameState.players[1], rack: facedownRack(gameState.players[1].rack.length) },
      ];
    } else {
      sanitized.players = [
        { ...gameState.players[0], rack: facedownRack(gameState.players[0].rack.length) },
        gameState.players[1],
      ];
    }

    return sanitized;
  }

  private async handleAction(action: GameAction, token: string, state: RoomState) {
    if (!state.gameState) return;

    // Verify it's the player's turn
    const isP1 = token === state.p1Token;
    const currentPlayerId = state.gameState.players[state.gameState.currentPlayer].id;
    
    if ((isP1 && currentPlayerId !== 'P1') || (!isP1 && currentPlayerId !== 'P2')) {
      return; // Not your turn
    }

    // TODO: Execute action using the engine
    // For now, this is a placeholder
    // We would need to load the dictionary and execute the action

    // Broadcast updated state to all players
    state.connections.forEach((conn) => {
      const url = new URL(conn.url!);
      const connToken = url.searchParams.get('token');
      if (connToken) {
        this.sendToConnection(conn, {
          type: 'state',
          state: this.sanitizeStateForPlayer(state.gameState!, connToken, state),
        });
      }
    });

    await this.saveState(state);
  }

  private sendToConnection(conn: Party.Connection, data: any) {
    conn.send(JSON.stringify(data));
  }

  private broadcast(data: any, exclude: string[] = []) {
    const message = JSON.stringify(data);
    this.room.broadcast(message, exclude);
  }
}

FlagServer satisfies Party.Worker;

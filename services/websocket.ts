import { ApiGame, ApiMove, ApiPosition, WS_BASE_URL } from './api';

export type WSConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface ConnectedPayload {
  clientId: string;
  gameId: string;
  role: 'white' | 'black' | 'spectator';
  game: ApiGame;
  whiteCount: number;
  blackCount: number;
  spectatorCount: number;
}

export interface MoveMadePayload {
  move: ApiMove;
  game: ApiGame;
  playedBy: string;
}

export interface GameResetPayload {
  game: ApiGame;
  resetBy: string;
}

export interface PlayerEventPayload {
  clientId: string;
  playerName: string;
  role: string;
  message: string;
}

export interface ChatPayload {
  senderId: string;
  senderName: string;
  role: string;
  text: string;
}

export interface WSMessageEnvelope {
  type: string;
  gameId?: string;
  payload?: any;
  timestamp?: string;
}

export interface ChessWebSocketCallbacks {
  onStatusChange?: (status: WSConnectionStatus) => void;
  onConnected?: (payload: ConnectedPayload) => void;
  onMoveMade?: (payload: MoveMadePayload) => void;
  onGameReset?: (payload: GameResetPayload) => void;
  onPlayerJoined?: (payload: PlayerEventPayload) => void;
  onPlayerLeft?: (payload: PlayerEventPayload) => void;
  onChat?: (payload: ChatPayload) => void;
  onError?: (error: string, details?: string) => void;
}

export class ChessWebSocketClient {
  private ws: WebSocket | null = null;
  private gameId: string | null = null;
  private role: string = '';
  private playerName: string = '';
  private callbacks: ChessWebSocketCallbacks = {};
  private status: WSConnectionStatus = 'disconnected';
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private baseUrl: string;

  constructor(baseUrl = WS_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public setCallbacks(callbacks: ChessWebSocketCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getStatus(): WSConnectionStatus {
    return this.status;
  }

  private setStatus(newStatus: WSConnectionStatus) {
    this.status = newStatus;
    this.callbacks.onStatusChange?.(newStatus);
  }

  public connect(gameId: string, role = '', playerName = '') {
    this.disconnect();

    this.gameId = gameId;
    this.role = role;
    this.playerName = playerName;
    this.shouldReconnect = true;
    this.setStatus('connecting');

    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (playerName) params.append('name', playerName);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const url = `${this.baseUrl}/games/${gameId}${queryString}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        console.log("WS Connected", url, this.ws);
        this.setStatus('connected');
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessageEnvelope = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.warn('[ChessWS] Failed to parse message:', event.data);
        }
      };

      this.ws.onerror = (event: any) => {
        console.warn('[ChessWS] WebSocket error:', event.message || event);
        this.callbacks.onError?.('WebSocket connection error');
      };

      this.ws.onclose = (event) => {
        this.stopPing();
        this.setStatus('disconnected');

        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          this.setStatus('reconnecting');
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          this.reconnectTimeout = setTimeout(() => {
            if (this.shouldReconnect && this.gameId) {
              this.connect(this.gameId, this.role, this.playerName);
            }
          }, delay);
        }
      };
    } catch (e: any) {
      this.setStatus('disconnected');
      this.callbacks.onError?.('Failed to initiate connection', e?.message);
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    this.stopPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private handleMessage(msg: WSMessageEnvelope) {
    switch (msg.type) {
      case 'CONNECTED':
        this.callbacks.onConnected?.(msg.payload);
        break;

      case 'MOVE_MADE':
        this.callbacks.onMoveMade?.(msg.payload);
        break;

      case 'GAME_RESET':
        this.callbacks.onGameReset?.(msg.payload);
        break;

      case 'PLAYER_JOINED':
        this.callbacks.onPlayerJoined?.(msg.payload);
        break;

      case 'PLAYER_LEFT':
        this.callbacks.onPlayerLeft?.(msg.payload);
        break;

      case 'CHAT':
        this.callbacks.onChat?.(msg.payload);
        break;

      case 'ERROR':
        this.callbacks.onError?.(msg.payload?.error || 'Unknown error', msg.payload?.details);
        break;

      case 'PONG':
        // Heartbeat received
        break;

      default:
        break;
    }
  }

  public send(type: string, payload: any = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[ChessWS] Cannot send message, socket not open');
      return false;
    }

    const envelope: WSMessageEnvelope = {
      type,
      gameId: this.gameId || undefined,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.ws.send(JSON.stringify(envelope));
    return true;
  }

  /**
   * Convert algebraic squares (e.g. 'e2', 'e4') into row/col coordinates and send move.
   * Backend board rows: 0 (rank 8, Black pieces) to 7 (rank 1, White pieces).
   * cols: 0 (a) to 7 (h).
   */
  public sendMove(fromSquare: string, toSquare: string, promotion?: string): boolean {
    console.log(`[ChessWS] Sending move: ${fromSquare} -> ${toSquare}, promotion: ${promotion}`);
    const fromPos = squareToCoords(fromSquare);
    const toPos = squareToCoords(toSquare);

    return this.send('MOVE', {
      from: fromPos,
      to: toPos,
      promotion: promotion || undefined,
    });
  }

  public sendReset(): boolean {
    return this.send('RESET', {});
  }

  public sendChat(text: string): boolean {
    return this.send('CHAT', { text });
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      this.send('PING', {});
    }, 25000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

/**
 * Converts chess square (e.g. 'e2') to { row, col }
 * 'e2' -> col = 4 ('e'), row = 6 (rank 2 is 8 - 2 = 6)
 */
export function squareToCoords(sq: string): ApiPosition {
  const col = sq.charCodeAt(0) - 97;
  const row = 8 - parseInt(sq[1], 10);
  return { row, col };
}

/**
 * Converts { row, col } back to chess square (e.g. 'e2')
 */
export function coordsToSquare(pos: ApiPosition): string {
  const col = String.fromCharCode(97 + pos.col);
  const row = `${8 - pos.row}`;
  return `${col}${row}`;
}

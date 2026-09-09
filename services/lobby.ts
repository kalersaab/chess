import { WS_BASE_URL, OnlinePlayer, ApiGame } from './api';

export type LobbyConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface ChallengeSentPayload {
  challengeId: string;
  targetName: string;
  color: string;
}

export interface ChallengeReceivedPayload {
  challengeId: string;
  challengerName: string;
  color: string;
}

export interface GameStartPayload {
  gameId: string;
  yourColor: 'white' | 'black';
  opponentName: string;
  opponentColor: 'white' | 'black';
  game: ApiGame;
}

export interface LobbyCallbacks {
  onStatusChange?: (status: LobbyConnectionStatus) => void;
  onOnlineUsers?: (users: OnlinePlayer[], count: number) => void;
  onChallengeSent?: (payload: ChallengeSentPayload) => void;
  onChallengeReceived?: (payload: ChallengeReceivedPayload) => void;
  onChallengeDeclined?: (payload: { challengeId: string; message: string }) => void;
  onChallengeCancelled?: (payload: { challengeId: string }) => void;
  onGameStart?: (payload: GameStartPayload) => void;
  onQuickMatchWaiting?: (message: string) => void;
  onError?: (error: string) => void;
}

export class LobbyWebSocketClient {
  private ws: WebSocket | null = null;
  private username: string = '';
  private userId: string = '';
  private callbacks: LobbyCallbacks = {};
  private status: LobbyConnectionStatus = 'disconnected';
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private baseUrl: string;

  constructor(baseUrl = WS_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public setCallbacks(callbacks: LobbyCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getStatus(): LobbyConnectionStatus {
    return this.status;
  }

  private setStatus(newStatus: LobbyConnectionStatus) {
    this.status = newStatus;
    this.callbacks.onStatusChange?.(newStatus);
  }

  public connect(username: string, userId = '') {
    this.disconnect();

    this.username = username;
    this.userId = userId;
    this.shouldReconnect = true;
    this.setStatus('connecting');

    const params = new URLSearchParams();
    if (username) params.append('username', username);
    if (userId) params.append('userId', userId);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const url = `${this.baseUrl}/lobby${queryString}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.warn('[LobbyWS] Failed to parse message:', event.data);
        }
      };

      this.ws.onerror = (event: any) => {
        console.warn('[LobbyWS] Error:', event.message || event);
        this.callbacks.onError?.('Lobby connection error');
      };

      this.ws.onclose = () => {
        this.stopPing();
        this.setStatus('disconnected');

        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          this.setStatus('reconnecting');
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          this.reconnectTimeout = setTimeout(() => {
            if (this.shouldReconnect && this.username) {
              this.connect(this.username, this.userId);
            }
          }, delay);
        }
      };
    } catch (e: any) {
      this.setStatus('disconnected');
      this.callbacks.onError?.(e?.message || 'Failed to connect to lobby');
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

  private handleMessage(msg: { type: string; payload: any; count?: number }) {
    switch (msg.type) {
      case 'ONLINE_PLAYERS':
        this.callbacks.onOnlineUsers?.(msg.payload || [], msg.count || 0);
        break;

      case 'CHALLENGE_SENT':
        this.callbacks.onChallengeSent?.(msg.payload);
        break;

      case 'CHALLENGE_RECEIVED':
        this.callbacks.onChallengeReceived?.(msg.payload);
        break;

      case 'CHALLENGE_DECLINED':
        this.callbacks.onChallengeDeclined?.(msg.payload);
        break;

      case 'CHALLENGE_CANCELLED':
        this.callbacks.onChallengeCancelled?.(msg.payload);
        break;

      case 'GAME_START':
        this.callbacks.onGameStart?.(msg.payload);
        break;

      case 'QUICK_MATCH_WAITING':
        this.callbacks.onQuickMatchWaiting?.(msg.payload?.message || 'Searching for opponent...');
        break;

      case 'ERROR':
        this.callbacks.onError?.(msg.payload?.error || 'Unknown lobby error');
        break;

      case 'PONG':
        break;

      default:
        break;
    }
  }

  public send(type: string, payload: any = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.ws.send(JSON.stringify({ type, payload }));
    return true;
  }

  public sendChallenge(targetUsername: string, color: 'white' | 'black' | 'random' = 'random') {
    return this.send('SEND_CHALLENGE', { targetUsername, color });
  }

  public acceptChallenge(challengeId: string) {
    return this.send('ACCEPT_CHALLENGE', { challengeId });
  }

  public declineChallenge(challengeId: string) {
    return this.send('DECLINE_CHALLENGE', { challengeId });
  }

  public cancelChallenge(challengeId: string) {
    return this.send('CANCEL_CHALLENGE', { challengeId });
  }

  public joinQuickMatch() {
    return this.send('QUICK_MATCH_JOIN', {});
  }

  public cancelQuickMatch() {
    return this.send('QUICK_MATCH_CANCEL', {});
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      this.send('PING', {});
    }, 20000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

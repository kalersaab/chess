import { Platform } from 'react-native';

export const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2:8080' : 'localhost:8080';
export const API_BASE_URL = `http://${DEFAULT_HOST}/api`;
export const WS_BASE_URL = `ws://${DEFAULT_HOST}/ws`;

export interface ApiPiece {
  type: 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
  color: 'white' | 'black';
}

export interface ApiPosition {
  row: number;
  col: number;
}

export interface ApiMove {
  from: ApiPosition;
  to: ApiPosition;
  piece: ApiPiece;
  captured?: ApiPiece;
  promotion?: string;
  timestamp: string;
}

export interface ApiGame {
  id: string;
  board: (ApiPiece | null)[][];
  playerWhite: string;
  playerBlack: string;
  currentTurn: 'white' | 'black';
  moves: ApiMove[];
  status: 'active' | 'finished' | 'draw';
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  winner?: string;
  createdAt: string;
  updatedAt: string;
}

import { getToken } from './auth';

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function createOnlineGame(
  playerWhite = 'White Player',
  playerBlack = 'Black Player',
  baseUrl = API_BASE_URL
): Promise<ApiGame> {
  const response = await fetch(`${baseUrl}/games`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ playerWhite, playerBlack }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to create game' }));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export async function getOnlineGame(id: string, baseUrl = API_BASE_URL): Promise<ApiGame> {
  const response = await fetch(`${baseUrl}/games/${id}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Game not found' }));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export async function listOnlineGames(baseUrl = API_BASE_URL): Promise<{ games: ApiGame[]; count: number }> {
  const response = await fetch(`${baseUrl}/games`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  return response.json();
}

export interface UserSearchResult {
  id: string;
  username: string;
  isOnline: boolean;
}

export interface OnlinePlayer {
  id: string;
  userId: string;
  username: string;
  status: string; // "online" | "in_game" | "waiting"
}

export async function searchUsers(query = '', baseUrl = API_BASE_URL): Promise<{ users: UserSearchResult[]; count: number }> {
  const response = await fetch(`${baseUrl}/users/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  return response.json();
}

export async function getOnlineUsers(baseUrl = API_BASE_URL): Promise<{ users: OnlinePlayer[]; count: number }> {
  const response = await fetch(`${baseUrl}/users/online`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  return response.json();
}


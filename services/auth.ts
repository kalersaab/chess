import { Platform } from 'react-native';

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080/api' : 'http://localhost:8080/api';

// In-memory storage for the token (since AsyncStorage was requested to be omitted)
let currentToken: string | null = null;
let currentUsername: string | null = null;

export const setToken = (token: string) => {
  currentToken = token;
};

export const getToken = () => {
  return currentToken;
};

export const clearToken = () => {
  currentToken = null;
  currentUsername = null;
};

export const setUsername = (username: string) => {
  currentUsername = username;
};

export const getUsername = () => {
  return currentUsername;
};

export const login = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to login');
  }

  const data = await response.json();
  if (data.token) {
    setToken(data.token);
  }
  return data;
};

export const signup = async (username: string, email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to sign up');
  }

  const data = await response.json();
  if (data.user && data.user.username) {
    setUsername(data.user.username);
  }
  return data;
};

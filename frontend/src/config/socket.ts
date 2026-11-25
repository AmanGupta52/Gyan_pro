import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/config/api';

/* ─────────────────────────────────────────────
 * Socket.IO client for real-time features.
 *
 * Usage:
 *   import { connectSocket, socket } from '@/config/socket';
 *   connectSocket(accessToken);
 *   socket.on('quiz:start', handler);
 * ───────────────────────────────────────────── */

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000';

/** Singleton socket instance — starts disconnected. */
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  // Function form: evaluated on every (re)connect so a refreshed access token is used
  auth: (cb) => cb({ token: getAccessToken() }),
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1_000,
  reconnectionDelayMax: 10_000,
  timeout: 20_000,
  transports: ['websocket', 'polling'],
});

/**
 * Connect (or reconnect) the socket with an access token.
 * The token is passed in the `auth` handshake so the server
 * can verify the user before accepting the connection.
 */
export function connectSocket(token: string): void {
  // Auth payload is resolved lazily (see `auth` above); keep the in-memory token in sync.
  void token;

  if (socket.connected) {
    // Force a reconnect so the new token is sent
    socket.disconnect();
  }

  socket.connect();
}

/** Disconnect the socket gracefully. */
export function disconnectSocket(): void {
  if (socket.connected) {
    socket.disconnect();
  }
}

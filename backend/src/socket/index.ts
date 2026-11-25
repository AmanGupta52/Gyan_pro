import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'node:http';
import { verifyAccessToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { registerGameHandlers, triggerEndQuestion } from './game.handler.js';
import { rehydrateActiveSessions } from '../services/game.service.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './types.js';

/** Map of userId → socketId for online user tracking */
const onlineUsers = new Map<string, string>();

/** The Socket.IO server instance — initialised by initSocket() */
let io: SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Initialise Socket.IO with authentication middleware and connection handlers.
 *
 * @param httpServer - The Node.js HTTP server to attach to
 * @returns The configured Socket.IO server instance
 */
export function initSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    },
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  // ── Authentication middleware ──────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      logger.warn('Socket connection rejected: no token');
      return next(new Error('Authentication token is required'));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      logger.warn('Socket connection rejected: invalid token');
      return next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ─────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    onlineUsers.set(userId, socket.id);

    logger.info(
      { userId, socketId: socket.id, totalOnline: onlineUsers.size },
      '🔌 Socket connected'
    );

    // Ping handler for latency measurement
    socket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback(Date.now());
      }
    });

    // Attach Game Multiplayer Handlers
    registerGameHandlers(io, socket);

    // ── Disconnect ───────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      if (onlineUsers.get(userId) === socket.id) {
        onlineUsers.delete(userId);
      }
      logger.info(
        { userId, socketId: socket.id, reason, totalOnline: onlineUsers.size },
        '🔌 Socket disconnected'
      );
    });
  });

  // Rehydrate running timers from MongoDB after restart or Render sleep
  rehydrateActiveSessions(async (sessionId) => {
    await triggerEndQuestion(io, sessionId);
  });

  logger.info('Socket.IO server initialised');
  return io;
}

/**
 * Get the Socket.IO server instance.
 * @throws if called before initSocket()
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO has not been initialised — call initSocket() first');
  }
  return io;
}

/**
 * Get the socket ID for an online user.
 * @returns socketId or undefined if the user is offline
 */
export function getSocketId(userId: string): string | undefined {
  return onlineUsers.get(userId);
}

/**
 * Get the count of currently connected users.
 */
export function getOnlineCount(): number {
  return onlineUsers.size;
}

import type { Server as SocketIOServer, Socket } from 'socket.io';
import { z } from 'zod';
import {
  getSession,
  startSession,
  advanceToQuestion,
  getActiveQuestionState,
  submitAnswer,
  closeCurrentQuestion,
  finishSession,
} from '../services/game.service.js';
import { GameSession } from '../models/GameSession.js';
import { logger } from '../utils/logger.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './types.js';

type CustomSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type CustomServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/** Active timeouts per game session to manage question countdowns */
const activeTimers = new Map<string, NodeJS.Timeout>();

/** Mutex lock per session to prevent race conditions during question transition */
const closingLocks = new Set<string>();

/** Active user socket registry to enforce anti-cheat single active connection per user */
const userSocketMap = new Map<string, string>();

/** Rate limiter for socket events: max 15 events per second per socket */
const socketRateMap = new Map<string, { count: number; lastReset: number }>();

function checkSocketRateLimit(socketId: string, limit = 15, windowMs = 1000): boolean {
  const now = Date.now();
  const entry = socketRateMap.get(socketId);
  if (!entry || now - entry.lastReset > windowMs) {
    socketRateMap.set(socketId, { count: 1, lastReset: now });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

// Zod schemas for socket payloads
const joinSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

const readySchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

const startSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

const answerSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  questionId: z.string().min(1, 'Question ID is required'),
  selectedOptions: z.array(z.string()).min(1, 'At least one option must be selected'),
});

export function registerGameHandlers(io: CustomServer, socket: CustomSocket) {
  const userId = socket.data.userId;

  // ── Anti-Cheat: Single active socket per user ─────────────────
  const previousSocketId = userSocketMap.get(userId);
  if (previousSocketId && previousSocketId !== socket.id) {
    const prevSocket = io.sockets.sockets.get(previousSocketId);
    if (prevSocket) {
      prevSocket.emit('session:superseded', {
        message: 'New connection detected. Your previous session was disconnected.',
      });
      prevSocket.disconnect(true);
    }
  }
  userSocketMap.set(userId, socket.id);

  // ── 1. game:join ─────────────────────────────────────────────
  socket.on('game:join', async (rawPayload, callback) => {
    if (!checkSocketRateLimit(socket.id)) {
      callback?.({ success: false, error: 'Too many requests. Slow down.' });
      return;
    }
    try {
      const parsed = joinSchema.safeParse(rawPayload);
      if (!parsed.success) {
        callback?.({ success: false, error: parsed.error.errors[0]?.message || 'Invalid payload' });
        return;
      }

      const { sessionId } = parsed.data;
      const { session, members } = await getSession(sessionId, userId);

      // Join socket room
      const room = `game:${sessionId}`;
      socket.join(room);
      socket.data.gameSessionId = sessionId;

      // Update connected players in session
      if (!session.connectedPlayers.includes(userId)) {
        session.connectedPlayers.push(userId);
        await session.save();
      }

      // Notify room (reconnect vs. first connect)
      io.to(room).emit('game:player-status', {
        sessionId,
        userId,
        status: 'connected',
      });
      if (session.status !== 'waiting') {
        io.to(room).emit('game:player-reconnected', { sessionId, userId });
      }

      // Send join confirmation payload
      socket.emit('game:joined', {
        sessionId,
        teamId: session.teamId._id.toString(),
        competitionId: session.competitionId._id.toString(),
        status: session.status,
        members,
        readyPlayers: session.readyPlayers,
        connectedPlayers: session.connectedPlayers,
        currentQuestionIndex: session.currentQuestionIndex,
        totalQuestions: session.questionIds.length,
      });

      // If a question is running, restore it WITHOUT touching the persisted deadline
      // (time keeps running while disconnected; reconnecting grants no extra time).
      if (session.status === 'question_active') {
        const active = await getActiveQuestionState(sessionId, userId);
        if (active) {
          socket.emit('game:question', {
            sessionId,
            questionIndex: active.questionIndex,
            totalQuestions: active.totalQuestions,
            question: {
              _id: active.question._id.toString(),
              text: active.question.text,
              type: active.question.type,
              options: active.question.options,
              points: active.question.points,
              timeLimit: active.timeLimit,
              image: active.question.image,
            },
            deadline: active.deadline.toISOString(),
            serverTime: Date.now(),
            alreadyAnswered: active.alreadyAnswered,
          });
        }
      }

      callback?.({ success: true });
    } catch (err: any) {
      logger.error({ err, userId }, 'Error in game:join');
      callback?.({ success: false, error: err.message || 'Failed to join game' });
    }
  });

  // ── 2. game:ready ────────────────────────────────────────────
  socket.on('game:ready', async (rawPayload, callback) => {
    if (!checkSocketRateLimit(socket.id)) {
      callback?.({ success: false, error: 'Too many requests. Slow down.' });
      return;
    }
    try {
      const parsed = readySchema.safeParse(rawPayload);
      if (!parsed.success) {
        callback?.({ success: false, error: 'Invalid payload' });
        return;
      }

      const { sessionId } = parsed.data;
      const session = await GameSession.findById(sessionId);
      if (!session) {
        callback?.({ success: false, error: 'Session not found' });
        return;
      }

      if (session.status !== 'waiting') {
        callback?.({ success: false, error: 'Game has already started' });
        return;
      }

      const isReady = session.readyPlayers.includes(userId);
      if (isReady) {
        session.readyPlayers = session.readyPlayers.filter((id) => id !== userId);
      } else {
        session.readyPlayers.push(userId);
      }
      await session.save();

      io.to(`game:${sessionId}`).emit('game:player-status', {
        sessionId,
        userId,
        status: isReady ? 'connected' : 'ready',
      });

      callback?.({ success: true });
    } catch (err: any) {
      logger.error({ err, userId }, 'Error in game:ready');
      callback?.({ success: false, error: err.message || 'Failed to toggle ready' });
    }
  });

  // ── 3. game:start ────────────────────────────────────────────
  socket.on('game:start', async (rawPayload, callback) => {
    if (!checkSocketRateLimit(socket.id)) {
      callback?.({ success: false, error: 'Too many requests. Slow down.' });
      return;
    }
    try {
      const parsed = startSchema.safeParse(rawPayload);
      if (!parsed.success) {
        callback?.({ success: false, error: 'Invalid payload' });
        return;
      }

      const { sessionId } = parsed.data;
      await startSession(sessionId, userId);

      const room = `game:${sessionId}`;
      io.to(room).emit('game:starting', {
        sessionId,
        countdownSeconds: 3,
      });

      // 3-second countdown before starting first question
      setTimeout(async () => {
        try {
          await triggerNextQuestion(io, sessionId, 0);
        } catch (err: any) {
          logger.error({ err, sessionId }, 'Error starting first question');
          io.to(room).emit('game:error', { message: 'Failed to start tournament question.' });
        }
      }, 3000);

      callback?.({ success: true });
    } catch (err: any) {
      logger.error({ err, userId }, 'Error in game:start');
      callback?.({ success: false, error: err.message || 'Failed to start game' });
    }
  });

  // ── 4. game:answer ───────────────────────────────────────────
  socket.on('game:answer', async (rawPayload, callback) => {
    if (!checkSocketRateLimit(socket.id)) {
      callback?.({ success: false, error: 'Too many requests. Slow down.' });
      return;
    }
    try {
      const parsed = answerSchema.safeParse(rawPayload);
      if (!parsed.success) {
        callback?.({ success: false, error: parsed.error.errors[0]?.message || 'Invalid answer payload' });
        return;
      }

      const { sessionId, questionId, selectedOptions } = parsed.data;
      const { allPlayersAnswered } = await submitAnswer(
        sessionId,
        userId,
        questionId,
        selectedOptions
      );

      const room = `game:${sessionId}`;

      // Notify teammates that this player has answered (without leaking choice!)
      io.to(room).emit('game:player-status', {
        sessionId,
        userId,
        status: 'answered',
      });

      callback?.({ success: true });

      // If all team members answered, immediately trigger question closure
      if (allPlayersAnswered) {
        logger.info({ sessionId, questionId }, 'All team members answered — closing question early');
        clearQuestionTimer(sessionId);
        await triggerEndQuestion(io, sessionId);
      }
    } catch (err: any) {
      logger.error({ err, userId }, 'Error in game:answer');
      callback?.({ success: false, error: err.message || 'Failed to submit answer' });
    }
  });

  // ── 5. disconnect ────────────────────────────────────────────
  socket.on('disconnect', async () => {
    socketRateMap.delete(socket.id);
    // A superseded socket must not clear the registration (or the "connected" status)
    // of the newer socket that replaced it.
    if (userSocketMap.get(userId) !== socket.id) return;
    userSocketMap.delete(userId);
    const sessionId = socket.data.gameSessionId;

    if (sessionId) {
      try {
        const session = await GameSession.findById(sessionId);
        if (session) {
          // Increment disconnect telemetry counter (anti-cheat detection)
          const currentCount = session.disconnectedCounts?.get(userId) || 0;
          session.disconnectedCounts?.set(userId, currentCount + 1);
          session.connectedPlayers = session.connectedPlayers.filter((id) => id !== userId);
          await session.save();

          io.to(`game:${sessionId}`).emit('game:player-status', {
            sessionId,
            userId,
            status: 'disconnected',
          });
        }
      } catch (err) {
        logger.error({ err, sessionId, userId }, 'Error updating disconnect status');
      }
    }
  });
}

function clearQuestionTimer(sessionId: string) {
  const existing = activeTimers.get(sessionId);
  if (existing) {
    clearTimeout(existing);
    activeTimers.delete(sessionId);
  }
}

/**
 * Advance tournament to the specified question and schedule countdown timer.
 */
export async function triggerNextQuestion(
  io: CustomServer,
  sessionId: string,
  questionIndex: number
) {
  clearQuestionTimer(sessionId);
  const room = `game:${sessionId}`;

  const { session, question, timeLimit, deadline } = await advanceToQuestion(
    sessionId,
    questionIndex
  );

  // Broadcast question to room — NEVER include correct answers or explanation!
  io.to(room).emit('game:question', {
    sessionId,
    questionIndex,
    totalQuestions: session.questionIds.length,
    question: {
      _id: question._id.toString(),
      text: question.text,
      type: question.type,
      options: question.options,
      points: question.points,
      timeLimit,
      image: question.image,
    },
    deadline: deadline.toISOString(),
    serverTime: Date.now(),
  });

  // Broadcast thinking status for all connected players
  for (const pId of session.connectedPlayers) {
    io.to(room).emit('game:player-status', {
      sessionId,
      userId: pId,
      status: 'thinking',
    });
  }

  // Set server-authoritative timer
  const timer = setTimeout(async () => {
    logger.info({ sessionId, questionIndex }, 'Question timer expired');
    await triggerEndQuestion(io, sessionId);
  }, timeLimit * 1000);

  activeTimers.set(sessionId, timer);
}

/**
 * Close current question, reveal correct answers + explanation, and advance or finish.
 */
export async function triggerEndQuestion(io: CustomServer, sessionId: string) {
  if (closingLocks.has(sessionId)) return;
  closingLocks.add(sessionId);

  try {
    clearQuestionTimer(sessionId);
    const room = `game:${sessionId}`;

    const {
      session,
      correctAnswers,
      explanation,
      playerAnswers,
      teamScoreSoFar,
      isLastQuestion,
    } = await closeCurrentQuestion(sessionId);

    // Reveal correct answer and explanation to all team players
    io.to(room).emit('game:question-ended', {
      sessionId,
      questionIndex: session.currentQuestionIndex,
      correctAnswers,
      explanation,
      playerAnswers,
      teamScoreSoFar,
    });

    if (isLastQuestion) {
      // 4-second review window before finishing
      setTimeout(async () => {
        try {
          const finished = await finishSession(sessionId);
          io.to(room).emit('game:finished', {
            sessionId,
            totalScore: finished.totalScore,
            accuracy: finished.accuracy,
            correctCount: finished.correctCount,
            totalQuestions: finished.totalQuestions,
            durationSeconds: finished.durationSeconds,
          });
        } catch (err) {
          logger.error({ err, sessionId }, 'Error completing tournament session');
        } finally {
          closingLocks.delete(sessionId);
        }
      }, 4000);
    } else {
      // 4-second review window before moving to next question
      const nextIndex = session.currentQuestionIndex + 1;
      io.to(room).emit('game:next-question', {
        sessionId,
        nextQuestionIndex: nextIndex,
        delayMs: 4000,
      });

      setTimeout(async () => {
        closingLocks.delete(sessionId);
        try {
          await triggerNextQuestion(io, sessionId, nextIndex);
        } catch (err) {
          logger.error({ err, sessionId }, 'Error advancing to next question');
        }
      }, 4000);
    }
  } catch (err) {
    closingLocks.delete(sessionId);
    logger.error({ err, sessionId }, 'Error in triggerEndQuestion');
  }
}

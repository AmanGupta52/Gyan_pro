/**
 * Socket.IO event type definitions for GYAN-26 Multiplayer Game Engine.
 */

export interface GameQuestionClientPayload {
  _id: string;
  text: string;
  type: string;
  options: Array<{ id: string; text: string }>;
  points: number;
  timeLimit: number;
  image?: string;
}

export interface PlayerAnswerSummary {
  userId: string;
  selectedOptions: string[];
  isCorrect: boolean;
  scoreAwarded: number;
  speedBonusAwarded: number;
  timeTakenSeconds: number;
}

// ─── Server → Client events ──────────────────────────────────
export interface ServerToClientEvents {
  /** Notify client that a user just connected */
  'user:connected': (data: { userId: string }) => void;

  /** Notify client that a user disconnected */
  'user:disconnected': (data: { userId: string }) => void;

  /** Generic error event */
  'error:auth': (data: { message: string }) => void;

  /** Real-time push notification */
  notification: (data: {
    _id: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    createdAt: string;
  }) => void;

  /** Session superseded if opened in another window/device */
  'session:superseded': (data: { message: string }) => void;

  // ── GAME MULTIPLAYER EVENTS ──────────────────────────────
  'game:joined': (data: {
    sessionId: string;
    teamId: string;
    competitionId: string;
    status: string;
    members: Array<{ userId: string; name: string; avatar?: string; role: 'leader' | 'member' }>;
    readyPlayers: string[];
    connectedPlayers: string[];
    currentQuestionIndex: number;
    totalQuestions: number;
  }) => void;

  'game:player-status': (data: {
    sessionId: string;
    userId: string;
    status: 'connected' | 'disconnected' | 'ready' | 'thinking' | 'answered';
  }) => void;

  'game:starting': (data: {
    sessionId: string;
    countdownSeconds: number;
  }) => void;

  'game:question': (data: {
    sessionId: string;
    questionIndex: number;
    totalQuestions: number;
    question: GameQuestionClientPayload;
    deadline: string; // ISO String
    serverTime: number; // Unix ms
  }) => void;

  'game:timer': (data: {
    sessionId: string;
    remainingSeconds: number;
  }) => void;

  'game:question-ended': (data: {
    sessionId: string;
    questionIndex: number;
    correctAnswers: string[];
    explanation?: string;
    playerAnswers: PlayerAnswerSummary[];
    teamScoreSoFar: number;
  }) => void;

  'game:next-question': (data: {
    sessionId: string;
    nextQuestionIndex: number;
    delayMs: number;
  }) => void;

  'game:finished': (data: {
    sessionId: string;
    totalScore: number;
    accuracy: number;
    correctCount: number;
    totalQuestions: number;
    durationSeconds: number;
  }) => void;

  'game:error': (data: {
    message: string;
  }) => void;
}

// ─── Client → Server events ──────────────────────────────────
export interface ClientToServerEvents {
  /** Ping for latency measurement */
  'ping': (callback: (timestamp: number) => void) => void;

  /** Join a game lobby or resume active game */
  'game:join': (
    data: { sessionId: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  /** Toggle player ready status in lobby */
  'game:ready': (
    data: { sessionId: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  /** Leader starts the game session */
  'game:start': (
    data: { sessionId: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  /** Submit answer for current question */
  'game:answer': (
    data: { sessionId: string; questionId: string; selectedOptions: string[] },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;
}

// ─── Inter-server events ─────────────────────────────────────
export interface InterServerEvents {
  /** Horizontal Redis pub/sub events in future scaling */
}

// ─── Socket data attached to each connection ─────────────────
export interface SocketData {
  userId: string;
  role: string;
  gameSessionId?: string;
}

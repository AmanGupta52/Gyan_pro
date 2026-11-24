/* ─────────────────────────────────────────────
 * GYAN-26 — Shared Frontend TypeScript Types
 * Mirrors the backend domain models exactly.
 * ───────────────────────────────────────────── */

// ── Auth & Users ──────────────────────────────

/** Allowed global user roles */
export type UserRole = 'player' | 'admin' | 'superAdmin';

/** Education level categories */
export type EducationLevel =
  | 'Junior KG'
  | 'Senior KG'
  | 'Class 1'
  | 'Class 2'
  | 'Class 3'
  | 'Class 4'
  | 'Class 5'
  | 'Class 6'
  | 'Class 7'
  | 'Class 8'
  | 'Class 9'
  | 'Class 10'
  | 'Class 11'
  | 'Class 12'
  | 'Undergraduate'
  | 'Postgraduate'
  | 'PhD'
  | string;

/** User object returned from the API */
export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  dateOfBirth: string;
  educationLevel: string;
  institution?: string;
  city?: string;
  state?: string;
  country: string;
  photo?: string;
  isEmailVerified: boolean;
  isMinor: boolean;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianConsentAt?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload returned on successful authentication */
export interface AuthPayload {
  user: User;
  accessToken: string;
}

/** Credentials for the login endpoint */
export interface LoginCredentials {
  identifier: string; // email or phone
  password: string;
}

/** Full registration data sent to the register endpoint */
export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword?: string;
  dateOfBirth: string;
  city: string;
  state: string;
  country: string;
  educationLevel: string;
  institution: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianConsent?: boolean;
}

// ── API Envelope ──────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Stubs for Future Phases ───────────────────

export type CompetitionStatus =
  | 'Draft'
  | 'Registration Open'
  | 'Registration Closed'
  | 'Live'
  | 'Completed'
  | 'Archived';

export interface Competition {
  _id: string;
  name: string;
  description: string;
  status: CompetitionStatus;
  startAt: string;
  endAt: string;
  registrationDeadline: string;
  participationMode: 'individual' | 'team';
  allowedTeamSize: 1 | 2 | 4 | 6;
  numberOfQuestions: number;
  timePerQuestionSeconds: number;
  createdAt: string;
}

export interface Team {
  _id: string;
  name: string;
  competitionId: string;
  category: string;
  size: 2 | 4 | 6;
  members: Array<{
    userId: string;
    role: 'leader' | 'member';
    joinedAt: string;
  }>;
  createdAt: string;
}

// ── Game Session Types (Phase 4) ──────────────

export type GameSessionStatus =
  | 'waiting'
  | 'starting'
  | 'question_active'
  | 'question_closed'
  | 'finished';

export type GamePlayerState = 'connected' | 'disconnected' | 'ready' | 'thinking' | 'answered';

export interface GameQuestionClient {
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

export interface GameMember {
  userId: string;
  name: string;
  avatar?: string;
  role: 'leader' | 'member';
  status: GamePlayerState;
}

export interface GameSession {
  _id: string;
  competitionId: string;
  teamId: string;
  status: GameSessionStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  connectedPlayers: string[];
  readyPlayers: string[];
  startedAt?: string;
  finishedAt?: string;
  totalDurationSeconds?: number;
}

// ── Results & Leaderboard Types (Phase 5) ─────

export interface PlayerResultSummary {
  userId: string;
  name: string;
  avatar?: string;
  playerScore: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number;
  avgResponseTime: number;
}

export interface TournamentResult {
  _id: string;
  competitionId: {
    _id: string;
    name: string;
    category: string;
    status: string;
    numberOfQuestions: number;
    timePerQuestionSeconds: number;
    tieBreakRules: string;
  };
  teamId: {
    _id: string;
    name: string;
    category: string;
  };
  gameSessionId: string;
  totalScore: number;
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalQuestions: number;
  totalDurationSeconds: number;
  rank: number;
  isProvisional: boolean;
  submittedAt: string;
}

export interface LeaderboardMember {
  userId: string;
  name: string;
  avatar?: string;
  role: 'leader' | 'member';
}

export interface LeaderboardRow {
  _id: string;
  teamId: {
    _id: string;
    name: string;
    category: string;
  };
  totalScore: number;
  accuracy: number;
  correctCount: number;
  totalDurationSeconds: number;
  rank: number;
  isProvisional: boolean;
  submittedAt: string;
  members: LeaderboardMember[];
}

export interface UserMatchHistoryItem {
  _id: string;
  gameSessionId: string;
  competition: {
    _id: string;
    name: string;
    category: string;
    status: string;
    startAt: string;
    endAt: string;
  };
  team: {
    _id: string;
    name: string;
    category: string;
  };
  rank: number | string;
  teamScore: number;
  playerScore: number;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  avgResponseTime: number;
  isProvisional: boolean;
  playedAt: string;
}

// ── Certificate Types (Phase 6) ───────────────

export interface UserCertificate {
  _id: string;
  certificateId: string;
  competition: {
    _id: string;
    name: string;
    category: string;
    status: string;
  };
  team: {
    _id: string;
    name: string;
  };
  rank: number;
  score: number;
  accuracy: number;
  status: 'generating' | 'issued' | 'revoked';
  pdfUrl?: string;
  qrCodeUrl: string;
  issuedAt: string;
}

export interface VerifiedCertificate {
  certificateId: string;
  status: string;
  isValid: boolean;
  recipientName: string;
  competitionName: string;
  category: string;
  teamName: string;
  rank: number;
  score: number;
  accuracy: number;
  pdfUrl?: string;
  issuedAt: string;
  verificationUrl: string;
}

// ── Donations & Indian UPI ───────────────────

export interface BankDetails {
  accountNumber: string;
  ifsc: string;
  bankName: string;
  branch: string;
  accountHolder: string;
}

export interface DonationSettings {
  _id: string;
  upiId: string;
  payeeName: string;
  suggestedAmounts: number[];
  notes: string;
  bankDetails: BankDetails;
  taxExemptionNote?: string;
  isActive: boolean;
}

export interface DonationSettingsResponse {
  settings: DonationSettings;
  defaultUpiUri: string;
  defaultQrCode: string;
}

export interface CustomQrResponse {
  upiUri: string;
  qrCodeDataUrl: string;
  amount: number;
  upiId: string;
  payeeName: string;
  notes: string;
}



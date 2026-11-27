/* ─────────────────────────────────────────────
 * GYAN-26 — Shared Frontend TypeScript Types
 * Mirrors the backend domain models exactly.
 * ───────────────────────────────────────────── */

// ── Auth & Users ──────────────────────────────

/** Allowed global user roles */
export type UserRole = 'player' | 'teacher' | 'admin' | 'superAdmin';

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
  /** Staff accounts (teacher/admin) may not have these */
  dateOfBirth?: string;
  educationLevel?: string;
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
  /** 'quiz' = passed a teacher's quiz; missing/'competition' = tournament certificate */
  kind?: 'competition' | 'quiz';
  maxScore?: number;
  issuerName?: string;
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
  kind?: 'competition' | 'quiz';
  maxScore?: number;
  issuerName?: string;
  passPercent?: number;
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




// ── Quizzes, Solo Play & Teachers ─────────────

export type QuizStatus = 'draft' | 'published' | 'archived';
export type QuizVisibility = 'public' | 'unlisted';
export type ShowAnswersMode = 'after_each' | 'after_finish' | 'never';

export interface SubjectRef {
  _id: string;
  name: string;
  code: string;
}

export interface Quiz {
  _id: string;
  title: string;
  description?: string;
  category: string;
  subject?: SubjectRef;
  subjectId?: SubjectRef | string | null;
  status: QuizStatus;
  visibility: QuizVisibility;
  questionCount: number;
  timePerQuestionSeconds: number | null;
  maxAttempts: number;
  passPercent: number;
  showAnswers: ShowAnswersMode;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  speedBonusMax: number;
  penaltyWrong: number;
  certificateEnabled?: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  createdBy?: { _id: string; name?: string };
  /** Only present for the owner / admins */
  canManage?: boolean;
  joinCode?: string;
  questionIds?: string[];
  /** The signed-in student's own progress on this quiz */
  my?: {
    attempts: number;
    bestScore: number | null;
    bestAccuracy: number | null;
    inProgressAttemptId: string | null;
  };
}

export interface ManagedQuiz extends Quiz {
  attemptCount: number;
  playerCount: number;
  avgAccuracy: number | null;
  updatedAt: string;
  createdBy?: { _id: string; name?: string };
}

export interface QuizInput {
  title: string;
  description?: string;
  category: string;
  subjectId?: string | null;
  questionIds: string[];
  visibility: QuizVisibility;
  timePerQuestionSeconds?: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  maxAttempts: number;
  passPercent: number;
  showAnswers: ShowAnswersMode;
  speedBonusMax: number;
  penaltyWrong: number;
  certificateEnabled: boolean;
  startAt?: string | null;
  endAt?: string | null;
}

export interface BankQuestion {
  _id: string;
  text: string;
  type: string;
  difficulty: string;
  educationLevel: string;
  points: number;
  timeLimit: number;
  status: string;
  createdBy: string;
  correctAnswers?: string[];
  explanation?: string;
  options: { id: string; text: string }[];
  subjectId?: SubjectRef | string;
}

export interface SoloQuestion {
  _id: string;
  text: string;
  type: string;
  options: { id: string; text: string }[];
  points: number;
  image?: string;
  timeLimit: number;
}

export interface SoloState {
  attemptId: string;
  mode: 'quiz' | 'practice';
  title: string;
  status: 'in_progress' | 'finished';
  total: number;
  answered: number;
  serverNow: string;
  current: null | {
    index: number;
    question: SoloQuestion;
    startedAt: string;
    deadline: string;
  };
}

export interface SoloAnswerResponse {
  recorded: boolean;
  finished: boolean;
  feedback: null | {
    isCorrect: boolean;
    scoreAwarded: number;
    speedBonusAwarded: number;
    correctAnswers: string[];
    explanation?: string;
  };
  progress: { answered: number; total: number };
}

export interface SoloReviewItem {
  order: number;
  questionId: string;
  text: string;
  type?: string;
  image?: string;
  options: { id: string; text: string }[];
  correctAnswers: string[];
  explanation?: string;
  selectedOptions: string[];
  isCorrect: boolean;
  unanswered: boolean;
  scoreAwarded: number;
  timeTakenSeconds: number;
}

export interface SoloResult {
  attemptId: string;
  quizId: string | null;
  mode: 'quiz' | 'practice';
  title: string;
  category?: string;
  totalScore: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  unansweredCount: number;
  accuracy: number;
  passed: boolean;
  passPercent: number;
  durationSeconds: number;
  finishedAt?: string;
  showAnswers: ShowAnswersMode;
  assignmentId?: string | null;
  late?: boolean;
  certificate?: { certificateId: string; status: string } | null;
  /** null in exam mode (showAnswers = never) */
  review: SoloReviewItem[] | null;
}

export interface SoloHistoryItem {
  _id: string;
  quizId: string | null;
  mode: 'quiz' | 'practice';
  title: string;
  category?: string;
  status: 'in_progress' | 'finished';
  totalScore: number;
  maxScore: number;
  accuracy: number;
  passed: boolean;
  progress: { answered: number; total: number };
  createdAt: string;
  finishedAt?: string;
}

export interface SoloStats {
  attempts: number;
  avgAccuracy: number;
  bestScore: number;
  totalScore: number;
  correctAnswers: number;
  passed: number;
  recent: { title: string; accuracy: number; totalScore: number; finishedAt: string }[];
}

export interface QuizAnalytics {
  summary: {
    attempts: number;
    players: number;
    avgScore: number;
    avgAccuracy: number;
    avgDurationSeconds: number;
    passRate: number;
    bestScore: number;
  };
  questions: {
    questionId: string;
    order: number;
    text: string;
    difficulty?: string;
    responses: number;
    skipped: number;
    correct: number;
    correctRate: number | null;
    avgTimeSeconds: number | null;
  }[];
}

export interface QuizAttemptRow {
  _id: string;
  userId: { _id: string; name: string; email: string; educationLevel?: string; institution?: string };
  totalScore: number;
  maxScore: number;
  correctCount: number;
  accuracy: number;
  passed: boolean;
  durationSeconds: number;
  finishedAt: string;
}

export interface QuizLeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  photo?: string;
  institution?: string;
  totalScore: number;
  accuracy: number;
  durationSeconds: number;
}

export interface TeacherRow {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  institution?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  quizCount: number;
  publishedQuizCount: number;
}


// ── Solo activity (streaks & badges) ──────────

export interface SoloActivity {
  _id: string;
  mode: 'quiz' | 'practice';
  finishedAt: string;
  totalScore: number;
  maxScore: number;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
}

// ── Classes & assignments ─────────────────────

export type AssignmentStatus =
  | 'upcoming'
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'submitted_late'
  | 'overdue';

export interface ClassSummary {
  _id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  joinCode: string;
  owner: { _id: string; name: string };
  memberCount: number;
  assignmentCount: number;
  openAssignmentCount: number;
  createdAt: string;
}

export interface ClassMemberRow {
  userId: string;
  name: string;
  email: string;
  educationLevel?: string;
  institution?: string;
  joinedAt: string;
}

export interface ClassAssignmentRow {
  _id: string;
  quizId: string;
  quizTitle: string;
  category?: string;
  openAt: string;
  dueAt: string;
  allowLate: boolean;
  note?: string;
  status: 'active' | 'cancelled';
  memberCount: number;
  submittedCount: number;
}

export interface ClassDetail {
  class: { _id: string; name: string; description?: string; status: 'active' | 'archived'; joinCode: string; ownerId: string };
  members: ClassMemberRow[];
  assignments: ClassAssignmentRow[];
}

export interface AddMembersResult {
  added: string[];
  alreadyIn: string[];
  notFound: string[];
  notStudent: string[];
}

export interface JoinedClass {
  _id: string;
  name: string;
  description?: string;
  teacherName?: string;
}

/** One assignment as a student sees it */
export interface MyAssignment {
  _id: string;
  quizId: string;
  quizTitle: string;
  category: string;
  questionCount: number;
  passPercent: number;
  certificateEnabled: boolean;
  timePerQuestionSeconds: number | null;
  quizPublished: boolean;
  className: string;
  teacherName?: string;
  openAt: string;
  dueAt: string;
  allowLate: boolean;
  note?: string;
  status: AssignmentStatus;
  score: number | null;
  accuracy: number | null;
  passed: boolean | null;
  resultAttemptId: string | null;
  inProgressAttemptId: string | null;
  attemptsLeft: number | null;
  canStart: boolean;
}

export interface AssignmentProgressRow {
  userId: string;
  name: string;
  email: string;
  educationLevel?: string;
  status: AssignmentStatus;
  attempts: number;
  score: number | null;
  accuracy: number | null;
  passed: boolean | null;
  finishedAt: string | null;
}

export interface AssignmentProgress {
  assignment: {
    _id: string;
    classId: string;
    className: string;
    quizId: string;
    quizTitle: string;
    category?: string;
    passPercent?: number;
    openAt: string;
    dueAt: string;
    allowLate: boolean;
    note?: string;
    status: 'active' | 'cancelled';
    lastRemindedAt: string | null;
  };
  summary: {
    students: number;
    submitted: number;
    late: number;
    inProgress: number;
    pending: number;
    overdue: number;
    passed: number;
    avgScore: number;
    avgAccuracy: number;
  };
  rows: AssignmentProgressRow[];
}

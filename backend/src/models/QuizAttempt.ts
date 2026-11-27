import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';
import type { ShowAnswersMode } from './Quiz.js';

export type AttemptMode = 'quiz' | 'practice';
export type AttemptStatus = 'in_progress' | 'finished';

export interface IAttemptAnswer {
  questionId: Types.ObjectId;
  selectedOptions: string[];
  isCorrect: boolean;
  scoreAwarded: number;
  speedBonusAwarded: number;
  timeTakenSeconds: number;
  /** true when the player ran out of time (or quit) without answering */
  unanswered: boolean;
  answeredAt: Date;
}

/** Settings frozen at start so later quiz edits never change a running attempt */
export interface IAttemptConfig {
  showAnswers: ShowAnswersMode;
  passPercent: number;
  speedBonusMax: number;
  penaltyWrong: number;
  shuffleOptions: boolean;
  /** Quiz-wide time override in seconds (practice may set it too) */
  timePerQuestionSeconds?: number;
}

export interface IQuizAttempt extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  quizId?: Types.ObjectId;
  /** Set when the student started this attempt from a class assignment */
  assignmentId?: Types.ObjectId;
  /** Started after the deadline of an assignment that allows late work */
  isLate: boolean;
  mode: AttemptMode;
  title: string;
  category?: string;
  status: AttemptStatus;
  questionIds: Types.ObjectId[];
  currentIndex: number;
  /** Timer starts when the question is first served, so reloads can't reset it */
  questionStartedAt: Date | null;
  questionDeadline: Date | null;
  answers: IAttemptAnswer[];
  config: IAttemptConfig;
  totalScore: number;
  maxScore: number;
  correctCount: number;
  accuracy: number;
  passed: boolean;
  startedAt: Date;
  finishedAt?: Date;
  durationSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<IAttemptAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOptions: { type: [String], default: [] },
    isCorrect: { type: Boolean, default: false },
    scoreAwarded: { type: Number, default: 0 },
    speedBonusAwarded: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number, default: 0 },
    unanswered: { type: Boolean, default: false },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attemptSchema = new Schema<IQuizAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', index: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', index: true },
    isLate: { type: Boolean, default: false },
    mode: { type: String, enum: ['quiz', 'practice'], required: true },
    title: { type: String, required: true },
    category: { type: String },
    status: { type: String, enum: ['in_progress', 'finished'], default: 'in_progress' },
    questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    currentIndex: { type: Number, default: 0, min: 0 },
    questionStartedAt: { type: Date, default: null },
    questionDeadline: { type: Date, default: null },
    answers: { type: [answerSchema], default: [] },
    config: {
      showAnswers: { type: String, enum: ['after_each', 'after_finish', 'never'], default: 'after_each' },
      passPercent: { type: Number, default: 40 },
      speedBonusMax: { type: Number, default: 0 },
      penaltyWrong: { type: Number, default: 0 },
      shuffleOptions: { type: Boolean, default: false },
      timePerQuestionSeconds: { type: Number },
    },
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

attemptSchema.index({ userId: 1, status: 1, createdAt: -1 });
attemptSchema.index({ quizId: 1, status: 1, totalScore: -1 });

export const QuizAttempt: Model<IQuizAttempt> =
  (mongoose.models.QuizAttempt as Model<IQuizAttempt>) ||
  mongoose.model<IQuizAttempt>('QuizAttempt', attemptSchema);

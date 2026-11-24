import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export type GameSessionStatus =
  | 'waiting'
  | 'starting'
  | 'question_active'
  | 'question_closed'
  | 'finished';

export interface IGameSession extends Document {
  _id: Types.ObjectId;
  competitionId: Types.ObjectId;
  teamId: Types.ObjectId;
  status: GameSessionStatus;
  currentQuestionIndex: number;
  questionIds: Types.ObjectId[];
  questionDeadline: Date | null;
  questionStartedAt: Date | null;
  connectedPlayers: string[]; // User IDs currently in room
  readyPlayers: string[]; // User IDs marked ready
  disconnectedCounts: Map<string, number>; // userId -> count of disconnects (anti-cheat telemetry)
  startedAt: Date | null;
  finishedAt: Date | null;
  totalDurationSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const gameSessionSchema = new Schema<IGameSession>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
      index: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'starting', 'question_active', 'question_closed', 'finished'],
      default: 'waiting',
      index: true,
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    questionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    questionDeadline: {
      type: Date,
      default: null,
    },
    questionStartedAt: {
      type: Date,
      default: null,
    },
    connectedPlayers: {
      type: [String],
      default: [],
    },
    readyPlayers: {
      type: [String],
      default: [],
    },
    disconnectedCounts: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
    startedAt: {
      type: Date,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    totalDurationSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: Only one GameSession per team per competition
gameSessionSchema.index({ competitionId: 1, teamId: 1 }, { unique: true });
gameSessionSchema.index({ competitionId: 1, status: 1 });

export const GameSession: Model<IGameSession> =
  mongoose.models.GameSession || mongoose.model<IGameSession>('GameSession', gameSessionSchema);

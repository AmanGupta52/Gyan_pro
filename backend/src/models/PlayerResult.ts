import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export interface IPlayerResult extends Document {
  _id: Types.ObjectId;
  resultId: Types.ObjectId;
  competitionId: Types.ObjectId;
  teamId: Types.ObjectId;
  userId: Types.ObjectId;
  gameSessionId: Types.ObjectId;
  playerScore: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number;
  avgResponseTime: number;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const playerResultSchema = new Schema<IPlayerResult>(
  {
    resultId: {
      type: Schema.Types.ObjectId,
      ref: 'Result',
      required: true,
      index: true,
    },
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gameSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'GameSession',
      required: true,
      index: true,
    },
    playerScore: {
      type: Number,
      required: true,
      default: 0,
    },
    correctCount: {
      type: Number,
      required: true,
      default: 0,
    },
    incorrectCount: {
      type: Number,
      required: true,
      default: 0,
    },
    unansweredCount: {
      type: Number,
      required: true,
      default: 0,
    },
    accuracy: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
    avgResponseTime: {
      type: Number,
      required: true,
      default: 0,
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

playerResultSchema.index({ competitionId: 1, userId: 1 }, { unique: true });
playerResultSchema.index({ userId: 1, createdAt: -1 });

export const PlayerResult: Model<IPlayerResult> =
  mongoose.models.PlayerResult || mongoose.model<IPlayerResult>('PlayerResult', playerResultSchema);

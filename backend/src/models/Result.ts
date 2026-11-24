import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export interface IResult extends Document {
  _id: Types.ObjectId;
  competitionId: Types.ObjectId;
  teamId: Types.ObjectId;
  gameSessionId: Types.ObjectId;
  totalScore: number;
  accuracy: number; // 0 to 1
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalQuestions: number;
  totalDurationSeconds: number;
  rank: number;
  isProvisional: boolean; // True until competition is Completed
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const resultSchema = new Schema<IResult>(
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
    gameSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'GameSession',
      required: true,
      index: true,
    },
    totalScore: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    accuracy: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
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
    totalQuestions: {
      type: Number,
      required: true,
    },
    totalDurationSeconds: {
      type: Number,
      required: true,
      default: 0,
    },
    rank: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    isProvisional: {
      type: Boolean,
      default: true,
      index: true,
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

resultSchema.index({ competitionId: 1, teamId: 1 }, { unique: true });
resultSchema.index({ competitionId: 1, totalScore: -1, totalDurationSeconds: 1 });
resultSchema.index({ competitionId: 1, rank: 1 });

export const Result: Model<IResult> =
  mongoose.models.Result || mongoose.model<IResult>('Result', resultSchema);

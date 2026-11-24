import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export interface IPlayerAnswer extends Document {
  _id: Types.ObjectId;
  gameSessionId: Types.ObjectId;
  userId: Types.ObjectId;
  questionId: Types.ObjectId;
  selectedOptions: string[];
  submittedAt: Date;
  timeTakenSeconds: number;
  isCorrect: boolean;
  scoreAwarded: number;
  speedBonusAwarded: number;
  isLate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const playerAnswerSchema = new Schema<IPlayerAnswer>(
  {
    gameSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'GameSession',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    selectedOptions: {
      type: [String],
      required: true,
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    timeTakenSeconds: {
      type: Number,
      required: true,
      min: 0,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    scoreAwarded: {
      type: Number,
      required: true,
      default: 0,
    },
    speedBonusAwarded: {
      type: Number,
      default: 0,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Critical anti-cheat unique compound index: Each player can only submit ONE answer per question per session!
playerAnswerSchema.index(
  { gameSessionId: 1, userId: 1, questionId: 1 },
  { unique: true }
);

export const PlayerAnswer: Model<IPlayerAnswer> =
  mongoose.models.PlayerAnswer || mongoose.model<IPlayerAnswer>('PlayerAnswer', playerAnswerSchema);

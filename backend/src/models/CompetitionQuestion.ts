import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export interface ICompetitionQuestion extends Document {
  _id: Types.ObjectId;
  competitionId: Types.ObjectId;
  questionId: Types.ObjectId;
  order: number;
  pointsOverride?: number;
  timeLimitOverride?: number;
  createdAt: Date;
  updatedAt: Date;
}

const competitionQuestionSchema = new Schema<ICompetitionQuestion>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    pointsOverride: {
      type: Number,
      min: 0,
    },
    timeLimitOverride: {
      type: Number,
      min: 5,
    },
  },
  {
    timestamps: true,
  }
);

// One question cannot appear twice in the same competition
competitionQuestionSchema.index(
  { competitionId: 1, questionId: 1 },
  { unique: true }
);

competitionQuestionSchema.index({ competitionId: 1, order: 1 });

export const CompetitionQuestion: Model<ICompetitionQuestion> =
  mongoose.model<ICompetitionQuestion>(
    'CompetitionQuestion',
    competitionQuestionSchema
  );

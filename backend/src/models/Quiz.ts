import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export type QuizStatus = 'draft' | 'published' | 'archived';
export type QuizVisibility = 'public' | 'unlisted';
/** When the player gets to see the correct answer */
export type ShowAnswersMode = 'after_each' | 'after_finish' | 'never';

export interface IQuiz extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  /** Education level category, e.g. "Class 10" */
  category: string;
  subjectId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  questionIds: Types.ObjectId[];
  status: QuizStatus;
  /** public = listed for every student; unlisted = only reachable with joinCode */
  visibility: QuizVisibility;
  joinCode: string;
  /** Overrides each question's own time limit when set (seconds) */
  timePerQuestionSeconds?: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  /** 0 = unlimited */
  maxAttempts: number;
  passPercent: number;
  showAnswers: ShowAnswersMode;
  speedBonusMax: number;
  penaltyWrong: number;
  /** Award a verifiable certificate when a student passes */
  certificateEnabled: boolean;
  startAt?: Date;
  endAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000 },
    category: { type: String, required: true, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    visibility: { type: String, enum: ['public', 'unlisted'], default: 'public' },
    joinCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    timePerQuestionSeconds: { type: Number, min: 5, max: 300 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    maxAttempts: { type: Number, default: 0, min: 0, max: 100 },
    passPercent: { type: Number, default: 40, min: 0, max: 100 },
    showAnswers: {
      type: String,
      enum: ['after_each', 'after_finish', 'never'],
      default: 'after_each',
    },
    speedBonusMax: { type: Number, default: 0, min: 0, max: 500 },
    penaltyWrong: { type: Number, default: 0, min: 0, max: 500 },
    certificateEnabled: { type: Boolean, default: true },
    startAt: { type: Date },
    endAt: { type: Date },
  },
  { timestamps: true }
);

quizSchema.index({ status: 1, visibility: 1, category: 1, createdAt: -1 });

export const Quiz: Model<IQuiz> =
  (mongoose.models.Quiz as Model<IQuiz>) || mongoose.model<IQuiz>('Quiz', quizSchema);

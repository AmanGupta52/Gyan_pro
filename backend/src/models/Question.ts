import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export type QuestionType =
  | 'single_choice'
  | 'multiple_correct'
  | 'true_false'
  | 'image_question';
  // TODO: Add 'text_answer' in future extensible registry

export type QuestionDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface IQuestionOption {
  id: string; // e.g. "A", "B", "C", "D"
  text: string;
}

export interface IQuestion extends Document {
  _id: Types.ObjectId;
  text: string;
  type: QuestionType;
  options: IQuestionOption[];
  correctAnswers: string[]; // Option IDs, e.g. ["A"] or ["B", "D"]
  explanation?: string;
  subjectId: Types.ObjectId;
  difficulty: QuestionDifficulty;
  educationLevel: string; // Category name (e.g. "Class 10")
  points: number;
  timeLimit: number; // In seconds
  image?: string; // Cloudinary URL
  status: 'draft' | 'published';
  tags: string[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const questionOptionSchema = new Schema<IQuestionOption>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const questionSchema = new Schema<IQuestion>(
  {
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['single_choice', 'multiple_correct', 'true_false', 'image_question'],
      default: 'single_choice',
      required: true,
    },
    options: {
      type: [questionOptionSchema],
      required: true,
      validate: {
        validator: function (options: IQuestionOption[]) {
          return options && options.length >= 2;
        },
        message: 'A question must provide at least 2 options',
      },
    },
    correctAnswers: {
      type: [String],
      required: [true, 'At least one correct answer must be specified'],
      select: false, // Security: never exposed in default queries
    },
    explanation: {
      type: String,
      trim: true,
      select: false, // Security: revealed only post-question close
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'expert'],
      default: 'medium',
      required: true,
    },
    educationLevel: {
      type: String,
      required: [true, 'Education level category is required'],
      trim: true,
    },
    points: {
      type: Number,
      default: 100,
      min: 10,
    },
    timeLimit: {
      type: Number,
      default: 30, // seconds
      min: 5,
      max: 300,
    },
    image: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ educationLevel: 1, subjectId: 1, difficulty: 1, status: 1 });
questionSchema.index({ type: 1 });
questionSchema.index({ tags: 1 });

export const Question: Model<IQuestion> = mongoose.model<IQuestion>(
  'Question',
  questionSchema
);

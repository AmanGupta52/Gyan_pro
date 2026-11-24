import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export type CompetitionStatus =
  | 'Draft'
  | 'Registration Open'
  | 'Registration Closed'
  | 'Live'
  | 'Completed'
  | 'Archived';

export type ParticipationMode = 'individual' | 'team';
export type AllowedTeamSize = 1 | 2 | 4 | 6;

export interface IScoringConfig {
  basePoints: number; // e.g. 100
  speedBonusMax: number; // e.g. 50 (linear 0 to N based on remaining time)
  penaltyWrong: number; // e.g. 0 or negative
}

export interface ICompetition extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  logo?: string;
  category: string; // Education level
  startAt: Date;
  endAt: Date;
  registrationDeadline: Date;
  participationMode: ParticipationMode;
  allowedTeamSize: AllowedTeamSize;
  numberOfQuestions: number;
  timePerQuestionSeconds: number;
  questionSelection: 'fixed' | 'random';
  scoringConfig: IScoringConfig;
  tieBreakRules: 'fastestTime' | 'accuracy' | 'submissionOrder';
  maxTeams?: number;
  maxPlayers?: number;
  rulesText?: string;
  status: CompetitionStatus;
  createdAt: Date;
  updatedAt: Date;

  // Virtual
  totalEstimatedSeconds: number;
}

const ALLOWED_TRANSITIONS: Record<CompetitionStatus, CompetitionStatus[]> = {
  Draft: ['Registration Open', 'Archived'],
  'Registration Open': ['Registration Closed', 'Archived'],
  'Registration Closed': ['Live', 'Archived'],
  Live: ['Completed'],
  Completed: ['Archived'],
  Archived: [],
};

const competitionSchema = new Schema<ICompetition>(
  {
    name: {
      type: String,
      required: [true, 'Competition name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Education level category is required'],
      trim: true,
    },
    startAt: {
      type: Date,
      required: [true, 'Start date/time is required'],
    },
    endAt: {
      type: Date,
      required: [true, 'End date/time is required'],
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Registration deadline is required'],
    },
    participationMode: {
      type: String,
      enum: ['individual', 'team'],
      default: 'team',
      required: true,
    },
    allowedTeamSize: {
      type: Number,
      enum: [1, 2, 4, 6],
      required: true,
      default: 4,
    },
    numberOfQuestions: {
      type: Number,
      required: true,
      default: 20,
      min: 1,
    },
    timePerQuestionSeconds: {
      type: Number,
      required: true,
      default: 30,
      min: 5,
    },
    questionSelection: {
      type: String,
      enum: ['fixed', 'random'],
      default: 'random',
    },
    scoringConfig: {
      basePoints: { type: Number, default: 100 },
      speedBonusMax: { type: Number, default: 50 },
      penaltyWrong: { type: Number, default: 0 },
    },
    tieBreakRules: {
      type: String,
      enum: ['fastestTime', 'accuracy', 'submissionOrder'],
      default: 'fastestTime',
    },
    maxTeams: { type: Number },
    maxPlayers: { type: Number },
    rulesText: { type: String },
    status: {
      type: String,
      enum: [
        'Draft',
        'Registration Open',
        'Registration Closed',
        'Live',
        'Completed',
        'Archived',
      ],
      default: 'Draft',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: total estimated quiz duration
competitionSchema.virtual('totalEstimatedSeconds').get(function (this: ICompetition) {
  return this.numberOfQuestions * this.timePerQuestionSeconds;
});

// Helper validation for status machine transitions
export function isValidTransition(
  current: CompetitionStatus,
  target: CompetitionStatus
): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(target) ?? false;
}

competitionSchema.index({ status: 1, startAt: 1 });
competitionSchema.index({ category: 1, status: 1 });
competitionSchema.index({ registrationDeadline: 1 });

export const Competition: Model<ICompetition> = mongoose.model<ICompetition>(
  'Competition',
  competitionSchema
);

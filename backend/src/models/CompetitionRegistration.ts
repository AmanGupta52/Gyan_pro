import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';

export interface ICompetitionRegistration extends Document {
  _id: Types.ObjectId;
  competitionId: Types.ObjectId;
  teamId: Types.ObjectId;
  registeredBy: Types.ObjectId;
  memberUserIds: Types.ObjectId[];
  status: 'confirmed' | 'cancelled';
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const competitionRegistrationSchema = new Schema<ICompetitionRegistration>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    registeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memberUserIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// One registration per team per competition
competitionRegistrationSchema.index(
  { competitionId: 1, teamId: 1 },
  { unique: true }
);

// Index to query if a player is already registered in a competition
competitionRegistrationSchema.index({
  competitionId: 1,
  memberUserIds: 1,
  status: 1,
});

export const CompetitionRegistration: Model<ICompetitionRegistration> =
  mongoose.model<ICompetitionRegistration>(
    'CompetitionRegistration',
    competitionRegistrationSchema
  );

import mongoose, { Schema, type Model } from 'mongoose';
import type { ICategory } from '../types/index.js';

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for ordering
categorySchema.index({ order: 1 });

export const Category: Model<ICategory> = mongoose.model<ICategory>('Category', categorySchema);

import mongoose, { Schema, Document } from 'mongoose';
import {
  SavedDecisionDocument as ISavedDecisionDocument,
} from '../types';

// Extend the interface to work with Mongoose
interface SavedDecisionDoc extends Omit<ISavedDecisionDocument, '_id'>, Document {}

const savedDecisionSchema = new Schema<SavedDecisionDoc>(
  {
    treeId: {
      type: String,
      required: true,
      index: true,
    },
    answers: [
      {
        questionId: { type: String, required: true },
        optionId: { type: String, required: true },
      },
    ],
    result: {
      recommendation: { type: String, required: true },
      scores: { type: Map, of: Number, required: true },
      result: {
        name: { type: String, required: true },
        reasoning: { type: String, required: true },
        tradeoffs: [{ type: String }],
        whenToReconsider: { type: String, required: true },
        bestFor: { type: String, required: true },
      },
      answers: [
        {
          questionId: { type: String, required: true },
          optionId: { type: String, required: true },
        },
      ],
      tieBreaker: { type: String },
      confidence: {
        type: String,
        enum: ['high', 'medium', 'low'],
        required: true,
      },
    },
    shareableSlug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
savedDecisionSchema.index({ createdAt: -1 });
savedDecisionSchema.index({ treeId: 1, createdAt: -1 });

export const SavedDecision = mongoose.model<SavedDecisionDoc>(
  'SavedDecision',
  savedDecisionSchema
);

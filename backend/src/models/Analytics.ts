import mongoose, { Schema, Document } from 'mongoose';
import {
  AnalyticsDocument as IAnalyticsDocument,
  AnalyticsEvent,
} from '../types';

interface AnalyticsDoc extends Omit<IAnalyticsDocument, '_id'>, Document {}

const analyticsSchema = new Schema<AnalyticsDoc>(
  {
    event: {
      type: String,
      required: true,
      enum: Object.values(AnalyticsEvent),
      index: true,
    },
    treeId: {
      type: String,
      required: true,
      index: true,
    },
    questionId: {
      type: String,
      index: true,
    },
    optionId: {
      type: String,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      // Note: TTL index is defined separately below
    },
  },
  {
    timestamps: false, // We're using our own timestamp field
  }
);

// Compound indexes for common queries
analyticsSchema.index({ treeId: 1, event: 1, timestamp: -1 });
analyticsSchema.index({ sessionId: 1, timestamp: 1 });

// TTL index - automatically delete analytics data after 90 days (optional)
analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

export const Analytics = mongoose.model<AnalyticsDoc>(
  'Analytics',
  analyticsSchema
);

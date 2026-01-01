/**
 * Core Types and Interfaces
 */

// ==================== Decision Tree Types ====================

export interface Question {
  id: string;
  text: string;
  options: Option[];
}

export interface Option {
  id: string;
  label: string;
  nextQuestionId: string | null; // null = end of tree
  scores: Record<string, number>; // technology -> score points
}

export interface Result {
  name: string;
  reasoning: string;
  tradeoffs: string[];
  whenToReconsider: string;
  bestFor: string;
}

export interface DecisionTree {
  id: string;
  title: string;
  description: string;
  version: string;
  questions: Question[];
  results: Record<string, Result>;
  metadata?: {
    created: Date;
    lastUpdated: Date;
    author?: string;
  };
}

// ==================== Navigation State ====================

export interface NavigationState {
  currentQuestionId: string;
  answeredQuestions: Map<string, string>; // questionId -> selectedOptionId
  visitedPath: string[]; // array of questionIds in order
  canGoBack: boolean;
  progressPercentage: number;
}

export interface Answer {
  questionId: string;
  optionId: string;
}

// ==================== Recommendation Result ====================

export interface RecommendationResult {
  recommendation: string;
  scores: Record<string, number>;
  result: Result;
  answers: Answer[];
  tieBreaker?: string; // explanation if tie-breaking was used
  confidence: 'high' | 'medium' | 'low'; // based on score differences
}

// ==================== API Request/Response Types ====================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

export interface APIError {
  code: ErrorCode;
  message: string;
  details?: any;
  field?: string; // for validation errors
}

export enum ErrorCode {
  // Tree errors
  TREE_NOT_FOUND = 'TREE_NOT_FOUND',
  TREE_INVALID = 'TREE_INVALID',
  
  // Question errors
  QUESTION_NOT_FOUND = 'QUESTION_NOT_FOUND',
  INVALID_QUESTION_ID = 'INVALID_QUESTION_ID',
  
  // Option errors
  OPTION_NOT_FOUND = 'OPTION_NOT_FOUND',
  INVALID_OPTION = 'INVALID_OPTION',
  
  // Answer errors
  MISSING_ANSWERS = 'MISSING_ANSWERS',
  INVALID_ANSWER_PATH = 'INVALID_ANSWER_PATH',
  
  // Save errors
  SAVE_FAILED = 'SAVE_FAILED',
  SLUG_COLLISION = 'SLUG_COLLISION',
  
  // Result errors
  NO_RECOMMENDATION = 'NO_RECOMMENDATION',
  RESULT_NOT_FOUND = 'RESULT_NOT_FOUND',
  
  // General errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

// ==================== API Endpoints ====================

// GET /api/trees
export interface GetTreesResponse {
  trees: TreeSummary[];
}

export interface TreeSummary {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  estimatedTime: string; // "5-7 minutes"
}

// GET /api/trees/:id
export interface GetTreeRequest {
  id: string;
}

export type GetTreeResponse = DecisionTree;

// POST /api/recommend
export interface RecommendRequest {
  treeId: string;
  answers: Answer[];
}

export type RecommendResponse = RecommendationResult;

// POST /api/save
export interface SaveDecisionRequest {
  treeId: string;
  answers: Answer[];
  result: RecommendationResult;
  userId?: string; // optional for v1
}

export interface SaveDecisionResponse {
  id: string;
  shareableSlug: string;
  shareableUrl: string;
}

// GET /api/results/:slug
export interface GetResultRequest {
  slug: string;
}

export interface GetResultResponse {
  treeId: string;
  result: RecommendationResult;
  answers: Answer[];
  createdAt: string;
  viewCount: number;
}

// POST /api/analytics/track
export interface TrackAnalyticsRequest {
  event: AnalyticsEvent;
  treeId: string;
  questionId?: string;
  optionId?: string;
  metadata?: Record<string, any>;
}

export enum AnalyticsEvent {
  TREE_STARTED = 'tree_started',
  QUESTION_ANSWERED = 'question_answered',
  TREE_COMPLETED = 'tree_completed',
  TREE_ABANDONED = 'tree_abandoned',
  RESULT_VIEWED = 'result_viewed',
  RESULT_SHARED = 'result_shared',
  RESULT_GENERATED = 'result_generated', // Added this
}

// ==================== Validation Types ====================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'error';
  code: string;
  message: string;
  location?: string; // e.g., "questions[2].options[0]"
}

export interface ValidationWarning {
  type: 'warning';
  code: string;
  message: string;
  location?: string;
}

// ==================== MongoDB Models ====================

export interface SavedDecisionDocument {
  _id?: string;
  treeId: string;
  answers: Answer[];
  result: RecommendationResult;
  shareableSlug: string;
  userId?: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsDocument {
  _id?: string;
  event: AnalyticsEvent;
  treeId: string;
  questionId?: string;
  optionId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

import { ErrorCode, APIResponse } from '../types';
import { logger } from '../config/logger';

/**
 * Error Handler
 * 
 * Centralized error handling and API response formatting
 */
export class ErrorHandler {
  /**
   * Create a standardized error response
   */
  static createErrorResponse(
    code: ErrorCode,
    message: string,
    details?: any,
    field?: string
  ): APIResponse<never> {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        field,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
      },
    };
  }

  /**
   * Create a success response
   */
  static createSuccessResponse<T>(data: T): APIResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
      },
    };
  }

  /**
   * Handle different error types and convert to API response
   */
  static handleError(error: any): APIResponse<never> {
    // Known error codes
    if (error.code && Object.values(ErrorCode).includes(error.code)) {
      return this.createErrorResponse(
        error.code,
        error.message || 'An error occurred',
        error.details
      );
    }

    // Validation errors
    if (error.name === 'ValidationError') {
      return this.createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        error.errors
      );
    }

    // MongoDB errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      // Duplicate key error
      if (error.code === 11000) {
        return this.createErrorResponse(
          ErrorCode.SLUG_COLLISION,
          'A record with this identifier already exists',
          error.keyValue
        );
      }

      return this.createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Database error occurred',
        process.env.NODE_ENV === 'development' ? error.message : undefined
      );
    }

    // Generic errors
    logger.error('[ErrorHandler] Unhandled error:', error);
    
    return this.createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }

  /**
   * Get HTTP status code for error code
   */
  static getStatusCode(code: ErrorCode): number {
    const statusMap: Record<ErrorCode, number> = {
      [ErrorCode.TREE_NOT_FOUND]: 404,
      [ErrorCode.TREE_INVALID]: 400,
      [ErrorCode.QUESTION_NOT_FOUND]: 404,
      [ErrorCode.INVALID_QUESTION_ID]: 400,
      [ErrorCode.OPTION_NOT_FOUND]: 404,
      [ErrorCode.INVALID_OPTION]: 400,
      [ErrorCode.MISSING_ANSWERS]: 400,
      [ErrorCode.INVALID_ANSWER_PATH]: 400,
      [ErrorCode.SAVE_FAILED]: 500,
      [ErrorCode.SLUG_COLLISION]: 409,
      [ErrorCode.NO_RECOMMENDATION]: 422,
      [ErrorCode.RESULT_NOT_FOUND]: 404,
      [ErrorCode.VALIDATION_ERROR]: 400,
      [ErrorCode.INTERNAL_ERROR]: 500,
      [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
    };

    return statusMap[code] || 500;
  }
}

/**
 * Custom error class for business logic errors
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any,
    public field?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Helper functions to throw common errors
 */
export const throwError = {
  treeNotFound: (treeId: string): never => {
    throw new AppError(
      ErrorCode.TREE_NOT_FOUND,
      `Decision tree "${treeId}" not found`
    );
  },

  questionNotFound: (questionId: string): never => {
    throw new AppError(
      ErrorCode.QUESTION_NOT_FOUND,
      `Question "${questionId}" not found`
    );
  },

  optionNotFound: (optionId: string, questionId: string): never => {
    throw new AppError(
      ErrorCode.OPTION_NOT_FOUND,
      `Option "${optionId}" not found in question "${questionId}"`
    );
  },

  invalidAnswerPath: (message: string): never => {
    throw new AppError(
      ErrorCode.INVALID_ANSWER_PATH,
      message
    );
  },

  missingAnswers: (): never => {
    throw new AppError(
      ErrorCode.MISSING_ANSWERS,
      'No answers provided'
    );
  },

  resultNotFound: (slug: string): never => {
    throw new AppError(
      ErrorCode.RESULT_NOT_FOUND,
      `Result with slug "${slug}" not found`
    );
  },

  validationError: (message: string, field?: string): never => {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      message,
      undefined,
      field
    );
  },

  rateLimitExceeded: (): never => {
    throw new AppError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Too many requests. Please try again later.'
    );
  },
};

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Architecture Journey API',
      version: '1.0.0',
      description: 'Interactive decision tree system for backend architecture recommendations',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Trees',
        description: 'Decision tree management',
      },
      {
        name: 'Recommendations',
        description: 'Get architecture recommendations',
      },
      {
        name: 'Results',
        description: 'Save and retrieve decision results',
      },
      {
        name: 'Analytics',
        description: 'Track user interactions',
      },
      {
        name: 'Health',
        description: 'API health check',
      },
    ],
    components: {
      schemas: {
        Answer: {
          type: 'object',
          required: ['questionId', 'optionId'],
          properties: {
            questionId: {
              type: 'string',
              description: 'ID of the question being answered',
              example: 'q1',
            },
            optionId: {
              type: 'string',
              description: 'ID of the selected option',
              example: 'opt1',
            },
          },
        },
        RecommendationResult: {
          type: 'object',
          required: ['recommendedTechnology', 'score', 'confidence', 'reasoning'],
          properties: {
            recommendedTechnology: {
              type: 'string',
              description: 'The recommended technology',
              example: 'PostgreSQL',
            },
            score: {
              type: 'number',
              description: 'Confidence score',
              example: 8,
            },
            confidence: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Confidence level of the recommendation',
              example: 'high',
            },
            reasoning: {
              type: 'string',
              description: 'Explanation for the recommendation',
              example: 'Based on your requirements for ACID compliance...',
            },
            tieBreakingInfo: {
              type: 'string',
              description: 'Information about how ties were broken (if applicable)',
              example: 'Multiple technologies had equal scores...',
            },
            allScores: {
              type: 'object',
              additionalProperties: {
                type: 'number',
              },
              description: 'Scores for all technologies',
              example: { PostgreSQL: 8, MongoDB: 5, MySQL: 6, Redis: 3 },
            },
          },
        },
        TreeSummary: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'database-selection',
            },
            name: {
              type: 'string',
              example: 'Database Selection',
            },
            description: {
              type: 'string',
              example: 'Choose the right database for your backend',
            },
            category: {
              type: 'string',
              example: 'database',
            },
            estimatedTime: {
              type: 'string',
              example: '5-7 minutes',
            },
            questionCount: {
              type: 'number',
              example: 6,
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'TREE_NOT_FOUND',
                },
                message: {
                  type: 'string',
                  example: 'The requested tree does not exist',
                },
                details: {
                  type: 'object',
                },
                field: {
                  type: 'string',
                },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                },
                version: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/server.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

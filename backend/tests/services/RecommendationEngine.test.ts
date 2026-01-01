import { recommendationEngine } from '../../src/services/RecommendationEngine';
import { DecisionTree, Answer } from '../../src/types';

describe('RecommendationEngine', () => {
  const mockTree: DecisionTree = {
    id: 'test-tree',
    title: 'Test Tree',
    description: 'Test description',
    version: '1.0.0',
    questions: [
      {
        id: 'q1',
        text: 'Question 1?',
        options: [
          {
            id: 'opt1',
            label: 'Option 1',
            nextQuestionId: 'q2',
            scores: { tech1: 3, tech2: 1 },
          },
          {
            id: 'opt2',
            label: 'Option 2',
            nextQuestionId: null,
            scores: { tech1: 1, tech2: 3 },
          },
        ],
      },
      {
        id: 'q2',
        text: 'Question 2?',
        options: [
          {
            id: 'opt3',
            label: 'Option 3',
            nextQuestionId: null,
            scores: { tech1: 2, tech2: 1 },
          },
        ],
      },
    ],
    results: {
      tech1: {
        name: 'Technology 1',
        reasoning: 'Tech 1 is best',
        tradeoffs: ['Tradeoff 1'],
        whenToReconsider: 'When X happens',
        bestFor: 'Use case A',
      },
      tech2: {
        name: 'Technology 2',
        reasoning: 'Tech 2 is best',
        tradeoffs: ['Tradeoff 2'],
        whenToReconsider: 'When Y happens',
        bestFor: 'Use case B',
      },
    },
  };

  describe('calculate', () => {
    it('should calculate recommendation for valid path', () => {
      const answers: Answer[] = [
        { questionId: 'q1', optionId: 'opt1' },
        { questionId: 'q2', optionId: 'opt3' },
      ];

      const result = recommendationEngine.calculate(mockTree, answers);

      expect(result.recommendation).toBe('tech1');
      expect(result.scores).toEqual({ tech1: 5, tech2: 2 });
      expect(result.confidence).toBe('medium');
    });

    it('should handle single question path', () => {
      const answers: Answer[] = [{ questionId: 'q1', optionId: 'opt2' }];

      const result = recommendationEngine.calculate(mockTree, answers);

      expect(result.recommendation).toBe('tech2');
      expect(result.scores).toEqual({ tech1: 1, tech2: 3 });
    });

    it('should throw error for empty answers', () => {
      expect(() => {
        recommendationEngine.calculate(mockTree, []);
      }).toThrow('No answers provided');
    });

    it('should throw error for invalid question', () => {
      const answers: Answer[] = [{ questionId: 'invalid', optionId: 'opt1' }];

      expect(() => {
        recommendationEngine.calculate(mockTree, answers);
      }).toThrow();
    });

    it('should throw error for invalid option', () => {
      const answers: Answer[] = [{ questionId: 'q1', optionId: 'invalid' }];

      expect(() => {
        recommendationEngine.calculate(mockTree, answers);
      }).toThrow();
    });

    it('should throw error for out of order questions', () => {
      const answers: Answer[] = [
        { questionId: 'q2', optionId: 'opt3' },
        { questionId: 'q1', optionId: 'opt1' },
      ];

      expect(() => {
        recommendationEngine.calculate(mockTree, answers);
      }).toThrow();
    });

    it('should throw error for incomplete path', () => {
      const answers: Answer[] = [{ questionId: 'q1', optionId: 'opt1' }];

      expect(() => {
        recommendationEngine.calculate(mockTree, answers);
      }).toThrow('Answer path did not reach a valid end node');
    });
  });

  describe('confidence levels', () => {
    it('should return high confidence for large score difference', () => {
      const treeWithLargeDiff: DecisionTree = {
        ...mockTree,
        questions: [
          {
            id: 'q1',
            text: 'Question?',
            options: [
              {
                id: 'opt1',
                label: 'Option 1',
                nextQuestionId: null,
                scores: { tech1: 10, tech2: 2 },
              },
            ],
          },
        ],
      };

      const answers: Answer[] = [{ questionId: 'q1', optionId: 'opt1' }];
      const result = recommendationEngine.calculate(treeWithLargeDiff, answers);

      expect(result.confidence).toBe('high');
    });

    it('should return low confidence for small score difference', () => {
      const treeWithSmallDiff: DecisionTree = {
        ...mockTree,
        questions: [
          {
            id: 'q1',
            text: 'Question?',
            options: [
              {
                id: 'opt1',
                label: 'Option 1',
                nextQuestionId: null,
                scores: { tech1: 5, tech2: 4 },
              },
            ],
          },
        ],
      };

      const answers: Answer[] = [{ questionId: 'q1', optionId: 'opt1' }];
      const result = recommendationEngine.calculate(treeWithSmallDiff, answers);

      expect(result.confidence).toBe('low');
    });
  });

  describe('tie-breaking', () => {
    it('should handle tie with explanation', () => {
      const treeWithTie: DecisionTree = {
        ...mockTree,
        questions: [
          {
            id: 'q1',
            text: 'Question?',
            options: [
              {
                id: 'opt1',
                label: 'Option 1',
                nextQuestionId: null,
                scores: { tech1: 5, tech2: 5 },
              },
            ],
          },
        ],
      };

      const answers: Answer[] = [{ questionId: 'q1', optionId: 'opt1' }];
      const result = recommendationEngine.calculate(treeWithTie, answers);

      expect(result.tieBreaker).toBeDefined();
      expect(result.confidence).toBe('low');
    });
  });
});

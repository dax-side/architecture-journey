import {
  Answer,
  DecisionTree,
  RecommendationResult,
  ErrorCode,
} from '../types';

/**
 * Recommendation Engine
 * 
 * Handles scoring logic, tie-breaking, and confidence calculation
 */
export class RecommendationEngine {
  /**
   * Calculate recommendation based on user answers
   */
  calculate(tree: DecisionTree, answers: Answer[]): RecommendationResult {
    // Validate answers path
    this.validateAnswerPath(tree, answers);

    // Calculate scores for each technology
    const scores = this.calculateScores(tree, answers);

    // Get the winning recommendation
    const { winner, tieBreaker } = this.determineWinner(scores, tree);

    // Calculate confidence level
    const confidence = this.calculateConfidence(scores, winner);

    // Get the result details
    const result = tree.results[winner];
    if (!result) {
      throw new Error(`Result not found for technology: ${winner}`);
    }

    return {
      recommendation: winner,
      scores,
      result,
      answers,
      tieBreaker,
      confidence,
    };
  }

  /**
   * Validate that the answer path is valid through the tree
   */
  private validateAnswerPath(tree: DecisionTree, answers: Answer[]): void {
    if (answers.length === 0) {
      throw this.createError(ErrorCode.MISSING_ANSWERS, 'No answers provided');
    }

    const questionMap = new Map(tree.questions.map(q => [q.id, q]));
    let expectedQuestionId: string | null = tree.questions[0]?.id || null;

    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];

      // Check if this is the expected question
      if (answer.questionId !== expectedQuestionId) {
        throw this.createError(
          ErrorCode.INVALID_ANSWER_PATH,
          `Expected question ${expectedQuestionId} but got ${answer.questionId} at position ${i}`
        );
      }

      // Check if question exists
      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw this.createError(
          ErrorCode.QUESTION_NOT_FOUND,
          `Question ${answer.questionId} not found in tree`
        );
      }

      // Check if option exists
      const option = question.options.find(opt => opt.id === answer.optionId);
      if (!option) {
        throw this.createError(
          ErrorCode.OPTION_NOT_FOUND,
          `Option ${answer.optionId} not found in question ${answer.questionId}`
        );
      }

      // Set next expected question
      expectedQuestionId = option.nextQuestionId;

      // If this is the last expected question, we're done
      if (expectedQuestionId === null) {
        break;
      }
    }

    // Verify we reached an end node (null nextQuestionId)
    if (expectedQuestionId !== null) {
      throw this.createError(
        ErrorCode.INVALID_ANSWER_PATH,
        'Answer path did not reach a valid end node'
      );
    }
  }

  /**
   * Calculate scores for each technology based on answers
   */
  private calculateScores(
    tree: DecisionTree,
    answers: Answer[]
  ): Record<string, number> {
    const scores: Record<string, number> = {};
    const questionMap = new Map(tree.questions.map(q => [q.id, q]));

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      const option = question.options.find(opt => opt.id === answer.optionId);
      if (!option) continue;

      // Add scores from this option
      for (const [tech, points] of Object.entries(option.scores)) {
        scores[tech] = (scores[tech] || 0) + points;
      }
    }

    return scores;
  }

  /**
   * Determine the winner with tie-breaking logic
   */
  private determineWinner(
    scores: Record<string, number>,
    tree: DecisionTree
  ): { winner: string; tieBreaker?: string } {
    const technologies = Object.keys(scores);

    if (technologies.length === 0) {
      throw this.createError(
        ErrorCode.NO_RECOMMENDATION,
        'No technologies scored any points'
      );
    }

    // Find maximum score
    const maxScore = Math.max(...Object.values(scores));

    // Find all technologies with max score
    const winners = technologies.filter(tech => scores[tech] === maxScore);

    // If single winner, return it
    if (winners.length === 1) {
      return { winner: winners[0] };
    }

    // Tie-breaking logic
    const { winner, explanation } = this.breakTie(winners, scores, tree);

    return {
      winner,
      tieBreaker: explanation,
    };
  }

  /**
   * Tie-breaking strategies (in order of precedence)
   */
  private breakTie(
    tiedTechnologies: string[],
    _scores: Record<string, number>,
    tree: DecisionTree
  ): { winner: string; explanation: string } {
    // Strategy 1: Check if one has more result info (better documented)
    const withResults = tiedTechnologies.filter(tech => tree.results[tech]);
    if (withResults.length === 1) {
      return {
        winner: withResults[0],
        explanation: 'Selected based on available documentation and guidance',
      };
    }

    // Strategy 2: Alphabetical (predictable, consistent)
    const alphabetical = [...tiedTechnologies].sort();
    const winner = alphabetical[0];

    return {
      winner,
      explanation: `Tied with ${tiedTechnologies.length} options (${tiedTechnologies.join(', ')}). ` +
        `Consider reviewing your requirements - both may be equally suitable.`,
    };
  }

  /**
   * Calculate confidence level based on score distribution
   */
  private calculateConfidence(
    scores: Record<string, number>,
    winner: string
  ): 'high' | 'medium' | 'low' {
    const scoreValues = Object.values(scores);
    const winnerScore = scores[winner];

    // Find second highest score
    const otherScores = scoreValues.filter(s => s !== winnerScore || 
      scoreValues.filter(sv => sv === winnerScore).length > 1);
    const secondHighest = Math.max(...otherScores, 0);

    const difference = winnerScore - secondHighest;

    // Confidence thresholds
    if (difference >= 5) return 'high';
    if (difference >= 2) return 'medium';
    return 'low';
  }

  /**
   * Helper to create consistent errors
   */
  private createError(code: ErrorCode, message: string): Error {
    const error = new Error(message);
    (error as any).code = code;
    return error;
  }
}

export const recommendationEngine = new RecommendationEngine();

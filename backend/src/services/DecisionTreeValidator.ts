import {
  DecisionTree,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types';

/**
 * Decision Tree Validator
 * 
 * Validates tree structure, references, and scoring logic
 * Run this before deployment or when loading trees
 */
export class DecisionTreeValidator {
  /**
   * Validate a complete decision tree
   */
  validate(tree: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic structure validation
    this.validateBasicStructure(tree, errors);

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // Question validation
    this.validateQuestions(tree, errors, warnings);

    // Reference validation
    this.validateReferences(tree, errors);

    // Reachability validation
    this.validateReachability(tree, errors, warnings);

    // Results validation
    this.validateResults(tree, errors, warnings);

    // Score balance validation
    this.validateScoreBalance(tree, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate basic tree structure
   */
  private validateBasicStructure(tree: any, errors: ValidationError[]): void {
    if (!tree) {
      errors.push({
        type: 'error',
        code: 'TREE_NULL',
        message: 'Tree is null or undefined',
      });
      return;
    }

    if (!tree.id || typeof tree.id !== 'string') {
      errors.push({
        type: 'error',
        code: 'MISSING_TREE_ID',
        message: 'Tree must have a valid id',
      });
    }

    if (!tree.title || typeof tree.title !== 'string') {
      errors.push({
        type: 'error',
        code: 'MISSING_TREE_TITLE',
        message: 'Tree must have a title',
      });
    }

    if (!Array.isArray(tree.questions)) {
      errors.push({
        type: 'error',
        code: 'INVALID_QUESTIONS',
        message: 'Tree must have a questions array',
      });
      return;
    }

    if (tree.questions.length === 0) {
      errors.push({
        type: 'error',
        code: 'EMPTY_TREE',
        message: 'Tree must have at least one question',
      });
    }

    if (!tree.results || typeof tree.results !== 'object') {
      errors.push({
        type: 'error',
        code: 'INVALID_RESULTS',
        message: 'Tree must have a results object',
      });
    }
  }

  /**
   * Validate individual questions
   */
  private validateQuestions(
    tree: DecisionTree,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const questionIds = new Set<string>();

    tree.questions.forEach((question, index) => {
      const location = `questions[${index}]`;

      // Check for valid ID
      if (!question.id) {
        errors.push({
          type: 'error',
          code: 'MISSING_QUESTION_ID',
          message: 'Question missing id',
          location,
        });
      } else if (questionIds.has(question.id)) {
        errors.push({
          type: 'error',
          code: 'DUPLICATE_QUESTION_ID',
          message: `Duplicate question id: ${question.id}`,
          location,
        });
      } else {
        questionIds.add(question.id);
      }

      // Check for question text
      if (!question.text || question.text.trim().length === 0) {
        errors.push({
          type: 'error',
          code: 'MISSING_QUESTION_TEXT',
          message: 'Question missing text',
          location,
        });
      }

      // Validate options
      if (!Array.isArray(question.options) || question.options.length === 0) {
        errors.push({
          type: 'error',
          code: 'MISSING_OPTIONS',
          message: 'Question must have at least one option',
          location,
        });
      } else {
        this.validateOptions(question.options, location, errors, warnings);
      }
    });
  }

  /**
   * Validate question options
   */
  private validateOptions(
    options: any[],
    questionLocation: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const optionIds = new Set<string>();

    options.forEach((option, index) => {
      const location = `${questionLocation}.options[${index}]`;

      // Check for valid ID
      if (!option.id) {
        errors.push({
          type: 'error',
          code: 'MISSING_OPTION_ID',
          message: 'Option missing id',
          location,
        });
      } else if (optionIds.has(option.id)) {
        errors.push({
          type: 'error',
          code: 'DUPLICATE_OPTION_ID',
          message: `Duplicate option id: ${option.id}`,
          location,
        });
      } else {
        optionIds.add(option.id);
      }

      // Check for label
      if (!option.label || option.label.trim().length === 0) {
        errors.push({
          type: 'error',
          code: 'MISSING_OPTION_LABEL',
          message: 'Option missing label',
          location,
        });
      }

      // Check scores
      if (!option.scores || typeof option.scores !== 'object') {
        errors.push({
          type: 'error',
          code: 'MISSING_SCORES',
          message: 'Option missing scores object',
          location,
        });
      } else if (Object.keys(option.scores).length === 0) {
        warnings.push({
          type: 'warning',
          code: 'EMPTY_SCORES',
          message: 'Option has no scores defined',
          location,
        });
      }

      // Validate score values
      if (option.scores) {
        Object.entries(option.scores).forEach(([tech, score]) => {
          if (typeof score !== 'number') {
            errors.push({
              type: 'error',
              code: 'INVALID_SCORE',
              message: `Score for ${tech} must be a number`,
              location: `${location}.scores.${tech}`,
            });
          }
        });
      }
    });
  }

  /**
   * Validate all references are valid
   */
  private validateReferences(
    tree: DecisionTree,
    errors: ValidationError[]
  ): void {
    const questionIds = new Set(tree.questions.map(q => q.id));

    tree.questions.forEach((question, qIndex) => {
      question.options.forEach((option, oIndex) => {
        const location = `questions[${qIndex}].options[${oIndex}]`;

        // Check nextQuestionId reference
        if (option.nextQuestionId !== null) {
          if (!questionIds.has(option.nextQuestionId)) {
            errors.push({
              type: 'error',
              code: 'INVALID_REFERENCE',
              message: `nextQuestionId "${option.nextQuestionId}" does not exist`,
              location,
            });
          }

          // Check for self-reference
          if (option.nextQuestionId === question.id) {
            errors.push({
              type: 'error',
              code: 'CIRCULAR_REFERENCE',
              message: 'Option references its own question (infinite loop)',
              location,
            });
          }
        }

        // Check if scores reference results that exist
        if (option.scores) {
          Object.keys(option.scores).forEach(tech => {
            if (!tree.results[tech]) {
              errors.push({
                type: 'error',
                code: 'MISSING_RESULT',
                message: `Score references technology "${tech}" but no result exists`,
                location: `${location}.scores.${tech}`,
              });
            }
          });
        }
      });
    });
  }

  /**
   * Validate all questions are reachable and no circular references
   */
  private validateReachability(
    tree: DecisionTree,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (tree.questions.length === 0) return;

    const reachable = new Set<string>();
    const visited = new Set<string>();

    // DFS to find all reachable questions
    const dfs = (questionId: string, path: string[]): void => {
      if (visited.has(questionId)) {
        // Check for circular reference
        if (path.includes(questionId)) {
          errors.push({
            type: 'error',
            code: 'CIRCULAR_REFERENCE',
            message: `Circular reference detected: ${[...path, questionId].join(' -> ')}`,
          });
        }
        return;
      }

      visited.add(questionId);
      reachable.add(questionId);

      const question = tree.questions.find(q => q.id === questionId);
      if (!question) return;

      for (const option of question.options) {
        if (option.nextQuestionId) {
          dfs(option.nextQuestionId, [...path, questionId]);
        }
      }
    };

    // Start from first question
    dfs(tree.questions[0].id, []);

    // Find unreachable questions
    const allQuestionIds = tree.questions.map(q => q.id);
    const unreachable = allQuestionIds.filter(id => !reachable.has(id));

    unreachable.forEach(id => {
      warnings.push({
        type: 'warning',
        code: 'UNREACHABLE_QUESTION',
        message: `Question "${id}" is not reachable from the starting question`,
      });
    });
  }

  /**
   * Validate result definitions
   */
  private validateResults(
    tree: DecisionTree,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const resultKeys = Object.keys(tree.results);

    if (resultKeys.length === 0) {
      errors.push({
        type: 'error',
        code: 'NO_RESULTS',
        message: 'Tree must have at least one result definition',
      });
      return;
    }

    resultKeys.forEach(key => {
      const result = tree.results[key];
      const location = `results.${key}`;

      if (!result.name) {
        errors.push({
          type: 'error',
          code: 'MISSING_RESULT_NAME',
          message: 'Result missing name',
          location,
        });
      }

      if (!result.reasoning) {
        warnings.push({
          type: 'warning',
          code: 'MISSING_REASONING',
          message: 'Result missing reasoning',
          location,
        });
      }

      if (!result.tradeoffs || result.tradeoffs.length === 0) {
        warnings.push({
          type: 'warning',
          code: 'MISSING_TRADEOFFS',
          message: 'Result missing tradeoffs',
          location,
        });
      }

      if (!result.whenToReconsider) {
        warnings.push({
          type: 'warning',
          code: 'MISSING_RECONSIDER',
          message: 'Result missing whenToReconsider',
          location,
        });
      }
    });
  }

  /**
   * Validate score balance to ensure fair recommendations
   */
  private validateScoreBalance(
    tree: DecisionTree,
    warnings: ValidationWarning[]
  ): void {
    // Calculate potential max scores for each technology
    const maxScores: Record<string, number> = {};

    tree.questions.forEach(question => {
      question.options.forEach(option => {
        Object.entries(option.scores).forEach(([tech, score]) => {
          maxScores[tech] = Math.max(maxScores[tech] || 0, score);
        });
      });
    });

    const technologies = Object.keys(maxScores);
    const avgMaxScore = Object.values(maxScores).reduce((a, b) => a + b, 0) / technologies.length;

    // Check for significant imbalances
    technologies.forEach(tech => {
      const deviation = Math.abs(maxScores[tech] - avgMaxScore) / avgMaxScore;
      if (deviation > 0.5) { // 50% deviation
        warnings.push({
          type: 'warning',
          code: 'SCORE_IMBALANCE',
          message: `Technology "${tech}" has significantly different max scores (${maxScores[tech]}) compared to average (${avgMaxScore.toFixed(1)})`,
        });
      }
    });
  }
}

export const treeValidator = new DecisionTreeValidator();

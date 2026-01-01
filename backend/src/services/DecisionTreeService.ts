import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';
import {
  DecisionTree,
  SaveDecisionRequest,
  SavedDecisionDocument,
  GetResultResponse,
  TrackAnalyticsRequest,
} from '../types';
import { treeValidator } from './DecisionTreeValidator';
import { throwError } from '../utils/ErrorHandler';
import { SavedDecision } from '../models/SavedDecision';
import { Analytics } from '../models/Analytics';
import { logger } from '../config/logger';

/**
 * Decision Tree Service
 * 
 * Handles loading, validating, and managing decision trees
 */
export class DecisionTreeService {
  private trees: Map<string, DecisionTree> = new Map();
  private treesDirectory: string;

  constructor(treesDirectory: string = path.join(__dirname, '../data/trees')) {
    this.treesDirectory = treesDirectory;
    this.loadTrees();
  }

  /**
   * Load all decision trees from JSON files
   */
  private loadTrees(): void {
    try {
      if (!fs.existsSync(this.treesDirectory)) {
        logger.warn(`[DecisionTree] Trees directory not found: ${this.treesDirectory}`);
        return;
      }

      const files = fs.readdirSync(this.treesDirectory);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.treesDirectory, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const tree = JSON.parse(content) as DecisionTree;

          // Validate tree
          const validation = treeValidator.validate(tree);
          
          if (!validation.isValid) {
            logger.error(`[DecisionTree] Invalid tree in ${file}:`, validation.errors);
            continue;
          }

          if (validation.warnings.length > 0) {
            logger.warn(`[DecisionTree] Warnings for tree ${tree.id}:`, validation.warnings);
          }

          this.trees.set(tree.id, tree);
          logger.info(`[DecisionTree] Loaded tree: ${tree.id} (${tree.title})`);
        } catch (error) {
          logger.error(`[DecisionTree] Failed to load tree from ${file}:`, error);
        }
      }

      logger.info(`[DecisionTree] Loaded ${this.trees.size} decision trees`);
    } catch (error) {
      logger.error('[DecisionTree] Failed to load trees:', error);
    }
  }

  /**
   * Get all available trees
   */
  getAllTrees(): DecisionTree[] {
    return Array.from(this.trees.values());
  }

  /**
   * Get a specific tree by ID
   */
  getTree(treeId: string): DecisionTree {
    const tree = this.trees.get(treeId);
    
    if (!tree) {
      throwError.treeNotFound(treeId);
    }

    return tree!;
  }

  /**
   * Save a decision to database
   */
  async saveDecision(request: SaveDecisionRequest): Promise<SavedDecisionDocument> {
    // Generate unique slug with retry logic
    let slug = nanoid(10);
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        // Check if slug exists
        const existing = await SavedDecision.findOne({ shareableSlug: slug });
        
        if (!existing) {
          break; // Slug is unique
        }
        
        // Generate new slug and retry
        slug = nanoid(10);
        attempts++;
      } catch (error) {
        logger.error('[SaveDecision] Error checking slug uniqueness:', error);
        throw error;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique slug after multiple attempts');
    }

    // Create document
    const document = new SavedDecision({
      treeId: request.treeId,
      answers: request.answers,
      result: request.result,
      shareableSlug: slug,
      userId: request.userId,
      viewCount: 0,
    });

    try {
      const saved = await document.save();
      
      return {
        _id: (saved._id as any).toString(),
        treeId: saved.treeId,
        answers: saved.answers,
        result: saved.result,
        shareableSlug: saved.shareableSlug,
        userId: saved.userId,
        viewCount: saved.viewCount,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
    } catch (error) {
      logger.error('[SaveDecision] Failed to save decision:', error);
      throw error;
    }
  }

  /**
   * Get saved decision by slug
   */
  async getResultBySlug(slug: string): Promise<GetResultResponse> {
    try {
      const result = await SavedDecision.findOne({ shareableSlug: slug });
      
      if (!result) {
        throwError.resultNotFound(slug);
      }

      // Increment view count
      await SavedDecision.updateOne(
        { shareableSlug: slug },
        { $inc: { viewCount: 1 } }
      );

      return {
        treeId: result!.treeId,
        result: result!.result,
        answers: result!.answers,
        createdAt: result!.createdAt.toISOString(),
        viewCount: result!.viewCount + 1, // Include the incremented count
      };
    } catch (error: any) {
      // If it's already our custom error, rethrow it
      if (error.code) {
        throw error;
      }
      logger.error('[GetResult] Failed to get result by slug:', error);
      throw error;
    }
  }

  /**
   * Track analytics event
   */
  async trackAnalytics(request: TrackAnalyticsRequest): Promise<void> {
    try {
      const document = new Analytics({
        event: request.event,
        treeId: request.treeId,
        questionId: request.questionId,
        optionId: request.optionId,
        metadata: request.metadata,
      });

      await document.save();
    } catch (error) {
      // Don't throw - analytics failures shouldn't break the app
      logger.error('[Analytics] Failed to track analytics:', error);
    }
  }

  /**
   * Reload trees from disk (useful for development)
   */
  reload(): void {
    this.trees.clear();
    this.loadTrees();
  }
}

// Singleton instance
export const decisionTreeService = new DecisionTreeService();

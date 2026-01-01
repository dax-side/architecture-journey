import { Router, Request, Response } from 'express';
import { decisionTreeService } from '../services/DecisionTreeService';
import { recommendationEngine } from '../services/RecommendationEngine';
import {
  GetTreesResponse,
  GetTreeResponse,
  RecommendRequest,
  RecommendResponse,
  SaveDecisionRequest,
  SaveDecisionResponse,
  GetResultResponse,
} from '../types';
import { ErrorHandler } from '../utils/ErrorHandler';
import { logger } from '../config/logger';

const router = Router();

/**
 * @swagger
 * /api/trees:
 *   get:
 *     summary: Get all available decision trees
 *     tags: [Trees]
 *     responses:
 *       200:
 *         description: List of all decision trees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     trees:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TreeSummary'
 */
router.get('/trees', async (_req: Request, res: Response) => {
  try {
    const trees = decisionTreeService.getAllTrees();
    
    const response: GetTreesResponse = {
      trees: trees.map(tree => ({
        id: tree.id,
        title: tree.title,
        description: tree.description,
        questionCount: tree.questions.length,
        estimatedTime: estimateTime(tree.questions.length),
      })),
    };

    res.json(ErrorHandler.createSuccessResponse(response));
  } catch (error) {
    const errorResponse = ErrorHandler.handleError(error);
    const statusCode = ErrorHandler.getStatusCode(errorResponse.error!.code);
    res.status(statusCode).json(errorResponse);
  }
});

/**
 * @swagger
 * /api/trees/{id}:
 *   get:
 *     summary: Get a specific decision tree by ID
 *     tags: [Trees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The tree ID
 *         example: database-selection
 *     responses:
 *       200:
 *         description: Decision tree details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     results:
 *                       type: object
 *       404:
 *         description: Tree not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/trees/:id', async (req: Request, res: Response) => {
  try {
    const tree = decisionTreeService.getTree(req.params.id);
    
    const response: GetTreeResponse = tree;

    res.json(ErrorHandler.createSuccessResponse(response));
  } catch (error) {
    const errorResponse = ErrorHandler.handleError(error);
    const statusCode = ErrorHandler.getStatusCode(errorResponse.error!.code);
    res.status(statusCode).json(errorResponse);
  }
});

/**
 * @swagger
 * /api/recommend:
 *   post:
 *     summary: Get architecture recommendation based on user answers
 *     tags: [Recommendations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - treeId
 *               - answers
 *             properties:
 *               treeId:
 *                 type: string
 *                 description: ID of the decision tree
 *                 example: database-selection
 *               answers:
 *                 type: array
 *                 description: Array of question-answer pairs
 *                 items:
 *                   $ref: '#/components/schemas/Answer'
 *     responses:
 *       200:
 *         description: Recommendation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RecommendationResult'
 *       400:
 *         description: Invalid request or answer path
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/recommend', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as RecommendRequest;
    
    // Validate request
    if (!body.treeId || !body.answers || !Array.isArray(body.answers)) {
      const errorResponse = ErrorHandler.createErrorResponse(
        'VALIDATION_ERROR' as any,
        'Invalid request: treeId and answers array required'
      );
      res.status(400).json(errorResponse);
      return;
    }

    // Get tree
    const tree = decisionTreeService.getTree(body.treeId);

    // Calculate recommendation
    const result = recommendationEngine.calculate(tree, body.answers);

    const response: RecommendResponse = result;

    res.json(ErrorHandler.createSuccessResponse(response));
  } catch (error) {
    const errorResponse = ErrorHandler.handleError(error);
    const statusCode = ErrorHandler.getStatusCode(errorResponse.error!.code);
    res.status(statusCode).json(errorResponse);
  }
});

/**
 * @swagger
 * /api/save:
 *   post:
 *     summary: Save a decision result and get shareable link
 *     tags: [Results]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - treeId
 *               - answers
 *               - result
 *             properties:
 *               treeId:
 *                 type: string
 *                 example: database-selection
 *               answers:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Answer'
 *               result:
 *                 $ref: '#/components/schemas/RecommendationResult'
 *               userId:
 *                 type: string
 *                 description: Optional user identifier
 *     responses:
 *       200:
 *         description: Decision saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     shareableSlug:
 *                       type: string
 *                     shareableUrl:
 *                       type: string
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/save', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as SaveDecisionRequest;
    
    // Validate request
    if (!body.treeId || !body.answers || !body.result) {
      const errorResponse = ErrorHandler.createErrorResponse(
        'VALIDATION_ERROR' as any,
        'Invalid request: treeId, answers, and result required'
      );
      res.status(400).json(errorResponse);
      return;
    }

    // Save to database (implement this in DecisionTreeService)
    const savedDecision = await decisionTreeService.saveDecision(body);

    const baseUrl = req.protocol + '://' + req.get('host');
    const response: SaveDecisionResponse = {
      id: savedDecision._id?.toString() || '',
      shareableSlug: savedDecision.shareableSlug,
      shareableUrl: `${baseUrl}/results/${savedDecision.shareableSlug}`,
    };

    res.json(ErrorHandler.createSuccessResponse(response));
  } catch (error) {
    const errorResponse = ErrorHandler.handleError(error);
    const statusCode = ErrorHandler.getStatusCode(errorResponse.error!.code);
    res.status(statusCode).json(errorResponse);
  }
});

/**
 * @swagger
 * /api/results/{slug}:
 *   get:
 *     summary: Get a saved decision result by shareable slug
 *     tags: [Results]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The shareable slug
 *         example: abc123xyz
 *     responses:
 *       200:
 *         description: Saved decision result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     treeId:
 *                       type: string
 *                     answers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Answer'
 *                     result:
 *                       $ref: '#/components/schemas/RecommendationResult'
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     viewCount:
 *                       type: number
 *       404:
 *         description: Result not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/results/:slug', async (req: Request, res: Response) => {
  try {
    const result = await decisionTreeService.getResultBySlug(req.params.slug);

    const response: GetResultResponse = result;

    res.json(ErrorHandler.createSuccessResponse(response));
  } catch (error) {
    const errorResponse = ErrorHandler.handleError(error);
    const statusCode = ErrorHandler.getStatusCode(errorResponse.error!.code);
    res.status(statusCode).json(errorResponse);
  }
});

/**
 * @swagger
 * /api/analytics/track:
 *   post:
 *     summary: Track user interaction analytics
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - treeId
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [question_viewed, option_selected, result_viewed, tree_started, tree_completed]
 *                 example: option_selected
 *               treeId:
 *                 type: string
 *                 example: database-selection
 *               questionId:
 *                 type: string
 *                 example: q1
 *               optionId:
 *                 type: string
 *                 example: opt1
 *               sessionId:
 *                 type: string
 *                 description: Unique session identifier
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       200:
 *         description: Analytics tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     tracked:
 *                       type: boolean
 */
router.post('/analytics/track', async (req: Request, res: Response) => {
  try {
    // Fire and forget - don't block response
    decisionTreeService.trackAnalytics(req.body).catch(err => {
      logger.error('[Analytics] Tracking failed:', err);
    });

    res.json(ErrorHandler.createSuccessResponse({ tracked: true }));
  } catch (error) {
    // Don't fail the request if analytics fails
    res.json(ErrorHandler.createSuccessResponse({ tracked: false }));
  }
});

/**
 * Helper: Estimate completion time based on question count
 */
function estimateTime(questionCount: number): string {
  const minutesPerQuestion = 1;
  const totalMinutes = questionCount * minutesPerQuestion;
  
  if (totalMinutes < 5) return `${totalMinutes} minutes`;
  if (totalMinutes <= 10) return `${totalMinutes} minutes`;
  
  return `${Math.floor(totalMinutes / 5) * 5}-${Math.ceil(totalMinutes / 5) * 5} minutes`;
}

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin';
import { Analytics } from '../models/Analytics';
import { SavedDecision } from '../models/SavedDecision';
import { ErrorHandler } from '../utils/ErrorHandler';
import { logger } from '../config/logger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify admin token
async function verifyAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Check both cookie and Authorization header
    const token = req.cookies?.admin_token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json(ErrorHandler.createErrorResponse(
        'UNAUTHORIZED' as any,
        'No token provided'
      ));
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      res.status(401).json(ErrorHandler.createErrorResponse(
        'UNAUTHORIZED' as any,
        'Invalid token'
      ));
      return;
    }

    (req as any).admin = admin;
    next();
  } catch (error) {
    res.status(401).json(ErrorHandler.createErrorResponse(
      'UNAUTHORIZED' as any,
      'Invalid or expired token'
    ));
    return;
  }
}

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json(ErrorHandler.createErrorResponse(
        'VALIDATION_ERROR' as any,
        'Username and password required'
      ));
      return;
    }

    const admin = await Admin.findOne({ username });
    
    if (!admin || !(await admin.comparePassword(password))) {
      res.status(401).json(ErrorHandler.createErrorResponse(
        'UNAUTHORIZED' as any,
        'Invalid credentials'
      ));
      return;
    }

    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '7d' });

    // Set httpOnly secure cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json(ErrorHandler.createSuccessResponse({
      token, // Still send token for backward compatibility
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
      },
    }));
  } catch (error) {
    const errorResponse = ErrorHandler.handleError(error);
    const statusCode = ErrorHandler.getStatusCode(errorResponse.error!.code);
    res.status(statusCode).json(errorResponse);
  }
});

/**
 * @swagger
 * /api/admin/logout:
 *   post:
 *     summary: Admin logout
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  res.clearCookie('admin_token');
  res.json(ErrorHandler.createSuccessResponse({ message: 'Logged out successfully' }));
});

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get analytics dashboard data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/dashboard', verifyAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total counts
    const totalResults = await SavedDecision.countDocuments();
    const totalEvents = await Analytics.countDocuments({ timestamp: { $gte: thirtyDaysAgo } });

    // Unique sessions (unique users)
    const uniqueSessions = await Analytics.distinct('sessionId', { 
      timestamp: { $gte: thirtyDaysAgo },
      sessionId: { $exists: true, $ne: null }
    });

    // Events by type
    const eventsByType = await Analytics.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Most popular trees
    const popularTrees = await Analytics.aggregate([
      { $match: { event: 'tree_started', timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$treeId', starts: { $sum: 1 } } },
      { $sort: { starts: -1 } },
    ]);

    // Completion rate
    const treeStarts = await Analytics.countDocuments({ 
      event: 'tree_started', 
      timestamp: { $gte: thirtyDaysAgo } 
    });
    const resultsGenerated = await Analytics.countDocuments({ 
      event: 'result_generated', 
      timestamp: { $gte: thirtyDaysAgo } 
    });
    const completionRate = treeStarts > 0 ? (resultsGenerated / treeStarts * 100).toFixed(1) : '0';

    // Most shared results
    const topSharedResults = await SavedDecision.find()
      .sort({ viewCount: -1 })
      .limit(10)
      .select('treeId shareableSlug viewCount createdAt result');

    // Popular answer paths (most common decision flows)
    const popularPaths = await SavedDecision.aggregate([
      {
        $group: {
          _id: {
            treeId: '$treeId',
            recommendation: '$result.recommendation',
          },
          count: { $sum: 1 },
          avgScores: { $avg: { $max: { $objectToArray: '$result.scores' } } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Daily activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyActivity = await Analytics.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(ErrorHandler.createSuccessResponse({
      summary: {
        totalResults,
        totalEvents,
        uniqueSessions: uniqueSessions.length,
        completionRate: `${completionRate}%`,
        treeStarts,
        resultsGenerated,
      },
      eventsByType: eventsByType.map(e => ({ event: e._id, count: e.count })),
      popularTrees: popularTrees.map(t => ({ treeId: t._id, starts: t.starts })),
      topSharedResults: topSharedResults.map(r => ({
        treeId: r.treeId,
        slug: r.shareableSlug,
        views: r.viewCount,
        recommendation: r.result?.recommendation,
        createdAt: r.createdAt,
      })),
      popularPaths: popularPaths.map(p => ({
        treeId: p._id.treeId,
        recommendation: p._id.recommendation,
        count: p.count,
      })),
      dailyActivity: dailyActivity.map(d => ({ date: d._id, count: d.count })),
    }));
  } catch (error) {
    logger.error('[Admin] Dashboard error:', error);
    const errorResponse = ErrorHandler.handleError(error);
    const statusCode = ErrorHandler.getStatusCode(errorResponse.error!.code);
    res.status(statusCode).json(errorResponse);
  }
});

/**
 * POST /api/admin/change-password
 * Change admin password
 */
router.post('/change-password', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = (req as any).admin;

    if (!currentPassword || !newPassword) {
      res.status(400).json(ErrorHandler.createErrorResponse(
        'VALIDATION_ERROR' as any,
        'Current password and new password required'
      ));
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json(ErrorHandler.createErrorResponse(
        'VALIDATION_ERROR' as any,
        'New password must be at least 6 characters'
      ));
      return;
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401).json(ErrorHandler.createErrorResponse(
        'UNAUTHORIZED' as any,
        'Current password is incorrect'
      ));
      return;
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.json(ErrorHandler.createSuccessResponse({ message: 'Password changed successfully' }));
  } catch (error) {
    const errorResponse = ErrorHandler.handleError(error);
    res.status(500).json(errorResponse);
  }
});

export default router;

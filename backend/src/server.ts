import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import apiRoutes from './routes/api';
import adminRoutes from './routes/admin';
import { ErrorHandler } from './utils/ErrorHandler';
import { dbConnection } from './config/database';
import { logger, morganStream } from './config/logger';
import { swaggerSpec } from './config/swagger';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging with Morgan
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, { stream: morganStream }));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Architecture Journey API Docs',
}));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Mount API routes
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
    },
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const errorResponse = ErrorHandler.handleError(err);
  const statusCode = err.code ? ErrorHandler.getStatusCode(err.code) : 500;
  res.status(statusCode).json(errorResponse);
});

// MongoDB connection and start server
async function startServer() {
  try {
    // Connect to MongoDB if URI is provided
    if (process.env.MONGODB_URI) {
      await dbConnection.connect();
    } else {
      logger.warn('[Config] MongoDB URI not set - running without database');
      logger.warn('[Config] Save and analytics features will not work');
    }

    // Start Express server
    app.listen(PORT, () => {
      logger.info('================================================');
      logger.info('[Bootstrap] Architecture Journey Backend API');
      logger.info('================================================');
      logger.info(`[Server] Listening on port ${PORT}`);
      logger.info(`[Environment] ${process.env.NODE_ENV || 'development'}`);
      logger.info(`[API] Version ${process.env.API_VERSION || '1.0.0'}`);
      logger.info(`[Route] Health check -> http://localhost:${PORT}/health`);
      logger.info(`[Route] API Documentation -> http://localhost:${PORT}/api-docs`);
      logger.info('================================================');
    });
  } catch (error) {
    logger.error('[Bootstrap] Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[Signal] SIGTERM received - shutting down gracefully');
  await dbConnection.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('[Signal] SIGINT received - shutting down gracefully');
  await dbConnection.disconnect();
  process.exit(0);
});

// Start the server
startServer();

export default app;

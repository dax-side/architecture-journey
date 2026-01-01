import mongoose from 'mongoose';
import { logger } from './logger';

/**
 * MongoDB Connection Manager
 */
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Connect to MongoDB
   */
  async connect(uri?: string): Promise<void> {
    if (this.isConnected) {
      logger.info('[MongoDB] Already connected');
      return;
    }

    const connectionUri = uri || process.env.MONGODB_URI;

    if (!connectionUri) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    try {
      await mongoose.connect(connectionUri);
      this.isConnected = true;
      logger.info('[MongoDB] Connected successfully');
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('[MongoDB] Connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('[MongoDB] Disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('[MongoDB] Reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      logger.error('[MongoDB] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('[MongoDB] Disconnected');
    } catch (error) {
      logger.error('[MongoDB] Error disconnecting:', error);
      throw error;
    }
  }

  /**
   * Check if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const dbConnection = DatabaseConnection.getInstance();

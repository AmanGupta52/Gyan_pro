import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/** Maximum number of connection retries before giving up */
const MAX_RETRIES = 5;

/** Delay (ms) between connection retries — exponential backoff base */
const RETRY_DELAY_MS = 3000;

/**
 * Connect to MongoDB with retry logic.
 * Uses exponential backoff and fails hard after MAX_RETRIES.
 */
export async function connectDB(): Promise<void> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        // Mongoose 8 defaults are good; override only what's needed
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
      });

      logger.info(
        { host: mongoose.connection.host, name: mongoose.connection.name },
        '✅ MongoDB connected successfully'
      );

      // Surface connection events for observability
      mongoose.connection.on('error', (err) => {
        logger.error({ err }, 'MongoDB connection error');
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      return;
    } catch (err) {
      retries++;
      const delay = RETRY_DELAY_MS * Math.pow(2, retries - 1);

      logger.error(
        { err, attempt: retries, maxRetries: MAX_RETRIES },
        `❌ MongoDB connection failed (attempt ${retries}/${MAX_RETRIES})`
      );

      if (retries >= MAX_RETRIES) {
        logger.fatal('💀 Exhausted all MongoDB connection retries — shutting down');
        process.exit(1);
      }

      logger.info(`⏳ Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

import http from 'node:http';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { app } from './app.js';
import { initSocket } from './socket/index.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    logger.info('🚀 Starting GYAN-26 Backend Server...');

    // 1. Connect Database
    await connectDB();

    // 2. Create HTTP Server
    const server = http.createServer(app);

    // 3. Attach Socket.IO
    initSocket(server);

    // 4. Listen on PORT
    server.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          env: env.NODE_ENV,
          corsOrigin: env.CORS_ORIGIN,
        },
        `🎯 GYAN-26 Backend is running on http://localhost:${env.PORT}`
      );
    });

    // 5. Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      logger.info({ signal }, '⚠️ Received shutdown signal, closing gracefully...');

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await mongoose.connection.close(false);
          logger.info('MongoDB connection closed');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error closing MongoDB connection');
          process.exit(1);
        }
      });

      // Force shutdown after 10s timeout
      setTimeout(() => {
        logger.fatal('Forcefully shutting down due to timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.fatal({ reason }, 'Unhandled Promise Rejection');
    });

    process.on('uncaughtException', (err) => {
      logger.fatal({ err }, 'Uncaught Exception — exiting process');
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ error }, '❌ Fatal error during server startup');
    process.exit(1);
  }
}

bootstrap();

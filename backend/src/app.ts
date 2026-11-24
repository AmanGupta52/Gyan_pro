import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { sanitize } from './middleware/sanitize.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';
import { AppError } from './utils/AppError.js';

export function createApp(): Express {
  const app = express();

  // 1. Security headers
  app.use(helmet());

  // 2. CORS configuration (supports Web, Capacitor Android/iOS, and local development)
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 3. Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Cookie parser for refresh token
  app.use(cookieParser());

  // 5. NoSQL injection sanitizer
  app.use(sanitize);

  // 6. Rate limiting for general API endpoints
  app.use('/api', generalLimiter);

  // 7. Health check (direct root and under api)
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'gyan-26-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // 8. Mount versioned API routes
  app.use('/api', apiRouter);

  // 9. 404 handler for undefined routes
  app.use((req: Request, _res: Response, next) => {
    next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // 10. Global error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();

import pino from 'pino';

/**
 * Application-wide Pino logger.
 * - Development: human-readable pretty-printed output
 * - Production: structured JSON for log aggregation
 */
export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  ...(process.env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

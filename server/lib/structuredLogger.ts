/**
 * Structured logging utility for observability.
 * Logs in JSON format for easy parsing by log aggregators.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  service?: string;
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  error?: Error | string;
  [key: string]: any;
}

function formatLog(level: LogLevel, message: string, context?: LogContext) {
  // Handle Error objects specially since their properties are non-enumerable
  const serializedContext = context ? { ...context } : {};
  if (serializedContext.error instanceof Error) {
    serializedContext.error = {
      message: serializedContext.error.message,
      stack: serializedContext.error.stack,
      name: serializedContext.error.name,
    };
  }
  
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...serializedContext,
  });
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(formatLog('debug', message, context));
    }
  },

  info(message: string, context?: LogContext) {
    console.log(formatLog('info', message, context));
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatLog('warn', message, context));
  },

  error(message: string, context?: LogContext) {
    console.error(formatLog('error', message, context));
  },

  fatal(message: string, context?: LogContext) {
    console.error(formatLog('fatal', message, context));
  },

  /**
   * Log an HTTP request with timing.
   */
  request(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    context?: Omit<LogContext, 'method' | 'path' | 'statusCode' | 'durationMs'>
  ) {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this[level](`${method} ${path} ${statusCode}`, {
      method,
      path,
      statusCode,
      durationMs,
      ...context,
    });
  },
};

/**
 * Express middleware for structured request logging.
 */
import type { Request, Response, NextFunction } from 'express';

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = req.get('X-Request-ID') || `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // Attach requestId to request for downstream use
  (req as any).requestId = requestId;

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const userId = (req as any).userId || 'guest';

    // Skip logging static assets and health checks in production
    if (process.env.NODE_ENV === 'production') {
      if (req.path.startsWith('/assets/') || req.path === '/api/health') {
        return;
      }
    }

    logger.request(req.method, req.path, res.statusCode, durationMs, {
      service: 'grudge-api',
      requestId,
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  });

  next();
}

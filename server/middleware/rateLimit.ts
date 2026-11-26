/**
 * Rate limiting middleware for Express and Colyseus endpoints.
 * Tracks requests per IP and per authenticated user.
 */
import type { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  requests: number;
  resetAt: number;
}

const ipStore = new Map<string, RateLimitStore>();
const userStore = new Map<string, RateLimitStore>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_IP = 100;
const MAX_REQUESTS_PER_USER = 200;

function cleanupOldEntries(store: Map<string, RateLimitStore>) {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now > value.resetAt) {
      store.delete(key);
    }
  }
}

function checkLimit(
  key: string,
  store: Map<string, RateLimitStore>,
  maxRequests: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { requests: 0, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  }

  entry.requests++;

  const remaining = Math.max(0, maxRequests - entry.requests);
  const allowed = entry.requests <= maxRequests;

  return { allowed, remaining, resetAt: entry.resetAt };
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting for health checks
  if (req.path === '/api/health' || req.path === '/api/colyseus/health') {
    return next();
  }

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    cleanupOldEntries(ipStore);
    cleanupOldEntries(userStore);
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const ipCheck = checkLimit(ip, ipStore, MAX_REQUESTS_PER_IP);

  if (!ipCheck.allowed) {
    res.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_IP));
    res.set('X-RateLimit-Remaining', '0');
    res.set('X-RateLimit-Reset', String(Math.floor(ipCheck.resetAt / 1000)));
    res.set('Retry-After', String(Math.ceil((ipCheck.resetAt - Date.now()) / 1000)));
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((ipCheck.resetAt - Date.now()) / 1000),
    });
  }

  // Check user-based rate limit if authenticated
  const authHeader = req.get('Authorization') || req.get('X-Session-Token');
  if (authHeader) {
    // Extract user ID from token (simple version without full JWT decode)
    const tokenHash = authHeader.substring(0, 16); // Use first 16 chars as identifier
    const userCheck = checkLimit(tokenHash, userStore, MAX_REQUESTS_PER_USER);

    if (!userCheck.allowed) {
      res.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_USER));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(Math.floor(userCheck.resetAt / 1000)));
      res.set('Retry-After', String(Math.ceil((userCheck.resetAt - Date.now()) / 1000)));
      return res.status(429).json({
        error: 'Too many requests',
        message: 'User rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((userCheck.resetAt - Date.now()) / 1000),
      });
    }

    res.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_USER));
    res.set('X-RateLimit-Remaining', String(userCheck.remaining));
    res.set('X-RateLimit-Reset', String(Math.floor(userCheck.resetAt / 1000)));
  } else {
    res.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_IP));
    res.set('X-RateLimit-Remaining', String(ipCheck.remaining));
    res.set('X-RateLimit-Reset', String(Math.floor(ipCheck.resetAt / 1000)));
  }

  next();
}

/**
 * Get current rate limit stats (for observability endpoints).
 */
export function getRateLimitStats() {
  return {
    ipTracked: ipStore.size,
    userTracked: userStore.size,
    windowMs: WINDOW_MS,
    maxRequestsPerIp: MAX_REQUESTS_PER_IP,
    maxRequestsPerUser: MAX_REQUESTS_PER_USER,
  };
}

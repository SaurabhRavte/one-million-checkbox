import { getRedis } from "../../common/config/db";

/**
 * Custom rate limiter using Redis sliding window.
 * No external packages used.
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Sliding window rate limiter using Redis sorted sets.
 * Key: rate:{identifier}
 * Members: timestamps
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
  namespace = "rl"
): Promise<RateLimitResult> {
  const redis = getRedis();
  const key = `${namespace}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipeline = redis.multi();
  // Remove old entries
  pipeline.zRemRangeByScore(key, "-inf", windowStart.toString());
  // Add current request
  pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
  // Count requests in window
  pipeline.zCard(key);
  // Set expiry
  pipeline.expire(key, Math.ceil(windowMs / 1000));
  
  const results = await pipeline.exec();
  const count = (results?.[2] as number) || 0;

  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);
  const resetAt = now + windowMs;

  return { allowed, remaining, resetAt };
}

/**
 * HTTP middleware factory for rate limiting
 */
import { Request, Response, NextFunction } from "express";
import { sendError } from "../../common/utils/apiResponse";

export function createRateLimiter(
  maxRequests: number,
  windowMs: number,
  namespace = "http"
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const identifier = `${ip}`;

    const result = await checkRateLimit(identifier, maxRequests, windowMs, namespace);

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader("X-RateLimit-Reset", result.resetAt);

    if (!result.allowed) {
      sendError(res, "Too many requests. Slow down!", 429);
      return;
    }
    next();
  };
}

/**
 * WebSocket rate limiter - check without Express middleware
 */
export async function checkWsRateLimit(
  userId: string,
  maxRequests = 10,
  windowMs = 1000
): Promise<boolean> {
  const result = await checkRateLimit(userId, maxRequests, windowMs, "ws");
  return result.allowed;
}

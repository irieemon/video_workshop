/**
 * Rate limiting utilities for API endpoints
 * Uses in-memory store for development, should be replaced with Redis in production
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per interval
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (should be replaced with Redis in production)
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // AI endpoints (expensive operations)
  AI_ROUNDTABLE: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },
  AI_ADVANCED: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute (more expensive)
  },
  AI_CONCEPT_GENERATION: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute
  },

  // Standard CRUD operations
  STANDARD: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },

  // Write operations (create, update, delete)
  WRITE: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },

  // File uploads
  UPLOAD: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
  },
} as const;

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the rate limit (e.g., user ID + endpoint)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // No existing record or reset time passed
  if (!record || now >= record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + config.interval,
    };
    rateLimitStore.set(identifier, newRecord);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newRecord.resetTime,
    };
  }

  // Existing record within time window
  if (record.count < config.maxRequests) {
    record.count++;
    rateLimitStore.set(identifier, record);

    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetTime: record.resetTime,
    retryAfter: Math.ceil((record.resetTime - now) / 1000), // seconds until reset
  };
}

/**
 * Create a rate limit identifier from user ID and endpoint
 */
export function createRateLimitKey(userId: string, endpoint: string): string {
  return `ratelimit:${userId}:${endpoint}`;
}

/**
 * Clean up expired rate limit records (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now >= record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

/**
 * Rate limit response helper for Next.js
 */
export function createRateLimitResponse(result: ReturnType<typeof checkRateLimit>) {
  return {
    error: 'Rate limit exceeded',
    message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
    retryAfter: result.retryAfter,
    resetTime: new Date(result.resetTime).toISOString(),
  };
}

/**
 * Rate limit headers for response
 */
export function getRateLimitHeaders(result: ReturnType<typeof checkRateLimit>) {
  return {
    'X-RateLimit-Limit': String(result.remaining + (result.allowed ? 1 : 0)),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetTime / 1000)),
    ...(result.retryAfter && { 'Retry-After': String(result.retryAfter) }),
  };
}

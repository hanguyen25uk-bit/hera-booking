// Simple in-memory rate limiter

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export const RATE_LIMIT_CONFIGS = {
  // POST booking: 5/min per IP
  booking: { maxRequests: 5, windowMs: 60 * 1000 },
  // POST contact: 3/min per IP
  contact: { maxRequests: 3, windowMs: 60 * 1000 },
  // GET public routes: 30/min per IP
  publicRead: { maxRequests: 30, windowMs: 60 * 1000 },
  // POST admin login: 5/15min per IP
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  // Admin routes: 30/min per IP
  admin: { maxRequests: 30, windowMs: 60 * 1000 },
  // General API: 60/min per IP
  api: { maxRequests: 60, windowMs: 60 * 1000 },
  // Email booking: 3/hour per email
  emailBooking: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
} as const;

export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  let entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetTime < now) {
    entry = { count: 1, resetTime: now + config.windowMs };
    rateLimitStore.set(identifier, entry);
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: entry.resetTime };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, resetTime: entry.resetTime, retryAfter };
  }

  entry.count++;
  rateLimitStore.set(identifier, entry);
  return { allowed: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime };
}

export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;

  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) return vercelForwardedFor.split(',')[0].trim();

  return 'unknown';
}

export function checkBookingRateLimit(ip: string, email?: string): RateLimitResult {
  // Check IP rate limit
  const ipResult = checkRateLimit(`booking:ip:${ip}`, RATE_LIMIT_CONFIGS.booking);
  if (!ipResult.allowed) return ipResult;

  // Check email rate limit if provided
  if (email) {
    const emailResult = checkRateLimit(`booking:email:${email.toLowerCase()}`, RATE_LIMIT_CONFIGS.emailBooking);
    if (!emailResult.allowed) return emailResult;
  }

  return ipResult;
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  };

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

// Helper type for rate limit config keys
export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS;

// Check rate limit and return error response if exceeded
export function applyRateLimit(
  request: Request,
  type: RateLimitType,
  prefix?: string
): { success: true } | { success: false; response: Response } {
  const ip = getClientIP(request);
  const key = prefix ? `${prefix}:${type}:${ip}` : `${type}:${ip}`;
  const config = RATE_LIMIT_CONFIGS[type];
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...getRateLimitHeaders(result),
          },
        }
      ),
    };
  }

  return { success: true };
}

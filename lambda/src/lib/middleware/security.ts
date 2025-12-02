/**
 * Security middleware for CSRF protection and rate limiting
 * Requirements: API security, rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter
 * In production, use Redis or similar distributed cache
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if request should be rate limited
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    let requests = this.requests.get(identifier) || [];

    // Filter out requests outside the window
    requests = requests.filter((timestamp) => timestamp > windowStart);

    // Check if limit exceeded
    if (requests.length >= this.maxRequests) {
      return true;
    }

    // Add current request
    requests.push(now);
    this.requests.set(identifier, requests);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return false;
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter((timestamp) => timestamp > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// Create rate limiter instances for different endpoints
const apiRateLimiter = new RateLimiter(60000, 100); // 100 requests per minute
const messageRateLimiter = new RateLimiter(60000, 30); // 30 messages per minute
const magicLinkRateLimiter = new RateLimiter(300000, 5); // 5 magic links per 5 minutes

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Use IP address as identifier from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';
  return ip;
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  limiter: RateLimiter = apiRateLimiter
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const identifier = getClientIdentifier(request);

    if (limiter.isRateLimited(identifier)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      );
    }

    return handler(request, ...args);
  };
}

/**
 * CSRF token validation
 * Uses constant-time comparison to prevent timing attacks
 */
export function validateCSRFToken(request: NextRequest): boolean {
  // Skip CSRF for GET requests
  if (request.method === 'GET') {
    return true;
  }

  // Get CSRF token from header
  const csrfToken = request.headers.get('x-csrf-token');

  // Get CSRF token from cookie
  const cookies = request.cookies;
  const csrfCookie = cookies.get('csrf-token');

  // Validate tokens match using constant-time comparison
  if (!csrfToken || !csrfCookie) {
    return false;
  }

  // Import validation function
  const { validateCSRFToken: validateToken } = require('@/lib/utils/csrf');
  return validateToken(csrfToken, csrfCookie.value);
}

/**
 * CSRF protection middleware
 */
export function withCSRFProtection(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    // Skip CSRF for GET requests
    if (request.method === 'GET') {
      return handler(request, ...args);
    }

    // Validate CSRF token
    if (!validateCSRFToken(request)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid CSRF token',
        },
        { status: 403 }
      );
    }

    return handler(request, ...args);
  };
}

/**
 * Combined security middleware
 */
export function withSecurity(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: {
    rateLimiter?: RateLimiter;
    skipCSRF?: boolean;
  } = {}
) {
  let securedHandler = handler;

  // Apply rate limiting
  if (options.rateLimiter) {
    securedHandler = withRateLimit(securedHandler, options.rateLimiter);
  } else {
    securedHandler = withRateLimit(securedHandler);
  }

  // Apply CSRF protection
  if (!options.skipCSRF) {
    securedHandler = withCSRFProtection(securedHandler);
  }

  return securedHandler;
}

// Export rate limiters for specific use cases
export { apiRateLimiter, messageRateLimiter, magicLinkRateLimiter };

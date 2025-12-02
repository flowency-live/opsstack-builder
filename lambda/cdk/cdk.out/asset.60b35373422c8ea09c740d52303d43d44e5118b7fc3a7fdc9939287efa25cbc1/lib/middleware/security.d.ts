/**
 * Security middleware for CSRF protection and rate limiting
 * Requirements: API security, rate limiting
 */
import { NextRequest, NextResponse } from 'next/server';
/**
 * Simple in-memory rate limiter
 * In production, use Redis or similar distributed cache
 */
declare class RateLimiter {
    private requests;
    private readonly windowMs;
    private readonly maxRequests;
    constructor(windowMs?: number, maxRequests?: number);
    /**
     * Check if request should be rate limited
     */
    isRateLimited(identifier: string): boolean;
    /**
     * Cleanup old entries
     */
    private cleanup;
}
declare const apiRateLimiter: RateLimiter;
declare const messageRateLimiter: RateLimiter;
declare const magicLinkRateLimiter: RateLimiter;
/**
 * Rate limiting middleware
 */
export declare function withRateLimit(handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>, limiter?: RateLimiter): (request: NextRequest, ...args: any[]) => Promise<NextResponse>;
/**
 * CSRF token validation
 * Uses constant-time comparison to prevent timing attacks
 */
export declare function validateCSRFToken(request: NextRequest): boolean;
/**
 * CSRF protection middleware
 */
export declare function withCSRFProtection(handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>): (request: NextRequest, ...args: any[]) => Promise<NextResponse>;
/**
 * Combined security middleware
 */
export declare function withSecurity(handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>, options?: {
    rateLimiter?: RateLimiter;
    skipCSRF?: boolean;
}): (request: NextRequest, ...args: any[]) => Promise<NextResponse>;
export { apiRateLimiter, messageRateLimiter, magicLinkRateLimiter };
//# sourceMappingURL=security.d.ts.map
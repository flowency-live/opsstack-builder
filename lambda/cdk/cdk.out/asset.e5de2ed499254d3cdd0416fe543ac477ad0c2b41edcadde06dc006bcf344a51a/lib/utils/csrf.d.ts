/**
 * CSRF Token Generation and Validation
 * Requirements: 18.1 - CSRF protection
 */
/**
 * Generate a cryptographically secure CSRF token
 */
export declare function generateCSRFToken(): string;
/**
 * Validate CSRF token
 */
export declare function validateCSRFToken(token: string, expectedToken: string): boolean;
/**
 * Create CSRF token cookie options
 */
export declare function getCSRFCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict";
    path: string;
    maxAge: number;
};
//# sourceMappingURL=csrf.d.ts.map
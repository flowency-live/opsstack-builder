"use strict";
/**
 * CSRF Token Generation and Validation
 * Requirements: 18.1 - CSRF protection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCSRFToken = generateCSRFToken;
exports.validateCSRFToken = validateCSRFToken;
exports.getCSRFCookieOptions = getCSRFCookieOptions;
const crypto_1 = require("crypto");
/**
 * Generate a cryptographically secure CSRF token
 */
function generateCSRFToken() {
    return (0, crypto_1.randomBytes)(32).toString('hex');
}
/**
 * Validate CSRF token
 */
function validateCSRFToken(token, expectedToken) {
    if (!token || !expectedToken) {
        return false;
    }
    // Use constant-time comparison to prevent timing attacks
    if (token.length !== expectedToken.length) {
        return false;
    }
    let result = 0;
    for (let i = 0; i < token.length; i++) {
        result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
    }
    return result === 0;
}
/**
 * Create CSRF token cookie options
 */
function getCSRFCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
    };
}
//# sourceMappingURL=csrf.js.map
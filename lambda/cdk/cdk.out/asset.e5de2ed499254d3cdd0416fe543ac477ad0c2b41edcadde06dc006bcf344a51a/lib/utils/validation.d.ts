/**
 * Input validation and sanitization utilities
 * Requirements: 18.3 - Input validation and sanitization
 */
/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export declare function sanitizeString(input: string): string;
/**
 * Validate and sanitize email address
 */
export declare function validateEmail(email: string): {
    valid: boolean;
    sanitized: string;
};
/**
 * Validate and sanitize phone number
 */
export declare function validatePhone(phone: string): {
    valid: boolean;
    sanitized: string;
};
/**
 * Validate session ID format
 */
export declare function validateSessionId(sessionId: string): boolean;
/**
 * Validate magic link token format
 */
export declare function validateMagicLinkToken(token: string): boolean;
/**
 * Sanitize object by sanitizing all string values
 */
export declare function sanitizeObject<T extends Record<string, any>>(obj: T): T;
/**
 * Validate contact information for submission
 */
export declare function validateContactInfo(contactInfo: {
    name?: string;
    email?: string;
    phone?: string;
    budgetRange?: string;
    timeline?: string;
    referralSource?: string;
    urgency?: string;
}): {
    valid: boolean;
    errors: string[];
};
/**
 * Validate specification completeness
 */
export declare function validateSpecificationCompleteness(specification: any): {
    valid: boolean;
    missingFields: string[];
};
//# sourceMappingURL=validation.d.ts.map
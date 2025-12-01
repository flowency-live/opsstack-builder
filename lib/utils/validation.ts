/**
 * Input validation and sanitization utilities
 * Requirements: 18.3 - Input validation and sanitization
 */

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length to prevent DoS
  const maxLength = 10000;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function validateEmail(email: string): { valid: boolean; sanitized: string } {
  const sanitized = sanitizeString(email).toLowerCase();
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = emailRegex.test(sanitized);
  
  return { valid, sanitized };
}

/**
 * Validate and sanitize phone number
 */
export function validatePhone(phone: string): { valid: boolean; sanitized: string } {
  const sanitized = sanitizeString(phone);
  
  // Remove all non-digit characters except + at the start
  const cleaned = sanitized.replace(/[^\d+]/g, '');
  
  // Basic phone validation (at least 10 digits)
  const valid = /^\+?\d{10,}$/.test(cleaned);
  
  return { valid, sanitized: cleaned };
}

/**
 * Validate session ID format
 */
export function validateSessionId(sessionId: string): boolean {
  const sanitized = sanitizeString(sessionId);
  
  // Session IDs should be UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sanitized);
}

/**
 * Validate magic link token format
 */
export function validateMagicLinkToken(token: string): boolean {
  const sanitized = sanitizeString(token);
  
  // Tokens should be UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sanitized);
}

/**
 * Sanitize object by sanitizing all string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Validate contact information for submission
 */
export function validateContactInfo(contactInfo: {
  name?: string;
  email?: string;
  phone?: string;
  budgetRange?: string;
  timeline?: string;
  referralSource?: string;
  urgency?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!contactInfo.name || sanitizeString(contactInfo.name).length === 0) {
    errors.push('Name is required');
  }
  
  if (!contactInfo.email) {
    errors.push('Email is required');
  } else {
    const { valid } = validateEmail(contactInfo.email);
    if (!valid) {
      errors.push('Invalid email address');
    }
  }
  
  if (!contactInfo.phone) {
    errors.push('Phone number is required');
  } else {
    const { valid } = validatePhone(contactInfo.phone);
    if (!valid) {
      errors.push('Invalid phone number');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate specification completeness
 */
export function validateSpecificationCompleteness(specification: any): {
  valid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
  if (!specification) {
    return { valid: false, missingFields: ['specification'] };
  }
  
  // Check plain English summary
  if (!specification.plainEnglishSummary?.overview) {
    missingFields.push('overview');
  }
  
  if (!specification.plainEnglishSummary?.keyFeatures?.length) {
    missingFields.push('keyFeatures');
  }
  
  if (!specification.plainEnglishSummary?.targetUsers) {
    missingFields.push('targetUsers');
  }
  
  // Check formal PRD
  if (!specification.formalPRD?.requirements?.length) {
    missingFields.push('requirements');
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

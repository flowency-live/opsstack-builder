# Security and Data Protection Implementation

This document describes the security measures implemented for the Specification Wizard application.

## Requirements Addressed

- **18.1**: CSRF token generation and validation
- **18.2**: Data encryption for DynamoDB and S3
- **18.3**: Input validation and sanitization
- **18.4**: GDPR-compliant data handling
- **18.5**: Privacy Policy and Terms of Service

## 1. Data Encryption (Requirement 18.2)

### Encryption at Rest

#### DynamoDB
- **Server-Side Encryption (SSE)**: All DynamoDB tables should be configured with encryption at rest using AWS-managed keys (SSE-KMS or SSE-S3)
- **Configuration**: Encryption is enabled at the table level in AWS Console or via Infrastructure as Code
- **Verification**: The `isTableEncrypted()` function in `lib/aws/dynamodb.ts` can verify encryption status

#### S3
- **Server-Side Encryption**: All S3 objects are uploaded with AES256 encryption
- **Implementation**: The `putObjectEncrypted()` function automatically applies encryption to all uploads
- **Bucket Policy**: S3 buckets should have default encryption enabled
- **Verification**: The `isBucketEncrypted()` function can verify bucket encryption configuration

### Encryption in Transit

- **TLS 1.3**: All AWS SDK clients are configured to use TLS 1.3 for data in transit
- **HTTPS Only**: All API endpoints enforce HTTPS in production

### Application-Level Encryption

- **Purpose**: Additional encryption layer for sensitive data beyond AWS encryption
- **Algorithm**: AES-256-GCM with scrypt key derivation
- **Implementation**: `lib/utils/encryption.ts` provides encrypt/decrypt functions
- **Usage**: Can be used for encrypting sensitive fields before storing in database

```typescript
import { encrypt, decrypt, encryptObject, decryptObject } from '@/lib/utils/encryption';

// Encrypt sensitive string
const encrypted = encrypt(sensitiveData);

// Decrypt
const decrypted = decrypt(encrypted);

// Encrypt entire object
const encryptedObj = encryptObject({ email: 'user@example.com', phone: '1234567890' });
const decryptedObj = decryptObject(encryptedObj);
```

**Configuration**: Set `ENCRYPTION_PASSWORD` environment variable (minimum 32 characters)

## 2. CSRF Protection (Requirement 18.1)

### Implementation

- **Token Generation**: Cryptographically secure tokens using `crypto.randomBytes(32)`
- **Token Storage**: Tokens stored in HTTP-only cookies
- **Token Validation**: Constant-time comparison to prevent timing attacks
- **Middleware**: `withCSRFProtection()` middleware in `lib/middleware/security.ts`

### Usage

```typescript
import { withSecurity } from '@/lib/middleware/security';

// Apply CSRF protection to API route
export const POST = withSecurity(async (request) => {
  // Your handler code
});
```

### Client-Side Integration

1. **Get CSRF Token**: Call `GET /api/csrf` to obtain a token
2. **Include in Requests**: Add `x-csrf-token` header to all POST/PUT/DELETE requests
3. **Cookie**: Token is automatically stored in cookie by the server

```typescript
// Example client-side usage
const response = await fetch('/api/csrf');
const { csrfToken } = await response.json();

// Use token in subsequent requests
await fetch('/api/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken,
  },
  body: JSON.stringify(data),
});
```

## 3. Rate Limiting (Requirement 18.3)

### Implementation

- **In-Memory Rate Limiter**: Simple implementation for MVP (use Redis in production)
- **Configurable Limits**: Different limits for different endpoint types
- **Middleware**: `withRateLimit()` middleware in `lib/middleware/security.ts`

### Default Limits

- **API Endpoints**: 100 requests per minute per IP
- **Message Endpoints**: 30 messages per minute per IP
- **Magic Link Generation**: 5 requests per 5 minutes per IP

### Usage

```typescript
import { withSecurity, messageRateLimiter } from '@/lib/middleware/security';

// Apply custom rate limiter
export const POST = withSecurity(async (request) => {
  // Your handler code
}, { rateLimiter: messageRateLimiter });
```

## 4. Input Validation and Sanitization (Requirement 18.3)

### Implementation

- **Sanitization**: Remove null bytes, trim whitespace, limit length
- **Validation**: Email, phone, session ID, magic link token validation
- **Object Sanitization**: Recursive sanitization of nested objects
- **Location**: `lib/utils/validation.ts`

### Functions

```typescript
import {
  sanitizeString,
  validateEmail,
  validatePhone,
  validateSessionId,
  validateMagicLinkToken,
  sanitizeObject,
  validateContactInfo,
  validateSpecificationCompleteness,
} from '@/lib/utils/validation';

// Sanitize user input
const clean = sanitizeString(userInput);

// Validate email
const { valid, sanitized } = validateEmail(email);

// Validate contact info
const { valid, errors } = validateContactInfo({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
});

// Sanitize entire object
const cleanObj = sanitizeObject(userProvidedData);
```

### Best Practices

1. **Always sanitize** user input before processing
2. **Validate format** before using in queries or operations
3. **Limit length** to prevent DoS attacks
4. **Use type checking** to ensure expected data types

## 5. GDPR Compliance (Requirements 18.4, 18.5)

### Data Subject Rights

#### Right to Erasure (Right to be Forgotten)

- **Endpoint**: `POST /api/data-deletion`
- **Implementation**: Deletes all session data, conversation history, specifications, and submissions
- **Request Format**:

```json
{
  "email": "user@example.com",
  "sessionId": "optional-session-id"
}
```

#### Right to Access

- Users can export their specifications via the export functionality
- Magic links provide access to complete session data

#### Right to Rectification

- Users can modify their specifications through conversational corrections
- Contact information can be updated before submission

### Data Retention

- **Active Sessions**: 30 days TTL in DynamoDB
- **Submitted Specifications**: Retained for quotation and project management
- **Abandoned Sessions**: Retained with status "abandoned" for potential retrieval

### Privacy Policy

- **Location**: `/privacy` page
- **Content**: Comprehensive privacy policy covering:
  - Information collection
  - Data usage
  - Security measures
  - Data retention
  - GDPR rights
  - Contact information

### Terms of Service

- **Location**: `/terms` page
- **Content**: Terms covering:
  - User responsibilities
  - Service description
  - Intellectual property
  - Security measures
  - Limitation of liability
  - Termination rights

## 6. Security Best Practices

### API Security

1. **CSRF Protection**: All state-changing endpoints protected
2. **Rate Limiting**: Prevents abuse and DoS attacks
3. **Input Validation**: All user input validated and sanitized
4. **Error Handling**: Generic error messages to prevent information leakage

### Data Security

1. **Encryption at Rest**: DynamoDB and S3 encryption enabled
2. **Encryption in Transit**: TLS 1.3 for all communications
3. **Application-Level Encryption**: Additional layer for sensitive data
4. **Secure Token Generation**: Cryptographically secure random tokens

### Authentication & Authorization

1. **Session-Based**: No user accounts for MVP
2. **Magic Links**: Secure, time-limited access tokens
3. **UUID v4**: Cryptographically secure session identifiers

### Monitoring & Logging

1. **Security Events**: Log all authentication attempts, rate limit violations
2. **Error Tracking**: Monitor and alert on security-related errors
3. **Audit Trail**: Track data access and modifications

## 7. Production Deployment Checklist

### Environment Variables

```bash
# Required
ENCRYPTION_PASSWORD=<32+ character secure password>
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_REGION=<your-region>

# Optional
DYNAMODB_TABLE_NAME=spec-wizard-sessions
S3_BUCKET_NAME=spec-wizard-exports
```

### AWS Configuration

1. **DynamoDB Tables**:
   - Enable encryption at rest (SSE-KMS recommended)
   - Enable point-in-time recovery
   - Configure TTL on session records

2. **S3 Buckets**:
   - Enable default encryption (AES256 or KMS)
   - Enable versioning
   - Configure lifecycle policies
   - Set appropriate bucket policies

3. **IAM Roles**:
   - Principle of least privilege
   - Separate roles for different services
   - Enable MFA for sensitive operations

4. **CloudWatch**:
   - Set up alarms for security events
   - Monitor rate limit violations
   - Track failed authentication attempts

### Security Headers

Configure Next.js to include security headers:

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

## 8. Testing

### Property-Based Tests

- **Location**: `__tests__/security/data-encryption.property.test.ts`
- **Coverage**: Encryption round-trip, tampering detection, hash functions
- **Runs**: 100 iterations per property

### Integration Tests

- DynamoDB encryption verification
- S3 encryption verification
- CSRF token validation
- Rate limiting behavior

### Manual Testing

1. Test CSRF protection by omitting token
2. Test rate limiting by exceeding limits
3. Test input validation with malicious input
4. Test data deletion endpoint

## 9. Incident Response

### Security Incident Procedure

1. **Detect**: Monitor logs and alerts
2. **Contain**: Disable affected endpoints if necessary
3. **Investigate**: Analyze logs and determine scope
4. **Remediate**: Fix vulnerability and deploy patch
5. **Notify**: Inform affected users if required by GDPR

### Contact

For security concerns, contact the development team immediately.

## 10. Future Enhancements

1. **Redis Rate Limiting**: Replace in-memory rate limiter with Redis
2. **WAF Integration**: Add AWS WAF for additional protection
3. **Security Scanning**: Automated vulnerability scanning in CI/CD
4. **Penetration Testing**: Regular security audits
5. **2FA**: Two-factor authentication for admin access
6. **Audit Logging**: Comprehensive audit trail for compliance

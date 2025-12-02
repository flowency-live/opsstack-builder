/**
 * Encryption utilities for sensitive data
 * Requirements: 18.2 - Data encryption
 *
 * Note: This provides application-level encryption in addition to AWS encryption at rest
 */
/**
 * Encrypt sensitive data
 * Returns base64-encoded string containing salt, IV, encrypted data, and auth tag
 */
export declare function encrypt(plaintext: string): string;
/**
 * Decrypt sensitive data
 * Accepts base64-encoded string containing salt, IV, encrypted data, and auth tag
 */
export declare function decrypt(ciphertext: string): string;
/**
 * Encrypt object (converts to JSON first)
 */
export declare function encryptObject<T>(obj: T): string;
/**
 * Decrypt object (parses JSON after decryption)
 */
export declare function decryptObject<T>(ciphertext: string): T;
/**
 * Hash sensitive data (one-way, for comparison purposes)
 */
export declare function hashData(data: string): string;
/**
 * Check if encryption is properly configured
 */
export declare function isEncryptionConfigured(): boolean;
//# sourceMappingURL=encryption.d.ts.map
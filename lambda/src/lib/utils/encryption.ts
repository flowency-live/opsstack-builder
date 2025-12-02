/**
 * Encryption utilities for sensitive data
 * Requirements: 18.2 - Data encryption
 * 
 * Note: This provides application-level encryption in addition to AWS encryption at rest
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

/**
 * Derive encryption key from password using scrypt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

/**
 * Get encryption password from environment
 */
function getEncryptionPassword(): string {
  const password = process.env.ENCRYPTION_PASSWORD;
  if (!password) {
    throw new Error('ENCRYPTION_PASSWORD environment variable not set');
  }
  return password;
}

/**
 * Encrypt sensitive data
 * Returns base64-encoded string containing salt, IV, encrypted data, and auth tag
 */
export function encrypt(plaintext: string): string {
  try {
    const password = getEncryptionPassword();
    
    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    
    // Derive key from password
    const key = deriveKey(password, salt);
    
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine salt, IV, encrypted data, and tag
    const combined = Buffer.concat([
      salt,
      iv,
      Buffer.from(encrypted, 'hex'),
      tag,
    ]);
    
    // Return as base64
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * Accepts base64-encoded string containing salt, IV, encrypted data, and auth tag
 */
export function decrypt(ciphertext: string): string {
  try {
    const password = getEncryptionPassword();
    
    // Decode from base64
    const combined = Buffer.from(ciphertext, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(combined.length - TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH, combined.length - TAG_LENGTH);
    
    // Derive key from password
    const key = deriveKey(password, salt);
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt object (converts to JSON first)
 */
export function encryptObject<T>(obj: T): string {
  const json = JSON.stringify(obj);
  return encrypt(json);
}

/**
 * Decrypt object (parses JSON after decryption)
 */
export function decryptObject<T>(ciphertext: string): T {
  const json = decrypt(ciphertext);
  return JSON.parse(json);
}

/**
 * Hash sensitive data (one-way, for comparison purposes)
 */
export function hashData(data: string): string {
  const { createHash } = require('crypto');
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    const password = process.env.ENCRYPTION_PASSWORD;
    return !!password && password.length >= 32;
  } catch {
    return false;
  }
}

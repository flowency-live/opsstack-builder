/**
 * S3 Client Configuration
 * Includes encryption at rest configuration
 * Requirements: 18.2 - Data encryption
 */
import { S3Client } from '@aws-sdk/client-s3';
export declare const s3Client: S3Client;
/**
 * Upload object to S3 with encryption
 * Automatically applies AES256 server-side encryption
 */
export declare function putObjectEncrypted(bucket: string, key: string, body: Buffer | string, contentType?: string): Promise<void>;
/**
 * Get object from S3
 */
export declare function getObject(bucket: string, key: string): Promise<Buffer>;
/**
 * Check if an S3 bucket has default encryption enabled
 */
export declare function isBucketEncrypted(bucketName: string): Promise<boolean>;
//# sourceMappingURL=s3.d.ts.map
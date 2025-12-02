/**
 * S3 Client Configuration
 * Includes encryption at rest configuration
 * Requirements: 18.2 - Data encryption
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Config } from './config';

// Create S3 client with encryption enabled
// Note: Server-side encryption is applied per-object via PutObject parameters
const client = new S3Client({
  ...s3Config,
  // Ensure TLS 1.3 for data in transit
  requestHandler: {
    httpsAgent: {
      minVersion: 'TLSv1.3',
    },
  } as any,
});

export const s3Client = client;

/**
 * Upload object to S3 with encryption
 * Automatically applies AES256 server-side encryption
 */
export async function putObjectEncrypted(
  bucket: string,
  key: string,
  body: Buffer | string,
  contentType?: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ServerSideEncryption: 'AES256', // Enable server-side encryption
    ContentType: contentType,
  });
  
  await client.send(command);
}

/**
 * Get object from S3
 */
export async function getObject(bucket: string, key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  const response = await client.send(command);
  const stream = response.Body as any;
  
  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

/**
 * Check if an S3 bucket has default encryption enabled
 */
export async function isBucketEncrypted(bucketName: string): Promise<boolean> {
  try {
    const { GetBucketEncryptionCommand } = await import('@aws-sdk/client-s3');
    const command = new GetBucketEncryptionCommand({ Bucket: bucketName });
    const response = await client.send(command);
    
    // Check if encryption rules exist
    return (response.ServerSideEncryptionConfiguration?.Rules?.length ?? 0) > 0;
  } catch (error: any) {
    // If error is ServerSideEncryptionConfigurationNotFoundError, encryption is not enabled
    if (error.name === 'ServerSideEncryptionConfigurationNotFoundError') {
      return false;
    }
    console.error('Error checking bucket encryption:', error);
    return false;
  }
}

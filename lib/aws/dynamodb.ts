/**
 * DynamoDB Client Configuration
 * Includes encryption at rest configuration
 * Requirements: 18.2 - Data encryption
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { dynamoDBConfig } from './config';

// Create DynamoDB client with encryption enabled
// Note: Encryption at rest is configured at the table level in AWS
// This client will work with encrypted tables
const client = new DynamoDBClient({
  ...dynamoDBConfig,
  // Ensure TLS 1.3 for data in transit
  requestHandler: {
    httpsAgent: {
      minVersion: 'TLSv1.3',
    },
  } as any,
});

// Create DynamoDB Document client for easier data manipulation
export const dynamoDBDocClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

export { client as dynamoDBClient };

/**
 * Check if encryption is enabled for a table
 * This is a helper function to verify encryption status
 */
export async function isTableEncrypted(tableName: string): Promise<boolean> {
  try {
    const { DescribeTableCommand } = await import('@aws-sdk/client-dynamodb');
    const command = new DescribeTableCommand({ TableName: tableName });
    const response = await client.send(command);
    
    // Check if SSE (Server-Side Encryption) is enabled
    const sseDescription = response.Table?.SSEDescription;
    return sseDescription?.Status === 'ENABLED' || sseDescription?.Status === 'ENABLING';
  } catch (error) {
    console.error('Error checking table encryption:', error);
    return false;
  }
}

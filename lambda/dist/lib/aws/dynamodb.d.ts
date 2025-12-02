/**
 * DynamoDB Client Configuration
 * Includes encryption at rest configuration
 * Requirements: 18.2 - Data encryption
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
declare const client: DynamoDBClient;
export declare const dynamoDBDocClient: DynamoDBDocumentClient;
export { client as dynamoDBClient };
/**
 * Check if encryption is enabled for a table
 * This is a helper function to verify encryption status
 */
export declare function isTableEncrypted(tableName: string): Promise<boolean>;
//# sourceMappingURL=dynamodb.d.ts.map
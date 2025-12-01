/**
 * DynamoDB Table Definitions
 * Single-table design with GSI for magic link and reference number lookups
 */

import {
  CreateTableCommand,
  CreateTableCommandInput,
  DescribeTableCommand,
  UpdateTimeToLiveCommand,
} from '@aws-sdk/client-dynamodb';
import { dynamoDBClient } from '../aws/dynamodb';
import { tableNames } from '../aws/config';

/**
 * Main table definition for single-table design
 * Stores sessions, messages, specifications, and submissions
 */
export const mainTableDefinition: CreateTableCommandInput = {
  TableName: tableNames.sessions,
  AttributeDefinitions: [
    { AttributeName: 'PK', AttributeType: 'S' },
    { AttributeName: 'SK', AttributeType: 'S' },
    { AttributeName: 'GSI1PK', AttributeType: 'S' },
    { AttributeName: 'GSI1SK', AttributeType: 'S' },
  ],
  KeySchema: [
    { AttributeName: 'PK', KeyType: 'HASH' },
    { AttributeName: 'SK', KeyType: 'RANGE' },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'GSI1',
      KeySchema: [
        { AttributeName: 'GSI1PK', KeyType: 'HASH' },
        { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
  ],
  BillingMode: 'PROVISIONED',
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
};

/**
 * Create the main table if it doesn't exist
 */
export async function createMainTable(): Promise<void> {
  try {
    // Check if table exists
    const describeCommand = new DescribeTableCommand({
      TableName: tableNames.sessions,
    });

    try {
      await dynamoDBClient.send(describeCommand);
      console.log(`Table ${tableNames.sessions} already exists`);
      return;
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
      // Table doesn't exist, create it
    }

    // Create table
    const createCommand = new CreateTableCommand(mainTableDefinition);
    await dynamoDBClient.send(createCommand);
    console.log(`Table ${tableNames.sessions} created successfully`);

    // Wait for table to be active
    let tableActive = false;
    while (!tableActive) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const describeResult = await dynamoDBClient.send(describeCommand);
      tableActive = describeResult.Table?.TableStatus === 'ACTIVE';
    }

    console.log(`Table ${tableNames.sessions} is now active`);

    // Enable TTL
    await enableTTL();
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  }
}

/**
 * Enable Time To Live (TTL) for 30-day session expiration
 */
export async function enableTTL(): Promise<void> {
  try {
    const command = new UpdateTimeToLiveCommand({
      TableName: tableNames.sessions,
      TimeToLiveSpecification: {
        Enabled: true,
        AttributeName: 'ttl',
      },
    });

    await dynamoDBClient.send(command);
    console.log(`TTL enabled for table ${tableNames.sessions}`);
  } catch (error) {
    console.error('Error enabling TTL:', error);
    throw error;
  }
}

/**
 * Access patterns documentation
 */
export const accessPatternsDocumentation = {
  patterns: [
    {
      name: 'Get Session by ID',
      description: 'Retrieve session metadata',
      query: 'Query with PK = SESSION#{sessionId} and SK = METADATA',
    },
    {
      name: 'Get Conversation History',
      description: 'Retrieve all messages for a session',
      query:
        'Query with PK = SESSION#{sessionId} and SK begins_with MESSAGE#',
    },
    {
      name: 'Get Latest Specification',
      description: 'Retrieve the most recent specification version',
      query:
        'Query with PK = SESSION#{sessionId} and SK begins_with SPEC#, sort descending, limit 1',
    },
    {
      name: 'Get All Specification Versions',
      description: 'Retrieve all versions of a specification',
      query: 'Query with PK = SESSION#{sessionId} and SK begins_with SPEC#',
    },
    {
      name: 'Restore Session from Magic Link',
      description: 'Find session by magic link token',
      query: 'Query GSI1 with GSI1PK = MAGIC_LINK#{token}',
    },
    {
      name: 'Get Submission by ID',
      description: 'Retrieve submission metadata',
      query: 'Query with PK = SUBMISSION#{submissionId} and SK = METADATA',
    },
    {
      name: 'Get Submission by Reference Number',
      description: 'Find submission by reference number',
      query: 'Query GSI1 with GSI1PK = REFERENCE#{referenceNumber}',
    },
    {
      name: 'List Active Sessions',
      description: 'Admin query to list all active sessions',
      query: 'Scan with filter status = active (admin only)',
    },
  ],
};

/**
 * Example queries for each access pattern
 */
export const exampleQueries = {
  getSession: {
    PK: 'SESSION#abc123',
    SK: 'METADATA',
  },
  getConversationHistory: {
    PK: 'SESSION#abc123',
    SK: { $beginsWith: 'MESSAGE#' },
  },
  getLatestSpec: {
    PK: 'SESSION#abc123',
    SK: { $beginsWith: 'SPEC#' },
    ScanIndexForward: false,
    Limit: 1,
  },
  restoreFromMagicLink: {
    IndexName: 'GSI1',
    GSI1PK: 'MAGIC_LINK#xyz789',
  },
  getSubmissionByReference: {
    IndexName: 'GSI1',
    GSI1PK: 'REFERENCE#REF-2024-001',
  },
};

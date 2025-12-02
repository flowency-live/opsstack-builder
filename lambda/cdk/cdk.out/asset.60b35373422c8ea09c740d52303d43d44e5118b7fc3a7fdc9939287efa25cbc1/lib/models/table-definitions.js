"use strict";
/**
 * DynamoDB Table Definitions
 * Single-table design with GSI for magic link and reference number lookups
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleQueries = exports.accessPatternsDocumentation = exports.mainTableDefinition = void 0;
exports.createMainTable = createMainTable;
exports.enableTTL = enableTTL;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const dynamodb_1 = require("../aws/dynamodb");
const config_1 = require("../aws/config");
/**
 * Main table definition for single-table design
 * Stores sessions, messages, specifications, and submissions
 */
exports.mainTableDefinition = {
    TableName: config_1.tableNames.sessions,
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
async function createMainTable() {
    try {
        // Check if table exists
        const describeCommand = new client_dynamodb_1.DescribeTableCommand({
            TableName: config_1.tableNames.sessions,
        });
        try {
            await dynamodb_1.dynamoDBClient.send(describeCommand);
            console.log(`Table ${config_1.tableNames.sessions} already exists`);
            return;
        }
        catch (error) {
            if (error.name !== 'ResourceNotFoundException') {
                throw error;
            }
            // Table doesn't exist, create it
        }
        // Create table
        const createCommand = new client_dynamodb_1.CreateTableCommand(exports.mainTableDefinition);
        await dynamodb_1.dynamoDBClient.send(createCommand);
        console.log(`Table ${config_1.tableNames.sessions} created successfully`);
        // Wait for table to be active
        let tableActive = false;
        while (!tableActive) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const describeResult = await dynamodb_1.dynamoDBClient.send(describeCommand);
            tableActive = describeResult.Table?.TableStatus === 'ACTIVE';
        }
        console.log(`Table ${config_1.tableNames.sessions} is now active`);
        // Enable TTL
        await enableTTL();
    }
    catch (error) {
        console.error('Error creating table:', error);
        throw error;
    }
}
/**
 * Enable Time To Live (TTL) for 30-day session expiration
 */
async function enableTTL() {
    try {
        const command = new client_dynamodb_1.UpdateTimeToLiveCommand({
            TableName: config_1.tableNames.sessions,
            TimeToLiveSpecification: {
                Enabled: true,
                AttributeName: 'ttl',
            },
        });
        await dynamodb_1.dynamoDBClient.send(command);
        console.log(`TTL enabled for table ${config_1.tableNames.sessions}`);
    }
    catch (error) {
        console.error('Error enabling TTL:', error);
        throw error;
    }
}
/**
 * Access patterns documentation
 */
exports.accessPatternsDocumentation = {
    patterns: [
        {
            name: 'Get Session by ID',
            description: 'Retrieve session metadata',
            query: 'Query with PK = SESSION#{sessionId} and SK = METADATA',
        },
        {
            name: 'Get Conversation History',
            description: 'Retrieve all messages for a session',
            query: 'Query with PK = SESSION#{sessionId} and SK begins_with MESSAGE#',
        },
        {
            name: 'Get Latest Specification',
            description: 'Retrieve the most recent specification version',
            query: 'Query with PK = SESSION#{sessionId} and SK begins_with SPEC#, sort descending, limit 1',
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
exports.exampleQueries = {
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
//# sourceMappingURL=table-definitions.js.map
"use strict";
/**
 * DynamoDB Client Configuration
 * Includes encryption at rest configuration
 * Requirements: 18.2 - Data encryption
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamoDBClient = exports.dynamoDBDocClient = void 0;
exports.isTableEncrypted = isTableEncrypted;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const config_1 = require("./config");
// Create DynamoDB client with encryption enabled
// Note: Encryption at rest is configured at the table level in AWS
// This client will work with encrypted tables
// TLS 1.2+ is used by default for data in transit
const client = new client_dynamodb_1.DynamoDBClient(config_1.dynamoDBConfig);
exports.dynamoDBClient = client;
// Create DynamoDB Document client for easier data manipulation
exports.dynamoDBDocClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
        wrapNumbers: false,
    },
});
/**
 * Check if encryption is enabled for a table
 * This is a helper function to verify encryption status
 */
async function isTableEncrypted(tableName) {
    try {
        const { DescribeTableCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-dynamodb')));
        const command = new DescribeTableCommand({ TableName: tableName });
        const response = await client.send(command);
        // Check if SSE (Server-Side Encryption) is enabled
        const sseDescription = response.Table?.SSEDescription;
        return sseDescription?.Status === 'ENABLED' || sseDescription?.Status === 'ENABLING';
    }
    catch (error) {
        console.error('Error checking table encryption:', error);
        return false;
    }
}
//# sourceMappingURL=dynamodb.js.map
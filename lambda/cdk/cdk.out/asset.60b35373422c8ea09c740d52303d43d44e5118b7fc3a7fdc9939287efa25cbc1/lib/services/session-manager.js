"use strict";
/**
 * SessionManager Service
 * Manages user sessions with aggressive persistence and magic link support
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 16.1, 16.4, 16.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionManager = exports.SessionManager = void 0;
const uuid_1 = require("uuid");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const aws_1 = require("../aws");
const dynamodb_schema_1 = require("../models/dynamodb-schema");
/**
 * SessionManager handles all session-related operations
 */
class SessionManager {
    constructor(tableName) {
        this.tableName = tableName || aws_1.tableNames.sessions;
    }
    /**
     * Create a new session
     * Generates a unique session ID and initializes empty state
     */
    async createSession() {
        const sessionId = (0, uuid_1.v4)();
        const now = new Date();
        const session = {
            id: sessionId,
            createdAt: now,
            lastAccessedAt: now,
            state: {
                conversationHistory: [],
                specification: {
                    id: sessionId,
                    version: 0,
                    plainEnglishSummary: {
                        overview: '',
                        keyFeatures: [],
                        targetUsers: '',
                        integrations: [],
                    },
                    formalPRD: {
                        introduction: '',
                        glossary: {},
                        requirements: [],
                        nonFunctionalRequirements: [],
                    },
                    lastUpdated: now,
                },
                progress: {
                    topics: [],
                    overallCompleteness: 0,
                    projectComplexity: 'Simple',
                },
            },
        };
        // Save session metadata to DynamoDB
        const record = (0, dynamodb_schema_1.sessionToRecord)(session);
        await aws_1.dynamoDBDocClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: record,
        }));
        return session;
    }
    /**
     * Get a session by ID
     * Reconstructs full session state from DynamoDB records
     */
    async getSession(sessionId) {
        // Get session metadata
        const metadataKey = dynamodb_schema_1.AccessPatterns.getSessionMetadata(sessionId);
        const metadataResponse = await aws_1.dynamoDBDocClient.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: metadataKey,
        }));
        if (!metadataResponse.Item) {
            return null;
        }
        const sessionRecord = metadataResponse.Item;
        // Get conversation history
        const conversationKey = dynamodb_schema_1.AccessPatterns.getConversationHistory(sessionId);
        const conversationResponse = await aws_1.dynamoDBDocClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': conversationKey.PK,
                ':sk': conversationKey.SKPrefix,
            },
        }));
        const conversationHistory = (conversationResponse.Items || [])
            .map((item) => (0, dynamodb_schema_1.recordToMessage)(item))
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        // Get latest specification
        const specKey = dynamodb_schema_1.AccessPatterns.getLatestSpecification(sessionId);
        const specResponse = await aws_1.dynamoDBDocClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': specKey.PK,
                ':sk': specKey.SKPrefix,
            },
            ScanIndexForward: false, // Sort descending to get latest first
            Limit: 1,
        }));
        let specification;
        let progress;
        if (specResponse.Items && specResponse.Items.length > 0) {
            const specRecord = specResponse.Items[0];
            specification = (0, dynamodb_schema_1.recordToSpecification)(specRecord);
            progress = JSON.parse(specRecord.progressState);
        }
        else {
            // No specification yet, use default
            specification = {
                id: sessionId,
                version: 0,
                plainEnglishSummary: {
                    overview: '',
                    keyFeatures: [],
                    targetUsers: '',
                    integrations: [],
                },
                formalPRD: {
                    introduction: '',
                    glossary: {},
                    requirements: [],
                    nonFunctionalRequirements: [],
                },
                lastUpdated: new Date(sessionRecord.createdAt),
            };
            progress = {
                topics: [],
                overallCompleteness: 0,
                projectComplexity: 'Simple',
            };
        }
        const sessionState = {
            conversationHistory,
            specification,
            progress,
        };
        // Update last accessed time
        await this.updateLastAccessedTime(sessionId);
        return (0, dynamodb_schema_1.recordToSession)(sessionRecord, sessionState);
    }
    /**
     * Save session state to DynamoDB
     * Implements aggressive persistence - saves after every message
     */
    async saveSessionState(sessionId, state) {
        const now = new Date();
        // Save new messages (only those not already saved)
        const existingSession = await this.getSession(sessionId);
        const existingMessageIds = new Set(existingSession?.state.conversationHistory.map((m) => m.id) || []);
        const newMessages = state.conversationHistory.filter((msg) => !existingMessageIds.has(msg.id));
        for (const message of newMessages) {
            const messageRecord = (0, dynamodb_schema_1.messageToRecord)(sessionId, message);
            await aws_1.dynamoDBDocClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: messageRecord,
            }));
        }
        // Save specification if version changed
        if (!existingSession ||
            existingSession.state.specification.version !== state.specification.version) {
            const specRecord = (0, dynamodb_schema_1.specificationToRecord)(sessionId, state.specification, state.progress);
            await aws_1.dynamoDBDocClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: specRecord,
            }));
        }
        // Update last accessed time
        await this.updateLastAccessedTime(sessionId);
    }
    /**
     * Generate a magic link token for session restoration
     * Uses UUID v4 for cryptographically secure tokens
     */
    async generateMagicLink(sessionId) {
        const token = (0, uuid_1.v4)();
        // Update session record with magic link token and GSI keys
        const metadataKey = dynamodb_schema_1.AccessPatterns.getSessionMetadata(sessionId);
        await aws_1.dynamoDBDocClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: metadataKey,
            UpdateExpression: 'SET magicLinkToken = :token, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
            ExpressionAttributeValues: {
                ':token': token,
                ':gsi1pk': `MAGIC_LINK#${token}`,
                ':gsi1sk': `SESSION#${sessionId}`,
            },
        }));
        return token;
    }
    /**
     * Restore session from magic link token
     * Looks up session using GSI on magic link token
     */
    async restoreSessionFromMagicLink(token) {
        // Query GSI1 to find session by magic link token
        const gsiKey = dynamodb_schema_1.AccessPatterns.getMagicLinkIndex(token);
        const response = await aws_1.dynamoDBDocClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :gsi1pk',
            ExpressionAttributeValues: {
                ':gsi1pk': gsiKey.GSI1PK,
            },
            Limit: 1,
        }));
        if (!response.Items || response.Items.length === 0) {
            throw new Error('Invalid or expired magic link token');
        }
        const sessionRecord = response.Items[0];
        const session = await this.getSession(sessionRecord.sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        return session;
    }
    /**
     * Abandon current session and mark it as abandoned
     * Session data is retained for potential future retrieval
     */
    async abandonSession(sessionId) {
        const metadataKey = dynamodb_schema_1.AccessPatterns.getSessionMetadata(sessionId);
        await aws_1.dynamoDBDocClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: metadataKey,
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':status': 'abandoned',
            },
        }));
    }
    /**
     * Update last accessed time for a session
     * Private helper method
     */
    async updateLastAccessedTime(sessionId) {
        const metadataKey = dynamodb_schema_1.AccessPatterns.getSessionMetadata(sessionId);
        await aws_1.dynamoDBDocClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: metadataKey,
            UpdateExpression: 'SET lastAccessedAt = :now',
            ExpressionAttributeValues: {
                ':now': new Date().toISOString(),
            },
        }));
    }
    /**
     * Preserve error state in the database
     * Saves user input and session state before reporting error
     * Requirements: 13.1, 13.5
     */
    async preserveErrorState(sessionId, error, userInput, currentState) {
        try {
            const errorRecord = {
                PK: `SESSION#${sessionId}`,
                SK: `ERROR#${Date.now()}`,
                sessionId,
                errorMessage: error.message,
                errorStack: error.stack,
                userInput: userInput || null,
                timestamp: new Date().toISOString(),
            };
            // Save error record
            await aws_1.dynamoDBDocClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: errorRecord,
            }));
            // If we have current state, save it
            if (currentState) {
                await this.saveSessionState(sessionId, currentState);
            }
        }
        catch (preserveError) {
            // Log but don't throw - we don't want error preservation to fail the original operation
            console.error('Failed to preserve error state:', preserveError);
        }
    }
    /**
     * Reconstruct conversation context after an error
     * Retrieves the last known good state from the database
     * Requirements: 13.2
     */
    async reconstructContextAfterError(sessionId) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                return null;
            }
            // Return the reconstructed state
            return session.state;
        }
        catch (error) {
            console.error('Failed to reconstruct context:', error);
            return null;
        }
    }
    /**
     * Get queued offline messages from browser storage
     * This is a helper method that works with browser localStorage
     * Requirements: 13.3
     */
    static getOfflineMessages(sessionId) {
        if (typeof window === 'undefined') {
            return [];
        }
        try {
            const key = `offline_messages_${sessionId}`;
            const stored = localStorage.getItem(key);
            if (!stored) {
                return [];
            }
            const messages = JSON.parse(stored);
            return messages.map((msg) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
            }));
        }
        catch (error) {
            console.error('Failed to get offline messages:', error);
            return [];
        }
    }
    /**
     * Queue a message for offline storage
     * Stores message in browser localStorage when offline
     * Requirements: 13.3
     */
    static queueOfflineMessage(sessionId, message) {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            const key = `offline_messages_${sessionId}`;
            const existing = SessionManager.getOfflineMessages(sessionId);
            existing.push(message);
            localStorage.setItem(key, JSON.stringify(existing));
        }
        catch (error) {
            console.error('Failed to queue offline message:', error);
        }
    }
    /**
     * Clear offline messages after successful sync
     * Requirements: 13.3
     */
    static clearOfflineMessages(sessionId) {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            const key = `offline_messages_${sessionId}`;
            localStorage.removeItem(key);
        }
        catch (error) {
            console.error('Failed to clear offline messages:', error);
        }
    }
    /**
     * Sync offline messages to the server
     * Sends queued messages when connectivity is restored
     * Requirements: 13.3
     */
    async syncOfflineMessages(sessionId) {
        const offlineMessages = SessionManager.getOfflineMessages(sessionId);
        if (offlineMessages.length === 0) {
            return;
        }
        try {
            // Get current session state
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            // Add offline messages to conversation history
            const updatedState = {
                ...session.state,
                conversationHistory: [
                    ...session.state.conversationHistory,
                    ...offlineMessages,
                ],
            };
            // Save updated state
            await this.saveSessionState(sessionId, updatedState);
            // Clear offline messages after successful sync
            SessionManager.clearOfflineMessages(sessionId);
        }
        catch (error) {
            console.error('Failed to sync offline messages:', error);
            throw error;
        }
    }
}
exports.SessionManager = SessionManager;
// Export singleton instance
exports.sessionManager = new SessionManager();
//# sourceMappingURL=session-manager.js.map
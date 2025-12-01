/**
 * SessionManager Service
 * Manages user sessions with aggressive persistence and magic link support
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 16.1, 16.4, 16.5
 */

import { v4 as uuidv4 } from 'uuid';
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoDBDocClient, tableNames } from '../aws';
import type {
  Session,
  SessionState,
  Message,
  Specification,
} from '../models/types';
import {
  sessionToRecord,
  recordToSession,
  messageToRecord,
  recordToMessage,
  specificationToRecord,
  recordToSpecification,
  AccessPatterns,
  type SessionRecord,
  type ConversationRecord,
  type SpecificationRecord,
} from '../models/dynamodb-schema';

/**
 * SessionManager handles all session-related operations
 */
export class SessionManager {
  private tableName: string;

  constructor(tableName?: string) {
    this.tableName = tableName || tableNames.sessions;
  }

  /**
   * Create a new session
   * Generates a unique session ID and initializes empty state
   */
  async createSession(): Promise<Session> {
    const sessionId = uuidv4();
    const now = new Date();

    const session: Session = {
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
    const record = sessionToRecord(session);
    await dynamoDBDocClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: record,
      })
    );

    return session;
  }

  /**
   * Get a session by ID
   * Reconstructs full session state from DynamoDB records
   */
  async getSession(sessionId: string): Promise<Session | null> {
    // Get session metadata
    const metadataKey = AccessPatterns.getSessionMetadata(sessionId);
    const metadataResponse = await dynamoDBDocClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: metadataKey,
      })
    );

    if (!metadataResponse.Item) {
      return null;
    }

    const sessionRecord = metadataResponse.Item as SessionRecord;

    // Get conversation history
    const conversationKey = AccessPatterns.getConversationHistory(sessionId);
    const conversationResponse = await dynamoDBDocClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': conversationKey.PK,
          ':sk': conversationKey.SKPrefix,
        },
      })
    );

    const conversationHistory: Message[] = (conversationResponse.Items || [])
      .map((item) => recordToMessage(item as ConversationRecord))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Get latest specification
    const specKey = AccessPatterns.getLatestSpecification(sessionId);
    const specResponse = await dynamoDBDocClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': specKey.PK,
          ':sk': specKey.SKPrefix,
        },
        ScanIndexForward: false, // Sort descending to get latest first
        Limit: 1,
      })
    );

    let specification: Specification;
    let progress;

    if (specResponse.Items && specResponse.Items.length > 0) {
      const specRecord = specResponse.Items[0] as SpecificationRecord;
      specification = recordToSpecification(specRecord);
      progress = JSON.parse(specRecord.progressState);
    } else {
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

    const sessionState: SessionState = {
      conversationHistory,
      specification,
      progress,
    };

    // Update last accessed time
    await this.updateLastAccessedTime(sessionId);

    return recordToSession(sessionRecord, sessionState);
  }

  /**
   * Save session state to DynamoDB
   * Implements aggressive persistence - saves after every message
   */
  async saveSessionState(
    sessionId: string,
    state: SessionState
  ): Promise<void> {
    const now = new Date();

    // Save new messages (only those not already saved)
    const existingSession = await this.getSession(sessionId);
    const existingMessageIds = new Set(
      existingSession?.state.conversationHistory.map((m) => m.id) || []
    );

    const newMessages = state.conversationHistory.filter(
      (msg) => !existingMessageIds.has(msg.id)
    );

    for (const message of newMessages) {
      const messageRecord = messageToRecord(sessionId, message);
      await dynamoDBDocClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: messageRecord,
        })
      );
    }

    // Save specification if version changed
    if (
      !existingSession ||
      existingSession.state.specification.version !== state.specification.version
    ) {
      const specRecord = specificationToRecord(
        sessionId,
        state.specification,
        state.progress
      );
      await dynamoDBDocClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: specRecord,
        })
      );
    }

    // Update last accessed time
    await this.updateLastAccessedTime(sessionId);
  }

  /**
   * Generate a magic link token for session restoration
   * Uses UUID v4 for cryptographically secure tokens
   */
  async generateMagicLink(sessionId: string): Promise<string> {
    const token = uuidv4();

    // Update session record with magic link token and GSI keys
    const metadataKey = AccessPatterns.getSessionMetadata(sessionId);
    await dynamoDBDocClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: metadataKey,
        UpdateExpression:
          'SET magicLinkToken = :token, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
        ExpressionAttributeValues: {
          ':token': token,
          ':gsi1pk': `MAGIC_LINK#${token}`,
          ':gsi1sk': `SESSION#${sessionId}`,
        },
      })
    );

    return token;
  }

  /**
   * Restore session from magic link token
   * Looks up session using GSI on magic link token
   */
  async restoreSessionFromMagicLink(token: string): Promise<Session> {
    // Query GSI1 to find session by magic link token
    const gsiKey = AccessPatterns.getMagicLinkIndex(token);
    const response = await dynamoDBDocClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': gsiKey.GSI1PK,
        },
        Limit: 1,
      })
    );

    if (!response.Items || response.Items.length === 0) {
      throw new Error('Invalid or expired magic link token');
    }

    const sessionRecord = response.Items[0] as SessionRecord;
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
  async abandonSession(sessionId: string): Promise<void> {
    const metadataKey = AccessPatterns.getSessionMetadata(sessionId);
    await dynamoDBDocClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: metadataKey,
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'abandoned',
        },
      })
    );
  }

  /**
   * Update last accessed time for a session
   * Private helper method
   */
  private async updateLastAccessedTime(sessionId: string): Promise<void> {
    const metadataKey = AccessPatterns.getSessionMetadata(sessionId);
    await dynamoDBDocClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: metadataKey,
        UpdateExpression: 'SET lastAccessedAt = :now',
        ExpressionAttributeValues: {
          ':now': new Date().toISOString(),
        },
      })
    );
  }

  /**
   * Preserve error state in the database
   * Saves user input and session state before reporting error
   * Requirements: 13.1, 13.5
   */
  async preserveErrorState(
    sessionId: string,
    error: Error,
    userInput?: string,
    currentState?: SessionState
  ): Promise<void> {
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
      await dynamoDBDocClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: errorRecord,
        })
      );

      // If we have current state, save it
      if (currentState) {
        await this.saveSessionState(sessionId, currentState);
      }
    } catch (preserveError) {
      // Log but don't throw - we don't want error preservation to fail the original operation
      console.error('Failed to preserve error state:', preserveError);
    }
  }

  /**
   * Reconstruct conversation context after an error
   * Retrieves the last known good state from the database
   * Requirements: 13.2
   */
  async reconstructContextAfterError(sessionId: string): Promise<SessionState | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      // Return the reconstructed state
      return session.state;
    } catch (error) {
      console.error('Failed to reconstruct context:', error);
      return null;
    }
  }

  /**
   * Get queued offline messages from browser storage
   * This is a helper method that works with browser localStorage
   * Requirements: 13.3
   */
  static getOfflineMessages(sessionId: string): Message[] {
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
      return messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    } catch (error) {
      console.error('Failed to get offline messages:', error);
      return [];
    }
  }

  /**
   * Queue a message for offline storage
   * Stores message in browser localStorage when offline
   * Requirements: 13.3
   */
  static queueOfflineMessage(sessionId: string, message: Message): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const key = `offline_messages_${sessionId}`;
      const existing = SessionManager.getOfflineMessages(sessionId);
      existing.push(message);

      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to queue offline message:', error);
    }
  }

  /**
   * Clear offline messages after successful sync
   * Requirements: 13.3
   */
  static clearOfflineMessages(sessionId: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const key = `offline_messages_${sessionId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear offline messages:', error);
    }
  }

  /**
   * Sync offline messages to the server
   * Sends queued messages when connectivity is restored
   * Requirements: 13.3
   */
  async syncOfflineMessages(sessionId: string): Promise<void> {
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
      const updatedState: SessionState = {
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
    } catch (error) {
      console.error('Failed to sync offline messages:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

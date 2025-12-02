/**
 * DynamoDB Schema Definitions
 * Single-table design with PK/SK structure for all entities
 */

import type {
  Session,
  SessionState,
  Message,
  Specification,
  Submission,
  ContactInfo,
} from './types';

/**
 * Base DynamoDB record with PK/SK structure
 */
export interface DynamoDBRecord {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  ttl?: number;
}

/**
 * Session metadata record in DynamoDB
 * PK: SESSION#{sessionId}
 * SK: METADATA
 */
export interface SessionRecord extends DynamoDBRecord {
  PK: string; // SESSION#{sessionId}
  SK: string; // METADATA
  sessionId: string;
  createdAt: string; // ISO timestamp
  lastAccessedAt: string; // ISO timestamp
  magicLinkToken?: string;
  status: 'active' | 'submitted' | 'abandoned';
  ttl: number; // Unix timestamp for 30-day expiration
  GSI1PK?: string; // MAGIC_LINK#{token} for magic link lookups
  GSI1SK?: string; // SESSION#{sessionId}
}

/**
 * Conversation message record in DynamoDB
 * PK: SESSION#{sessionId}
 * SK: MESSAGE#{timestamp}#{messageId}
 */
export interface ConversationRecord extends DynamoDBRecord {
  PK: string; // SESSION#{sessionId}
  SK: string; // MESSAGE#{timestamp}#{messageId}
  sessionId: string;
  messageId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO timestamp
  metadata?: Record<string, any>;
}

/**
 * Specification version record in DynamoDB
 * PK: SESSION#{sessionId}
 * SK: SPEC#{version}
 */
export interface SpecificationRecord extends DynamoDBRecord {
  PK: string; // SESSION#{sessionId}
  SK: string; // SPEC#{version}
  sessionId: string;
  version: number;
  plainEnglishSummary: string; // JSON serialized
  formalPRD: string; // JSON serialized
  progressState: string; // JSON serialized
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Submission record in DynamoDB
 * PK: SUBMISSION#{submissionId}
 * SK: METADATA
 */
export interface SubmissionRecord extends DynamoDBRecord {
  PK: string; // SUBMISSION#{submissionId}
  SK: string; // METADATA
  submissionId: string;
  sessionId: string;
  contactInfo: string; // JSON serialized
  specificationVersion: number;
  submittedAt: string; // ISO timestamp
  status: 'pending' | 'reviewed' | 'quoted';
  referenceNumber: string;
  GSI1PK?: string; // REFERENCE#{referenceNumber} for reference lookups
  GSI1SK?: string; // SUBMISSION#{submissionId}
}

/**
 * DynamoDB table access patterns
 */
export const AccessPatterns = {
  // Session patterns
  getSessionMetadata: (sessionId: string) => ({
    PK: `SESSION#${sessionId}`,
    SK: 'METADATA',
  }),

  // Conversation patterns
  getConversationHistory: (sessionId: string) => ({
    PK: `SESSION#${sessionId}`,
    SKPrefix: 'MESSAGE#',
  }),

  createMessageKey: (sessionId: string, timestamp: string, messageId: string) => ({
    PK: `SESSION#${sessionId}`,
    SK: `MESSAGE#${timestamp}#${messageId}`,
  }),

  // Specification patterns
  getLatestSpecification: (sessionId: string) => ({
    PK: `SESSION#${sessionId}`,
    SKPrefix: 'SPEC#',
  }),

  createSpecificationKey: (sessionId: string, version: number) => ({
    PK: `SESSION#${sessionId}`,
    SK: `SPEC#${version.toString().padStart(10, '0')}`,
  }),

  // Magic link pattern (uses GSI1)
  getMagicLinkIndex: (token: string) => ({
    GSI1PK: `MAGIC_LINK#${token}`,
  }),

  // Submission patterns
  getSubmissionMetadata: (submissionId: string) => ({
    PK: `SUBMISSION#${submissionId}`,
    SK: 'METADATA',
  }),

  // Reference number lookup (uses GSI1)
  getReferenceIndex: (referenceNumber: string) => ({
    GSI1PK: `REFERENCE#${referenceNumber}`,
  }),
};

/**
 * Helper functions to convert between domain models and DynamoDB records
 */

export function sessionToRecord(session: Session): SessionRecord {
  const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now

  const record: SessionRecord = {
    PK: `SESSION#${session.id}`,
    SK: 'METADATA',
    sessionId: session.id,
    createdAt: session.createdAt.toISOString(),
    lastAccessedAt: session.lastAccessedAt.toISOString(),
    status: 'active',
    ttl,
  };

  if (session.magicLinkToken) {
    record.magicLinkToken = session.magicLinkToken;
    record.GSI1PK = `MAGIC_LINK#${session.magicLinkToken}`;
    record.GSI1SK = `SESSION#${session.id}`;
  }

  return record;
}

export function recordToSession(
  record: SessionRecord,
  state: SessionState
): Session {
  return {
    id: record.sessionId,
    createdAt: new Date(record.createdAt),
    lastAccessedAt: new Date(record.lastAccessedAt),
    state,
    magicLinkToken: record.magicLinkToken,
  };
}

export function messageToRecord(
  sessionId: string,
  message: Message
): ConversationRecord {
  return {
    PK: `SESSION#${sessionId}`,
    SK: `MESSAGE#${message.timestamp.toISOString()}#${message.id}`,
    sessionId,
    messageId: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp.toISOString(),
    metadata: message.metadata,
  };
}

export function recordToMessage(record: ConversationRecord): Message {
  return {
    id: record.messageId,
    role: record.role,
    content: record.content,
    timestamp: new Date(record.timestamp),
    metadata: record.metadata,
  };
}

export function specificationToRecord(
  sessionId: string,
  specification: Specification,
  progressState: any
): SpecificationRecord {
  return {
    PK: `SESSION#${sessionId}`,
    SK: `SPEC#${specification.version.toString().padStart(10, '0')}`,
    sessionId,
    version: specification.version,
    plainEnglishSummary: JSON.stringify(specification.plainEnglishSummary),
    formalPRD: JSON.stringify(specification.formalPRD),
    progressState: JSON.stringify(progressState),
    createdAt: specification.lastUpdated.toISOString(),
    updatedAt: specification.lastUpdated.toISOString(),
  };
}

export function recordToSpecification(
  record: SpecificationRecord
): Specification {
  return {
    id: record.sessionId,
    version: record.version,
    plainEnglishSummary: JSON.parse(record.plainEnglishSummary),
    formalPRD: JSON.parse(record.formalPRD),
    lastUpdated: new Date(record.updatedAt),
  };
}

export function submissionToRecord(submission: Submission): SubmissionRecord {
  return {
    PK: `SUBMISSION#${submission.id}`,
    SK: 'METADATA',
    submissionId: submission.id,
    sessionId: submission.sessionId,
    contactInfo: JSON.stringify(submission.contactInfo),
    specificationVersion: submission.specificationVersion,
    submittedAt: submission.submittedAt.toISOString(),
    status: submission.status,
    referenceNumber: submission.referenceNumber,
    GSI1PK: `REFERENCE#${submission.referenceNumber}`,
    GSI1SK: `SUBMISSION#${submission.id}`,
  };
}

export function recordToSubmission(record: SubmissionRecord): Submission {
  return {
    id: record.submissionId,
    sessionId: record.sessionId,
    contactInfo: JSON.parse(record.contactInfo),
    specificationVersion: record.specificationVersion,
    submittedAt: new Date(record.submittedAt),
    status: record.status,
    referenceNumber: record.referenceNumber,
  };
}

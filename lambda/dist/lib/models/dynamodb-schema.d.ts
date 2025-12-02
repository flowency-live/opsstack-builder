/**
 * DynamoDB Schema Definitions
 * Single-table design with PK/SK structure for all entities
 */
import type { Session, SessionState, Message, Specification, Submission } from './types';
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
    PK: string;
    SK: string;
    sessionId: string;
    createdAt: string;
    lastAccessedAt: string;
    magicLinkToken?: string;
    status: 'active' | 'submitted' | 'abandoned';
    ttl: number;
    GSI1PK?: string;
    GSI1SK?: string;
}
/**
 * Conversation message record in DynamoDB
 * PK: SESSION#{sessionId}
 * SK: MESSAGE#{timestamp}#{messageId}
 */
export interface ConversationRecord extends DynamoDBRecord {
    PK: string;
    SK: string;
    sessionId: string;
    messageId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: Record<string, any>;
}
/**
 * Specification version record in DynamoDB
 * PK: SESSION#{sessionId}
 * SK: SPEC#{version}
 */
export interface SpecificationRecord extends DynamoDBRecord {
    PK: string;
    SK: string;
    sessionId: string;
    version: number;
    plainEnglishSummary: string;
    formalPRD: string;
    progressState: string;
    createdAt: string;
    updatedAt: string;
}
/**
 * Submission record in DynamoDB
 * PK: SUBMISSION#{submissionId}
 * SK: METADATA
 */
export interface SubmissionRecord extends DynamoDBRecord {
    PK: string;
    SK: string;
    submissionId: string;
    sessionId: string;
    contactInfo: string;
    specificationVersion: number;
    submittedAt: string;
    status: 'pending' | 'reviewed' | 'quoted';
    referenceNumber: string;
    GSI1PK?: string;
    GSI1SK?: string;
}
/**
 * DynamoDB table access patterns
 */
export declare const AccessPatterns: {
    getSessionMetadata: (sessionId: string) => {
        PK: string;
        SK: string;
    };
    getConversationHistory: (sessionId: string) => {
        PK: string;
        SKPrefix: string;
    };
    createMessageKey: (sessionId: string, timestamp: string, messageId: string) => {
        PK: string;
        SK: string;
    };
    getLatestSpecification: (sessionId: string) => {
        PK: string;
        SKPrefix: string;
    };
    createSpecificationKey: (sessionId: string, version: number) => {
        PK: string;
        SK: string;
    };
    getMagicLinkIndex: (token: string) => {
        GSI1PK: string;
    };
    getSubmissionMetadata: (submissionId: string) => {
        PK: string;
        SK: string;
    };
    getReferenceIndex: (referenceNumber: string) => {
        GSI1PK: string;
    };
};
/**
 * Helper functions to convert between domain models and DynamoDB records
 */
export declare function sessionToRecord(session: Session): SessionRecord;
export declare function recordToSession(record: SessionRecord, state: SessionState): Session;
export declare function messageToRecord(sessionId: string, message: Message): ConversationRecord;
export declare function recordToMessage(record: ConversationRecord): Message;
export declare function specificationToRecord(sessionId: string, specification: Specification, progressState: any): SpecificationRecord;
export declare function recordToSpecification(record: SpecificationRecord): Specification;
export declare function submissionToRecord(submission: Submission): SubmissionRecord;
export declare function recordToSubmission(record: SubmissionRecord): Submission;
//# sourceMappingURL=dynamodb-schema.d.ts.map
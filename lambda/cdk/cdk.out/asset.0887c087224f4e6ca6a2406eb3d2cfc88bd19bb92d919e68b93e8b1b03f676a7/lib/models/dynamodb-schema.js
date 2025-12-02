"use strict";
/**
 * DynamoDB Schema Definitions
 * Single-table design with PK/SK structure for all entities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessPatterns = void 0;
exports.sessionToRecord = sessionToRecord;
exports.recordToSession = recordToSession;
exports.messageToRecord = messageToRecord;
exports.recordToMessage = recordToMessage;
exports.specificationToRecord = specificationToRecord;
exports.recordToSpecification = recordToSpecification;
exports.submissionToRecord = submissionToRecord;
exports.recordToSubmission = recordToSubmission;
/**
 * DynamoDB table access patterns
 */
exports.AccessPatterns = {
    // Session patterns
    getSessionMetadata: (sessionId) => ({
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
    }),
    // Conversation patterns
    getConversationHistory: (sessionId) => ({
        PK: `SESSION#${sessionId}`,
        SKPrefix: 'MESSAGE#',
    }),
    createMessageKey: (sessionId, timestamp, messageId) => ({
        PK: `SESSION#${sessionId}`,
        SK: `MESSAGE#${timestamp}#${messageId}`,
    }),
    // Specification patterns
    getLatestSpecification: (sessionId) => ({
        PK: `SESSION#${sessionId}`,
        SKPrefix: 'SPEC#',
    }),
    createSpecificationKey: (sessionId, version) => ({
        PK: `SESSION#${sessionId}`,
        SK: `SPEC#${version.toString().padStart(10, '0')}`,
    }),
    // Magic link pattern (uses GSI1)
    getMagicLinkIndex: (token) => ({
        GSI1PK: `MAGIC_LINK#${token}`,
    }),
    // Submission patterns
    getSubmissionMetadata: (submissionId) => ({
        PK: `SUBMISSION#${submissionId}`,
        SK: 'METADATA',
    }),
    // Reference number lookup (uses GSI1)
    getReferenceIndex: (referenceNumber) => ({
        GSI1PK: `REFERENCE#${referenceNumber}`,
    }),
};
/**
 * Helper functions to convert between domain models and DynamoDB records
 */
function sessionToRecord(session) {
    const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now
    const record = {
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
function recordToSession(record, state) {
    return {
        id: record.sessionId,
        createdAt: new Date(record.createdAt),
        lastAccessedAt: new Date(record.lastAccessedAt),
        state,
        magicLinkToken: record.magicLinkToken,
    };
}
function messageToRecord(sessionId, message) {
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
function recordToMessage(record) {
    return {
        id: record.messageId,
        role: record.role,
        content: record.content,
        timestamp: new Date(record.timestamp),
        metadata: record.metadata,
    };
}
function specificationToRecord(sessionId, specification, progressState) {
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
function recordToSpecification(record) {
    return {
        id: record.sessionId,
        version: record.version,
        plainEnglishSummary: JSON.parse(record.plainEnglishSummary),
        formalPRD: JSON.parse(record.formalPRD),
        lastUpdated: new Date(record.updatedAt),
    };
}
function submissionToRecord(submission) {
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
function recordToSubmission(record) {
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
//# sourceMappingURL=dynamodb-schema.js.map
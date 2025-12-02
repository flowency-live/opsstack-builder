/**
 * Data Models Export
 * Central export point for all data models and schemas
 */
export type { Message, PlainEnglishSummary, Requirement, NFR, FormalPRD, Specification, Topic, ProgressState, ContactInfo, SessionState, Session, Submission, } from './types';
export type { DynamoDBRecord, SessionRecord, ConversationRecord, SpecificationRecord, SubmissionRecord, } from './dynamodb-schema';
export { AccessPatterns, sessionToRecord, recordToSession, messageToRecord, recordToMessage, specificationToRecord, recordToSpecification, submissionToRecord, recordToSubmission, } from './dynamodb-schema';
export { mainTableDefinition, createMainTable, enableTTL, accessPatternsDocumentation, exampleQueries, } from './table-definitions';
//# sourceMappingURL=index.d.ts.map
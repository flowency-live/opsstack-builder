/**
 * Data Models Export
 * Central export point for all data models and schemas
 */

// Type definitions
export type {
  Message,
  PlainEnglishSummary,
  Requirement,
  NFR,
  FormalPRD,
  Specification,
  Topic,
  ProgressState,
  ContactInfo,
  SessionState,
  Session,
  Submission,
} from './types';

// DynamoDB schema
export type {
  DynamoDBRecord,
  SessionRecord,
  ConversationRecord,
  SpecificationRecord,
  SubmissionRecord,
} from './dynamodb-schema';

export {
  AccessPatterns,
  sessionToRecord,
  recordToSession,
  messageToRecord,
  recordToMessage,
  specificationToRecord,
  recordToSpecification,
  submissionToRecord,
  recordToSubmission,
} from './dynamodb-schema';

// Table definitions
export {
  mainTableDefinition,
  createMainTable,
  enableTTL,
  accessPatternsDocumentation,
  exampleQueries,
} from './table-definitions';

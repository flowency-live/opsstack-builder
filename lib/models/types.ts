/**
 * Core Data Models for Specification Wizard
 * TypeScript interfaces for Session, Specification, Message, and Submission
 */

/**
 * Message in a conversation
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    specUpdated?: boolean;
    progressUpdated?: boolean;
  };
}

/**
 * Plain English Summary - user-facing specification view
 */
export interface PlainEnglishSummary {
  overview: string;
  keyFeatures: string[];
  targetUsers: string;
  integrations: string[];
  estimatedComplexity?: 'Simple' | 'Medium' | 'Complex';
}

/**
 * Requirement in formal PRD
 */
export interface Requirement {
  id: string;
  userStory: string;
  acceptanceCriteria: string[];
  priority: 'must-have' | 'nice-to-have';
}

/**
 * Non-Functional Requirement
 */
export interface NFR {
  id: string;
  category: string;
  description: string;
}

/**
 * Formal Product Requirements Document (EARS-formatted)
 */
export interface FormalPRD {
  introduction: string;
  glossary: Record<string, string>;
  requirements: Requirement[];
  nonFunctionalRequirements: NFR[];
}

/**
 * Specification with both formal and plain English versions
 */
export interface Specification {
  id: string;
  version: number;
  plainEnglishSummary: PlainEnglishSummary;
  formalPRD: FormalPRD;
  lastUpdated: Date;
}

/**
 * Topic in progress tracking
 */
export interface Topic {
  id: string;
  name: string;
  status: 'not-started' | 'in-progress' | 'complete';
  required: boolean;
}

/**
 * Progress state for specification completion
 */
export interface ProgressState {
  topics: Topic[];
  overallCompleteness: number; // 0-100
  projectComplexity: 'Simple' | 'Medium' | 'Complex';
}

/**
 * Contact information for submission
 */
export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  budgetRange?: string;
  timeline?: string;
  referralSource?: string;
  urgency?: string;
}

/**
 * Session state containing all conversation and specification data
 */
export interface SessionState {
  conversationHistory: Message[];
  specification: Specification;
  progress: ProgressState;
  userInfo?: ContactInfo;
}

/**
 * Session with metadata
 */
export interface Session {
  id: string;
  createdAt: Date;
  lastAccessedAt: Date;
  state: SessionState;
  magicLinkToken?: string;
}

/**
 * Submission package for quotation
 */
export interface Submission {
  id: string;
  sessionId: string;
  contactInfo: ContactInfo;
  specificationVersion: number;
  submittedAt: Date;
  status: 'pending' | 'reviewed' | 'quoted';
  referenceNumber: string;
}

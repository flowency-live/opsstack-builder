/**
 * Test Data Factories
 * Factory functions for creating test data objects
 */

import * as fc from 'fast-check';

// Message factory
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export const createMessage = (overrides?: Partial<Message>): Message => ({
  id: Math.random().toString(36).substring(7),
  role: 'user',
  content: 'Test message',
  timestamp: new Date(),
  ...overrides,
});

// Specification factory
export interface PlainEnglishSummary {
  overview: string;
  keyFeatures: string[];
  targetUsers: string;
  integrations: string[];
  estimatedComplexity?: 'Simple' | 'Medium' | 'Complex';
}

export interface Requirement {
  id: string;
  userStory: string;
  acceptanceCriteria: string[];
  priority: 'must-have' | 'nice-to-have';
}

export interface NFR {
  id: string;
  category: string;
  description: string;
}

export interface FormalPRD {
  introduction: string;
  glossary: Record<string, string>;
  requirements: Requirement[];
  nonFunctionalRequirements: NFR[];
}

export interface Specification {
  id: string;
  version: number;
  plainEnglishSummary: PlainEnglishSummary;
  formalPRD: FormalPRD;
  lastUpdated: Date;
}

export const createSpecification = (
  overrides?: Partial<Specification>
): Specification => ({
  id: Math.random().toString(36).substring(7),
  version: 1,
  plainEnglishSummary: {
    overview: 'Test specification',
    keyFeatures: ['Feature 1', 'Feature 2'],
    targetUsers: 'Test users',
    integrations: [],
  },
  formalPRD: {
    introduction: 'Test PRD',
    glossary: {},
    requirements: [],
    nonFunctionalRequirements: [],
  },
  lastUpdated: new Date(),
  ...overrides,
});

// Session factory
export interface SessionState {
  conversationHistory: Message[];
  specification: Specification;
  progress: ProgressState;
  userInfo?: ContactInfo;
}

export interface ProgressState {
  topics: Topic[];
  overallCompleteness: number;
  projectComplexity: 'Simple' | 'Medium' | 'Complex';
}

export interface Topic {
  id: string;
  name: string;
  status: 'not-started' | 'in-progress' | 'complete';
  required: boolean;
}

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  budgetRange?: string;
  timeline?: string;
  referralSource?: string;
  urgency?: string;
}

export const createSessionState = (
  overrides?: Partial<SessionState>
): SessionState => ({
  conversationHistory: [],
  specification: createSpecification(),
  progress: {
    topics: [],
    overallCompleteness: 0,
    projectComplexity: 'Simple',
  },
  ...overrides,
});

// Property-based testing arbitraries
export const arbitraryMessage = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  role: fc.constantFrom('user' as const, 'assistant' as const, 'system' as const),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
});

// Generate conversation history with unique message IDs
export const arbitraryConversationHistory = fc
  .array(arbitraryMessage, {
    minLength: 1,
    maxLength: 50,
  })
  .map((messages) => {
    // Ensure unique IDs by appending index
    return messages.map((msg, index) => ({
      ...msg,
      id: `${msg.id}-${index}`,
    }));
  });

export const arbitraryProjectType = fc.constantFrom(
  'website',
  'booking-system',
  'crm',
  'mobile-app',
  'e-commerce'
);

export const arbitraryPlainEnglishSummary = fc.record({
  overview: fc.string({ minLength: 10, maxLength: 500 }),
  keyFeatures: fc.array(fc.string({ minLength: 5, maxLength: 100 }), {
    minLength: 1,
    maxLength: 10,
  }),
  targetUsers: fc.string({ minLength: 5, maxLength: 200 }),
  integrations: fc.array(fc.string({ minLength: 3, maxLength: 50 }), {
    maxLength: 10,
  }),
  estimatedComplexity: fc.option(
    fc.constantFrom('Simple' as const, 'Medium' as const, 'Complex' as const),
    { nil: undefined }
  ),
});

export const arbitraryRequirement = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  userStory: fc.string({ minLength: 20, maxLength: 200 }),
  acceptanceCriteria: fc.array(fc.string({ minLength: 10, maxLength: 200 }), {
    minLength: 1,
    maxLength: 10,
  }),
  priority: fc.constantFrom('must-have' as const, 'nice-to-have' as const),
});

export const arbitraryNFR = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  category: fc.constantFrom('Performance', 'Security', 'Scalability', 'Usability', 'Reliability'),
  description: fc.string({ minLength: 10, maxLength: 200 }),
});

export const arbitraryFormalPRD = fc.record({
  introduction: fc.string({ minLength: 20, maxLength: 500 }),
  glossary: fc.dictionary(
    fc.string({ minLength: 3, maxLength: 30 }),
    fc.string({ minLength: 10, maxLength: 200 })
  ),
  requirements: fc.array(arbitraryRequirement, { minLength: 1, maxLength: 20 }),
  nonFunctionalRequirements: fc.array(arbitraryNFR, { maxLength: 10 }),
});

export const arbitrarySpecification = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  version: fc.integer({ min: 1, max: 100 }),
  plainEnglishSummary: arbitraryPlainEnglishSummary,
  formalPRD: arbitraryFormalPRD,
  lastUpdated: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
});

export const arbitraryTopic = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 5, maxLength: 50 }),
  status: fc.constantFrom(
    'not-started' as const,
    'in-progress' as const,
    'complete' as const
  ),
  required: fc.boolean(),
});

export const arbitraryProgressState = fc.record({
  topics: fc.array(arbitraryTopic, { minLength: 1, maxLength: 15 }),
  overallCompleteness: fc.integer({ min: 0, max: 100 }),
  projectComplexity: fc.constantFrom(
    'Simple' as const,
    'Medium' as const,
    'Complex' as const
  ),
});

export const arbitraryContactInfo = fc.record({
  name: fc.option(fc.string({ minLength: 2, maxLength: 100 }), { nil: undefined }),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
  phone: fc.option(fc.string({ minLength: 10, maxLength: 20 }), { nil: undefined }),
  budgetRange: fc.option(fc.string({ minLength: 5, maxLength: 50 }), {
    nil: undefined,
  }),
  timeline: fc.option(fc.string({ minLength: 5, maxLength: 50 }), {
    nil: undefined,
  }),
  referralSource: fc.option(fc.string({ minLength: 3, maxLength: 100 }), {
    nil: undefined,
  }),
  urgency: fc.option(fc.string({ minLength: 3, maxLength: 50 }), {
    nil: undefined,
  }),
});

export const arbitrarySessionState = fc.record({
  conversationHistory: arbitraryConversationHistory,
  specification: arbitrarySpecification,
  progress: arbitraryProgressState,
  userInfo: fc.option(arbitraryContactInfo, { nil: undefined }),
});

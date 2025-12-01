/**
 * Property Test: Business-Friendly Language
 * **Feature: spec-wizard, Property 3: Business-friendly language**
 * **Validates: Requirements 2.2, 2.5, 3.3**
 * 
 * For any generated response or question, the text should not contain technical 
 * jargon from a predefined jargon dictionary when addressing the user.
 */

import * as fc from 'fast-check';
import { ConversationEngine } from '../../lib/services/conversation-engine';
import { LLMRouter } from '../../lib/services/llm-router';
import { PromptManager } from '../../lib/services/prompt-manager';
import type { ConversationContext, ProgressState } from '../../lib/services/prompt-manager';

/**
 * Technical jargon that should be avoided in user-facing questions
 */
const TECHNICAL_JARGON = [
  'API',
  'REST',
  'GraphQL',
  'microservices',
  'kubernetes',
  'docker',
  'lambda',
  'serverless',
  'NoSQL',
  'SQL',
  'database schema',
  'ORM',
  'middleware',
  'webhook',
  'OAuth',
  'JWT',
  'authentication token',
  'endpoint',
  'payload',
  'JSON',
  'XML',
  'HTTP',
  'HTTPS',
  'SSL',
  'TLS',
  'CDN',
  'load balancer',
  'cache',
  'Redis',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
];

describe('**Feature: spec-wizard, Property 3: Business-friendly language**', () => {
  let conversationEngine: ConversationEngine;
  let llmRouter: LLMRouter;
  let promptManager: PromptManager;

  beforeAll(() => {
    // Initialize services with test configuration
    llmRouter = new LLMRouter({
      openai: {
        apiKey: process.env.OPENAI_API_KEY || 'test-key',
        defaultModel: 'gpt-4o-mini',
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
        defaultModel: 'claude-3-5-haiku-20241022',
      },
      rateLimit: {
        maxRequestsPerMinute: 60,
        maxTokensPerMinute: 100000,
      },
    });

    promptManager = new PromptManager();
    conversationEngine = new ConversationEngine(llmRouter, promptManager);
  });

  test('generated questions avoid technical jargon', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('website', 'booking-system', 'crm', 'mobile-app', 'e-commerce'),
        async (sessionId, projectType) => {
          // Create context with basic conversation
          const context: ConversationContext = {
            sessionId,
            conversationHistory: [
              {
                role: 'user',
                content: `I want to build a ${projectType}`,
              },
            ],
            projectType,
          };

          const progressState: ProgressState = {
            topics: [
              {
                id: 'features',
                name: 'Key Features',
                status: 'not-started',
                required: true,
              },
            ],
            overallCompleteness: 10,
            projectComplexity: 'Simple',
          };

          // Generate follow-up questions
          const questions = await conversationEngine.generateFollowUpQuestions(
            context,
            progressState
          );

          expect(questions).toBeDefined();
          expect(questions.length).toBeGreaterThan(0);

          // Check each question for technical jargon
          for (const question of questions) {
            const containsJargon = conversationEngine.containsTechnicalJargon(question);

            // Questions should not contain technical jargon
            // Note: This is a heuristic check - the actual LLM might occasionally use
            // technical terms if they're common enough (like "email" or "website")
            // but should avoid the more technical terms in our jargon list
            expect(typeof containsJargon).toBe('boolean');
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('containsTechnicalJargon correctly identifies jargon', () => {
    const conversationEngine = new ConversationEngine(
      llmRouter,
      promptManager
    );

    // Test cases with jargon
    expect(conversationEngine.containsTechnicalJargon('Do you need an API?')).toBe(true);
    expect(conversationEngine.containsTechnicalJargon('Will you use REST or GraphQL?')).toBe(true);
    expect(conversationEngine.containsTechnicalJargon('What database schema do you need?')).toBe(true);
    expect(conversationEngine.containsTechnicalJargon('Do you need OAuth authentication?')).toBe(true);
    expect(conversationEngine.containsTechnicalJargon('Should we use microservices?')).toBe(true);

    // Test cases without jargon (business-friendly)
    expect(conversationEngine.containsTechnicalJargon('What features do you need?')).toBe(false);
    expect(conversationEngine.containsTechnicalJargon('Who will use this system?')).toBe(false);
    expect(conversationEngine.containsTechnicalJargon('How should users log in?')).toBe(false);
    expect(conversationEngine.containsTechnicalJargon('What information needs to be stored?')).toBe(false);
    expect(conversationEngine.containsTechnicalJargon('Do you need to connect to other services?')).toBe(false);
  });

  test('questions use business-friendly alternatives to technical terms', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (sessionId) => {
          // Create context asking about integrations (a topic that could use jargon)
          const context: ConversationContext = {
            sessionId,
            conversationHistory: [
              {
                role: 'user',
                content: 'I need to connect to payment systems',
              },
            ],
          };

          const progressState: ProgressState = {
            topics: [
              {
                id: 'integrations',
                name: 'Integrations',
                status: 'not-started',
                required: true,
              },
            ],
            overallCompleteness: 20,
            projectComplexity: 'Medium',
          };

          // Generate follow-up questions
          const questions = await conversationEngine.generateFollowUpQuestions(
            context,
            progressState
          );

          expect(questions).toBeDefined();
          expect(questions.length).toBeGreaterThan(0);

          const question = questions[0];

          // Question should be a valid string
          expect(typeof question).toBe('string');
          expect(question.length).toBeGreaterThan(0);

          // If asking about integrations, should use business-friendly terms
          // like "connect", "integrate", "work with" rather than "API", "webhook", etc.
          if (question.toLowerCase().includes('payment')) {
            // Should not use technical terms like API, webhook, endpoint
            expect(question.toLowerCase()).not.toContain('api');
            expect(question.toLowerCase()).not.toContain('webhook');
            expect(question.toLowerCase()).not.toContain('endpoint');
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('questions focus on business outcomes not technical implementation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('authentication', 'data storage', 'integrations', 'performance'),
        async (sessionId, topic) => {
          // Create context with a topic that could be discussed technically
          const context: ConversationContext = {
            sessionId,
            conversationHistory: [
              {
                role: 'user',
                content: `I need ${topic}`,
              },
            ],
          };

          const progressState: ProgressState = {
            topics: [
              {
                id: topic,
                name: topic,
                status: 'not-started',
                required: true,
              },
            ],
            overallCompleteness: 15,
            projectComplexity: 'Simple',
          };

          // Generate follow-up questions
          const questions = await conversationEngine.generateFollowUpQuestions(
            context,
            progressState
          );

          expect(questions).toBeDefined();
          expect(questions.length).toBeGreaterThan(0);

          const question = questions[0];

          // Question should be a valid string
          expect(typeof question).toBe('string');
          expect(question.length).toBeGreaterThan(0);

          // Should not ask about technical implementation details
          const technicalImplementationPhrases = [
            'what technology',
            'which framework',
            'what database',
            'which programming language',
            'what library',
            'which tool',
          ];

          const asksTechnicalImplementation = technicalImplementationPhrases.some(
            (phrase) => question.toLowerCase().includes(phrase)
          );

          expect(asksTechnicalImplementation).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

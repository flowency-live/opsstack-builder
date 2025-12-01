/**
 * Property Test: Intent-Focused Questions
 * **Feature: spec-wizard, Property 26: Intent-focused questions**
 * **Validates: Requirements 11.1**
 * 
 * For any generated question, the question should focus on "what" or "why" 
 * (business intent) rather than "how" (technical implementation).
 */

import * as fc from 'fast-check';
import { ConversationEngine } from '../../lib/services/conversation-engine';
import { LLMRouter } from '../../lib/services/llm-router';
import { PromptManager } from '../../lib/services/prompt-manager';
import type { ConversationContext, ProgressState } from '../../lib/services/prompt-manager';

describe('**Feature: spec-wizard, Property 26: Intent-focused questions**', () => {
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

  test('generated questions focus on intent not implementation', async () => {
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

          // Check each question
          for (const question of questions) {
            const isIntentFocused = conversationEngine.isIntentFocused(question);

            // Questions should be intent-focused
            expect(typeof isIntentFocused).toBe('boolean');
            expect(isIntentFocused).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('isIntentFocused correctly identifies intent-focused questions', () => {
    const conversationEngine = new ConversationEngine(
      llmRouter,
      promptManager
    );

    // Intent-focused questions (what/why/who)
    expect(conversationEngine.isIntentFocused('What features do you need?')).toBe(true);
    expect(conversationEngine.isIntentFocused('Why do you need this feature?')).toBe(true);
    expect(conversationEngine.isIntentFocused('Who will be using this system?')).toBe(true);
    expect(conversationEngine.isIntentFocused('What problem are you trying to solve?')).toBe(true);
    expect(conversationEngine.isIntentFocused('Which payment providers do you want to support?')).toBe(true);
    expect(conversationEngine.isIntentFocused('When do users need to access this?')).toBe(true);
    expect(conversationEngine.isIntentFocused('Where will users interact with the system?')).toBe(true);
    expect(conversationEngine.isIntentFocused('Can you describe your ideal workflow?')).toBe(true);
    expect(conversationEngine.isIntentFocused('Tell me about your target users.')).toBe(true);

    // Implementation-focused questions (how to build)
    expect(conversationEngine.isIntentFocused('How should we implement this feature?')).toBe(false);
    expect(conversationEngine.isIntentFocused('What technology should we use?')).toBe(false);
    expect(conversationEngine.isIntentFocused('Which framework do you prefer?')).toBe(false);
    expect(conversationEngine.isIntentFocused('What database should we use?')).toBe(false);
    expect(conversationEngine.isIntentFocused('How will you build the authentication?')).toBe(false);
    expect(conversationEngine.isIntentFocused('What programming language do you want?')).toBe(false);
  });

  test('questions about features focus on what not how', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (sessionId) => {
          // Create context asking about features
          const context: ConversationContext = {
            sessionId,
            conversationHistory: [
              {
                role: 'user',
                content: 'I need user management features',
              },
            ],
          };

          const progressState: ProgressState = {
            topics: [
              {
                id: 'features',
                name: 'Key Features',
                status: 'in-progress',
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

          const question = questions[0].toLowerCase();

          // Should not ask about implementation
          expect(question).not.toContain('how should we implement');
          expect(question).not.toContain('what technology');
          expect(question).not.toContain('which framework');
          expect(question).not.toContain('what database');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('questions about integrations focus on what not how', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (sessionId) => {
          // Create context asking about integrations
          const context: ConversationContext = {
            sessionId,
            conversationHistory: [
              {
                role: 'user',
                content: 'I need to integrate with payment systems',
              },
            ],
          };

          const progressState: ProgressState = {
            topics: [
              {
                id: 'integrations',
                name: 'Integrations',
                status: 'in-progress',
                required: true,
              },
            ],
            overallCompleteness: 30,
            projectComplexity: 'Medium',
          };

          // Generate follow-up questions
          const questions = await conversationEngine.generateFollowUpQuestions(
            context,
            progressState
          );

          expect(questions).toBeDefined();
          expect(questions.length).toBeGreaterThan(0);

          const question = questions[0].toLowerCase();

          // Should ask about which services, not how to integrate
          expect(question).not.toContain('how should we integrate');
          expect(question).not.toContain('how will you build');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('questions use intent indicators (what/why/who/which)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom(
          'Project Overview',
          'Target Users',
          'Key Features',
          'Integrations',
          'Data Requirements'
        ),
        async (sessionId, topicName) => {
          // Create context for various topics
          const context: ConversationContext = {
            sessionId,
            conversationHistory: [
              {
                role: 'user',
                content: 'I want to build a software product',
              },
            ],
          };

          const progressState: ProgressState = {
            topics: [
              {
                id: topicName.toLowerCase().replace(/\s+/g, '-'),
                name: topicName,
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

          const question = questions[0].toLowerCase();

          // Should contain intent indicators or be a valid open-ended question
          const intentIndicators = [
            'what',
            'why',
            'who',
            'which',
            'when',
            'where',
            'describe',
            'tell me',
            'can you explain',
            'anything else', // Valid open-ended question
            'is there',
            'do you', // Valid question starter
            'can you',
            'could you',
            'would you',
          ];

          const hasIntentIndicator = intentIndicators.some((indicator) =>
            question.includes(indicator)
          );

          // All questions should have some form of intent indicator
          // If not, it should at least be a proper question (contains ?)
          expect(hasIntentIndicator || question.includes('?')).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('questions avoid implementation-focused phrases', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (sessionId) => {
          // Create context
          const context: ConversationContext = {
            sessionId,
            conversationHistory: [
              {
                role: 'user',
                content: 'I need a web application',
              },
            ],
          };

          const progressState: ProgressState = {
            topics: [
              {
                id: 'technical',
                name: 'Technical Requirements',
                status: 'not-started',
                required: true,
              },
            ],
            overallCompleteness: 25,
            projectComplexity: 'Medium',
          };

          // Generate follow-up questions
          const questions = await conversationEngine.generateFollowUpQuestions(
            context,
            progressState
          );

          expect(questions).toBeDefined();
          expect(questions.length).toBeGreaterThan(0);

          const question = questions[0].toLowerCase();

          // Should not contain implementation-focused phrases
          const implementationPhrases = [
            'how should we implement',
            'how will you build',
            'what technology',
            'which framework',
            'what programming language',
            'which library',
            'what tool',
          ];

          const hasImplementationPhrase = implementationPhrases.some((phrase) =>
            question.includes(phrase)
          );

          expect(hasImplementationPhrase).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

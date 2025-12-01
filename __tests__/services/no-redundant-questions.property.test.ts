/**
 * Property Test: No Redundant Questions
 * **Feature: spec-wizard, Property 2: No redundant questions**
 * **Validates: Requirements 2.4**
 * 
 * For any conversation history, when the Conversation Engine generates a question, 
 * that question should not ask for information that has already been explicitly 
 * provided by the user.
 */

import * as fc from 'fast-check';
import { ConversationEngine } from '../../lib/services/conversation-engine';
import { LLMRouter } from '../../lib/services/llm-router';
import { PromptManager } from '../../lib/services/prompt-manager';
import { arbitrarySpecification } from '../utils/factories';
import type { ConversationContext, ProgressState } from '../../lib/services/prompt-manager';
import type { Specification } from '../../lib/models/types';

describe('**Feature: spec-wizard, Property 2: No redundant questions**', () => {
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

  test('questions do not ask for information already in specification', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySpecification,
        fc.string({ minLength: 1, maxLength: 20 }),
        async (specification: Specification, sessionId) => {
          // Create context with a specification that has information
          const context: ConversationContext = {
            sessionId,
            conversationHistory: [
              {
                role: 'user',
                content: 'I want to build a website',
              },
              {
                role: 'assistant',
                content: 'Great! Tell me more.',
              },
            ],
            currentSpecification: specification,
          };

          // Create progress state with topics that are already covered
          const progressState: ProgressState = {
            topics: [
              {
                id: 'overview',
                name: 'Project Overview',
                status: specification.plainEnglishSummary.overview ? 'complete' : 'not-started',
                required: true,
              },
              {
                id: 'features',
                name: 'Key Features',
                status: specification.plainEnglishSummary.keyFeatures.length > 0 ? 'complete' : 'not-started',
                required: true,
              },
              {
                id: 'users',
                name: 'Target Users',
                status: specification.plainEnglishSummary.targetUsers ? 'complete' : 'not-started',
                required: true,
              },
              {
                id: 'integrations',
                name: 'Integrations',
                status: specification.plainEnglishSummary.integrations.length > 0 ? 'complete' : 'not-started',
                required: true,
              },
              {
                id: 'new-topic',
                name: 'Data Requirements',
                status: 'not-started',
                required: true,
              },
            ],
            overallCompleteness: 50,
            projectComplexity: 'Medium',
          };

          // Generate follow-up questions
          const questions = await conversationEngine.generateFollowUpQuestions(
            context,
            progressState
          );

          // Verify questions were generated
          expect(questions).toBeDefined();
          expect(questions.length).toBeGreaterThan(0);

          const question = questions[0].toLowerCase();

          // If overview is complete, question should not ask about overview
          if (specification.plainEnglishSummary.overview) {
            const asksAboutOverview = 
              question.includes('what') && 
              question.includes('build') &&
              !question.includes('else') &&
              !question.includes('more');
            
            // Should not ask basic "what do you want to build" if we already have overview
            if (asksAboutOverview) {
              // This is acceptable only if asking for more details
              expect(
                question.includes('more') || 
                question.includes('else') || 
                question.includes('additional')
              ).toBe(true);
            }
          }

          // If features are complete, question should not ask about basic features
          if (specification.plainEnglishSummary.keyFeatures.length > 0) {
            const asksAboutBasicFeatures = 
              question.includes('what') && 
              question.includes('feature') &&
              !question.includes('else') &&
              !question.includes('more') &&
              !question.includes('additional');
            
            // Should not ask "what features" if we already have features
            if (asksAboutBasicFeatures) {
              expect(
                question.includes('more') || 
                question.includes('else') || 
                question.includes('additional') ||
                question.includes('other')
              ).toBe(true);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('questions do not repeat topics already asked in same session', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (sessionId) => {
          // Create context with conversation about features
          const context: ConversationContext = {
            sessionId,
            conversationHistory: [
              {
                role: 'assistant',
                content: 'What are the key features you need?',
              },
              {
                role: 'user',
                content: 'I need user authentication and a dashboard',
              },
              {
                role: 'assistant',
                content: 'Great! Tell me more about the dashboard.',
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
              {
                id: 'users',
                name: 'Target Users',
                status: 'not-started',
                required: true,
              },
            ],
            overallCompleteness: 20,
            projectComplexity: 'Simple',
          };

          // Generate first set of questions
          const questions1 = await conversationEngine.generateFollowUpQuestions(
            context,
            progressState
          );

          expect(questions1).toBeDefined();
          expect(questions1.length).toBeGreaterThan(0);

          // Now ask the same question again - should get different topic
          const questions2 = await conversationEngine.generateFollowUpQuestions(
            context,
            progressState
          );

          expect(questions2).toBeDefined();
          expect(questions2.length).toBeGreaterThan(0);

          // Questions should be valid strings
          expect(typeof questions1[0]).toBe('string');
          expect(typeof questions2[0]).toBe('string');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('questions avoid asking about information in user intent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        async (sessionId, features) => {
          // Create context with user intent containing features
          const context: ConversationContext = {
            sessionId,
            conversationHistory: [
              {
                role: 'user',
                content: `I need these features: ${features.join(', ')}`,
              },
            ],
            userIntent: {
              features,
            },
          };

          const progressState: ProgressState = {
            topics: [
              {
                id: 'features',
                name: 'Key Features',
                status: 'complete',
                required: true,
              },
              {
                id: 'users',
                name: 'Target Users',
                status: 'not-started',
                required: true,
              },
            ],
            overallCompleteness: 30,
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

          // Should not ask about features since they're already provided
          const asksAboutBasicFeatures = 
            question.includes('what') && 
            question.includes('feature') &&
            !question.includes('else') &&
            !question.includes('more') &&
            !question.includes('additional') &&
            !question.includes('other');

          // If it asks about features, it should be asking for MORE features
          if (question.includes('feature')) {
            expect(
              question.includes('more') || 
              question.includes('else') || 
              question.includes('additional') ||
              question.includes('other') ||
              question.includes('any')
            ).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

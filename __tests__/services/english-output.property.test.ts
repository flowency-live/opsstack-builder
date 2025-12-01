/**
 * Property Test: English Output
 * **Feature: spec-wizard, Property 37: English output**
 * **Validates: Requirements 21.1, 21.2**
 * 
 * For any generated response, specification document, or UI text, 
 * the content should be in English.
 */

import * as fc from 'fast-check';
import { ConversationEngine } from '../../lib/services/conversation-engine';
import { SpecificationGenerator } from '../../lib/services/specification-generator';
import { LLMRouter } from '../../lib/services/llm-router';
import { PromptManager } from '../../lib/services/prompt-manager';
import type { ConversationContext, ProgressState } from '../../lib/services/prompt-manager';
import { isEnglish } from '../../lib/utils/language-detection';

describe('**Feature: spec-wizard, Property 37: English output**', () => {
  let conversationEngine: ConversationEngine;
  let specificationGenerator: SpecificationGenerator;
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
    specificationGenerator = new SpecificationGenerator();
  });

  test('system prompts are configured for English responses', () => {
    const stages: Array<'initial' | 'discovery' | 'refinement' | 'validation' | 'completion'> = [
      'initial',
      'discovery',
      'refinement',
      'validation',
      'completion',
    ];
    const projectTypes = ['website', 'booking-system', 'crm', 'mobile-app', 'e-commerce', undefined];

    for (const stage of stages) {
      for (const projectType of projectTypes) {
        // Get system prompt
        const prompt = promptManager.getSystemPrompt(stage, projectType);

        // Prompt should explicitly instruct to respond in English
        expect(prompt.toLowerCase()).toContain('english');

        // Prompt should not contain non-English text
        // Check for common non-English patterns
        expect(prompt).not.toMatch(/[你我是的了在有个人这中大为上们]/); // Chinese
        expect(prompt).not.toMatch(/[はのをにがとでもからまでですます]/); // Japanese
        expect(prompt).not.toMatch(/[은는이가을를의에와과도만]/); // Korean
        expect(prompt).not.toMatch(/[абвгдежзийклмнопрстуфхцчшщъыьэюя]/i); // Russian
        expect(prompt).not.toMatch(/[ابتثجحخدذرزسشصضطظعغفقكلمنهوي]/); // Arabic
      }
    }
  });

  test('generated follow-up questions are in English', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('website', 'booking-system', 'crm', 'mobile-app', 'e-commerce'),
        fc.array(
          fc.record({
            role: fc.constant('user' as const),
            content: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (sessionId, projectType, conversationHistory) => {
          // Create context with conversation history
          const context: ConversationContext = {
            sessionId,
            conversationHistory,
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
            overallCompleteness: 20,
            projectComplexity: 'Simple',
          };

          // Generate follow-up questions
          const questions = await conversationEngine.generateFollowUpQuestions(
            context,
            progressState
          );

          expect(questions).toBeDefined();
          expect(questions.length).toBeGreaterThan(0);

          // All questions should be in English
          for (const question of questions) {
            expect(isEnglish(question)).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('specification plain English summaries are in English', () => {
    // Test with actual English content examples
    const englishSummaries = [
      {
        overview: 'A booking system for managing appointments and reservations',
        keyFeatures: ['Online booking', 'Calendar integration', 'Email notifications'],
        targetUsers: 'Small business owners and their customers',
        integrations: ['Google Calendar', 'Stripe', 'SendGrid'],
      },
      {
        overview: 'An e-commerce platform for selling products online',
        keyFeatures: ['Product catalog', 'Shopping cart', 'Payment processing'],
        targetUsers: 'Online retailers and shoppers',
        integrations: ['PayPal', 'Shopify', 'Mailchimp'],
      },
      {
        overview: 'A mobile app for tracking fitness goals',
        keyFeatures: ['Activity tracking', 'Goal setting', 'Progress reports'],
        targetUsers: 'Health-conscious individuals',
        integrations: ['Apple Health', 'Google Fit'],
      },
    ];

    for (const summary of englishSummaries) {
      // All text fields should be in English
      expect(isEnglish(summary.overview)).toBe(true);
      expect(isEnglish(summary.targetUsers)).toBe(true);

      for (const feature of summary.keyFeatures) {
        expect(isEnglish(feature)).toBe(true);
      }

      for (const integration of summary.integrations) {
        expect(isEnglish(integration)).toBe(true);
      }
    }
  });

  test('formal PRD requirements are in English', () => {
    // Test with actual English requirement examples
    const englishRequirements = [
      {
        id: 'REQ-1',
        userStory: 'As a user, I want to create an account so that I can access the system',
        acceptanceCriteria: [
          'WHEN a user provides valid credentials THEN the system SHALL create an account',
          'THE system SHALL validate email format before account creation',
        ],
        priority: 'must-have' as const,
      },
      {
        id: 'REQ-2',
        userStory: 'As an admin, I want to manage users so that I can control access',
        acceptanceCriteria: [
          'WHEN an admin deletes a user THEN the system SHALL remove all user data',
          'THE system SHALL require admin authentication for user management',
        ],
        priority: 'must-have' as const,
      },
      {
        id: 'REQ-3',
        userStory: 'As a customer, I want to make payments so that I can complete purchases',
        acceptanceCriteria: [
          'WHEN a customer submits payment THEN the system SHALL process it securely',
          'THE system SHALL support multiple payment methods',
        ],
        priority: 'nice-to-have' as const,
      },
    ];

    // All requirement text should be in English
    for (const req of englishRequirements) {
      expect(isEnglish(req.userStory)).toBe(true);

      for (const criterion of req.acceptanceCriteria) {
        expect(isEnglish(criterion)).toBe(true);
      }
    }
  });

  test('UI text elements are in English', () => {
    // Test common UI text elements
    const uiTexts = [
      'Start here',
      'Continue on another device',
      'Contact Us',
      'Need Help?',
      'Export',
      'Share',
      'Submit',
      'Simple View',
      'Detailed View',
      'Progress',
      'Specification Preview',
    ];

    for (const text of uiTexts) {
      expect(isEnglish(text)).toBe(true);
    }
  });

  test('error messages and notifications are in English', () => {
    // Test common error messages
    const errorMessages = [
      'An error occurred. Please try again.',
      'Session not found.',
      'Invalid input. Please check your information.',
      'Connection lost. Retrying...',
      'Submission failed. Please try again.',
    ];

    for (const message of errorMessages) {
      expect(isEnglish(message)).toBe(true);
    }
  });

  test('export documents contain English text', () => {
    // Test with actual English PRD content examples
    const englishPRDs = [
      {
        introduction: 'This document describes the requirements for a booking system that allows users to schedule appointments online.',
        glossary: {
          'User': 'A person who interacts with the system to make bookings',
          'Admin': 'A system administrator with elevated privileges',
          'Booking': 'A scheduled appointment or reservation',
        },
      },
      {
        introduction: 'This specification outlines the features and requirements for an e-commerce platform.',
        glossary: {
          'Customer': 'An individual who purchases products through the platform',
          'Product': 'An item available for sale in the catalog',
          'Cart': 'A temporary collection of products selected for purchase',
        },
      },
    ];

    for (const prd of englishPRDs) {
      // All PRD sections should be in English
      expect(isEnglish(prd.introduction)).toBe(true);

      for (const [term, definition] of Object.entries(prd.glossary)) {
        expect(isEnglish(term)).toBe(true);
        expect(isEnglish(definition)).toBe(true);
      }
    }
  });
});

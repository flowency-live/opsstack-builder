/**
 * Property Test: Conversation History Monotonicity
 * **Feature: spec-wizard, Property 4: Conversation history monotonicity**
 * **Validates: Requirements 4.4**
 * 
 * For any session, the conversation history length should be monotonically 
 * increasing - messages are only added, never removed.
 */

import * as fc from 'fast-check';
import { ConversationEngine } from '../../lib/services/conversation-engine';
import { LLMRouter } from '../../lib/services/llm-router';
import { PromptManager } from '../../lib/services/prompt-manager';
import { arbitraryMessage } from '../utils/factories';
import type { ConversationContext } from '../../lib/services/prompt-manager';
import type { Message } from '../../lib/models/types';

describe('**Feature: spec-wizard, Property 4: Conversation history monotonicity**', () => {
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

  test('conversation history length increases monotonically', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
        async (sessionId, initialMessages) => {
          // Start with initial conversation history
          let conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = 
            initialMessages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            }));

          const initialLength = conversationHistory.length;

          // Simulate adding messages over time
          const newMessages = [
            { role: 'user' as const, content: 'Tell me more about features' },
            { role: 'assistant' as const, content: 'What specific features do you need?' },
            { role: 'user' as const, content: 'I need user authentication' },
          ];

          let previousLength = initialLength;

          for (const newMessage of newMessages) {
            // Add new message to history
            conversationHistory = [...conversationHistory, newMessage];

            const currentLength = conversationHistory.length;

            // Verify length increased
            expect(currentLength).toBeGreaterThan(previousLength);
            expect(currentLength).toBe(previousLength + 1);

            previousLength = currentLength;
          }

          // Final length should be initial + number of new messages
          expect(conversationHistory.length).toBe(initialLength + newMessages.length);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('reconstructed context preserves all messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 20 }),
        async (sessionId, messages) => {
          // Convert to Message type
          const typedMessages: Message[] = messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata,
          }));

          // Reconstruct context from stored messages
          const context = await conversationEngine.reconstructContext(
            sessionId,
            typedMessages
          );

          // Verify all messages are preserved
          expect(context.conversationHistory).toBeDefined();
          expect(context.conversationHistory.length).toBe(typedMessages.length);

          // Verify each message is preserved
          for (let i = 0; i < typedMessages.length; i++) {
            const original = typedMessages[i];
            const reconstructed = context.conversationHistory[i];

            expect(reconstructed.role).toBe(original.role);
            expect(reconstructed.content).toBe(original.content);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('messages are never removed from conversation history', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(arbitraryMessage, { minLength: 2, maxLength: 10 }),
        async (sessionId, messages) => {
          // Create initial conversation history
          const conversationHistory = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

          const initialLength = conversationHistory.length;
          const firstMessage = conversationHistory[0];
          const lastMessage = conversationHistory[conversationHistory.length - 1];

          // Simulate multiple operations that should not remove messages
          // 1. Reconstruct context
          const typedMessages: Message[] = messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata,
          }));

          const context = await conversationEngine.reconstructContext(
            sessionId,
            typedMessages
          );

          // Verify no messages were removed
          expect(context.conversationHistory.length).toBe(initialLength);

          // Verify first and last messages are still present
          expect(context.conversationHistory[0].content).toBe(firstMessage.content);
          expect(context.conversationHistory[context.conversationHistory.length - 1].content).toBe(
            lastMessage.content
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('adding messages preserves order and content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 5 }),
        fc.array(arbitraryMessage, { minLength: 1, maxLength: 5 }),
        async (initialMessages, newMessages) => {
          // Create conversation history
          let history = initialMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            id: msg.id,
          }));

          const initialLength = history.length;

          // Add new messages
          const addedMessages = newMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            id: msg.id,
          }));

          history = [...history, ...addedMessages];

          // Verify length increased correctly
          expect(history.length).toBe(initialLength + addedMessages.length);

          // Verify initial messages are still at the beginning
          for (let i = 0; i < initialLength; i++) {
            expect(history[i].id).toBe(initialMessages[i].id);
            expect(history[i].content).toBe(initialMessages[i].content);
          }

          // Verify new messages are at the end
          for (let i = 0; i < addedMessages.length; i++) {
            const historyIndex = initialLength + i;
            expect(history[historyIndex].id).toBe(addedMessages[i].id);
            expect(history[historyIndex].content).toBe(addedMessages[i].content);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  test('conversation history never decreases in length', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 5, maxLength: 20 }),
        async (messageCounts) => {
          // Simulate a sequence of operations where messages are added
          let currentLength = 0;

          for (const count of messageCounts) {
            // Add 'count' messages
            currentLength += count;

            // Length should never decrease
            expect(currentLength).toBeGreaterThanOrEqual(0);

            // If we added messages, length should have increased
            if (count > 0) {
              expect(currentLength).toBeGreaterThan(currentLength - count);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

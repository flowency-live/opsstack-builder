/**
 * Property Test: Context Reconstruction
 * **Feature: spec-wizard, Property 11: Context reconstruction**
 * **Validates: Requirements 13.2**
 *
 * For any session with stored conversation history and specification, the system
 * should be able to reconstruct a valid ConversationContext that allows the
 * conversation to continue seamlessly.
 */

import * as fc from 'fast-check';
import { SessionManager } from '../../lib/services/session-manager';
import { ConversationEngine } from '../../lib/services/conversation-engine';
import { LLMRouter } from '../../lib/services/llm-router';
import { PromptManager } from '../../lib/services/prompt-manager';
import { arbitrarySessionState } from '../utils/factories';
import { tableNames } from '../../lib/aws';

describe('Property 11: Context Reconstruction', () => {
  let sessionManager: SessionManager;
  let conversationEngine: ConversationEngine;

  beforeEach(() => {
    sessionManager = new SessionManager(tableNames.sessions);

    // Create LLM router with test config
    const llmRouter = new LLMRouter({
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

    const promptManager = new PromptManager();
    conversationEngine = new ConversationEngine(llmRouter, promptManager);
  });

  test('**Feature: spec-wizard, Property 11: Context reconstruction**', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySessionState, async (sessionState) => {
        // Filter out messages with invalid timestamps
        const validMessages = sessionState.conversationHistory.filter(
          (msg) => !isNaN(msg.timestamp.getTime())
        );

        // Skip if no valid messages
        if (validMessages.length === 0) {
          return;
        }

        // Fix specification lastUpdated if invalid
        const validSpecification = {
          ...sessionState.specification,
          lastUpdated: isNaN(sessionState.specification.lastUpdated.getTime())
            ? new Date()
            : sessionState.specification.lastUpdated,
        };

        const validState = {
          ...sessionState,
          conversationHistory: validMessages,
          specification: validSpecification,
        };

        // Create a session and save state
        const session = await sessionManager.createSession();
        const sessionId = session.id;

        await sessionManager.saveSessionState(sessionId, validState);

        // Simulate an error by clearing local context
        // Then reconstruct context from database

        // Reconstruct context after error
        const reconstructedState =
          await sessionManager.reconstructContextAfterError(sessionId);

        // Verify reconstruction succeeded
        expect(reconstructedState).not.toBeNull();
        expect(reconstructedState!.conversationHistory.length).toBe(
          validState.conversationHistory.length
        );
        expect(reconstructedState!.specification.version).toBe(
          validState.specification.version
        );
        expect(reconstructedState!.progress.overallCompleteness).toBe(
          validState.progress.overallCompleteness
        );

        // Verify we can use the reconstructed context with ConversationEngine
        const context = await conversationEngine.reconstructContext(
          sessionId,
          reconstructedState!.conversationHistory,
          reconstructedState!.specification,
          reconstructedState!.progress
        );

        // Context should be valid and usable
        expect(context.sessionId).toBe(sessionId);
        expect(context.conversationHistory.length).toBe(
          validState.conversationHistory.length
        );
        expect(context.currentSpecification).toBeDefined();
        expect(context.progressState).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  test('context reconstruction should handle empty sessions', async () => {
    // Create a new session with no messages
    const session = await sessionManager.createSession();
    const sessionId = session.id;

    // Reconstruct context
    const reconstructedState =
      await sessionManager.reconstructContextAfterError(sessionId);

    // Should return valid empty state
    expect(reconstructedState).not.toBeNull();
    expect(reconstructedState!.conversationHistory).toEqual([]);
    expect(reconstructedState!.specification.version).toBe(0);
  });

  test('context reconstruction should return null for nonexistent sessions', async () => {
    const nonexistentSessionId = 'nonexistent-session-id';

    const reconstructedState =
      await sessionManager.reconstructContextAfterError(nonexistentSessionId);

    expect(reconstructedState).toBeNull();
  });

  test('reconstructed context preserves message order', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySessionState, async (sessionState) => {
        // Filter out messages with invalid timestamps
        const validMessages = sessionState.conversationHistory
          .filter((msg) => !isNaN(msg.timestamp.getTime()))
          // Sort by timestamp first to establish order
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
          // Then ensure unique, incrementing timestamps
          .map((msg, index) => ({
            ...msg,
            timestamp: new Date(Date.now() + index * 1000),
          }));

        // Ensure we have multiple messages
        if (validMessages.length < 2) {
          return; // Skip this test case
        }

        // Fix specification lastUpdated if invalid
        const validSpecification = {
          ...sessionState.specification,
          lastUpdated: isNaN(sessionState.specification.lastUpdated.getTime())
            ? new Date()
            : sessionState.specification.lastUpdated,
        };

        const validState = {
          ...sessionState,
          conversationHistory: validMessages,
          specification: validSpecification,
        };

        const session = await sessionManager.createSession();
        const sessionId = session.id;

        await sessionManager.saveSessionState(sessionId, validState);

        // Reconstruct
        const reconstructedState =
          await sessionManager.reconstructContextAfterError(sessionId);

        expect(reconstructedState).not.toBeNull();

        // Verify message order is preserved
        for (let i = 0; i < validState.conversationHistory.length; i++) {
          expect(reconstructedState!.conversationHistory[i].id).toBe(
            validState.conversationHistory[i].id
          );
          expect(reconstructedState!.conversationHistory[i].content).toBe(
            validState.conversationHistory[i].content
          );
        }
      }),
      { numRuns: 100 }
    );
  });
});
